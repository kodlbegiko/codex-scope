import fs from "node:fs";
import { assertSchema, readJson, writeJson } from "./conformance-lib.mjs";

const manifest = readJson("conformance/manifest.json");
const regressions = readJson("conformance/regressions.json");
const pkg = readJson("package.json");
const matrixSchema = readJson("conformance/schema/compatibility.schema.json");

function readAdapterVersion() {
  const source = fs.readFileSync("src/adapters/codex.ts", "utf8");
  const match = source.match(/export const CODEX_ADAPTER_VERSION = "([^"]+)";/);
  if (!match) throw new Error("Could not read CODEX_ADAPTER_VERSION from src/adapters/codex.ts");
  return match[1];
}

function generateMatrix() {
  const byOutcome = (outcome) =>
    manifest.rules.filter((rule) => rule.expected_outcome === outcome).map((rule) => rule.rule_id).sort();

  return {
    schema_version: "codex-scope.compatibility.v1",
    codex_scope_version: pkg.version,
    resolver_version: manifest.resolver_version,
    adapter_version: readAdapterVersion(),
    evidence_date: manifest.evidence_date,
    tested_codex_version: manifest.upstream.tested_codex_version,
    tested_upstream_commit: manifest.upstream.commit,
    supported_rules: byOutcome("compatible"),
    unsupported_rules: byOutcome("unsupported"),
    unresolved_rules: byOutcome("unresolved"),
    unknown_areas: [
      "automatic local Codex version detection",
      "cloud-managed configuration defaults and enforcement",
      "managed requirements.toml semantics",
      "Windows system configuration location",
      "full TOML 1.0 grammar",
      "hooks semantics and execution",
      "MCP, plugins, and rules merge semantics",
      "runtime/model/remote configuration state"
    ],
    known_regressions: regressions.cases.map((item) => ({
      regression_id: item.regression_id,
      rule_id: item.rule_id,
      kind: item.kind,
      expected_result: item.expected_result
    })),
    known_upstream_discrepancies: [
      {
        id: "openai/codex#34193",
        status: "open",
        summary: "AGENTS.md can be duplicated when CODEX_HOME is also the project root.",
        evidence_url: "https://github.com/openai/codex/issues/34193",
        verified_against_commit: manifest.upstream.commit
      }
    ],
    generated_from: ["conformance/manifest.json", "conformance/regressions.json", "package.json", "src/adapters/codex.ts"]
  };
}

const generated = generateMatrix();
assertSchema(generated, matrixSchema, "compatibility matrix");
const rendered = JSON.stringify(generated, null, 2) + "\n";
const target = "conformance/compatibility-matrix.json";

if (process.argv.includes("--write")) {
  writeJson(target, generated);
  console.log("compatibility matrix: wrote " + target);
} else if (process.argv.includes("--check")) {
  if (!fs.existsSync(target)) {
    console.error("compatibility matrix: missing " + target);
    process.exit(1);
  }
  const existing = fs.readFileSync(target, "utf8");
  if (existing !== rendered) {
    console.error("compatibility matrix: stale; run npm run conformance:matrix");
    process.exit(1);
  }
  console.log("compatibility matrix: current");
} else {
  process.stdout.write(rendered);
}
