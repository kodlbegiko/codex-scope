import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { codexAdapter } = require("../dist/adapters/codex.js");
const { geminiAdapter } = require("../dist/adapters/gemini.js");
const {
  opencodeAdapter,
  OPENCODE_EVIDENCE_REVISION,
} = require("../dist/adapters/opencode.js");
const { inspectWithAdapter } = require("../dist/core.js");
const { renderJson } = require("../dist/render.js");

const allowedStatuses = new Set([
  "resolved",
  "unresolved",
  "unsupported",
  "ignored",
  "shadowed",
  "conditional",
  "available",
]);

function codexOptions(overrides = {}) {
  return {
    cwd: path.resolve("fixtures/demo/conflict/project"),
    codexHome: path.resolve("fixtures/demo/conflict/home"),
    trust: "trusted",
    invocationComplete: true,
    profile: "dev",
    cliOverrides: [],
    systemConfigPath: path.resolve("conformance/__missing_system_config.toml"),
    managedConfigPaths: [],
    ...overrides,
  };
}

const geminiBase = JSON.parse(
  fs.readFileSync(
    path.resolve("fixtures/gemini-adapter/adapter-options.json"),
    "utf8",
  ),
);
const opencodeBase = JSON.parse(
  fs.readFileSync(
    path.resolve("fixtures/opencode/adapter-options.json"),
    "utf8",
  ),
);

function inspect(adapter, options) {
  return inspectWithAdapter(adapter, options);
}

function assertSharedShape(adapter, inspection) {
  assert.equal(inspection.agent, adapter.id);
  assert.equal(inspection.adapterVersion, adapter.adapterVersion);
  assert.equal(inspection.capabilities.runtimeNetworkRequired, false);
  assert.equal(inspection.capabilities.subprocessRequired, false);
  assert.match(inspection.evidence.upstreamCommit, /^[0-9a-f]{40}$/);
  assert.ok(Array.isArray(inspection.evidence.references));
  assert.ok(inspection.evidence.references.length > 0);
  assert.ok(Array.isArray(inspection.records));

  for (const record of inspection.records) {
    assert.equal(record.agent, adapter.id);
    assert.equal(allowedStatuses.has(record.status), true, record.status);
    assert.equal(typeof record.surface, "string");
    assert.equal(typeof record.subject, "string");
    assert.equal(typeof record.reason, "string");
    assert.ok(Array.isArray(record.missingInformation));
    assert.ok(record.provenance && typeof record.provenance === "object");
    for (const key of ["shadowed", "ignored", "conditional"]) {
      assert.ok(Array.isArray(record.provenance[key]));
    }
  }
}

test("Codex, Gemini, and OpenCode satisfy the shared neutral adapter contract", () => {
  const cases = [
    [codexAdapter, codexOptions()],
    [geminiAdapter, geminiBase],
    [opencodeAdapter, opencodeBase],
  ];
  for (const [adapter, options] of cases) {
    const first = inspect(adapter, options);
    const second = inspect(adapter, options);
    assertSharedShape(adapter, first);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
  }
});

test("shared adapters fail closed on unresolved inputs without changing vocabulary", () => {
  const codex = inspect(codexAdapter, codexOptions({ invocationComplete: false }));
  const gemini = inspect(geminiAdapter, {
    ...geminiBase,
    trustInputs: {},
  });
  const opencode = inspect(opencodeAdapter, {
    ...opencodeBase,
    configSnapshots: {
      completeness: "partial",
      project: "fixtures/opencode/config/project.json",
    },
    version: undefined,
  });

  assert.ok(codex.records.some((record) => record.status === "unresolved"));
  assert.ok(gemini.records.some((record) => record.status === "unresolved"));
  assert.ok(opencode.records.some((record) => record.status === "unresolved"));
  assert.equal(opencode.result.version.state, "unknown");
  assert.equal(codex.evidence.testedUpstreamVersion, "unknown");
  assert.equal(gemini.evidence.testedUpstreamVersion, "unknown");
});

test("outside-evidence version state is explicit and never promoted to compatible static fact", () => {
  const inspection = inspect(opencodeAdapter, {
    ...opencodeBase,
    version: {
      source: "supplied",
      value: "future",
      evidenceRevision: "2222222222222222222222222222222222222222",
    },
  });
  assert.equal(inspection.result.version.state, "outside_evidence");
  const record = inspection.records.find(
    (item) => item.surface === "version" && item.subject === "opencode-version",
  );
  assert.equal(record?.status, "unresolved");
  assert.notEqual(
    inspection.result.version.evidenceRevision,
    OPENCODE_EVIDENCE_REVISION,
  );
});

test("unsupported/runtime-only syntax remains visible rather than silently ignored", () => {
  const gemini = inspect(geminiAdapter, geminiBase);
  const opencode = inspect(opencodeAdapter, opencodeBase);
  assert.equal(
    gemini.records.find((record) => record.subject === "mcp-instructions")?.status,
    "unsupported",
  );
  assert.equal(
    opencode.records.find(
      (record) => record.subject === "https://example.invalid/shared.md",
    )?.status,
    "unsupported",
  );
  assert.equal(
    opencode.records.find((record) => record.subject === "plugins")?.status,
    "unsupported",
  );
});

test("shared path handling stays deterministic and normalized", () => {
  const codex = inspect(codexAdapter, codexOptions());
  const gemini = inspect(geminiAdapter, geminiBase);
  const opencode = inspect(opencodeAdapter, opencodeBase);

  const codexInstruction = codex.records.find(
    (record) =>
      record.surface === "instructions" && record.provenance.winner?.path,
  );
  assert.ok(path.isAbsolute(codexInstruction.provenance.winner.path));
  assert.ok(gemini.result.activeInstructionPaths.every(path.isAbsolute));
  assert.ok(opencode.result.activeInstructionPaths.every(path.isAbsolute));
});

test("OpenCode bounded config redacts secret-like values before returning adapter results or records", () => {
  const inspection = inspect(opencodeAdapter, opencodeBase);
  const serialized = JSON.stringify(inspection);
  assert.equal(serialized.includes("sanitized-fixture-secret"), false);
  assert.equal(serialized.includes("[REDACTED]"), true);
});

test("Codex public JSON contract remains codex-scope.v0.1 and adapter metadata remains internal", () => {
  const inspection = inspect(codexAdapter, codexOptions());
  const parsed = JSON.parse(renderJson(inspection.result, "inspect"));
  assert.equal(parsed.schemaVersion, "codex-scope.v0.1");
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "records"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "adapterVersion"), false);
});
