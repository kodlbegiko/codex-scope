import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("dist/cli.js");
const codexInput = "fixtures/comparison/cli-codex-input.json";
const geminiInput = "fixtures/comparison/cli-gemini-input.json";

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env },
  });
}

function compareArgs(codex = codexInput, gemini = geminiInput) {
  return [
    "compare",
    "codex",
    "gemini",
    "--codex-input",
    codex,
    "--gemini-input",
    gemini,
    "--json",
  ];
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function withTempInput(prefix, value, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-compare-"));
  const file = path.join(directory, prefix + ".json");
  fs.writeFileSync(
    file,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
  try {
    return callback(file);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("compare codex gemini emits the versioned JSON-only comparison envelope", () => {
  const result = run(compareArgs());

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const parsed = JSON.parse(result.stdout);
  assert.equal(
    parsed.schema_version,
    "codex-scope.semantic-comparison-cli.v1",
  );
  assert.equal(
    parsed.comparison.schema_version,
    "codex-scope.semantic-comparison.v1",
  );
  assert.equal(
    parsed.comparison.normalization_version,
    "codex-scope.semantic-normalization.v1",
  );
  assert.equal(
    parsed.ci_summary.schema_version,
    "codex-scope.semantic-comparison-ci.v1",
  );
  assert.equal(parsed.ci_summary.outcome, "unresolved");
  assert.deepEqual(parsed.comparison.counts, {
    same: 0,
    semantically_equivalent: 2,
    behaviorally_different: 1,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 1,
    total: 4,
  });
});

test("compare JSON is byte-stable and preserves stable comparison ordering", () => {
  const first = run(compareArgs());
  const second = run(compareArgs());
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  const parsed = JSON.parse(first.stdout);
  const ids = parsed.comparison.comparisons.map((item) => item.comparison_id);
  assert.deepEqual(ids, [...ids].sort());
});

test("checked-in compare CLI snapshot detects stale public JSON output", () => {
  const result = run(compareArgs());
  assert.equal(result.status, 0, result.stderr);
  const expected = fs.readFileSync(
    path.resolve("conformance/comparison/cli-codex-gemini.json"),
    "utf8",
  );
  assert.equal(result.stdout, expected);
});

test("malformed Codex input is a sanitized JSON tool_error", () => {
  withTempInput("codex", '{"secret":"sk-do-not-print-me",', (file) => {
    const result = run(compareArgs(file, geminiInput));
    assert.equal(result.status, 2);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /sk-do-not-print-me/);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.comparison, null);
    assert.equal(parsed.ci_summary.outcome, "tool_error");
    assert.equal(
      parsed.ci_summary.schema_version,
      "codex-scope.semantic-comparison-ci.v1",
    );
  });
});

test("malformed Gemini input is a sanitized JSON tool_error", () => {
  withTempInput("gemini", '{"secret":"gm-do-not-print-me",', (file) => {
    const result = run(compareArgs(codexInput, file));
    assert.equal(result.status, 2);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /gm-do-not-print-me/);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.comparison, null);
    assert.equal(parsed.ci_summary.outcome, "tool_error");
  });
});

test("unsupported agent name and missing explicit input fail closed", () => {
  const unsupported = run([
    "compare",
    "codex",
    "claude",
    "--codex-input",
    codexInput,
    "--gemini-input",
    geminiInput,
    "--json",
  ]);
  assert.equal(unsupported.status, 2);
  assert.equal(JSON.parse(unsupported.stdout).ci_summary.outcome, "tool_error");

  const missing = run([
    "compare",
    "codex",
    "gemini",
    "--codex-input",
    codexInput,
    "--json",
  ]);
  assert.equal(missing.status, 2);
  assert.equal(JSON.parse(missing.stdout).ci_summary.outcome, "tool_error");
});

test("unknown future compare input schema versions are rejected", () => {
  const input = readJson(codexInput);
  input.schema_version = "codex-scope.compare-input.codex.v2";
  withTempInput("codex", input, (file) => {
    const result = run(compareArgs(file, geminiInput));
    assert.equal(result.status, 2);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.comparison, null);
    assert.equal(parsed.ci_summary.outcome, "tool_error");
    assert.match(parsed.ci_summary.reason, /unsupported schema_version/);
  });
});

