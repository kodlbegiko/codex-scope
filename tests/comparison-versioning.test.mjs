import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  COMPARISON_SCHEMA_VERSION,
  NORMALIZATION_VERSION,
  validateComparisonDocument,
} = require("../dist/comparison.js");
const {
  COMPARISON_CI_SCHEMA_VERSION,
} = require("../dist/comparison-ci.js");
const {
  COMPARISON_CLI_SCHEMA_VERSION,
} = require("../dist/compare-cli.js");
const {
  CODEX_ADAPTER_VERSION,
} = require("../dist/adapters/codex.js");
const {
  GEMINI_ADAPTER_VERSION,
} = require("../dist/adapters/gemini.js");

test("comparison version contract separates public schemas from adapters and legacy JSON", () => {
  const contract = JSON.parse(
    fs.readFileSync(
      path.resolve("conformance/comparison/version-contract.json"),
      "utf8",
    ),
  );

  assert.deepEqual(contract, {
    schema_version: "codex-scope.comparison-version-contract.v1",
    legacy_json_schema: "codex-scope.v0.1",
    comparison_schema: COMPARISON_SCHEMA_VERSION,
    normalization_version: NORMALIZATION_VERSION,
    ci_summary_schema: COMPARISON_CI_SCHEMA_VERSION,
    cli_envelope_schema: COMPARISON_CLI_SCHEMA_VERSION,
    codex_adapter_version: CODEX_ADAPTER_VERSION,
    gemini_adapter_version: GEMINI_ADAPTER_VERSION,
    migration_policy: "no_silent_mutation",
    future_version_policy: "fail_closed",
    comparison_vs_legacy: "separate"
  });

  const distinct = [
    contract.comparison_schema,
    contract.normalization_version,
    contract.ci_summary_schema,
    contract.cli_envelope_schema,
    contract.codex_adapter_version,
    contract.gemini_adapter_version,
  ];
  assert.equal(new Set(distinct).size, distinct.length);
});

test("unknown future comparison schema versions fail closed", () => {
  const demo = JSON.parse(
    fs.readFileSync(
      path.resolve("conformance/comparison/codex-gemini-demo.json"),
      "utf8",
    ),
  );
  demo.schema_version = "codex-scope.semantic-comparison.v2";
  assert.throws(
    () => validateComparisonDocument(demo),
    /schema_version must be codex-scope\.semantic-comparison\.v1/,
  );
});
