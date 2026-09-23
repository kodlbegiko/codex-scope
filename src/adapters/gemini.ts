import fs from "node:fs";
import path from "node:path";
import type {
  AdapterCapabilities,
  AdapterEvidence,
  AgentAdapter,
  AgentInspection,
  NeutralInspectionRecord,
  NeutralProvenance,
  NeutralSourceRef,
} from "../core";

export const GEMINI_ADAPTER_VERSION = "gemini-adapter.v1";

export type GeminiTrustSource = "env" | "ide" | "file" | "folder_trust_disabled";

export interface GeminiTrustInputs {
  restrictedMode?: boolean;
  envWorkspace?: "true" | "false";
  folderTrustEnabled?: boolean;
  ideTrust?: boolean;
  fileTrust?: boolean;
  fileError?: boolean;
}

export interface GeminiSettingsPaths {
  systemDefaults?: string;
  user?: string;
  workspace?: string;
  system?: string;
}

export interface GeminiInspectOptions {
  cwd: string;
  trustedRoot: string;
  geminiHome: string;
  trustInputs: GeminiTrustInputs;
  settings?: GeminiSettingsPaths;
  targetPath?: string;
  userProjectMemoryDirectory?: string;
  extensionSnapshotPath?: string;
  mcpDeclarationPath?: string;
  memoryImportPaths?: string[];
}

export interface GeminiInspectionResult {
  schemaVersion: "codex-scope.gemini-adapter.v1";
  cwd: string;
  trustedRoot: string;
  trust: {
    state: "trusted" | "untrusted" | "unknown";
    source?: GeminiTrustSource;
  };
  contextFilenames: string[];
  activeInstructionPaths: string[];
  conditionalInstructionPaths: string[];
  warnings: string[];
}

interface SettingsLayer {
  scope: "system_defaults" | "user" | "workspace" | "system";
  path?: string;
  precedence: number;
  value: Record<string, unknown>;
}

interface TrustResolution {
  state: "trusted" | "untrusted" | "unknown";
  source?: GeminiTrustSource;
  reason: string;
  missingInformation: string[];
}

const capabilities: AdapterCapabilities = {
  instructions: true,
  config: true,
  trust: true,
  versionDetection: "none",
  runtimeNetworkRequired: false,
  subprocessRequired: false,
};

const evidence: AdapterEvidence = {
  evidenceDate: "2026-09-23",
  upstreamRepository: "google-gemini/gemini-cli",
  upstreamCommit: "62364cb2000795537a6895261b37ec668e4cf527",
  testedUpstreamVersion: "unknown",
  references: [
    "conformance/research/gemini-cli/manifest.json",
    "conformance/research/gemini-cli/probes.json",
    "conformance/research/gemini-cli/real-repositories.json",
    "conformance/research/external-evidence.json",
  ],
};

function emptyProvenance(): NeutralProvenance {
  return {
    shadowed: [],
    ignored: [],
    conditional: [],
  };
}