test("unknown Codex trust remains unresolved instead of becoming a difference", () => {
  const input = readJson(codexInput);
  input.options.trust = "unknown";
  withTempInput("codex", input, (file) => {
    const result = run(compareArgs(file, geminiInput));
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ci_summary.outcome, "unresolved");
    const trust = parsed.comparison.comparisons.find(
      (item) => item.comparison_id === "trust.workspace-state",
    );
    assert.equal(trust.classification, "unresolved");
    assert.equal(trust.left.status, "unresolved");
  });
});

test("omitted Gemini folder-trust evidence remains unresolved", () => {
  const input = readJson(geminiInput);
  input.options.trustInputs = {};
  withTempInput("gemini", input, (file) => {
    const result = run(compareArgs(codexInput, file));
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ci_summary.outcome, "unresolved");
    const trust = parsed.comparison.comparisons.find(
      (item) => item.comparison_id === "trust.workspace-state",
    );
    assert.equal(trust.classification, "unresolved");
    assert.equal(trust.right.status, "unresolved");
  });
});

test("compare JSON covers resolved difference, semantic equivalence, and evidence gap without collapsing them", () => {
  const result = run(compareArgs());
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  const byId = Object.fromEntries(
    parsed.comparison.comparisons.map((item) => [item.comparison_id, item]),
  );
  assert.equal(
    byId["instructions.active-project-filenames"].classification,
    "behaviorally_different",
  );
  assert.equal(
    byId["instructions.project-entrypoint-exists"].classification,
    "semantically_equivalent",
  );
  assert.equal(
    byId["runtime.mcp-effective-instructions"].classification,
    "evidence_gap",
  );
});

test("compare JSON preserves adapter, upstream, rule, reference, and source provenance", () => {
  const result = run(compareArgs());
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  for (const item of parsed.comparison.comparisons) {
    assert.equal(item.evidence.left.adapter_version, "codex-adapter.v1");
    assert.equal(item.evidence.right.adapter_version, "gemini-adapter.v1");
    assert.match(item.evidence.left.upstream_commit, /^[0-9a-f]{40}$/);
    assert.match(item.evidence.right.upstream_commit, /^[0-9a-f]{40}$/);
    assert.ok(item.evidence.left.rule_ids.length > 0);
    assert.ok(item.evidence.right.rule_ids.length > 0);
    assert.ok(item.evidence.left.references.length > 0);
    assert.ok(item.evidence.right.references.length > 0);
  }
  const filenames = parsed.comparison.comparisons.find(
    (item) => item.comparison_id === "instructions.active-project-filenames",
  );
  assert.ok(filenames.provenance.left.length > 0);
  assert.ok(filenames.provenance.right.length > 0);
});

test("compare JSON does not leak the absolute checkout path", () => {
  const result = run(compareArgs());
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes(path.resolve(process.cwd())), false);
});

test("compare CLI schema is separate from legacy v0.1 JSON and references frozen comparison contracts", () => {
  const schema = readJson("conformance/schema/semantic-comparison-cli.schema.json");
  assert.equal(schema.additionalProperties, false);
  assert.equal(
    schema.properties.schema_version.const,
    "codex-scope.semantic-comparison-cli.v1",
  );
  assert.equal(
    schema.properties.comparison.anyOf[1].$ref,
    "semantic-comparison.schema.json",
  );
  assert.equal(
    schema.properties.ci_summary.$ref,
    "semantic-comparison-ci.schema.json",
  );

  const legacy = run([
    "inspect",
    "--cwd",
    "fixtures/demo/conflict/project",
    "--codex-home",
    "fixtures/demo/conflict/home",
    "--profile",
    "dev",
    "--trust",
    "trusted",
    "--invocation-complete",
    "--json",
  ]);
  assert.equal(legacy.status, 0, legacy.stderr);
  assert.equal(JSON.parse(legacy.stdout).schemaVersion, "codex-scope.v0.1");
});

test("compare implementation contains no network, model, or subprocess execution path", () => {
  const source = fs.readFileSync(path.resolve("src/compare-cli.ts"), "utf8");
  for (const forbidden of [
    "child_process",
    "spawn(",
    "spawnSync(",
    "exec(",
    "execFile(",
    "fetch(",
    "http.request",
    "https.request",
    "openai",
    "anthropic",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "compare CLI contains forbidden execution surface: " + forbidden,
    );
  }
});
