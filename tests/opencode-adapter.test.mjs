import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  opencodeAdapter,
  OPENCODE_ADAPTER_VERSION,
  OPENCODE_EVIDENCE_REVISION,
} = require("../dist/adapters/opencode.js");
const { inspectWithAdapter } = require("../dist/core.js");

const rawOptions = JSON.parse(
  fs.readFileSync(path.resolve("fixtures/opencode/adapter-options.json"), "utf8"),
);

function fixtureOptions(overrides = {}) {
  return {
    ...rawOptions,
    ...overrides,
  };
}

function inspect(overrides = {}) {
  return inspectWithAdapter(opencodeAdapter, fixtureOptions(overrides));
}

// ASSERT: opencode.instructions.project_upward
// ASSERT: opencode.instructions.nested_directory_applicability
// ASSERT: opencode.instructions.global_agents
// ASSERT: opencode.instructions.custom_config_dir_precedence
// ASSERT: opencode.instructions.deduplicate_paths
// ASSERT: opencode.instructions.project_read_failure
// ASSERT: opencode.instructions.project_config_disabled
// ASSERT: opencode.instructions.outside_project_root
// ASSERT: opencode.instructions.claude_compatibility_fallback
// ASSERT: opencode.config.remote_base_precedence
// ASSERT: opencode.config.global_overrides_remote
// ASSERT: opencode.config.custom_overrides_global
// ASSERT: opencode.config.project_overrides_custom
// ASSERT: opencode.config.inline_overrides_project
// ASSERT: opencode.config.deep_merge
// ASSERT: opencode.config.instructions_concat_dedup
// ASSERT: opencode.config.snapshot_completeness
// ASSERT: opencode.instructions.custom_local_pattern
// ASSERT: opencode.permissions.declaration_order
// ASSERT: opencode.permissions.last_matching_rule
// ASSERT: opencode.permissions.wildcard_patterns
// ASSERT: opencode.permissions.session_approvals
// ASSERT: opencode.runtime.remote_config
// ASSERT: opencode.instructions.remote_url
// ASSERT: opencode.runtime.plugins
// ASSERT: opencode.runtime.mcp
// ASSERT: opencode.runtime.managed_account_org
// ASSERT: opencode.version.supplied
// ASSERT: opencode.version.detected
// ASSERT: opencode.version.unknown
// ASSERT: opencode.version.outside_evidence

test("OpenCode adapter exposes only the bounded deterministic contract", () => {
  assert.equal(opencodeAdapter.id, "opencode");
  assert.equal(opencodeAdapter.adapterVersion, OPENCODE_ADAPTER_VERSION);
  assert.deepEqual(opencodeAdapter.capabilities, {
    instructions: true,
    config: true,
    trust: false,
    versionDetection: "none",
    runtimeNetworkRequired: false,
    subprocessRequired: false,
  });
  assert.equal(opencodeAdapter.evidence.upstreamCommit, OPENCODE_EVIDENCE_REVISION);
  assert.equal(opencodeAdapter.evidence.testedUpstreamVersion, "unknown");
});

test("OpenCode resolves explicit custom/global/project AGENTS hierarchy without duplicates", () => {
  const inspection = inspect();
  const custom = path.resolve("fixtures/opencode/custom/AGENTS.md");
  const ordinaryGlobal = path.resolve("fixtures/opencode/global/AGENTS.md");
  const project = path.resolve("fixtures/opencode/project/AGENTS.md");
  const nested = path.resolve(
    "fixtures/opencode/project/packages/app/AGENTS.md",
  );

  assert.equal(inspection.result.boundedInstructionState, "resolved");
  assert.deepEqual(inspection.result.activeInstructionPaths, [
    custom,
    project,
    nested,
  ]);
  assert.equal(inspection.result.activeInstructionPaths.includes(ordinaryGlobal), false);
  assert.equal(
    new Set(inspection.result.activeInstructionPaths).size,
    inspection.result.activeInstructionPaths.length,
  );

  const fallback = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "claude-compatibility-fallback",
  );
  assert.equal(fallback?.status, "unresolved");
});

test("OpenCode fails closed for explicit instruction unavailability, disable state, and root containment", () => {
  const unavailable = path.resolve(
    "fixtures/opencode/project/packages/app/AGENTS.md",
  );
  const readFailure = inspect({
    instructionUnavailablePaths: [unavailable],
  });
  assert.equal(readFailure.result.boundedInstructionState, "unresolved");
  assert.equal(
    readFailure.records.find((record) => record.subject === unavailable)?.status,
    "unresolved",
  );

  const disabled = inspect({ disableProjectInstructions: true });
  assert.deepEqual(disabled.result.activeInstructionPaths, [
    path.resolve("fixtures/opencode/custom/AGENTS.md"),
  ]);
  assert.equal(
    disabled.records.find(
      (record) => record.subject === "project-instructions-disabled",
    )?.status,
    "resolved",
  );

  const outside = inspect({
    cwd: path.resolve("fixtures/opencode/global"),
  });
  assert.equal(outside.result.boundedInstructionState, "unresolved");
  assert.equal(
    outside.records.find(
      (record) => record.subject === "project-applicability",
    )?.status,
    "unresolved",
  );
});

