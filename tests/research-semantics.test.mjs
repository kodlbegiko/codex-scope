import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("Gemini research semantic probes are deterministic", () => {
  const result = spawnSync(
    process.execPath,
    [path.resolve("scripts/research-gemini-semantics.mjs"), "--json"],
    { encoding: "utf8", env: { ...process.env } },
  );

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(
    parsed.schema_version,
    "codex-scope.agent-research-probe-run.v1",
  );
  assert.deepEqual(parsed.counts, { pass: 5, fail: 0 });

  const jit = parsed.results.find(
    (item) => item.probe_id === "gemini.instructions.jit_target",
  );
  assert.deepEqual(jit.actual.active, []);
  assert.deepEqual(jit.actual.conditional, [
    "fixtures/gemini-research/hierarchy/project/packages/app/GEMINI.md",
  ]);

  const untrusted = parsed.results.find(
    (item) =>
      item.probe_id === "gemini.trust.untrusted_workspace_settings",
  );
  assert.equal(untrusted.actual.trusted, false);
  assert.equal(untrusted.actual.context_file_name, "GEMINI.md");
});
