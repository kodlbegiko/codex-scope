import fs from "node:fs";
import { readJson } from "./conformance-lib.mjs";

function fail(message) {
  throw new Error(message);
}

try {
  const audit = readJson("conformance/research/phase-e/false-certainty-audit.json");
  const matrix = readJson("conformance/research/phase-e/candidates.json");
  const manifest = readJson("conformance/research/opencode/manifest.json");
  const compatibility = readJson("conformance/research/opencode/compatibility.json");
  const phaseD = readJson("conformance/research/phase-e/phase-d-invariant.json");
  const adapterSource = fs.readFileSync("src/adapters/opencode.ts", "utf8");
  const conformanceStatus = fs.readFileSync("docs/conformance-status.md", "utf8");

  const requiredChecks = [
    "compatible_requires_upstream_evidence",
    "no_filename_only_semantic_proof",
    "no_key_name_cross_agent_equivalence",
    "runtime_only_not_static_fact",
    "unknown_version_not_known",
    "unsupported_not_silently_ignored",
    "network_sources_not_treated_as_acquired",
    "missing_snapshot_not_empty_config",
    "missing_managed_session_state_not_absent",
    "remote_instruction_content_not_fake_parsed",
    "phase_d_external_proof_unchanged",
  ];
  if (audit.result !== "pass") fail("false-certainty audit result must be pass");
  for (const id of requiredChecks) {
    const check = audit.checks.find((item) => item.id === id);
    if (!check || check.status !== "pass") fail("false-certainty check not passed: " + id);
  }

  for (const rule of manifest.rules) {
    if (
      rule.compatibility_outcome === "compatible" &&
      (!Array.isArray(rule.upstream_evidence) || rule.upstream_evidence.length === 0)
    ) {
      fail(rule.id + ": compatible rule lacks upstream evidence");
    }
    if (
      ["runtime_only", "network_runtime", "session_runtime"].includes(
        rule.runtime_dependency_classification,
      ) &&
      rule.compatibility_outcome === "compatible"
    ) {
      fail(rule.id + ": runtime-only rule was incorrectly marked compatible");
    }
    if (/equivalent\s+to\s+(codex|gemini)/i.test(rule.statement)) {
      fail(rule.id + ": key/name-level cross-agent equivalence claim is forbidden");
    }
  }

  for (const candidate of matrix.candidates) {
    if (candidate.primary_semantic_proof === "filename_only") {
      fail(candidate.candidate_id + ": filename-only primary proof detected");
    }
  }

  for (const id of ["opencode.version.unknown", "opencode.version.outside_evidence"]) {
    const rule = manifest.rules.find((item) => item.id === id);
    if (!rule || rule.compatibility_outcome !== "unresolved") {
      fail(id + ": must remain unresolved");
    }
  }
  for (const id of ["opencode.runtime.plugins", "opencode.runtime.mcp", "opencode.instructions.remote_url"]) {
    const rule = manifest.rules.find((item) => item.id === id);
    if (!rule || rule.compatibility_outcome !== "unsupported") {
      fail(id + ": must remain unsupported");
    }
  }
  for (const id of ["opencode.config.snapshot_completeness", "opencode.runtime.managed_account_org", "opencode.permissions.session_approvals"]) {
    const rule = manifest.rules.find((item) => item.id === id);
    if (!rule || rule.compatibility_outcome !== "unresolved") {
      fail(id + ": missing/runtime state must remain unresolved");
    }
  }

  if (compatibility.public_contract.changed !== false) {
    fail("public codex-scope.v0.1 contract must remain unchanged");
  }
  if (/\bfetch\s*\(/.test(adapterSource)) {
    fail("OpenCode adapter must not perform runtime fetch");
  }
  if (/node:child_process|spawnSync|execSync|execFileSync/.test(adapterSource)) {
    fail("OpenCode adapter must not execute subprocesses");
  }

  if (
    phaseD.verified_external_users !== 0 ||
    phaseD.required_external_users !== 3 ||
    phaseD.status !== "blocked_external_proof"
  ) {
    fail("Phase D invariant changed");
  }
  if (
    !conformanceStatus.includes("verified external user cases: 0 / 3") ||
    !conformanceStatus.includes("phase status: blocked_external_proof")
  ) {
    fail("docs/conformance-status.md no longer records the Phase D 0/3 blocked state");
  }

  console.log("Phase E false-certainty audit: pass (" + requiredChecks.length + " checks)");
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
