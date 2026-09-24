import { loadSnapshotIndex, loadSnapshots } from "./observatory-lib.mjs";

try {
  const index = loadSnapshotIndex();
  const snapshots = loadSnapshots(index);
  const currentEntries = index.snapshots.filter((entry) => entry.role === "current");
  if (currentEntries.length !== 1) throw new Error("snapshot index must contain exactly one current snapshot");
  if (currentEntries[0].snapshot_id !== index.current_snapshot_id) {
    throw new Error("current snapshot entry must match current_snapshot_id");
  }
  for (const [id, snapshot] of snapshots) {
    if (snapshot.retention.immutable !== true) throw new Error(id + ": retained snapshots must be immutable");
    const ids = new Set();
    for (const rule of snapshot.semantic_rules) {
      if (ids.has(rule.rule_id)) throw new Error(id + ": duplicate rule_id " + rule.rule_id);
      ids.add(rule.rule_id);
      if (rule.semantic_signature.expected_outcome !== rule.expected_outcome) {
        throw new Error(id + ": semantic_signature expected_outcome mismatch for " + rule.rule_id);
      }
    }
  }
  console.log("observatory snapshots: valid (" + snapshots.size + " retained snapshots)");
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
