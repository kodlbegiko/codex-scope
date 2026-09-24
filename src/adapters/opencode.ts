import { directoriesFromRoot, isFile, path, readText } from "../fs-utils";
import { isSecretLikeKey } from "../redact";
import type {
  AdapterCapabilities,
  AdapterEvidence,
  AgentAdapter,
  AgentInspection,
  NeutralInspectionRecord,
  NeutralProvenance,
  NeutralSourceRef,
} from "../core";

export const OPENCODE_ADAPTER_VERSION = "opencode-adapter.v1";
export const OPENCODE_EVIDENCE_REVISION =
  "0f549842ee746e400b1f72516b0b2e292e267e2c";

export type OpenCodeVersionState =
  | "supplied"
  | "detected"
  | "unknown"
  | "outside_evidence";

export interface OpenCodeVersionInput {
  value?: string;
  source?: "supplied" | "detected";
  evidenceRevision?: string;
}

export interface OpenCodeConfigSnapshots {
  completeness: "complete" | "partial";
  remote?: string;
  global?: string;
  custom?: string;
  project?: string;
  inline?: string;
}

export interface OpenCodePermissionQuery {
  id: string;
  permission: string;
  pattern: string;
}

export interface OpenCodeInspectOptions {
  cwd: string;
  projectRoot: string;
  globalConfigDir: string;
  customConfigDir?: string;
  disableProjectInstructions?: boolean;
  instructionUnavailablePaths?: string[];
  configSnapshots?: OpenCodeConfigSnapshots;
  permissionSnapshotPath?: string;
  permissionQueries?: OpenCodePermissionQuery[];
  version?: OpenCodeVersionInput;
}

export interface OpenCodePermissionRule {
  permission: string;
  pattern: string;
  action: "allow" | "ask" | "deny";
  order: number;
}

export interface OpenCodeInspectionResult {
  schemaVersion: "codex-scope.opencode-adapter.v1";
  cwd: string;
  projectRoot: string;
  boundedInstructionState: "resolved" | "unresolved";
  activeInstructionPaths: string[];
  boundedConfigState: "resolved" | "unresolved";
  effectiveConfig: Record<string, unknown>;
  permissionRules: OpenCodePermissionRule[];
  permissionEvaluations: Array<{
    id: string;
    permission: string;
    pattern: string;
    action: "allow" | "ask" | "deny";
  }>;
  version: {
    state: OpenCodeVersionState;
    value?: string;
    evidenceRevision?: string;
  };
  warnings: string[];
}

interface ConfigLayer {
  scope: "remote" | "global" | "custom" | "project" | "inline";
  precedence: number;
  path: string;
  value: Record<string, unknown>;
}

interface VersionResolution {
  state: OpenCodeVersionState;
  value?: string;
  evidenceRevision?: string;
  reason: string;
}

const capabilities: AdapterCapabilities = {
  instructions: true,
  config: true,
  trust: false,
  versionDetection: "none",
  runtimeNetworkRequired: false,
  subprocessRequired: false,
};

const evidence: AdapterEvidence = {
  evidenceDate: "2026-09-24",
  upstreamRepository: "anomalyco/opencode",
  upstreamCommit: OPENCODE_EVIDENCE_REVISION,
  testedUpstreamVersion: "unknown",
  references: [
    "conformance/research/opencode/manifest.json",
    "conformance/research/opencode/regressions.json",
    "conformance/research/phase-e/selection.json",
  ],
};

function normalize(input: string): string {
  return path.resolve(input);
}

function emptyProvenance(): NeutralProvenance {
  return {
    shadowed: [],
    ignored: [],
    conditional: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readText(normalize(filePath)));
  if (!isRecord(parsed)) {
    throw new Error("Expected JSON object: " + filePath);
  }
  return parsed;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
    );
  }
  return value;
}

