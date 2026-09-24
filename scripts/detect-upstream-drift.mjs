import { buildCompatibilityHistory } from "./observatory-lib.mjs";

try {
  const history = buildCompatibilityHistory();
  let toolErrors = 0;
  for (const comparison of history.comparisons) {
    toolErrors += comparison.counts.tool_error;
    console.log(
      comparison.from_snapshot_id +
        " -> " +
        comparison.to_snapshot_id +
        ": " +
        Object.entries(comparison.counts)
          .map(([key, value]) => key + "=" + value)
          .join(" ")
    );
  }
  if (toolErrors > 0) process.exit(2);
} catch (error) {
  console.error("conformance drift: tool_error");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(2);
}
