import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const { resolveConfig } = require("../dist/config.js");
const { ConfigParseError } = require("../dist/errors.js");

const root = path.resolve("fixtures/config");

function options(caseName, relativeCwd = "", extra = {}) {
  const base = path.join(root, caseName);
  return {
    cwd: path.join(base, "project", relativeCwd),
    codexHome: path.join(base, "home"),
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(base, "missing-system.toml"),
    ...extra,
  };
}

test("config precedence: CLI > closest project > profile > user > system > default", () => {
  const result = resolveConfig(
    options("layering", "app", {
      profile: "dev",
      cliOverrides: ['approval_policy="never"'],
    }),
  );
  const approval = result.values.approval_policy;
  assert.equal(approval.state, "resolved");
  assert.equal(approval.effectiveValue, "never");
  assert.equal(approval.winner?.type, "cli");
  assert.equal(approval.shadowed[0]?.type, "project");
  assert.match(approval.shadowed[0]?.path ?? "", /app\/\.codex\/config\.toml$/);
  assert.equal(result.values.sandbox_mode.effectiveValue, "workspace-write");
  assert.equal(result.values.sandbox_mode.winner?.type, "profile");
});

test("closest project config wins over project root when trusted", () => {
  const result = resolveConfig(options("layering", "app", { profile: "dev" }));
  assert.equal(result.values.approval_policy.effectiveValue, "never");
  assert.match(result.values.approval_policy.winner?.path ?? "", /app\/\.codex\/config\.toml$/);
});

test("untrusted project config is ignored", () => {
  const result = resolveConfig(options("untrusted", "", { trust: "untrusted" }));
  const approval = result.values.approval_policy;
  assert.equal(approval.effectiveValue, "on-request");
  assert.equal(approval.winner?.type, "user");
  assert.equal(approval.ignored[0]?.type, "project");
});

test("unknown trust keeps project candidate conditional and final result unresolved", () => {
  const result = resolveConfig(options("untrusted", "", { trust: "unknown" }));
  const approval = result.values.approval_policy;
  assert.equal(approval.state, "unresolved");
  assert.equal(approval.effectiveValue, "on-request");
  assert.equal(approval.conditional[0]?.type, "project");
});

test("incomplete invocation state does not become false certainty", () => {
  const result = resolveConfig(options("untrusted", "", { trust: "untrusted", invocationComplete: false }));
  assert.equal(result.values.approval_policy.state, "unresolved");
  assert.match(result.values.approval_policy.missingInformation[0], /invocation/i);
});

test("system config participates below user config", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-system-"));
  const systemPath = path.join(temp, "config.toml");
  const home = path.join(temp, "home");
  const project = path.join(temp, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.writeFileSync(systemPath, 'approval_policy = "never"\n');
  const result = resolveConfig({
    cwd: project,
    codexHome: home,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: systemPath,
  });
  assert.equal(result.values.approval_policy.effectiveValue, "never");
  assert.equal(result.values.approval_policy.winner?.type, "system");
});

test("malformed TOML stops resolution instead of guessing", () => {
  assert.throws(() => resolveConfig(options("malformed")), ConfigParseError);
});

test("detected managed configuration prevents false resolved claims", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-managed-"));
  const home = path.join(temp, "home");
  const project = path.join(temp, "project");
  const managed = path.join(temp, "requirements.toml");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.writeFileSync(path.join(home, "config.toml"), 'approval_policy = "on-request"\n');
  fs.writeFileSync(managed, 'allowed_approval_policies = ["never"]\n');
  const result = resolveConfig({
    cwd: project,
    codexHome: home,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [managed],
  });
  assert.equal(result.values.approval_policy.state, "unresolved");
  assert.match(result.values.approval_policy.missingInformation.join(" "), /managed/i);
});

test("missing selected profile fails closed", () => {
  assert.throws(
    () => resolveConfig(options("untrusted", "", { profile: "does-not-exist" })),
    /Selected Codex profile file was not found/,
  );
});

test("later repeated CLI override wins", () => {
  const result = resolveConfig(
    options("untrusted", "", {
      trust: "untrusted",
      cliOverrides: ['approval_policy="on-request"', 'approval_policy="never"'],
    }),
  );
  assert.equal(result.values.approval_policy.effectiveValue, "never");
  assert.equal(result.values.approval_policy.winner?.type, "cli");
});

test("project-scoped protected machine-local keys are ignored even when trusted", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-protected-"));
  const home = path.join(temp, "home");
  const project = path.join(temp, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.mkdirSync(path.join(project, ".codex"), { recursive: true });
  fs.writeFileSync(path.join(home, "config.toml"), 'model_provider = "openai"\n');
  fs.writeFileSync(path.join(project, ".codex", "config.toml"), 'model_provider = "custom"\n');
  const result = resolveConfig({
    cwd: project,
    codexHome: home,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [],
  });
  assert.equal(result.values.model_provider.effectiveValue, "openai");
  assert.equal(result.values.model_provider.winner?.type, "user");
  assert.equal(result.values.model_provider.ignored[0]?.type, "project");
  assert.match(result.values.model_provider.ignored[0]?.reason ?? "", /ignores/);
});

test("unsupported config keys are labeled unsupported rather than claimed effective", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-unsupported-"));
  const home = path.join(temp, "home");
  const project = path.join(temp, "project");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.writeFileSync(path.join(home, "config.toml"), 'reasoning_effort = "high"\n');
  const result = resolveConfig({
    cwd: project,
    codexHome: home,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [],
  });
  assert.equal(result.values.reasoning_effort.state, "unsupported");
});

test("project_root_markers controls root detection and an empty list makes cwd the root", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-root-markers-"));
  const home = path.join(temp, "home");
  const project = path.join(temp, "repo");
  const child = path.join(project, "a", "b");
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(child, { recursive: true });
  fs.writeFileSync(path.join(project, ".scope-root"), "marker\n");
  fs.writeFileSync(path.join(home, "config.toml"), 'project_root_markers = [".scope-root"]\n');
  const custom = resolveConfig({
    cwd: child,
    codexHome: home,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [],
  });
  assert.equal(custom.projectRoot, project);

  const cwdRoot = resolveConfig({
    cwd: child,
    codexHome: home,
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: ['project_root_markers=[]'],
    systemConfigPath: path.join(temp, "missing-system.toml"),
    managedConfigPaths: [],
  });
  assert.equal(cwdRoot.projectRoot, child);
});
