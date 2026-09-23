import { codexAdapter } from "./adapters/codex";
import type { CompatibilityOutcome } from "./core";
import { VERSION } from "./version";

interface CompatibilityMatrix {
  schema_version: "codex-scope.compatibility.v1";
  codex_scope_version: string;
  resolver_version: string;
  adapter_version: string;
  evidence_date: string;
  tested_codex_version: string;
  tested_upstream_commit: string;
  supported_rules: string[];
  unsupported_rules: string[];
  unresolved_rules: string[];
  known_upstream_discrepancies: Array<{
    id: string;
    status: string;
    summary: string;
    verified_against_commit: string;
  }>;
  generated_from: string[];
}

const matrix = require("../conformance/compatibility-matrix.json") as CompatibilityMatrix;

type VersionOutcome = Extract<CompatibilityOutcome, "compatible" | "unresolved">;

export interface CompatibilitySummary {
  schemaVersion: "codex-scope.compatibility.v1";
  agent: "codex";
  codexScopeVersion: string;
  resolverVersion: string;
  adapterVersion: string;
  evidenceDate: string;
  testedUpstreamCommit: string;
  testedCodexVersion: string;
  inspectedCodexVersion: string;
  versionSource: "supplied" | "unknown";
  versionOutcome: VersionOutcome;
  versionReason: string;
  localVersionProbe: "not_performed";
  rules: {
    supported: number;
    unsupported: number;
    unresolved: number;
    total: number;
  };
  knownDiscrepancies: Array<{
    id: string;
    status: string;
    summary: string;
    verifiedAgainstCommit: string;
  }>;
  sourceOfTruth: string[];
}

export function buildCompatibilitySummary(input: { codexVersion?: string } = {}): CompatibilitySummary {
  if (matrix.codex_scope_version !== VERSION) {
    throw new Error("Packaged compatibility matrix does not match the running Codex Scope version.");
  }
  if (matrix.adapter_version !== codexAdapter.adapterVersion) {
    throw new Error("Packaged compatibility matrix does not match the running Codex adapter version.");
  }

  const supplied = input.codexVersion?.trim();
  const inspectedCodexVersion = supplied || "unknown";
  const versionSource = supplied ? "supplied" : "unknown";

  let versionOutcome: VersionOutcome = "unresolved";
  let versionReason: string;

  if (!supplied) {
    versionReason =
      "No Codex version was supplied and deterministic inspection does not execute a local Codex subprocess; version compatibility remains unresolved.";
  } else if (matrix.tested_codex_version === "unknown") {
    versionReason =
      "A Codex version was supplied, but the checked-in evidence does not pin a tested Codex binary version; compatibility cannot be promoted from unresolved.";
  } else if (supplied === matrix.tested_codex_version) {
    versionOutcome = "compatible";
    versionReason = "The supplied Codex version exactly matches the checked-in tested Codex binary version.";
  } else {
    versionReason =
      "The supplied Codex version does not exactly match the checked-in tested Codex binary version; this evidence set does not prove compatibility.";
  }

  const supported = matrix.supported_rules.length;
  const unsupported = matrix.unsupported_rules.length;
  const unresolved = matrix.unresolved_rules.length;

  return {
    schemaVersion: matrix.schema_version,
    agent: "codex",
    codexScopeVersion: VERSION,
    resolverVersion: matrix.resolver_version,
    adapterVersion: matrix.adapter_version,
    evidenceDate: matrix.evidence_date,
    testedUpstreamCommit: matrix.tested_upstream_commit,
    testedCodexVersion: matrix.tested_codex_version,
    inspectedCodexVersion,
    versionSource,
    versionOutcome,
    versionReason,
    localVersionProbe: "not_performed",
    rules: {
      supported,
      unsupported,
      unresolved,
      total: supported + unsupported + unresolved,
    },
    knownDiscrepancies: matrix.known_upstream_discrepancies.map((item) => ({
      id: item.id,
      status: item.status,
      summary: item.summary,
      verifiedAgainstCommit: item.verified_against_commit,
    })),
    sourceOfTruth: [...matrix.generated_from],
  };
}