function mergeValue(target: unknown, source: unknown, key?: string): unknown {
  if (
    key === "instructions" &&
    Array.isArray(target) &&
    Array.isArray(source) &&
    target.every((item) => typeof item === "string") &&
    source.every((item) => typeof item === "string")
  ) {
    return Array.from(new Set([...(target as string[]), ...(source as string[])]));
  }
  if (isRecord(target) && isRecord(source)) {
    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(target)) {
      result[childKey] = cloneValue(childValue);
    }
    for (const [childKey, childValue] of Object.entries(source)) {
      result[childKey] = mergeValue(result[childKey], childValue, childKey);
    }
    return result;
  }
  return cloneValue(source);
}

function mergeConfigLayers(layers: ConfigLayer[]): Record<string, unknown> {
  let result: Record<string, unknown> = {};
  for (const layer of layers) {
    result = mergeValue(result, layer.value) as Record<string, unknown>;
  }
  return result;
}

function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = isSecretLikeKey(key) ? "[REDACTED]" : redactUnknown(child);
    }
    return result;
  }
  return value;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(normalize(root), normalize(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function instructionRef(
  scope: string,
  filePath: string,
  reason: string,
  precedence?: number,
): NeutralSourceRef {
  return {
    type: scope === "project" ? "project" : "user",
    scope,
    path: normalize(filePath),
    precedence,
    reason,
  };
}

function instructionRecord(
  filePath: string,
  scope: string,
  status: "resolved" | "unresolved" | "ignored",
  reason: string,
  precedence?: number,
): NeutralInspectionRecord {
  const ref = instructionRef(scope, filePath, reason, precedence);
  return {
    agent: "opencode",
    surface: "instructions",
    subject: normalize(filePath),
    status,
    value: { path: normalize(filePath) },
    provenance: {
      winner: status === "resolved" ? ref : undefined,
      shadowed: [],
      ignored: status === "ignored" ? [ref] : [],
      conditional: status === "unresolved" ? [ref] : [],
    },
    missingInformation:
      status === "unresolved"
        ? ["Instruction source availability/applicability was not deterministically resolved."]
        : [],
    reason,
  };
}

function discoverInstructions(
  options: OpenCodeInspectOptions,
): {
  records: NeutralInspectionRecord[];
  active: string[];
  state: "resolved" | "unresolved";
} {
  const records: NeutralInspectionRecord[] = [];
  const active: string[] = [];
  const seen = new Set<string>();
  let state: "resolved" | "unresolved" = "resolved";

  const ordinaryGlobal = normalize(path.join(options.globalConfigDir, "AGENTS.md"));
  const customGlobal = options.customConfigDir
    ? normalize(path.join(options.customConfigDir, "AGENTS.md"))
    : undefined;
  const globalWinner =
    customGlobal && isFile(customGlobal)
      ? customGlobal
      : isFile(ordinaryGlobal)
        ? ordinaryGlobal
        : undefined;

  if (globalWinner) {
    seen.add(globalWinner);
    active.push(globalWinner);
    records.push(
      instructionRecord(
        globalWinner,
        globalWinner === customGlobal ? "custom_config_dir" : "global",
        "resolved",
        globalWinner === customGlobal
          ? "Explicit custom config directory AGENTS.md takes precedence over ordinary global AGENTS.md."
          : "Explicit global OpenCode config directory AGENTS.md.",
        10,
      ),
    );
  }

  const root = normalize(options.projectRoot);
  const cwd = normalize(options.cwd);
  if (options.disableProjectInstructions === true) {
    records.push({
      agent: "opencode",
      surface: "instructions",
      subject: "project-instructions-disabled",
      status: "resolved",
      value: true,
      provenance: emptyProvenance(),
      missingInformation: [],
      reason:
        "Project instruction discovery was explicitly disabled by the caller snapshot.",
    });
  } else if (!isWithin(root, cwd)) {
    state = "unresolved";
    records.push({
      agent: "opencode",
      surface: "instructions",
      subject: "project-applicability",
      status: "unresolved",
      provenance: emptyProvenance(),
      missingInformation: ["cwd must be within the explicitly supplied projectRoot."],
      reason:
        "Project AGENTS.md applicability is not inferred outside the supplied project root.",
    });
  } else {
    const unavailable = new Set(
      (options.instructionUnavailablePaths ?? []).map(normalize),
    );
    const directories = directoriesFromRoot(root, cwd);
    for (const directory of directories) {
      const candidate = normalize(path.join(directory, "AGENTS.md"));
      if (!isFile(candidate) && !unavailable.has(candidate)) continue;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      if (unavailable.has(candidate)) {
        state = "unresolved";
        records.push(
          instructionRecord(
            candidate,
            "project",
            "unresolved",
            "Caller-supplied inert read-error state marks this discovered project instruction unavailable.",
            20 + records.length,
          ),
        );
        continue;
      }
      active.push(candidate);
      records.push(
        instructionRecord(
          candidate,
          "project",
          "resolved",
          "Project AGENTS.md lies on the explicit project-root to cwd ancestry.",
          20 + records.length,
        ),
      );
    }
  }

  records.push({
    agent: "opencode",
    surface: "instructions",
    subject: "claude-compatibility-fallback",
    status: "unresolved",
    provenance: emptyProvenance(),
    missingInformation: [
      "The bounded adapter does not claim the complete Claude compatibility fallback resolver.",
    ],
    reason:
      "Official OpenCode docs describe Claude Code fallbacks, but the Phase E native AGENTS.md source alone is not used to infer those runtime compatibility semantics.",
  });

  return { records, active, state };
}

function loadConfigLayers(
  snapshots?: OpenCodeConfigSnapshots,
): ConfigLayer[] {
  if (!snapshots) return [];
  const definitions: Array<[
    ConfigLayer["scope"],
    number,
    string | undefined,
  ]> = [
    ["remote", 10, snapshots.remote],
    ["global", 20, snapshots.global],
    ["custom", 30, snapshots.custom],
    ["project", 40, snapshots.project],
    ["inline", 50, snapshots.inline],
  ];
  const layers: ConfigLayer[] = [];
  for (const [scope, precedence, filePath] of definitions) {
    if (!filePath) continue;
    layers.push({
      scope,
      precedence,
      path: normalize(filePath),
      value: readJsonObject(filePath),
    });
  }
  return layers;
}

function configSource(layer: ConfigLayer): NeutralSourceRef {
  return {
    type:
      layer.scope === "project"
        ? "project"
        : layer.scope === "inline"
          ? "cli"
          : layer.scope === "remote"
            ? "remote"
            : "user",
    scope: layer.scope,
    path: layer.path,
    precedence: layer.precedence,
    reason: "Explicit inert OpenCode config snapshot.",
  };
}

function isRemoteInstruction(value: string): boolean {
  const separator = "://";
  return value.startsWith("http" + separator) || value.startsWith("https" + separator);
}

function configRecords(
  options: OpenCodeInspectOptions,
  layers: ConfigLayer[],
  merged: Record<string, unknown>,
): NeutralInspectionRecord[] {
  const complete = options.configSnapshots?.completeness === "complete";
  const records: NeutralInspectionRecord[] = [
    {
      agent: "opencode",
      surface: "config",
      subject: "bounded-snapshot",
      status: complete ? "resolved" : "unresolved",
      value: redactUnknown(merged),
      provenance: {
        winner: layers.length > 0 ? configSource(layers[layers.length - 1]) : undefined,
        shadowed: layers.slice(0, -1).map(configSource),
        ignored: [],
        conditional: [],
      },
      missingInformation: complete
        ? []
        : [
            "The caller did not declare the bounded config snapshot set complete.",
            "Missing live remote/managed/account/org state must not be treated as empty.",
          ],
      reason: complete
        ? "Resolved only across the explicitly supplied inert snapshot layers."
        : "Known snapshots are visible, but the bounded snapshot set is incomplete.",
    },
  ];

  const keys = Array.from(
    new Set(layers.flatMap((layer) => Object.keys(layer.value))),
  ).sort();
  for (const key of keys) {
    const contributors = layers.filter((layer) =>
      Object.prototype.hasOwnProperty.call(layer.value, key),
    );
    const winner = contributors[contributors.length - 1];
    records.push({
      agent: "opencode",
      surface: "config",
      subject: key,
      status: complete ? "resolved" : "unresolved",
      value: redactUnknown(merged[key]),
      provenance: {
        winner: winner ? configSource(winner) : undefined,
        shadowed: contributors.slice(0, -1).map(configSource),
        ignored: [],
        conditional: [],
      },
      missingInformation: complete
        ? []
        : ["Config snapshot completeness is partial."],
      reason: winner
        ? "Highest-precedence explicitly supplied inert snapshot contributing this key."
        : "No supplied snapshot contributes this key.",
    });
  }

  const instructions = merged.instructions;
  if (Array.isArray(instructions)) {
    for (const declaration of instructions) {
      if (typeof declaration !== "string") continue;
      if (isRemoteInstruction(declaration)) {
        records.push({
          agent: "opencode",
          surface: "instructions",
          subject: declaration,
          status: "unsupported",
          value: { declaration, fetched: false },
          provenance: emptyProvenance(),
          missingInformation: [
            "Remote instruction contents are not fetched by the deterministic core.",
          ],
          reason: "Remote instruction URL declaration is visible but content loading is unsupported.",
        });
      } else if (/[*?]/.test(declaration)) {
        records.push({
          agent: "opencode",
          surface: "instructions",
          subject: declaration,
          status: "unresolved",
          value: { declaration, expanded: false },
          provenance: emptyProvenance(),
          missingInformation: [
            "Arbitrary custom-instruction glob expansion is outside the authorized Phase E subset.",
          ],
          reason:
            "The config declaration is preserved, but effective matched files are not inferred.",
        });
      }
    }
  }
  return records;
}

function isPermissionAction(
  value: unknown,
): value is "allow" | "ask" | "deny" {
  return value === "allow" || value === "ask" || value === "deny";
}

function flattenPermissionRules(value: unknown): OpenCodePermissionRule[] {
  const rules: OpenCodePermissionRule[] = [];
  if (isPermissionAction(value)) {
    return [{ permission: "*", pattern: "*", action: value, order: 0 }];
  }
  if (!isRecord(value)) return rules;

  let order = 0;
  for (const [permission, declaration] of Object.entries(value)) {
    if (isPermissionAction(declaration)) {
      rules.push({ permission, pattern: "*", action: declaration, order });
      order += 1;
      continue;
    }
    if (!isRecord(declaration)) continue;
    for (const [pattern, action] of Object.entries(declaration)) {
      if (!isPermissionAction(action)) continue;
      rules.push({ permission, pattern, action, order });
      order += 1;
    }
  }
  return rules;
}

function wildcardMatch(pattern: string, value: string): boolean {
  let expression = "^";
  for (const character of pattern) {
    if (character === "*") expression += ".*";
    else if (character === "?") expression += ".";
    else expression += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  expression += "$";
  return new RegExp(expression).test(value);
}

function evaluatePermission(
  rules: OpenCodePermissionRule[],
  permission: string,
  pattern: string,
): "allow" | "ask" | "deny" {
  let winner: OpenCodePermissionRule | undefined;
  for (const rule of rules) {
    if (
      wildcardMatch(rule.permission, permission) &&
      wildcardMatch(rule.pattern, pattern)
    ) {
      winner = rule;
    }
  }
  return winner?.action ?? "ask";
}

function permissionRecords(
  options: OpenCodeInspectOptions,
  mergedConfig: Record<string, unknown>,
): {
  records: NeutralInspectionRecord[];
  rules: OpenCodePermissionRule[];
  evaluations: OpenCodeInspectionResult["permissionEvaluations"];
} {
  const snapshot = options.permissionSnapshotPath
    ? readJsonObject(options.permissionSnapshotPath)
    : mergedConfig;
  const hasSnapshot =
    Boolean(options.permissionSnapshotPath) ||
    Object.prototype.hasOwnProperty.call(mergedConfig, "permission");
  const rules = flattenPermissionRules(snapshot.permission);
  const records: NeutralInspectionRecord[] = [
    {
      agent: "opencode",
      surface: "permissions",
      subject: "permission-config",
      status: hasSnapshot ? "resolved" : "unresolved",
      value: hasSnapshot ? rules : undefined,
      provenance: options.permissionSnapshotPath
        ? {
            winner: {
              type: "user",
              scope: "permission_snapshot",
              path: normalize(options.permissionSnapshotPath),
              reason: "Explicit inert permission snapshot.",
            },
            shadowed: [],
            ignored: [],
            conditional: [],
          }
        : emptyProvenance(),
      missingInformation: hasSnapshot
        ? []
        : ["No deterministic permission config snapshot was supplied."],
      reason: hasSnapshot
        ? "Permission declaration order is preserved from the supplied JSON snapshot."
        : "Live permission config is not inferred.",
    },
  ];
  const evaluations = (options.permissionQueries ?? []).map((query) => {
    const action = evaluatePermission(rules, query.permission, query.pattern);
    records.push({
      agent: "opencode",
      surface: "permissions",
      subject: "permission:" + query.id,
      status: hasSnapshot ? "resolved" : "unresolved",
      value: hasSnapshot ? action : undefined,
      provenance: emptyProvenance(),
      missingInformation: hasSnapshot
        ? []
        : ["Permission snapshot is required for deterministic evaluation."],
      reason: hasSnapshot
        ? "Last matching rule wins in preserved declaration order."
        : "No static permission result is claimed without a snapshot.",
    });
    return {
      id: query.id,
      permission: query.permission,
      pattern: query.pattern,
      action,
    };
  });

  records.push({
    agent: "opencode",
    surface: "permissions",
    subject: "session-approvals",
    status: "conditional",
    provenance: emptyProvenance(),
    missingInformation: [
      "Current-session once/always approval state is runtime-only and was not resolved.",
    ],
    reason:
      "Static permission config does not prove live session approval overlays.",
  });

  return { records, rules, evaluations };
}

function resolveVersion(input?: OpenCodeVersionInput): VersionResolution {
  if (
    input?.evidenceRevision &&
    input.evidenceRevision !== OPENCODE_EVIDENCE_REVISION
  ) {
    return {
      state: "outside_evidence",
      value: input.value,
      evidenceRevision: input.evidenceRevision,
      reason:
        "Supplied evidence revision does not match the pinned OpenCode source revision.",
    };
  }
  if (!input?.value) {
    return {
      state: "unknown",
      evidenceRevision: input?.evidenceRevision,
      reason:
        "No OpenCode version was supplied; deterministic core does not execute the OpenCode binary.",
    };
  }
  if (input.source === "detected") {
    return {
      state: "detected",
      value: input.value,
      evidenceRevision: input.evidenceRevision,
      reason:
        "Caller reported an externally detected version; Codex Scope did not perform detection.",
    };
  }
  return {
    state: "supplied",
    value: input.value,
    evidenceRevision: input.evidenceRevision,
    reason:
      "Version was supplied explicitly by the caller; no binary execution was performed.",
  };
}

function versionRecord(version: VersionResolution): NeutralInspectionRecord {
  return {
    agent: "opencode",
    surface: "version",
    subject: "opencode-version",
    status:
      version.state === "supplied"
        ? "resolved"
        : version.state === "detected"
          ? "conditional"
          : "unresolved",
    value: {
      state: version.state,
      value: version.value,
      evidenceRevision: version.evidenceRevision,
      pinnedEvidenceRevision: OPENCODE_EVIDENCE_REVISION,
    },
    provenance: emptyProvenance(),
    missingInformation:
      version.state === "unknown"
        ? ["Supply version/revision provenance explicitly if required."]
        : version.state === "outside_evidence"
          ? ["Revalidate semantics against the supplied upstream revision."]
          : version.state === "detected"
            ? ["Detection occurred outside Codex Scope and is caller-provided provenance."]
            : [],
    reason: version.reason,
  };
}

function runtimeBoundaryRecords(): NeutralInspectionRecord[] {
  return [
    {
      agent: "opencode",
      surface: "runtime",
      subject: "remote-config-live",
      status: "conditional",
      provenance: emptyProvenance(),
      missingInformation: [
        "Live remote configuration is network-derived and intentionally not fetched.",
      ],
      reason:
        "An inert remote snapshot can be replayed, but it does not prove current live remote state.",
    },
    {
      agent: "opencode",
      surface: "runtime",
      subject: "plugins",
      status: "unsupported",
      provenance: emptyProvenance(),
      missingInformation: ["Plugin execution and output are outside the deterministic core."],
      reason: "OpenCode plugins are never loaded or executed.",
    },
    {
      agent: "opencode",
      surface: "runtime",
      subject: "mcp",
      status: "unsupported",
      provenance: emptyProvenance(),
      missingInformation: ["MCP runtime state and provided content are outside the deterministic core."],
      reason: "No MCP server is connected to, started, or queried.",
    },
    {
      agent: "opencode",
      surface: "runtime",
      subject: "managed-account-org",
      status: "conditional",
      provenance: emptyProvenance(),
      missingInformation: [
        "Live managed, MDM, account, and organization state was not resolved.",
      ],
      reason:
        "Missing managed/account/org state is not interpreted as absence.",
    },
  ];
}

function buildInspection(
  options: OpenCodeInspectOptions,
): AgentInspection<OpenCodeInspectionResult> {
  const instructions = discoverInstructions(options);
  const layers = loadConfigLayers(options.configSnapshots);
  const mergedConfig = mergeConfigLayers(layers);
  const config = configRecords(options, layers, mergedConfig);
  const permissions = permissionRecords(options, mergedConfig);
  const version = resolveVersion(options.version);

  const records: NeutralInspectionRecord[] = [
    ...instructions.records,
    ...config,
    ...permissions.records,
    versionRecord(version),
    ...runtimeBoundaryRecords(),
  ];

  const result: OpenCodeInspectionResult = {
    schemaVersion: "codex-scope.opencode-adapter.v1",
    cwd: normalize(options.cwd),
    projectRoot: normalize(options.projectRoot),
    boundedInstructionState: instructions.state,
    activeInstructionPaths: instructions.active,
    boundedConfigState:
      options.configSnapshots?.completeness === "complete"
        ? "resolved"
        : "unresolved",
    effectiveConfig: redactUnknown(mergedConfig) as Record<string, unknown>,
    permissionRules: permissions.rules,
    permissionEvaluations: permissions.evaluations,
    version: {
      state: version.state,
      value: version.value,
      evidenceRevision: version.evidenceRevision,
    },
    warnings: [],
  };

  return {
    agent: "opencode",
    adapterVersion: OPENCODE_ADAPTER_VERSION,
    capabilities,
    evidence,
    records,
    result,
  };
}

export const opencodeAdapter: AgentAdapter<
  OpenCodeInspectOptions,
  OpenCodeInspectionResult
> = {
  id: "opencode",
  adapterVersion: OPENCODE_ADAPTER_VERSION,
  capabilities,
  evidence,
  inspect(options: OpenCodeInspectOptions) {
    return buildInspection(options);
  },
};
