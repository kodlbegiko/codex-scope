import fs from "node:fs";
import { readJson, writeJson } from "./conformance-lib.mjs";

function build(manifest) {
  const sorted = (predicate) =>
    manifest.rules.filter(predicate).map((rule) => rule.id).sort();
  return {
    schema_version: "codex-scope.opencode-compatibility.v1",
    agent: "opencode",
    adapter_version: "opencode-adapter.v1",
    source_manifest: "conformance/research/opencode/manifest.json",
    evidence: {
      date: manifest.evidence_date,
      upstream_repository: manifest.upstream_repository,
      upstream_revision: manifest.inspected_revision,
      version_detection: "none",
    },
    counts: {
      total: manifest.rules.length,
      compatible: manifest.rules.filter(
        (rule) => rule.compatibility_outcome === "compatible",
      ).length,
      conditional: manifest.rules.filter(
        (rule) => rule.expected_semantic_state === "conditional",
      ).length,
      unsupported: manifest.rules.filter(
        (rule) => rule.compatibility_outcome === "unsupported",
      ).length,
      unresolved: manifest.rules.filter(
        (rule) => rule.compatibility_outcome === "unresolved",
      ).length,
      tool_error: manifest.rules.filter(
        (rule) => rule.compatibility_outcome === "tool_error",
      ).length,
    },
    compatible_rule_ids: sorted(
      (rule) => rule.compatibility_outcome === "compatible",
    ),
    conditional_rule_ids: sorted(
      (rule) => rule.expected_semantic_state === "conditional",
    ),
    unsupported_rule_ids: sorted(
      (rule) => rule.compatibility_outcome === "unsupported",
    ),
    unresolved_rule_ids: sorted(
      (rule) => rule.compatibility_outcome === "unresolved",
    ),
    tool_error_rule_ids: sorted(
      (rule) => rule.compatibility_outcome === "tool_error",
    ),
    version_boundary: {
      supported_states: ["supplied"],
      provenance_only_states: ["detected"],
      fail_closed_states: ["unknown", "outside_evidence"],
      binary_execution: false,
    },
    runtime_boundary: {
      network: false,
      subprocess: false,
      plugins: false,
      mcp: false,
      hooks: false,
      live_session_approvals: false,
      native_diagnostics_authoritative: true,
    },
    public_contract: {
      codex_json_schema: "codex-scope.v0.1",
      changed: false,
      adapter_artifact_visibility: "internal_conformance_artifact",
    },
  };
}

const mode = process.argv[2] ?? "--check";
const outputPath = "conformance/research/opencode/compatibility.json";

try {
  const manifest = readJson("conformance/research/opencode/manifest.json");
  const generated = build(manifest);
  if (mode === "--write") {
    writeJson(outputPath, generated);
    console.log("OpenCode compatibility artifact written");
  } else if (mode === "--check") {
    const existing = readJson(outputPath);
    if (JSON.stringify(existing) !== JSON.stringify(generated)) {
      throw new Error(
        "OpenCode compatibility artifact is stale; run generator with --write",
      );
    }
    console.log(
      "OpenCode compatibility: current (rules=" +
        generated.counts.total +
        ")",
    );
  } else {
    throw new Error("expected --check or --write");
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
