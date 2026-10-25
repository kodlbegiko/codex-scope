import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { resolveConfig } = require("../dist/config.js");
const {
  permissionProfileRecords,
  projectlessPermissionDefaultsBoundary,
} = require("../dist/permissions.js");

function tempOptions(configText, extra = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-october-"));
  const codexHome = path.join(temp, "codex-home");
  const project = path.join(temp, "project");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.writeFileSync(path.join(codexHome, "config.toml"), configText);
  return {
    cwd: project,
    codexHome,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [],
    ...extra,
  };
}

function permissionRecord(configText, extra = {}) {
  const result = resolveConfig(tempOptions(configText, extra));
  return permissionProfileRecords(result.values)[0];
}

test("explicit built-in permission profile has deterministic static identity", () => {
  const record = permissionRecord('default_permissions = ":workspace"\n');
  assert.equal(record.status, "resolved");
  assert.deepEqual(record.value, {
    id: ":workspace",
    kind: "builtin",
    staticSandboxIdentity: "workspace-write",
  });
});

test("named permission profile preserves explicit inheritance chain", () => {
  const record = permissionRecord(
    'default_permissions = "child"\n' +
      '[permissions.base]\n' +
      'extends = ":read-only"\n' +
      '[permissions.child]\n' +
      'extends = "base"\n',
  );
  assert.equal(record.status, "resolved");
  assert.deepEqual(record.value, {
    id: "child",
    kind: "named",
    extends: "base",
    inheritance: ["child", "base", ":read-only"],
  });
});

test("unknown default permission profile fails closed", () => {
  const result = resolveConfig(tempOptions('default_permissions = "missing"\n'));
  assert.throws(
    () => permissionProfileRecords(result.values),
    /default_permissions refers to undefined profile missing/,
  );
});

test("unsupported built-in inheritance parent fails closed", () => {
  const result = resolveConfig(
    tempOptions(
      'default_permissions = "custom"\n' +
        '[permissions.custom]\n' +
        'extends = ":danger-full-access"\n',
    ),
  );
  assert.throws(
    () => permissionProfileRecords(result.values),
    /extends unsupported built-in parent :danger-full-access/,
  );
});

test("permission profile inheritance cycles fail closed", () => {
  const result = resolveConfig(
    tempOptions(
      'default_permissions = "a"\n' +
        '[permissions.a]\n' +
        'extends = "b"\n' +
        '[permissions.b]\n' +
        'extends = "a"\n',
    ),
  );
  assert.throws(
    () => permissionProfileRecords(result.values),
    /inheritance cycle detected: a -> b -> a/,
  );
});

test("incomplete invocation keeps explicit permission selection unresolved", () => {
  const record = permissionRecord('default_permissions = ":read-only"\n', {
    invocationComplete: false,
  });
  assert.equal(record.status, "unresolved");
  assert.match(record.missingInformation.join(" "), /invocation/i);
});

test("sandbox_mode and default_permissions invocation overrides fail closed together", () => {
  const result = resolveConfig(
    tempOptions("", {
      cliOverrides: [
        'sandbox_mode="workspace-write"',
        'default_permissions=":workspace"',
      ],
    }),
  );
  assert.throws(
    () => permissionProfileRecords(result.values),
    /does not allow sandbox_mode and default_permissions invocation overrides together/,
  );
});

test("implicit permission selection remains unresolved instead of inferred", () => {
  const record = permissionRecord("");
  assert.equal(record.status, "unresolved");
  assert.match(record.reason, /does not infer/);
});

test("overridden CODEX_HOME does not isolate a separate cwd project .codex layer", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-home-converse-"));
  const home = path.join(temp, "home");
  const defaultHomeDotCodex = path.join(home, ".codex");
  const activeCodexHome = path.join(temp, "isolated-codex-home");
  fs.mkdirSync(defaultHomeDotCodex, { recursive: true });
  fs.mkdirSync(activeCodexHome, { recursive: true });
  fs.writeFileSync(
    path.join(defaultHomeDotCodex, "config.toml"),
    'approval_policy = "never"\n',
  );
  fs.writeFileSync(
    path.join(activeCodexHome, "config.toml"),
    'approval_policy = "on-request"\n',
  );

  const result = resolveConfig({
    cwd: home,
    codexHome: activeCodexHome,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [],
  });

  assert.equal(result.projectRoot, home);
  assert.deepEqual(result.projectConfigPaths, [
    path.join(defaultHomeDotCodex, "config.toml"),
  ]);
  assert.equal(result.values.approval_policy.effectiveValue, "never");
  assert.equal(result.values.approval_policy.winner?.type, "project");
  assert.equal(result.values.approval_policy.shadowed[0]?.type, "user");
});

test("projectless trust and permission defaults remain an explicit runtime boundary", () => {
  const record = projectlessPermissionDefaultsBoundary();
  assert.equal(record.status, "unsupported");
  assert.match(record.reason, /does not simulate projectless TUI\/session/);
  assert.match(record.missingInformation.join(" "), /saved trust/);
});
