import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const require = createRequire(import.meta.url);
const { buildCompatibilitySummary } = require("../dist/compatibility.js");

const cli = path.resolve("dist/cli.js");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env },
  });
}

test("compatibility summary keeps unknown Codex version unresolved", () => {
  const summary = buildCompatibilitySummary();

  assert.equal(summary.schemaVersion, "codex-scope.compatibility.v1");
  assert.equal(summary.agent, "codex");
  assert.equal(summary.adapterVersion, "codex-adapter.v1");
  assert.equal(summary.testedCodexVersion, "unknown");
  assert.equal(summary.inspectedCodexVersion, "unknown");
  assert.equal(summary.versionSource, "unknown");
  assert.equal(summary.versionOutcome, "unresolved");
  assert.equal(summary.localVersionProbe, "not_performed");
  assert.deepEqual(summary.rules, {
    supported: 25,
    unsupported: 3,
    unresolved: 4,
    total: 32,
  });
});

test("supplied version is recorded without false compatibility certainty", () => {
  const summary = buildCompatibilitySummary({ codexVersion: "0.999.0" });

  assert.equal(summary.inspectedCodexVersion, "0.999.0");
  assert.equal(summary.versionSource, "supplied");
  assert.equal(summary.versionOutcome, "unresolved");
  assert.match(summary.versionReason, /does not pin a tested Codex binary version/);
});

test("compatibility CLI exposes machine-readable evidence without probing a subprocess", () => {
  const result = run(["compatibility", "--json", "--codex-version", "0.999.0"]);

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.schemaVersion, "codex-scope.compatibility.v1");
  assert.equal(parsed.adapterVersion, "codex-adapter.v1");
  assert.equal(parsed.inspectedCodexVersion, "0.999.0");
  assert.equal(parsed.versionOutcome, "unresolved");
  assert.equal(parsed.localVersionProbe, "not_performed");
  assert.match(parsed.testedUpstreamCommit, /^[0-9a-f]{40}$/);
});

test("--codex-version is rejected outside compatibility command", () => {
  const result = run(["inspect", "--codex-version", "0.999.0"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /only valid with codex-scope compatibility/);
});
