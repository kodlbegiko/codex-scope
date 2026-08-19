import { directoriesFromRoot, fileSize, isFile, path, readBuffer, readBufferLimit } from "./fs-utils";
import type { InstructionReport, InstructionSource } from "./types";

function uniqueNames(fallbacks: string[]): string[] {
  const result: string[] = [];
  for (const name of ["AGENTS.override.md", "AGENTS.md", ...fallbacks]) {
    if (name && !result.includes(name)) result.push(name);
  }
  return result;
}

function trimmedText(buffer: Buffer): string {
  return buffer.toString("utf8").trim();
}

function pushIgnoredExisting(
  sources: InstructionSource[],
  candidates: string[],
  startIndex: number,
  directory: string,
  scope: "global" | "project",
  precedence: number,
  reason: string,
): void {
  for (let index = startIndex; index < candidates.length; index += 1) {
    const candidate = path.join(directory, candidates[index]);
    if (!isFile(candidate)) continue;
    const bytes = fileSize(candidate);
    sources.push({
      path: candidate,
      scope,
      directory,
      filename: candidates[index],
      state: "ignored",
      bytes,
      includedBytes: 0,
      precedence,
      reason,
    });
  }
}

function loadGlobal(codexHome: string, sources: InstructionSource[]): void {
  const candidates = ["AGENTS.override.md", "AGENTS.md"];
  for (let index = 0; index < candidates.length; index += 1) {
    const filePath = path.join(codexHome, candidates[index]);
    if (!isFile(filePath)) continue;
    const buffer = readBuffer(filePath);
    if (trimmedText(buffer).length === 0) {
      sources.push({
        path: filePath,
        scope: "global",
        directory: codexHome,
        filename: candidates[index],
        state: "ignored",
        bytes: buffer.length,
        includedBytes: 0,
        precedence: 1000 - index,
        reason: "Empty global instruction file; Codex continues to the next global candidate.",
      });
      continue;
    }
    sources.push({
      path: filePath,
      scope: "global",
      directory: codexHome,
      filename: candidates[index],
      state: "resolved",
      bytes: buffer.length,
      includedBytes: buffer.length,
      precedence: 1000 - index,
      reason: "First non-empty global instruction candidate selected.",
    });
    pushIgnoredExisting(
      sources,
      candidates,
      index + 1,
      codexHome,
      "global",
      1000 - index - 1,
      "A higher-precedence non-empty global instruction file was selected.",
    );
    return;
  }
}

export function resolveInstructions(input: {
  cwd: string;
  codexHome: string;
  projectRoot: string;
  fallbackFilenames: string[];
  projectByteLimit: number;
  invocationComplete: boolean;
  configUncertainty: boolean;
}): InstructionReport {
  const sources: InstructionSource[] = [];
  const warnings: string[] = [];
  const missingInformation: string[] = [];
  loadGlobal(input.codexHome, sources);

  const candidateNames = uniqueNames(input.fallbackFilenames);
  let remaining = Math.max(0, Math.trunc(input.projectByteLimit));
  let totalProjectBytes = 0;
  const directories = directoriesFromRoot(input.projectRoot, input.cwd);

  directories.forEach((directory, directoryIndex) => {
    let selectedIndex = -1;
    for (let index = 0; index < candidateNames.length; index += 1) {
      if (isFile(path.join(directory, candidateNames[index]))) {
        selectedIndex = index;
        break;
      }
    }
    if (selectedIndex < 0) return;

    const selectedName = candidateNames[selectedIndex];
    const selectedPath = path.join(directory, selectedName);
    const bytes = fileSize(selectedPath);
    const precedence = 2000 + directoryIndex * 100 - selectedIndex;

    if (remaining <= 0) {
      sources.push({
        path: selectedPath,
        scope: "project",
        directory,
        filename: selectedName,
        state: "ignored",
        bytes,
        includedBytes: 0,
        precedence,
        reason: "Project instruction byte budget was already exhausted by earlier directories.",
      });
      pushIgnoredExisting(
        sources,
        candidateNames,
        selectedIndex + 1,
        directory,
        "project",
        precedence - 1,
        `${selectedName} exists and wins filename discovery precedence in this directory.`,
      );
      return;
    }

    const included = readBufferLimit(selectedPath, remaining);
    const text = trimmedText(included);
    if (text.length === 0) {
      sources.push({
        path: selectedPath,
        scope: "project",
        directory,
        filename: selectedName,
        state: "ignored",
        bytes,
        includedBytes: 0,
        precedence,
        reason:
          "Selected by existence precedence but content is empty after trimming; lower filename candidates are not reconsidered.",
      });
      pushIgnoredExisting(
        sources,
        candidateNames,
        selectedIndex + 1,
        directory,
        "project",
        precedence - 1,
        `${selectedName} exists and wins filename discovery precedence in this directory.`,
      );
      return;
    }

    const includedBytes = included.length;
    totalProjectBytes += includedBytes;
    remaining -= includedBytes;
    const truncated = bytes > includedBytes;
    sources.push({
      path: selectedPath,
      scope: "project",
      directory,
      filename: selectedName,
      state: "resolved",
      bytes,
      includedBytes,
      precedence,
      reason: truncated
        ? `Active project instruction source, truncated by cumulative ${input.projectByteLimit}-byte project budget.`
        : "Active project instruction source.",
      truncated,
    });
    pushIgnoredExisting(
      sources,
      candidateNames,
      selectedIndex + 1,
      directory,
      "project",
      precedence - 1,
      `${selectedName} exists and wins filename discovery precedence in this directory.`,
    );
    if (truncated) {
      warnings.push(`Project instruction truncated at byte budget: ${selectedPath}`);
    }
  });

  if (!input.invocationComplete) {
    missingInformation.push("Invocation overrides/profile state are not declared complete and can change instruction-related config.");
  }
  if (input.configUncertainty) {
    missingInformation.push("Instruction discovery settings are derived from config with unresolved trust/invocation state.");
  }

  return {
    state: missingInformation.length > 0 ? "unresolved" : "resolved",
    sources: sources.sort((a, b) => a.precedence - b.precedence),
    active: sources.filter((source) => source.state === "resolved").sort((a, b) => a.precedence - b.precedence),
    totalProjectBytes,
    projectByteLimit: input.projectByteLimit,
    fallbackFilenames: input.fallbackFilenames,
    missingInformation,
    warnings,
  };
}
