import { displayPath } from "./fs-utils";
import { redactEnvironment } from "./redact";
import type { EffectiveCodexEnvironment, InstructionSource, ResolvedValue } from "./types";

function valueText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function sourceText(source: ResolvedValue["winner"], environment: EffectiveCodexEnvironment): string {
  if (!source) return "(none)";
  const location = source.path ? displayPath(source.path, environment.cwd) : source.scope;
  const base = `${location}${source.line ? `:${source.line}` : ""}`;
  return source.reason ? `${base} — ${source.reason}` : base;
}

function instructionLine(source: InstructionSource, environment: EffectiveCodexEnvironment): string {
  const icon = source.state === "resolved" ? "✓" : "○";
  const suffix = source.truncated ? " (truncated)" : "";
  return `  ${icon} ${displayPath(source.path, environment.cwd)}${suffix}`;
}

export function renderInspect(raw: EffectiveCodexEnvironment): string {
  const environment = redactEnvironment(raw);
  const lines = [
    "CODEX SCOPE",
    "────────────────────────────────────────",
    "Target",
    `  ${environment.cwd}`,
    `  project root: ${environment.projectRoot}`,
    "",
    `Instructions  [${environment.instructions.state}]`,
  ];
  if (environment.instructions.sources.length === 0) lines.push("  (none discovered)");
  else {
    for (const source of environment.instructions.sources) {
      lines.push(instructionLine(source, environment));
      if (source.state !== "resolved") lines.push(`    ${source.reason}`);
    }
  }

  lines.push("", "Important config");
  const preferred = ["approval_policy", "sandbox_mode", "model", "model_provider"];
  const keys = preferred.filter((key) => environment.config[key]);
  const displayKeys = keys.length > 0 ? keys : Object.keys(environment.config).slice(0, 6);
  for (const key of displayKeys) {
    const value = environment.config[key];
    lines.push(
      `  ${key} = ${value.effectiveValue === undefined ? "unknown" : valueText(value.effectiveValue)}  [${value.state}]`,
      `    source: ${sourceText(value.winner, environment)}`,
    );
  }

  const unresolved = Object.values(environment.config).filter((value) => value.state === "unresolved");
  if (unresolved.length > 0 || environment.instructions.state === "unresolved") {
    lines.push("", "Unresolved");
    if (environment.instructions.state === "unresolved") {
      for (const missing of environment.instructions.missingInformation) lines.push(`  - instructions: ${missing}`);
    }
    for (const value of unresolved.slice(0, 8)) {
      lines.push(`  - ${value.key}: ${value.missingInformation.join("; ") || value.reason}`);
    }
    if (unresolved.length > 8) lines.push(`  - … ${unresolved.length - 8} more config values; run 'codex-scope config'`);
  }

  if (environment.warnings.length > 0) {
    lines.push("", "Warnings");
    for (const warning of environment.warnings) lines.push(`  ⚠ ${warning}`);
  }
  return lines.join("\n");
}

export function renderInstructions(raw: EffectiveCodexEnvironment): string {
  const environment = redactEnvironment(raw);
  const lines = [
    `Instructions [${environment.instructions.state}]`,
    `target: ${environment.cwd}`,
    `project root: ${environment.projectRoot}`,
    `project byte budget: ${environment.instructions.totalProjectBytes}/${environment.instructions.projectByteLimit}`,
  ];
  if (environment.instructions.fallbackFilenames.length > 0) {
    lines.push(`fallback filenames: ${environment.instructions.fallbackFilenames.join(", ")}`);
  }
  lines.push("");
  if (environment.instructions.sources.length === 0) lines.push("(none discovered)");
  for (const source of environment.instructions.sources) {
    lines.push(`${source.state.padEnd(9)} ${displayPath(source.path, environment.cwd)}`);
    lines.push(`  ${source.reason}`);
    if (source.scope === "project") lines.push(`  bytes: ${source.includedBytes}/${source.bytes}`);
  }
  if (environment.instructions.missingInformation.length > 0) {
    lines.push("", "missing");
    for (const missing of environment.instructions.missingInformation) lines.push(`  - ${missing}`);
  }
  return lines.join("\n");
}