function normalize(input: string): string {
  return path.resolve(input);
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(normalize(root), normalize(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function readJsonObject(filePath?: string): Record<string, unknown> {
  if (!filePath) return {};
  const parsed: unknown = JSON.parse(readText(normalize(filePath)));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected JSON object: " + filePath);
  }
  return parsed as Record<string, unknown>;
}

function readPath(value: unknown, keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function sourceForLayer(layer: SettingsLayer, reason: string): NeutralSourceRef {
  return {
    type:
      layer.scope === "workspace"
        ? "project"
        : layer.scope === "user"
          ? "user"
          : "system",
    scope: layer.scope,
    path: layer.path ? normalize(layer.path) : undefined,
    precedence: layer.precedence,
    reason,
  };
}

function loadSettingsLayers(settings: GeminiSettingsPaths = {}): SettingsLayer[] {
  return [
    {
      scope: "system_defaults",
      path: settings.systemDefaults,
      precedence: 10,
      value: readJsonObject(settings.systemDefaults),
    },
    {
      scope: "user",
      path: settings.user,
      precedence: 20,
      value: readJsonObject(settings.user),
    },
    {
      scope: "workspace",
      path: settings.workspace,
      precedence: 30,
      value: readJsonObject(settings.workspace),
    },
    {
      scope: "system",
      path: settings.system,
      precedence: 40,
      value: readJsonObject(settings.system),
    },
  ];
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function scalarScenario(
  layers: SettingsLayer[],
  keys: string[],
  includeWorkspace: boolean,
): {
  value: unknown;
  winner?: SettingsLayer;
  shadowed: SettingsLayer[];
} {
  let value: unknown;
  let winner: SettingsLayer | undefined;
  const shadowed: SettingsLayer[] = [];

  for (const layer of layers) {
    if (layer.scope === "workspace" && !includeWorkspace) continue;
    const candidate = readPath(layer.value, keys);
    if (candidate === undefined) continue;
    if (winner) shadowed.push(winner);
    value = candidate;
    winner = layer;
  }

  return { value, winner, shadowed };
}

function scalarConfigRecord(
  subject: string,
  keys: string[],
  layers: SettingsLayer[],
  trust: TrustResolution,
  omittedIsUnresolved = false,
): NeutralInspectionRecord {
  const trusted = scalarScenario(layers, keys, true);
  const untrusted = scalarScenario(layers, keys, false);
  const chosen =
    trust.state === "trusted"
      ? trusted
      : trust.state === "untrusted"
        ? untrusted
        : undefined;

  if (!chosen && !valuesEqual(trusted.value, untrusted.value)) {
    const workspace = layers.find(
      (layer) =>
        layer.scope === "workspace" &&
        readPath(layer.value, keys) !== undefined,
    );
    return {
      agent: "gemini",
      surface: "config",
      subject,
      status: "unresolved",
      provenance: {
        ...emptyProvenance(),
        conditional: workspace
          ? [
              sourceForLayer(
                workspace,
                "Workspace contribution depends on unresolved trust.",
              ),
            ]
          : [],
      },
      missingInformation: [
        "Workspace trust must be resolved before this setting can be selected.",
      ],
      reason:
        "Trusted and untrusted settings-file scenarios produce different values.",
    };
  }

  const scenario = chosen ?? trusted;
  if (scenario.value === undefined && omittedIsUnresolved) {
    return {
      agent: "gemini",
      surface: "config",
      subject,
      status: "unresolved",
      provenance: emptyProvenance(),
      missingInformation: [
        "No explicit settings layer supplies this value.",
        "Pinned Gemini documentation and implementation disagree about the omitted Folder Trust default.",
      ],
      reason:
        "Codex Scope does not choose a value for an omitted security.folderTrust.enabled setting.",
    };
  }

  const winner = scenario.winner;
  return {
    agent: "gemini",
    surface: "config",
    subject,
    status: "resolved",
    value: scenario.value,
    provenance: {
      winner: winner
        ? sourceForLayer(winner, "Highest-precedence applicable settings layer.")
        : undefined,
      shadowed: scenario.shadowed.map((layer) =>
        sourceForLayer(layer, "Overridden by a higher-precedence settings layer."),
      ),
      ignored:
        trust.state === "untrusted"
          ? layers
              .filter(
                (layer) =>
                  layer.scope === "workspace" &&
                  readPath(layer.value, keys) !== undefined,
              )
              .map((layer) =>
                sourceForLayer(
                  layer,
                  "Workspace settings are excluded for an explicitly untrusted workspace.",
                ),
              )
          : [],
      conditional: [],
    },
    missingInformation: [],
    reason: winner
      ? "Resolved from deterministic Gemini settings-file precedence."
      : "No settings layer supplied this optional value.",
  };
}

function includeDirectoriesRecord(
  layers: SettingsLayer[],
  trust: TrustResolution,
): NeutralInspectionRecord {
  const keys = ["context", "includeDirectories"];
  const collect = (includeWorkspace: boolean): {
    values: unknown[];
    sources: SettingsLayer[];
  } => {
    const values: unknown[] = [];
    const sources: SettingsLayer[] = [];
    for (const layer of layers) {
      if (layer.scope === "workspace" && !includeWorkspace) continue;
      const candidate = readPath(layer.value, keys);
      if (!Array.isArray(candidate)) continue;
      values.push(...candidate);
      sources.push(layer);
    }
    return { values, sources };
  };

  const trusted = collect(true);
  const untrusted = collect(false);
  if (
    trust.state === "unknown" &&
    !valuesEqual(trusted.values, untrusted.values)
  ) {
    const workspace = layers.find(
      (layer) =>
        layer.scope === "workspace" &&
        Array.isArray(readPath(layer.value, keys)),
    );
    return {
      agent: "gemini",
      surface: "config",
      subject: "context.includeDirectories",
      status: "unresolved",
      provenance: {
        ...emptyProvenance(),
        conditional: workspace
          ? [
              sourceForLayer(
                workspace,
                "Workspace CONCAT contribution depends on unresolved trust.",
              ),
            ]
          : [],
      },
      missingInformation: ["Workspace trust must be resolved."],
      reason:
        "The setting uses CONCAT semantics and the workspace contribution is trust-gated.",
    };
  }

  const scenario = trust.state === "untrusted" ? untrusted : trusted;
  return {
    agent: "gemini",
    surface: "config",
    subject: "context.includeDirectories",
    status: "resolved",
    value: scenario.values,
    provenance: {
      winner: undefined,
      shadowed: [],
      ignored:
        trust.state === "untrusted"
          ? layers
              .filter(
                (layer) =>
                  layer.scope === "workspace" &&
                  Array.isArray(readPath(layer.value, keys)),
              )
              .map((layer) =>
                sourceForLayer(
                  layer,
                  "Workspace settings are excluded for an explicitly untrusted workspace.",
                ),
              )
          : [],
      conditional: [],
    },
    missingInformation: [],
    reason:
      "Resolved by concatenating the authorized context.includeDirectories settings-file layers in precedence order.",
  };
}

function resolveTrust(input: GeminiTrustInputs): TrustResolution {
  if (input.restrictedMode === true || input.envWorkspace === "false") {
    return {
      state: "untrusted",
      source: "env",
      reason:
        "Restrictive or explicit GEMINI_CLI_TRUST_WORKSPACE=false input wins.",
      missingInformation: [],
    };
  }
  if (input.envWorkspace === "true") {
    return {
      state: "trusted",
      source: "env",
      reason: "Explicit GEMINI_CLI_TRUST_WORKSPACE=true input wins.",
      missingInformation: [],
    };
  }
  if (input.folderTrustEnabled === false) {
    return {
      state: "trusted",
      source: "folder_trust_disabled",
      reason: "Explicitly disabled Folder Trust resolves the workspace trusted.",
      missingInformation: [],
    };
  }
  if (input.folderTrustEnabled === undefined) {
    return {
      state: "unknown",
      reason:
        "security.folderTrust.enabled was omitted and its pinned upstream default is disputed.",
      missingInformation: [
        "Supply an explicit folderTrustEnabled value or a higher-precedence environment trust input.",
      ],
    };
  }
  if (typeof input.ideTrust === "boolean") {
    return {
      state: input.ideTrust ? "trusted" : "untrusted",
      source: "ide",
      reason: "Explicit IDE trust input applies after Folder Trust is enabled.",
      missingInformation: [],
    };
  }
  if (input.fileError === true) {
    return {
      state: "unknown",
      reason:
        "The supplied trusted-folders snapshot indicates a parse/read error; no fallback trust decision is claimed.",
      missingInformation: ["Provide a valid trusted-folders snapshot."],
    };
  }
  if (typeof input.fileTrust === "boolean") {
    return {
      state: input.fileTrust ? "trusted" : "untrusted",
      source: "file",
      reason: "Explicit trusted-folders file decision applies.",
      missingInformation: [],
    };
  }
  return {
    state: "unknown",
    reason:
      "Folder Trust is explicitly enabled but no deterministic IDE or file decision was supplied.",
    missingInformation: ["Supply IDE or trusted-folders provenance."],
  };
}

function trustRecord(trust: TrustResolution): NeutralInspectionRecord {
  const source = trust.source;
  return {
    agent: "gemini",
    surface: "trust",
    subject: "workspace_trust",
    status: trust.state === "unknown" ? "unresolved" : "resolved",
    value:
      trust.state === "unknown" ? undefined : trust.state === "trusted",
    provenance: {
      winner: source
        ? {
            type: source === "file" ? "user" : "cli",
            scope: source,
            reason: trust.reason,
          }
        : undefined,
      shadowed: [],
      ignored: [],
      conditional: [],
    },
    missingInformation: trust.missingInformation,
    reason: trust.reason,
  };
}

function normalizeContextFilenames(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.length > 0) return [value];
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string" && entry.length > 0)
  ) {
    return [...value] as string[];
  }
  return undefined;
}

function upwardContextFiles(
  startDir: string,
  ceiling: string,
  filenames: string[],
): string[] {
  const results: string[] = [];
  const stop = normalize(ceiling);
  let current = normalize(startDir);

  if (!isWithin(stop, current)) return results;

  while (true) {
    const found = filenames
      .map((filename) => path.join(current, filename))
      .filter((candidate) => isFile(candidate));
    results.unshift(...found);

    if (current === stop) break;
    const parent = path.dirname(current);
    if (parent === current || !isWithin(stop, parent)) break;
    current = parent;
  }
  return results;
}

function instructionFileRecord(
  subject: string,
  status: "resolved" | "conditional",
  scope: string,
  reason: string,
): NeutralInspectionRecord {
  const reference: NeutralSourceRef = {
    type: scope === "global" ? "user" : "project",
    scope,
    path: subject,
    reason,
  };
  return {
    agent: "gemini",
    surface: "instructions",
    subject,
    status,
    value: { path: subject },
    provenance: {
      winner: status === "resolved" ? reference : undefined,
      shadowed: [],
      ignored: [],
      conditional: status === "conditional" ? [reference] : [],
    },
    missingInformation: [],
    reason,
  };
}

function selectUserProjectMemory(
  directory: string,
  contextFilenames: string[],
): string[] {
  const root = normalize(directory);
  const preferred = path.join(root, "MEMORY.md");
  if (isFile(preferred)) return [preferred];
  return contextFilenames
    .map((filename) => path.join(root, filename))
    .filter((candidate) => isFile(candidate));
}

function extensionMemoryRecord(snapshotPath: string): NeutralInspectionRecord {
  const snapshot = readJsonObject(snapshotPath);
  const extensions = Array.isArray(snapshot.extensions)
    ? snapshot.extensions
    : [];
  const available = extensions
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        (entry as Record<string, unknown>).is_active === true,
    )
    .flatMap((entry) =>
      Array.isArray(entry.context_files) ? entry.context_files : [],
    )
    .filter((entry): entry is string => typeof entry === "string")
    .map(normalize)
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .sort();

  return {
    agent: "gemini",
    surface: "instructions",
    subject: "extension-memory",
    status: "conditional",
    value: available,
    provenance: {
      ...emptyProvenance(),
      conditional: [
        {
          scope: "extension_snapshot",
          path: normalize(snapshotPath),
          reason:
            "Only an inert, already-materialized activation snapshot was inspected.",
        },
      ],
    },
    missingInformation: [
      "Runtime extension discovery and activation are intentionally not executed.",
    ],
    reason:
      "Active extension context declarations are available conditionally from an inert snapshot.",
  };
}

function mcpRecord(declarationPath: string): NeutralInspectionRecord {
  const declaration = readJsonObject(declarationPath);
  const declared = declaration.declared === true;
  return {
    agent: "gemini",
    surface: "instructions",
    subject: "mcp-instructions",
    status: "unsupported",
    value: {
      declared,
      effectiveContentResolved: false,
      executionAttempted: false,
    },
    provenance: {
      ...emptyProvenance(),
      conditional: [
        {
          scope: "mcp_declaration",
          path: normalize(declarationPath),
          reason: "Only declaration metadata was inspected.",
        },
      ],
    },
    missingInformation: declared
      ? [
          "Effective MCP instruction content is runtime-derived and intentionally unsupported.",
        ]
      : [],
    reason:
      "The deterministic adapter never connects to, starts, or queries MCP servers.",
  };
}

function findConservativeLocalImportCandidates(content: string): string[] {
  const candidates: string[] = [];
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = trimmed.match(/^@(\.\.?\/[^\s]+)\s*$/);
    if (match) candidates.push(match[1]);
  }
  return candidates;
}

