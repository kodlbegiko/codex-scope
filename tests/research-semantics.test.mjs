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
  assert.deepEqual(parsed.counts, { pass: 12, fail: 0 });

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

  const provenance = parsed.results.find(
    (item) => item.probe_id === "gemini.trust.provenance_precedence",
  );
  const precedenceCase = provenance.actual.cases.find(
    (item) => item.id === "ide-precedes-file",
  );
  assert.deepEqual(precedenceCase.actual, {
    outcome: "resolved",
    is_trusted: false,
    source: "ide",
  });
  const unknownCase = provenance.actual.cases.find(
    (item) => item.id === "no-trust-source",
  );
  assert.equal(unknownCase.actual.outcome, "unresolved");

  const userProject = parsed.results.find((item) => item.probe_id === "gemini.instructions.user_project_memory_precedence");
  assert.deepEqual(userProject.actual.cases.preferred, ["fixtures/gemini-research/user-project-memory/preferred/MEMORY.md"]);
  assert.deepEqual(userProject.actual.cases.legacy, ["fixtures/gemini-research/user-project-memory/legacy/GEMINI.md"]);

  const extension = parsed.results.find((item) => item.probe_id === "gemini.instructions.extension_memory_snapshot");
  assert.equal(extension.actual.execution_attempted, false);
  assert.equal(extension.actual.classification, "conditional");

  const mcp = parsed.results.find((item) => item.probe_id === "gemini.instructions.mcp_runtime_boundary");
  assert.deepEqual(mcp.actual, { declared: true, classification: "unsupported", execution_attempted: false, effective_content_resolved: false });

  const imports = parsed.results.find((item) => item.probe_id === "gemini.instructions.memory_import_fail_closed");
  assert.deepEqual(imports.actual.candidates, ["./shared.md"]);
  assert.equal(imports.actual.classification, "unresolved");
  assert.equal(imports.actual.expanded, false);

  const includeDirectories = parsed.results.find(
    (item) => item.probe_id === "gemini.config.include_directories_concat",
  );
  assert.deepEqual(includeDirectories.actual.trusted, [
    "/system/defaults/dir",
    "/user/dir1",
    "/user/dir2",
    "/workspace/dir",
    "/system/dir",
  ]);
  assert.deepEqual(includeDirectories.actual.untrusted, [
    "/system/defaults/dir",
    "/user/dir1",
    "/user/dir2",
    "/system/dir",
  ]);

  const folderTrust = parsed.results.find(
    (item) => item.probe_id === "gemini.config.folder_trust_explicit_precedence",
  );
  assert.deepEqual(folderTrust.actual.cases, [
    { id: "workspace-over-user-when-trusted", value: false },
    { id: "workspace-excluded-when-untrusted", value: true },
    { id: "system-overrides-workspace", value: true },
  ]);
});
