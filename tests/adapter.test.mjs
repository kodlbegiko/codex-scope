import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const { codexAdapter, CODEX_ADAPTER_VERSION } = require("../dist/adapters/codex.js");
const { inspectWithAdapter } = require("../dist/core.js");
const { buildEnvironment } = require("../dist/environment.js");
const { renderConfig, renderInspect, renderInstructions, renderJson, renderWhy } = require("../dist/render.js");

function fixtureOptions() {
  return {
    cwd: path.resolve("fixtures/demo/conflict/project"),
    codexHome: path.resolve("fixtures/demo/conflict/home"),
    trust: "trusted",
    invocationComplete: true,
    profile: "dev",
    cliOverrides: [],
    systemConfigPath: path.resolve("conformance/__missing_system_config.toml"),
    managedConfigPaths: [],
  };
}

test("Codex adapter declares a static deterministic contract", () => {
  assert.equal(codexAdapter.id, "codex");
  assert.equal(codexAdapter.adapterVersion, CODEX_ADAPTER_VERSION);
  assert.deepEqual(codexAdapter.capabilities, {
    instructions: true,
    config: true,
    trust: true,
    versionDetection: "none",
    runtimeNetworkRequired: false,
    subprocessRequired: false,
  });
  assert.equal(codexAdapter.evidence.testedUpstreamVersion, "unknown");
  assert.match(codexAdapter.evidence.upstreamCommit, /^[0-9a-f]{40}$/);
  assert.ok(codexAdapter.evidence.references.includes("conformance/manifest.json"));
});

test("neutral inspection records retain Codex provenance without changing the legacy result", () => {
  const options = fixtureOptions();
  const inspection = inspectWithAdapter(codexAdapter, options);
  const legacy = buildEnvironment(options);

  assert.deepEqual(inspection.result, legacy);
  assert.equal(inspection.agent, "codex");
  assert.equal(inspection.adapterVersion, CODEX_ADAPTER_VERSION);

  const instruction = inspection.records.find(
    (record) => record.surface === "instructions" && record.status === "resolved",
  );
  assert.ok(instruction);
  assert.ok(instruction.provenance.winner?.path);

  const approval = inspection.records.find(
    (record) => record.surface === "config" && record.subject === "approval_policy",
  );
  assert.ok(approval);
  assert.equal(approval.status, "resolved");
  assert.equal(approval.value, "on-request");
  assert.ok(approval.provenance.winner);
});

test("neutral instruction records retain report-level uncertainty", () => {
  const options = { ...fixtureOptions(), invocationComplete: false };
  const inspection = inspectWithAdapter(codexAdapter, options);
  const instruction = inspection.records.find(
    (record) => record.surface === "instructions" && record.subject.endsWith("AGENTS.md"),
  );

  assert.ok(instruction);
  assert.equal(inspection.result.instructions.state, "unresolved");
  assert.equal(instruction.status, "unresolved");
  assert.equal(instruction.provenance.winner, undefined);
  assert.equal(instruction.provenance.conditional.length, 1);
  assert.match(instruction.missingInformation.join(" "), /invocation/i);
});

test("v0.1 renderers remain byte-for-byte identical through the adapter seam", () => {
  const options = fixtureOptions();
  const viaEnvironment = buildEnvironment(options);
  const viaAdapter = inspectWithAdapter(codexAdapter, options).result;

  assert.equal(renderInspect(viaEnvironment), renderInspect(viaAdapter));
  assert.equal(renderInstructions(viaEnvironment), renderInstructions(viaAdapter));
  assert.equal(renderConfig(viaEnvironment), renderConfig(viaAdapter));
  assert.equal(renderWhy(viaEnvironment, "approval_policy"), renderWhy(viaAdapter, "approval_policy"));

  for (const [command, key] of [
    ["inspect", undefined],
    ["instructions", undefined],
    ["config", undefined],
    ["why", "approval_policy"],
  ]) {
    const legacyJson = renderJson(viaEnvironment, command, key);
    const adapterJson = renderJson(viaAdapter, command, key);
    assert.equal(legacyJson, adapterJson);

    const parsed = JSON.parse(adapterJson);
    assert.equal(parsed.schemaVersion, "codex-scope.v0.1");
    assert.equal(Object.prototype.hasOwnProperty.call(parsed, "records"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(parsed, "adapterVersion"), false);
  }
});