export function renderConfig(raw: EffectiveCodexEnvironment): string {
  const environment = redactEnvironment(raw);
  const keys = Object.keys(environment.config).sort();
  const lines = ["Config", `trust: ${environment.trust}`, `invocation complete: ${environment.invocationComplete}`, ""];
  for (const key of keys) {
    const value = environment.config[key];
    lines.push(`${key} = ${value.effectiveValue === undefined ? "unknown" : valueText(value.effectiveValue)}`);
    lines.push(`  state: ${value.state}`);
    lines.push(`  winner: ${sourceText(value.winner, environment)}`);
    if (value.shadowed.length > 0) {
      lines.push("  shadowed:");
      for (const source of value.shadowed) lines.push(`    - ${sourceText(source, environment)}`);
    }
    if (value.conditional.length > 0) {
      lines.push("  conditional:");
      for (const source of value.conditional) lines.push(`    - ${sourceText(source, environment)}`);
    }
    if (value.ignored.length > 0) {
      lines.push("  ignored:");
      for (const source of value.ignored) lines.push(`    - ${sourceText(source, environment)}`);
    }
    if (value.missingInformation.length > 0) {
      lines.push("  missing:");
      for (const missing of value.missingInformation) lines.push(`    - ${missing}`);
    }
    lines.push("");
  }
  if (environment.warnings.length > 0) {
    lines.push("warnings");
    for (const warning of environment.warnings) lines.push(`  ⚠ ${warning}`);
  }
  return lines.join("\n").trimEnd();
}

export function renderWhy(raw: EffectiveCodexEnvironment, key: string): string {
  const environment = redactEnvironment(raw);
  const value = environment.config[key];
  if (!value) {
    return [
      `${key} = unknown`,
      "state: unresolved",
      "",
      "missing",
      "  No supported source or documented V0.1 default for this key was found.",
    ].join("\n");
  }
  const lines = [
    `${key} = ${value.effectiveValue === undefined ? "unknown" : valueText(value.effectiveValue)}`,
    `state: ${value.state}`,
    "",
    "winner",
    `  ${sourceText(value.winner, environment)}`,
  ];
  if (value.shadowed.length > 0) {
    lines.push("", "shadowed");
    for (const source of value.shadowed) lines.push(`  ${sourceText(source, environment)}`);
  }
  if (value.conditional.length > 0) {
    lines.push("", "conditional");
    for (const source of value.conditional) lines.push(`  ${sourceText(source, environment)}`);
  }
  if (value.ignored.length > 0) {
    lines.push("", "ignored");
    for (const source of value.ignored) lines.push(`  ${sourceText(source, environment)}`);
  }
  if (value.missingInformation.length > 0) {
    lines.push("", "missing");
    for (const missing of value.missingInformation) lines.push(`  ${missing}`);
  }
  lines.push("", "reason", `  ${value.reason}`);
  if (environment.warnings.length > 0) {
    lines.push("", "warnings");
    for (const warning of environment.warnings) lines.push(`  ⚠ ${warning}`);
  }
  return lines.join("\n");
}

export function renderJson(raw: EffectiveCodexEnvironment, command: string, key?: string): string {
  const environment = redactEnvironment(raw);
  let result: unknown;
  if (command === "instructions") result = environment.instructions;
  else if (command === "config") result = environment.config;
  else if (command === "why") {
    result = environment.config[key ?? ""] ?? {
      key,
      state: "unresolved",
      missingInformation: ["No supported source or documented V0.1 default for this key was found."],
    };
  } else result = environment;
  return JSON.stringify(
    {
      schemaVersion: environment.schemaVersion,
      command,
      result,
      warnings: environment.warnings,
      compatibility: environment.compatibility,
    },
    null,
    2,
  );
}
