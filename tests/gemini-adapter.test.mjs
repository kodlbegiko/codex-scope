import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  geminiAdapter,
  GEMINI_ADAPTER_VERSION,
} = require("../dist/adapters/gemini.js");
const { inspectWithAdapter } = require("../dist/core.js");

const options = JSON.parse(
  fs.readFileSync(
    path.resolve("fixtures/gemini-adapter/adapter-options.json"),
    "utf8",
  ),
);

test("Gemini adapter exposes only the authorized deterministic subset", () => {
  const inspection = inspectWithAdapter(geminiAdapter, options);

  assert.equal(inspection.agent, "gemini");
  assert.equal(inspection.adapterVersion, GEMINI_ADAPTER_VERSION);
  assert.deepEqual(inspection.capabilities, {
    instructions: true,
    config: true,
    trust: true,
    versionDetection: "none",
    runtimeNetworkRequired: false,
    subprocessRequired: false,
  });
  assert.equal(
    inspection.evidence.upstreamCommit,
    "62364cb2000795537a6895261b37ec668e4cf527",
  );

  const trust = inspection.records.find(
    (record) =>
      record.surface === "trust" && record.subject === "workspace_trust",
  );
  assert.ok(trust);
  assert.equal(trust.status, "resolved");
  assert.equal(trust.value, true);
  assert.equal(trust.provenance.winner?.scope, "env");

  const contextFileName = inspection.records.find(
    (record) =>
      record.surface === "config" && record.subject === "context.fileName",
  );
  assert.ok(contextFileName);
  assert.equal(contextFileName.status, "resolved");
  assert.deepEqual(contextFileName.value, ["AGENTS.md", "GEMINI.md"]);

  const omittedFolderTrust = inspection.records.find(
    (record) =>
      record.surface === "config" &&
      record.subject === "security.folderTrust.enabled",
  );
  assert.ok(omittedFolderTrust);
  assert.equal(omittedFolderTrust.status, "unresolved");

  const activePaths = inspection.records
    .filter(
      (record) =>
        record.surface === "instructions" &&
        record.status === "resolved" &&
        record.subject !== "user-project-memory",
    )
    .map((record) => record.subject);
  assert.ok(
    activePaths.includes(
      path.resolve(
        "fixtures/gemini-research/hierarchy/home/.gemini/GEMINI.md",
      ),
    ),
  );
  assert.ok(
    activePaths.includes(
      path.resolve("fixtures/gemini-research/hierarchy/project/GEMINI.md"),
    ),
  );

  const jit = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject ===
        path.resolve(
          "fixtures/gemini-research/hierarchy/project/packages/app/GEMINI.md",
        ),
  );
  assert.ok(jit);
  assert.equal(jit.status, "conditional");

  const userMemory = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "user-project-memory",
  );
  assert.ok(userMemory);
  assert.equal(userMemory.status, "resolved");
  assert.deepEqual(userMemory.value, [
    path.resolve(
      "fixtures/gemini-research/user-project-memory/preferred/MEMORY.md",
    ),
  ]);

  const extensionMemory = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "extension-memory",
  );
  assert.ok(extensionMemory);
  assert.equal(extensionMemory.status, "conditional");
  assert.deepEqual(extensionMemory.value, [
    path.resolve(
      "fixtures/gemini-research/extension-memory/active-a/GEMINI.md",
    ),
    path.resolve(
      "fixtures/gemini-research/extension-memory/active-b/GEMINI.md",
    ),
  ]);

  const mcp = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "mcp-instructions",
  );
  assert.ok(mcp);
  assert.equal(mcp.status, "unsupported");

  const imports = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject ===
        path.resolve("fixtures/gemini-research/imports/GEMINI.md"),
  );
  assert.ok(imports);
  assert.equal(imports.status, "unresolved");
  assert.deepEqual(imports.value, {
    candidates: ["./shared.md"],
    expanded: false,
  });
});

test("Gemini adapter leaves trust unresolved when folder-trust default is omitted", () => {
  const inspection = inspectWithAdapter(geminiAdapter, {
    ...options,
    trustInputs: {},
  });
  const trust = inspection.records.find(
    (record) =>
      record.surface === "trust" && record.subject === "workspace_trust",
  );
  assert.ok(trust);
  assert.equal(trust.status, "unresolved");
  assert.equal(trust.value, undefined);
});
