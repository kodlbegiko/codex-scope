import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ledgerPath = path.resolve(
  "conformance/comparison/structural-differences.json",
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

test("structural difference ledger contains five distinct proven dimensions", () => {
  const ledger = readJson(ledgerPath);
  assert.equal(
    ledger.schema_version,
    "codex-scope.structural-differences.v1",
  );
  assert.equal(ledger.expected_count, 5);
  assert.equal(ledger.proven_behaviorally_different_count, 5);
  assert.equal(ledger.cases.length, ledger.expected_count);

  const ids = ledger.cases.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate ledger ids");

  const dimensions = ledger.cases.map((item) => item.semantic_dimension);
  assert.equal(
    new Set(dimensions).size,
    dimensions.length,
    "proven threshold must use distinct semantic dimensions",
  );

  for (const item of ledger.cases) {
    assert.equal(item.classification, "behaviorally_different", item.id);
    assert.deepEqual(item.agents, ["codex", "gemini"], item.id);
    assert.equal(item.deterministic_status, "proven", item.id);
    assert.ok(item.left_summary.length > 0, item.id);
    assert.ok(item.right_summary.length > 0, item.id);
    assert.ok(item.evidence.left_rule_ids.length > 0, item.id);
    assert.ok(item.evidence.right_rule_ids.length > 0, item.id);
    assert.match(item.evidence.left_upstream_commit, /^[0-9a-f]{40}$/, item.id);
    assert.match(item.evidence.right_upstream_commit, /^[0-9a-f]{40}$/, item.id);
    assert.ok(item.provenance.left.length > 0, item.id);
    assert.ok(item.provenance.right.length > 0, item.id);
    assert.ok(item.comparison_reference.length > 0, item.id);

    const [referencePath] = item.comparison_reference.split("#");
    assert.equal(
      fs.existsSync(path.resolve(referencePath)),
      true,
      item.comparison_reference,
    );
  }
});

test("structural difference ledger count cannot silently go stale", () => {
  const ledger = readJson(ledgerPath);
  const proven = ledger.cases.filter(
    (item) =>
      item.classification === "behaviorally_different" &&
      item.deterministic_status === "proven",
  );
  assert.equal(
    ledger.proven_behaviorally_different_count,
    proven.length,
  );
  assert.ok(
    ledger.proven_behaviorally_different_count >= 5,
    "sustained cross-agent expansion gate requires at least five proven structural differences",
  );
});