test("OpenCode replays explicit config snapshot precedence, deep merge, concat/dedup, and redaction", () => {
  const inspection = inspect();
  assert.equal(inspection.result.boundedConfigState, "resolved");
  assert.equal(inspection.result.effectiveConfig.model, "inline/model");
  assert.deepEqual(inspection.result.effectiveConfig.nested, {
    remote: true,
    winner: "inline",
    global: true,
    custom: true,
    project: true,
    inline: true,
  });
  assert.deepEqual(inspection.result.effectiveConfig.instructions, [
    "docs/base.md",
    "docs/global.md",
    "docs/custom.md",
    "CONTRIBUTING.md",
    ".cursor/rules/*.md",
    "https://example.invalid/shared.md",
  ]);
  assert.equal(
    inspection.result.effectiveConfig.provider.example.options.apiKey,
    "[REDACTED]",
  );
  assert.equal(
    JSON.stringify(inspection).includes("sanitized-fixture-secret"),
    false,
  );

  const model = inspection.records.find(
    (record) => record.surface === "config" && record.subject === "model",
  );
  assert.equal(model?.provenance.winner?.scope, "inline");

  const remoteInstruction = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "https://example.invalid/shared.md",
  );
  assert.equal(remoteInstruction?.status, "unsupported");
  assert.deepEqual(remoteInstruction?.value, {
    declaration: "https://example.invalid/shared.md",
    fetched: false,
  });

  const glob = inspection.records.find(
    (record) =>
      record.surface === "instructions" &&
      record.subject === ".cursor/rules/*.md",
  );
  assert.equal(glob?.status, "unresolved");
});

test("OpenCode leaves partial config snapshots unresolved rather than treating missing layers as empty", () => {
  const inspection = inspect({
    configSnapshots: {
      completeness: "partial",
      project: "fixtures/opencode/config/project.json",
    },
  });
  assert.equal(inspection.result.boundedConfigState, "unresolved");
  assert.equal(
    inspection.records.find(
      (record) =>
        record.surface === "config" && record.subject === "bounded-snapshot",
    )?.status,
    "unresolved",
  );
});

test("OpenCode preserves permission declaration order and last-match wildcard semantics", () => {
  const inspection = inspect({
    permissionQueries: [
      {
        id: "git-status",
        permission: "bash",
        pattern: "git status --porcelain",
      },
      {
        id: "git-push",
        permission: "bash",
        pattern: "git push origin main",
      },
      {
        id: "edit-ts",
        permission: "edit",
        pattern: "src/a.ts",
      },
      {
        id: "read-env-example",
        permission: "read",
        pattern: "local.env.example",
      },
      {
        id: "read-env",
        permission: "read",
        pattern: "local.env",
      },
    ],
  });

  assert.deepEqual(
    inspection.result.permissionRules.map((rule) => [
      rule.permission,
      rule.pattern,
      rule.action,
    ]),
    [
      ["*", "*", "ask"],
      ["bash", "*", "ask"],
      ["bash", "git *", "allow"],
      ["bash", "git push *", "deny"],
      ["edit", "*", "deny"],
      ["edit", "src/*.ts", "allow"],
      ["read", "*", "allow"],
      ["read", "*.env", "deny"],
      ["read", "*.env.example", "allow"],
    ],
  );
  assert.deepEqual(
    Object.fromEntries(
      inspection.result.permissionEvaluations.map((item) => [
        item.id,
        item.action,
      ]),
    ),
    {
      "git-status": "allow",
      "git-push": "deny",
      "edit-ts": "allow",
      "read-env-example": "allow",
      "read-env": "deny",
    },
  );
  assert.equal(
    inspection.records.find(
      (record) =>
        record.surface === "permissions" &&
        record.subject === "session-approvals",
    )?.status,
    "conditional",
  );
});

test("OpenCode runtime-only and executable surfaces stay conditional or unsupported", () => {
  const inspection = inspect();
  const expected = {
    "remote-config-live": "conditional",
    plugins: "unsupported",
    mcp: "unsupported",
    "managed-account-org": "conditional",
  };
  for (const [subject, status] of Object.entries(expected)) {
    assert.equal(
      inspection.records.find(
        (record) =>
          record.surface === "runtime" && record.subject === subject,
      )?.status,
      status,
    );
  }
});

test("OpenCode version provenance distinguishes supplied, detected, unknown, and outside evidence", () => {
  const supplied = inspect().result.version;
  assert.deepEqual(supplied, {
    state: "supplied",
    value: "1.0.0",
    evidenceRevision: OPENCODE_EVIDENCE_REVISION,
  });

  const detected = inspect({
    version: {
      source: "detected",
      value: "1.0.0",
      evidenceRevision: OPENCODE_EVIDENCE_REVISION,
    },
  });
  assert.equal(detected.result.version.state, "detected");
  assert.equal(
    detected.records.find(
      (record) =>
        record.surface === "version" && record.subject === "opencode-version",
    )?.status,
    "conditional",
  );

  assert.equal(inspect({ version: undefined }).result.version.state, "unknown");

  assert.equal(
    inspect({
      version: {
        source: "supplied",
        value: "future",
        evidenceRevision: "1111111111111111111111111111111111111111",
      },
    }).result.version.state,
    "outside_evidence",
  );
});

test("OpenCode inspection is stable for identical explicit inputs", () => {
  const first = inspect({
    permissionQueries: [
      { id: "git-status", permission: "bash", pattern: "git status" },
    ],
  });
  const second = inspect({
    permissionQueries: [
      { id: "git-status", permission: "bash", pattern: "git status" },
    ],
  });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("OpenCode assertion ledger remains bound to implemented tests", () => {
  const assertions = JSON.parse(
    fs.readFileSync(
      path.resolve("conformance/research/opencode/assertions.json"),
      "utf8",
    ),
  );
  const source = fs.readFileSync(new URL(import.meta.url), "utf8");
  for (const assertion of assertions.assertions) {
    assert.match(source, new RegExp("ASSERT: " + assertion.rule_id.replaceAll(".", "\\.")));
    assert.equal(
      assertion.implementation_test,
      "tests/opencode-adapter.test.mjs#" + assertion.rule_id,
    );
  }
});
