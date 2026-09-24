import test from "node:test";
import assert from "node:assert/strict";
import { compareSnapshots } from "../scripts/observatory-lib.mjs";

function rule(rule_id, expected_outcome = "compatible", evidence_state = "verified", value = "v1") {
  return {
    rule_id,
    expected_outcome,
    evidence_state,
    regression: false,
    evidence_date: "2026-09-24",
    evidence_commit_or_version: "a".repeat(40),
    semantic_signature: {
      expected_outcome,
      expected_behavior: value,
      supported_boundary: "supported",
      unsupported_boundary: "unsupported"
    },
    source_references: ["https://example.com/evidence"]
  };
}

function snapshot(id, rules) {
  return {
    snapshot_id: id,
    upstream_commit: id.padEnd(40, "0").slice(0, 40),
    semantic_rules: rules
  };
}

test("observatory classifies unchanged, evidence gaps, and added rules", () => {
  const from = snapshot("a", [rule("codex.a"), rule("codex.b")]);
  const to = snapshot("b", [
    rule("codex.a"),
    rule("codex.b", "compatible", "carried_forward"),
    rule("codex.c")
  ]);
  const result = compareSnapshots(from, to);
  assert.equal(result.counts.unchanged, 1);
  assert.equal(result.counts.evidence_gap, 1);
  assert.equal(result.counts.added_rule, 1);
});

test("observatory distinguishes verified behavior drift from support boundary change", () => {
  const from = snapshot("a", [rule("codex.a"), rule("codex.b")]);
  const changed = rule("codex.a", "compatible", "verified", "v2");
  const boundary = rule("codex.b", "unsupported", "verified");
  const result = compareSnapshots(from, snapshot("b", [changed, boundary]));
  assert.equal(result.counts.behavior_drift, 1);
  assert.equal(result.counts.support_boundary_change, 1);
});
