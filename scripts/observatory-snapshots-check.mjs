import { readJson } from "./conformance-lib.mjs";
import { loadSnapshotIndex, loadSnapshots } from "./observatory-lib.mjs";

function sortedRuleIds(snapshot, outcome) {
  return snapshot.semantic_rules
    .filter((rule) => rule.expected_outcome === outcome)
    .map((rule) => rule.rule_id)
    .sort();
}

function assertSameArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(label + " does not match semantic_rules");
  }
}

try {
  const index = loadSnapshotIndex();
  const snapshots = loadSnapshots(index);
  const currentEntries = index.snapshots.filter((entry) => entry.role === "current");
  if (currentEntries.length !== 1) {
    throw new Error("snapshot index must contain exactly one current snapshot");
  }
  if (currentEntries[0].snapshot_id !== index.current_snapshot_id) {
    throw new Error("current snapshot entry must match current_snapshot_id");
  }

  for (const [id, snapshot] of snapshots) {
    if (snapshot.retention.immutable !== true) {
      throw new Error(id + ": retained snapshots must be immutable");
    }
    const ids = new Set();
    for (const rule of snapshot.semantic_rules) {
      if (ids.has(rule.rule_id)) {
        throw new Error(id + ": duplicate rule_id " + rule.rule_id);
      }
      ids.add(rule.rule_id);
      if (rule.semantic_signature.expected_outcome !== rule.expected_outcome) {
        throw new Error(
          id + ": semantic_signature expected_outcome mismatch for " + rule.rule_id,
        );
      }
    }
    assertSameArray(
      snapshot.compatibility_boundary.supported_rules,
      sortedRuleIds(snapshot, "compatible"),
      id + ": supported compatibility boundary",
    );
    assertSameArray(
      snapshot.compatibility_boundary.unsupported_rules,
      sortedRuleIds(snapshot, "unsupported"),
      id + ": unsupported compatibility boundary",
    );
    assertSameArray(
      snapshot.compatibility_boundary.unresolved_rules,
      sortedRuleIds(snapshot, "unresolved"),
      id + ": unresolved compatibility boundary",
    );
  }

  const manifest = readJson("conformance/manifest.json");
  const current = snapshots.get(index.current_snapshot_id);
  const currentRules = new Map(
    current.semantic_rules.map((rule) => [rule.rule_id, rule]),
  );
  for (const manifestRule of manifest.rules) {
    const snapshotRule = currentRules.get(manifestRule.rule_id);
    if (!snapshotRule) {
      throw new Error(
        index.current_snapshot_id +
          ": current snapshot is missing manifest rule " +
          manifestRule.rule_id,
      );
    }
    const expectedSignature = {
      expected_outcome: manifestRule.expected_outcome,
      expected_behavior: manifestRule.expected_behavior,
      supported_boundary: manifestRule.supported_boundary,
      unsupported_boundary: manifestRule.unsupported_boundary,
    };
    if (snapshotRule.expected_outcome !== manifestRule.expected_outcome) {
      throw new Error(
        index.current_snapshot_id +
          ": current snapshot outcome is stale for " +
          manifestRule.rule_id,
      );
    }
    if (
      JSON.stringify(snapshotRule.semantic_signature) !==
      JSON.stringify(expectedSignature)
    ) {
      throw new Error(
        index.current_snapshot_id +
          ": current snapshot semantic signature is stale for " +
          manifestRule.rule_id,
      );
    }
  }

  console.log(
    "observatory snapshots: valid (" +
      snapshots.size +
      " retained snapshots; current covers " +
      manifest.rules.length +
      " manifest rules)",
  );
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
