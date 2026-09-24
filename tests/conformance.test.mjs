import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const conformanceScript = path.resolve("scripts/conformance-check.mjs");

function copyCorpus() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-conformance-error-"));
  fs.cpSync(path.resolve("conformance"), path.join(temporaryRoot, "conformance"), { recursive: true });
  fs.cpSync(path.resolve("fixtures"), path.join(temporaryRoot, "fixtures"), { recursive: true });
  return temporaryRoot;
}

function runJson(cwd = process.cwd()) {
  return spawnSync(process.execPath, [conformanceScript, "--json"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env },
  });
}

test("conformance JSON reports expected and actual outcomes separately", () => {
  const result = runJson();

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.schema_version, "codex-scope.conformance-run.v1");
  assert.equal(parsed.adapter_version, "codex-adapter.v1");
  assert.deepEqual(parsed.counts, {
    compatible: 42,
    behavior_drift: 0,
    unsupported: 3,
    unresolved: 5,
    tool_error: 0,
  });
  assert.equal(parsed.results.length, 50);

  const unknownVersion = parsed.results.find(
    (item) => item.rule_id === "codex.compatibility.unknown_version",
  );
  assert.equal(unknownVersion.expected_outcome, "unresolved");
  assert.equal(unknownVersion.actual_outcome, "unresolved");
  assert.deepEqual(unknownVersion.details, []);
});

test("conformance JSON reports tool_error when a corpus file cannot be loaded", () => {
  const temporaryRoot = copyCorpus();
  fs.unlinkSync(path.join(temporaryRoot, "conformance", "manifest.json"));

  const result = runJson(temporaryRoot);
  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.schema_version, "codex-scope.conformance-run.v1");
  assert.equal(parsed.adapter_version, "codex-adapter.v1");
  assert.equal(parsed.resolver_version, "unknown");
  assert.equal(parsed.counts.tool_error, 1);
  assert.match(parsed.error, /ENOENT/);
});

test("conformance JSON error serialization does not depend on valid manifest metadata", () => {
  const temporaryRoot = copyCorpus();
  const manifestPath = path.join(temporaryRoot, "conformance", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.upstream;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  const result = runJson(temporaryRoot);
  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.schema_version, "codex-scope.conformance-run.v1");
  assert.equal(parsed.tested_upstream_commit, "unknown");
  assert.equal(parsed.tested_codex_version, "unknown");
  assert.equal(parsed.counts.tool_error, 1);
  assert.match(parsed.error, /missing required property upstream/);
});

test("conformance rejects a regression fixture binding that drifts from its manifest rule", () => {
  const temporaryRoot = copyCorpus();
  const regressionsPath = path.join(temporaryRoot, "conformance", "regressions.json");
  const regressions = JSON.parse(fs.readFileSync(regressionsPath, "utf8"));
  regressions.cases[0].test_binding.fixture_path = "fixtures/__wrong_regression_fixture__";
  fs.writeFileSync(regressionsPath, JSON.stringify(regressions, null, 2) + "\n");

  const result = runJson(temporaryRoot);
  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);
  assert.match(parsed.error, /fixture_path must match manifest fixture/);
});

test("conformance rejects regression metadata that does not pin its exact upstream commit", () => {
  const temporaryRoot = copyCorpus();
  const regressionsPath = path.join(temporaryRoot, "conformance", "regressions.json");
  const regressions = JSON.parse(fs.readFileSync(regressionsPath, "utf8"));
  regressions.cases[0].evidence = ["https://github.com/openai/codex/issues/9932"];
  fs.writeFileSync(regressionsPath, JSON.stringify(regressions, null, 2) + "\n");

  const result = runJson(temporaryRoot);
  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);
  assert.match(parsed.error, /evidence does not pin upstream_commit/);
});
