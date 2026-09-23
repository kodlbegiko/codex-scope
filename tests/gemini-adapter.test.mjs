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


test("Gemini adapter applies trust-gated CONCAT and scalar settings precedence", () => {
  const includeBase = "fixtures/gemini-research/settings/include-directories";
  const settings = {
    systemDefaults: path.resolve(includeBase, "system-defaults.json"),
    user: path.resolve(includeBase, "user.json"),
    workspace: path.resolve(includeBase, "workspace.json"),
    system: path.resolve(includeBase, "system.json"),
  };

  const trusted = inspectWithAdapter(geminiAdapter, {
    ...options,
    settings,
    trustInputs: { envWorkspace: "true" },
  });
  const trustedIncludes = trusted.records.find(
    (record) =>
      record.surface === "config" &&
      record.subject === "context.includeDirectories",
  );
  assert.ok(trustedIncludes);
  assert.equal(trustedIncludes.status, "resolved");
  assert.deepEqual(trustedIncludes.value, [
    "/system/defaults/dir",
    "/user/dir1",
    "/user/dir2",
    "/workspace/dir",
    "/system/dir",
  ]);

  const untrusted = inspectWithAdapter(geminiAdapter, {
    ...options,
    settings,
    trustInputs: { envWorkspace: "false" },
  });
  const untrustedIncludes = untrusted.records.find(
    (record) =>
      record.surface === "config" &&
      record.subject === "context.includeDirectories",
  );
  assert.ok(untrustedIncludes);
  assert.equal(untrustedIncludes.status, "resolved");
  assert.deepEqual(untrustedIncludes.value, [
    "/system/defaults/dir",
    "/user/dir1",
    "/user/dir2",
    "/system/dir",
  ]);
});

test("Gemini adapter preserves explicit Folder Trust settings precedence", () => {
  const cases = JSON.parse(
    fs.readFileSync(
      path.resolve(
        "fixtures/gemini-research/settings/folder-trust-explicit/cases.json",
      ),
      "utf8",
    ),
  );

  for (const item of cases.cases) {
    const tempDir = fs.mkdtempSync(
      path.join(process.cwd(), ".tmp-gemini-folder-trust-"),
    );
    try {
      const settings = {};
      for (const [name, value] of Object.entries(item.layers)) {
        const filePath = path.join(tempDir, name + ".json");
        fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
        settings[
          name === "system_defaults"
            ? "systemDefaults"
            : name
        ] = filePath;
      }

      const inspection = inspectWithAdapter(geminiAdapter, {
        ...options,
        settings,
        trustInputs: {
          envWorkspace: item.trusted ? "true" : "false",
        },
      });
      const record = inspection.records.find(
        (candidate) =>
          candidate.surface === "config" &&
          candidate.subject === "security.folderTrust.enabled",
      );
      assert.ok(record, item.id);
      assert.equal(record.status, "resolved", item.id);
      assert.equal(record.value, item.expected, item.id);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test("Gemini adapter uses explicit user-project memory fallback and trust provenance", () => {
  const legacyDirectory = path.resolve(
    "fixtures/gemini-research/user-project-memory/legacy",
  );
  const inspection = inspectWithAdapter(geminiAdapter, {
    ...options,
    trustInputs: {
      folderTrustEnabled: true,
      ideTrust: true,
    },
    userProjectMemoryDirectory: legacyDirectory,
  });

  const trust = inspection.records.find(
    (record) =>
      record.surface === "trust" && record.subject === "workspace_trust",
  );
  assert.ok(trust);
  assert.equal(trust.status, "resolved");
  assert.equal(trust.value, true);
  assert.equal(trust.provenance.winner?.scope, "ide");

  const memory = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "user-project-memory",
  );
  assert.ok(memory);
  assert.deepEqual(memory.value, [
    path.join(legacyDirectory, "GEMINI.md"),
  ]);
});
