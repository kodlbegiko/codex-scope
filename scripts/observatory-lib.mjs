import { assertSchema, readJson } from "./conformance-lib.mjs";

export const DRIFT_CLASSIFICATIONS = [
  "unchanged",
  "behavior_drift",
  "evidence_gap",
  "support_boundary_change",
  "added_rule",
  "removed_rule",
  "tool_error"
];

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function classify(left, right) {
  if (!left) return { classification: "added_rule", reason: "Rule exists only in the newer snapshot." };
  if (!right) return { classification: "removed_rule", reason: "Rule exists only in the older snapshot." };
  if (left.expected_outcome !== right.expected_outcome) {
    return {
      classification: "support_boundary_change",
      reason: "Expected compatibility outcome changed across snapshots."
    };
  }
  if (!jsonEqual(left.semantic_signature, right.semantic_signature)) {
    if (left.evidence_state === "verified" && right.evidence_state === "verified") {
      return {
        classification: "behavior_drift",
        reason: "Verified semantic signature changed across snapshots."
      };
    }
    return {
      classification: "evidence_gap",
      reason: "Semantic signature changed without verified evidence on both snapshots."
    };
  }
  if (right.evidence_state !== "verified") {
    return {
      classification: "evidence_gap",
      reason: "Newer snapshot carries the rule forward without revalidating it against the pinned upstream commit."
    };
  }
  return {
    classification: "unchanged",
    reason: "Verified semantic signature and compatibility outcome are unchanged."
  };
}

function edge(rule) {
  return rule
    ? {
        expected_outcome: rule.expected_outcome,
        evidence_state: rule.evidence_state,
        evidence_date: rule.evidence_date,
        evidence_commit_or_version: rule.evidence_commit_or_version
      }
    : null;
}

export function compareSnapshots(from, to) {
  const fromRules = new Map(from.semantic_rules.map((rule) => [rule.rule_id, rule]));
  const toRules = new Map(to.semantic_rules.map((rule) => [rule.rule_id, rule]));
  const ids = [...new Set([...fromRules.keys(), ...toRules.keys()])].sort();
  const rules = ids.map((ruleId) => {
    const left = fromRules.get(ruleId);
    const right = toRules.get(ruleId);
    const result = classify(left, right);
    return {
      rule_id: ruleId,
      classification: result.classification,
      reason: result.reason,
      from: edge(left),
      to: edge(right)
    };
  });
  const counts = Object.fromEntries(DRIFT_CLASSIFICATIONS.map((item) => [item, 0]));
  for (const rule of rules) counts[rule.classification] += 1;
  return {
    from_snapshot_id: from.snapshot_id,
    to_snapshot_id: to.snapshot_id,
    from_upstream_commit: from.upstream_commit,
    to_upstream_commit: to.upstream_commit,
    counts,
    rules
  };
}

export function loadSnapshotIndex() {
  const index = readJson("conformance/snapshots/index.json");
  const schema = readJson("conformance/schema/snapshot-index.schema.json");
  assertSchema(index, schema, "snapshot index");
  return index;
}

export function loadSnapshots(index) {
  const schema = readJson("conformance/schema/upstream-snapshot.schema.json");
  const snapshots = new Map();
  for (const entry of index.snapshots) {
    const snapshot = readJson(entry.path);
    assertSchema(snapshot, schema, "upstream snapshot " + entry.snapshot_id);
    if (snapshot.snapshot_id !== entry.snapshot_id) {
      throw new Error(entry.path + ": snapshot_id does not match index entry");
    }
    if (snapshot.retention.role !== entry.role) {
      throw new Error(entry.path + ": retention role does not match index entry");
    }
    if (snapshots.has(snapshot.snapshot_id)) {
      throw new Error("duplicate snapshot_id: " + snapshot.snapshot_id);
    }
    snapshots.set(snapshot.snapshot_id, snapshot);
  }
  return snapshots;
}

export function buildCompatibilityHistory() {
  const index = loadSnapshotIndex();
  const snapshots = loadSnapshots(index);
  const current = snapshots.get(index.current_snapshot_id);
  if (!current || current.retention.role !== "current") {
    throw new Error("current_snapshot_id must reference the current snapshot");
  }
  const comparisons = index.comparison_pairs.map((pair) => {
    const from = snapshots.get(pair.from_snapshot_id);
    const to = snapshots.get(pair.to_snapshot_id);
    if (!from || !to) throw new Error("comparison pair references an unknown snapshot");
    return compareSnapshots(from, to);
  });
  return {
    schema_version: "codex-scope.compatibility-history.v1",
    agent: "codex",
    generated_from: "conformance/snapshots/index.json",
    comparisons
  };
}
