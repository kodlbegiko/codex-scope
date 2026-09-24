import { assertSchema, readJson } from "./conformance-lib.mjs";

try {
  const findings = readJson("conformance/upstream-findings.json");
  const schema = readJson("conformance/schema/upstream-findings.schema.json");
  assertSchema(findings, schema, "upstream findings");
  const ids = new Set();
  for (const finding of findings.findings) {
    if (ids.has(finding.finding_id)) throw new Error("duplicate finding_id: " + finding.finding_id);
    ids.add(finding.finding_id);
    if (finding.discovered_date < "2026-09-24") {
      throw new Error(finding.finding_id + ": v0.4 finding predates 2026-09-24");
    }
  }
  console.log("upstream findings: valid (" + findings.findings.length + ")");
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
