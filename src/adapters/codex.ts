import { resolveInstructions } from "../agents";
import { resolveConfig, valueAsNumber, valueAsStringArray } from "../config";
import type {
  AdapterCapabilities,
  AdapterEvidence,
  AgentAdapter,
  AgentInspection,
  NeutralInspectionRecord,
  NeutralSourceRef,
} from "../core";
import type {
  EffectiveCodexEnvironment,
  InstructionSource,
  ResolveOptions,
  ResolvedValue,
  ResolutionSource,
} from "../types";
import { VERSION } from "../version";

export const CODEX_ADAPTER_VERSION = "codex-adapter.v1";

const CODEX_COMPATIBILITY = {
  codexScopeVersion: VERSION,
  target:
    "OpenAI Codex documentation plus openai/codex implementation evidence at 94174e44cbc54cece45f6052328ca0c2cd7a8a2a, observed on 2026-09-22",
  evidenceDate: "2026-09-22",
  localCodexDetected: false,
} as const;

const capabilities: AdapterCapabilities = {
  instructions: true,
  config: true,
  trust: true,
  versionDetection: "none",
  runtimeNetworkRequired: false,
  subprocessRequired: false,
};

const evidence: AdapterEvidence = {
  evidenceDate: "2026-09-22",
  upstreamRepository: "openai/codex",
  upstreamCommit: "94174e44cbc54cece45f6052328ca0c2cd7a8a2a",
  testedUpstreamVersion: "unknown",
  references: ["conformance/manifest.json", "conformance/regressions.json", "docs/semantics.md", "docs/compatibility.md"],
};

function sourceRef(source: ResolutionSource): NeutralSourceRef {
  const reference: NeutralSourceRef = {
    scope: source.scope,
  };
  if (source.type !== undefined) reference.type = source.type;
  if (source.path !== undefined) reference.path = source.path;
  if (source.line !== undefined) reference.line = source.line;
  if (source.precedence !== undefined) reference.precedence = source.precedence;
  if (source.reason !== undefined) reference.reason = source.reason;
  return reference;
}

function emptyProvenance() {
  return {
    shadowed: [],
    ignored: [],
    conditional: [],
  };
}

function instructionRecord(source: InstructionSource, environment: EffectiveCodexEnvironment): NeutralInspectionRecord {
  const reference: NeutralSourceRef = {
    scope: source.scope,
    path: source.path,
    precedence: source.precedence,
    reason: source.reason,
  };
  const status =
    source.state === "resolved" && environment.instructions.state === "unresolved" ? "unresolved" : source.state;
  return {
    agent: "codex",
    surface: "instructions",
    subject: source.path,
    status,
    value: {
      scope: source.scope,
      filename: source.filename,
      bytes: source.bytes,
      includedBytes: source.includedBytes,
      truncated: source.truncated ?? false,
    },
    provenance: {
      winner: status === "resolved" ? reference : undefined,
      shadowed: [],
      ignored: source.state === "ignored" ? [reference] : [],
      conditional: status === "unresolved" ? [reference] : [],
    },
    missingInformation: status === "unresolved" ? environment.instructions.missingInformation : [],
    reason:
      status === "unresolved" && source.state === "resolved"
        ? `${source.reason} The overall instruction set remains unresolved because required invocation or config inputs are missing.`
        : source.reason,
  };
}

function configRecord(value: ResolvedValue): NeutralInspectionRecord {
  return {
    agent: "codex",
    surface: "config",
    subject: value.key,
    status: value.state,
    value: value.effectiveValue,
    provenance: {
      winner: value.winner ? sourceRef(value.winner) : undefined,
      shadowed: value.shadowed.map(sourceRef),
      ignored: value.ignored.map(sourceRef),
      conditional: value.conditional.map(sourceRef),
    },
    missingInformation: [...value.missingInformation],
    reason: value.reason,
  };
}

function buildNeutralRecords(environment: EffectiveCodexEnvironment): NeutralInspectionRecord[] {
  const records: NeutralInspectionRecord[] = environment.instructions.sources.map((source) =>
    instructionRecord(source, environment),
  );

  for (const key of Object.keys(environment.config).sort()) {
    records.push(configRecord(environment.config[key]));
  }

  records.push({
    agent: "codex",
    surface: "trust",
    subject: "project_trust",
    status: environment.trust === "unknown" ? "unresolved" : "resolved",
    value: environment.trust,
    provenance: emptyProvenance(),
    missingInformation: environment.trust === "unknown" ? ["Project trust was not supplied as known."] : [],
    reason:
      environment.trust === "unknown"
        ? "Project-scoped semantics remain conditional until trust is known."
        : "Project trust was supplied explicitly for deterministic inspection.",
  });

  records.push({
    agent: "codex",
    surface: "invocation",
    subject: "invocation_completeness",
    status: environment.invocationComplete ? "resolved" : "unresolved",
    value: environment.invocationComplete,
    provenance: emptyProvenance(),
    missingInformation: environment.invocationComplete
      ? []
      : ["Invocation overrides/profile state were not declared complete."],
    reason: environment.invocationComplete
      ? "Invocation state was declared complete by the caller."
      : "Unseen invocation inputs can still change effective semantics.",
  });

  return records;
}

function buildCodexEnvironment(options: ResolveOptions): EffectiveCodexEnvironment {
  const configResult = resolveConfig(options);
  const maxBytes = valueAsNumber(configResult.values.project_doc_max_bytes, 32768);
  const fallbacks = valueAsStringArray(configResult.values.project_doc_fallback_filenames, []);
  const instructionConfigKeys = [
    configResult.values.project_doc_max_bytes,
    configResult.values.project_doc_fallback_filenames,
    configResult.values.project_root_markers,
  ].filter(Boolean);
  const configUncertainty = instructionConfigKeys.some((value) => value.state === "unresolved");

  const instructions = resolveInstructions({
    cwd: options.cwd,
    codexHome: options.codexHome,
    projectRoot: configResult.projectRoot,
    fallbackFilenames: fallbacks,
    projectByteLimit: maxBytes,
    invocationComplete: options.invocationComplete,
    configUncertainty,
    trust: options.trust,
  });

  const warnings = [...configResult.warnings, ...instructions.warnings];
  if (configResult.projectConfigPaths.length > 1) {
    warnings.push(
      `${configResult.projectConfigPaths.length} project config layers were discovered from project root to cwd.`,
    );
  }

  return {
    schemaVersion: "codex-scope.v0.1",
    cwd: options.cwd,
    projectRoot: configResult.projectRoot,
    codexHome: options.codexHome,
    trust: options.trust,
    invocationComplete: options.invocationComplete,
    selectedProfile: options.profile,
    instructions,
    config: configResult.values,
    warnings,
    compatibility: { ...CODEX_COMPATIBILITY },
  };
}

export const codexAdapter: AgentAdapter<ResolveOptions, EffectiveCodexEnvironment> = {
  id: "codex",
  adapterVersion: CODEX_ADAPTER_VERSION,
  capabilities,
  evidence,
  inspect(options: ResolveOptions): AgentInspection<EffectiveCodexEnvironment> {
    const result = buildCodexEnvironment(options);
    return {
      agent: "codex",
      adapterVersion: CODEX_ADAPTER_VERSION,
      capabilities,
      evidence,
      records: buildNeutralRecords(result),
      result,
    };
  },
};