function importRecord(memoryPath: string): NeutralInspectionRecord {
  const absolutePath = normalize(memoryPath);
  const candidates = findConservativeLocalImportCandidates(
    readText(absolutePath),
  );
  return {
    agent: "gemini",
    surface: "instructions",
    subject: absolutePath,
    status: candidates.length > 0 ? "unresolved" : "resolved",
    value: {
      candidates,
      expanded: false,
    },
    provenance: {
      ...emptyProvenance(),
      conditional:
        candidates.length > 0
          ? [
              {
                scope: "memory_import",
                path: absolutePath,
                reason:
                  "Potential local import detected; recursive expansion is not performed.",
              },
            ]
          : [],
    },
    missingInformation:
      candidates.length > 0
        ? [
            "Recursive import semantics are outside the authorized deterministic subset.",
          ]
        : [],
    reason:
      candidates.length > 0
        ? "Potential memory import detected; effective content fails closed as unresolved."
        : "No conservative local import candidate was detected.",
  };
}

function buildInspection(
  options: GeminiInspectOptions,
): AgentInspection<GeminiInspectionResult> {
  const layers = loadSettingsLayers(options.settings);
  const trust = resolveTrust(options.trustInputs);

  const contextFileNameRecord = scalarConfigRecord(
    "context.fileName",
    ["context", "fileName"],
    layers,
    trust,
  );
  const explicitContextFilenames = normalizeContextFilenames(
    contextFileNameRecord.value,
  );
  const contextFilenames = explicitContextFilenames ?? ["GEMINI.md"];

  const records: NeutralInspectionRecord[] = [
    trustRecord(trust),
    contextFileNameRecord,
    includeDirectoriesRecord(layers, trust),
    scalarConfigRecord(
      "security.folderTrust.enabled",
      ["security", "folderTrust", "enabled"],
      layers,
      trust,
      true,
    ),
  ];

  const activeInstructionPaths: string[] = [];
  const conditionalInstructionPaths: string[] = [];

  const globalPath = path.join(normalize(options.geminiHome), "GEMINI.md");
  if (isFile(globalPath)) {
    activeInstructionPaths.push(globalPath);
    records.push(
      instructionFileRecord(
        globalPath,
        "resolved",
        "global",
        "Documented global Gemini memory file.",
      ),
    );
  }

  const root = normalize(options.trustedRoot);
  const cwd = normalize(options.cwd);
  if (trust.state === "trusted" && isWithin(root, cwd)) {
    for (const instructionPath of upwardContextFiles(
      cwd,
      root,
      contextFilenames,
    )) {
      if (!activeInstructionPaths.includes(instructionPath)) {
        activeInstructionPaths.push(instructionPath);
        records.push(
          instructionFileRecord(
            instructionPath,
            "resolved",
            "workspace",
            "Trusted initial workspace hierarchy.",
          ),
        );
      }
    }
  } else {
    records.push({
      agent: "gemini",
      surface: "instructions",
      subject: "workspace-hierarchy",
      status: "unresolved",
      provenance: emptyProvenance(),
      missingInformation:
        trust.state === "unknown"
          ? [...trust.missingInformation]
          : ["cwd must be within the supplied trustedRoot."],
      reason:
        trust.state === "untrusted"
          ? "The authorized adapter subset does not claim trusted workspace memory for an explicitly untrusted workspace."
          : "Trusted workspace hierarchy cannot be asserted without deterministic trust and root containment.",
    });
  }

  if (options.targetPath) {
    const target = normalize(options.targetPath);
    if (trust.state === "trusted" && isWithin(root, target)) {
      const discovered = upwardContextFiles(
        path.dirname(target),
        root,
        contextFilenames,
      );
      for (const instructionPath of discovered) {
        if (
          !activeInstructionPaths.includes(instructionPath) &&
          !conditionalInstructionPaths.includes(instructionPath)
        ) {
          conditionalInstructionPaths.push(instructionPath);
          records.push(
            instructionFileRecord(
              instructionPath,
              "conditional",
              "jit",
              "Explicit target/access input makes descendant context resolvable, but not pre-session active.",
            ),
          );
        }
      }
    } else {
      records.push({
        agent: "gemini",
        surface: "instructions",
        subject: "jit-subdirectory-context",
        status: "unresolved",
        provenance: emptyProvenance(),
        missingInformation: [
          "JIT resolution requires a trusted workspace and a target within trustedRoot.",
        ],
        reason:
          "No descendant instruction is promoted to active without the authorized explicit-target conditions.",
      });
    }
  } else {
    records.push({
      agent: "gemini",
      surface: "instructions",
      subject: "jit-subdirectory-context",
      status: "unresolved",
      provenance: emptyProvenance(),
      missingInformation: [
        "Supply a target/access path to resolve deterministic JIT candidates.",
      ],
      reason:
        "Future runtime access traces are not inferred by static pre-session inspection.",
    });
  }

  if (options.userProjectMemoryDirectory) {
    const selected = selectUserProjectMemory(
      options.userProjectMemoryDirectory,
      contextFilenames,
    );
    records.push({
      agent: "gemini",
      surface: "instructions",
      subject: "user-project-memory",
      status: "resolved",
      value: selected,
      provenance: {
        winner:
          selected.length > 0
            ? {
                scope: "user_project_memory",
                path: selected[0],
                reason:
                  path.basename(selected[0]) === "MEMORY.md"
                    ? "MEMORY.md has explicit precedence in the supplied project-memory directory."
                    : "Configured context filename is the legacy fallback because MEMORY.md is absent.",
              }
            : undefined,
        shadowed: [],
        ignored: [],
        conditional: [],
      },
      missingInformation: [],
      reason:
        "Selection is limited to the explicitly supplied user-project memory directory.",
    });
  } else {
    records.push({
      agent: "gemini",
      surface: "instructions",
      subject: "user-project-memory",
      status: "unresolved",
      provenance: emptyProvenance(),
      missingInformation: [
        "Gemini CLI project-memory storage directory was not supplied explicitly.",
      ],
      reason:
        "The adapter does not derive live user-project storage identity or paths.",
    });
  }

  if (options.extensionSnapshotPath) {
    records.push(extensionMemoryRecord(options.extensionSnapshotPath));
  } else {
    records.push({
      agent: "gemini",
      surface: "instructions",
      subject: "extension-memory",
      status: "unresolved",
      provenance: emptyProvenance(),
      missingInformation: [
        "No inert extension activation snapshot was supplied.",
      ],
      reason:
        "Runtime extension discovery or execution is outside the deterministic core.",
    });
  }

  if (options.mcpDeclarationPath) {
    records.push(mcpRecord(options.mcpDeclarationPath));
  }

  for (const memoryPath of options.memoryImportPaths ?? []) {
    records.push(importRecord(memoryPath));
  }

  const result: GeminiInspectionResult = {
    schemaVersion: "codex-scope.gemini-adapter.v1",
    cwd,
    trustedRoot: root,
    trust: {
      state: trust.state,
      source: trust.source,
    },
    contextFilenames,
    activeInstructionPaths,
    conditionalInstructionPaths,
    warnings: [],
  };

  return {
    agent: "gemini",
    adapterVersion: GEMINI_ADAPTER_VERSION,
    capabilities,
    evidence,
    records,
    result,
  };
}

export const geminiAdapter: AgentAdapter<
  GeminiInspectOptions,
  GeminiInspectionResult
> = {
  id: "gemini",
  adapterVersion: GEMINI_ADAPTER_VERSION,
  capabilities,
  evidence,
  inspect(options: GeminiInspectOptions) {
    return buildInspection(options);
  },
};
