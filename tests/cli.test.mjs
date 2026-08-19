import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("dist/cli.js");

function run(args, env = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("inspect --json emits versioned machine contract", () => {
  const project = path.resolve("fixtures/demo/conflict/project");
  const home = path.resolve("fixtures/demo/conflict/home");
  const result = run([
    "inspect",
    "--cwd",
    project,
    "--codex-home",
    home,
    "--profile",
    "dev",
    "--trust",
    "trusted",
    "--invocation-complete",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.schemaVersion, "codex-scope.v0.1");
  assert.equal(parsed.command, "inspect");
  assert.equal(parsed.result.config.approval_policy.effectiveValue, "on-request");
});

test("why explains winner and shadowed sources", () => {
  const project = path.resolve("fixtures/demo/conflict/project");
  const home = path.resolve("fixtures/demo/conflict/home");
  const result = run([
    "why",
    "approval_policy",
    "--cwd",
    project,
    "--codex-home",
    home,
    "--profile",
    "dev",
    "--trust",
    "trusted",
    "--invocation-complete",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /approval_policy = on-request/);
  assert.match(result.stdout, /shadowed/);
  assert.match(result.stdout, /\.codex\/config\.toml/);
  assert.match(result.stdout, /dev\.config\.toml/);
});

test("secret-like values are redacted in terminal and JSON", () => {
  const project = path.resolve("fixtures/config/secret/project");
  const home = path.resolve("fixtures/config/secret/home");
  for (const json of [false, true]) {
    const args = [
      "config",
      "--cwd",
      project,
      "--codex-home",
      home,
      "--trust",
      "trusted",
      "--invocation-complete",
    ];
    if (json) args.push("--json");
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /sk-do-not-print-me/);
    assert.match(result.stdout, /\[REDACTED\]/);
  }
});

test("malformed config produces useful failure and non-zero status", () => {
  const project = path.resolve("fixtures/config/malformed/project");
  const home = path.resolve("fixtures/config/malformed/home");
  const result = run([
    "config",
    "--cwd",
    project,
    "--codex-home",
    home,
    "--trust",
    "trusted",
    "--invocation-complete",
  ]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Could not parse/);
  assert.match(result.stderr, /stopped configuration resolution instead of guessing/);
});

test("inspection does not execute discovered hooks", () => {
  const base = path.resolve("fixtures/demo/conflict");
  const hooksPath = path.join(base, "project", ".codex", "hooks.json");
  const marker = path.join(base, "HOOK_EXECUTED");
  fs.rmSync(marker, { force: true });
  fs.writeFileSync(hooksPath, JSON.stringify({ SessionStart: [{ command: `touch ${marker}` }] }, null, 2));
  try {
    const result = run([
      "inspect",
      "--cwd",
      path.join(base, "project"),
      "--codex-home",
      path.join(base, "home"),
      "--trust",
      "trusted",
      "--invocation-complete",
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(marker), false);
  } finally {
    fs.rmSync(hooksPath, { force: true });
    fs.rmSync(marker, { force: true });
  }
});

test("all four core commands execute offline against deterministic fixture", () => {
  const project = path.resolve("fixtures/demo/conflict/project");
  const home = path.resolve("fixtures/demo/conflict/home");
  const common = ["--cwd", project, "--codex-home", home, "--trust", "trusted", "--invocation-complete"];
  for (const args of [
    ["inspect", ...common],
    ["instructions", ...common],
    ["config", ...common],
    ["why", "approval_policy", ...common],
  ]) {
    const result = run(args);
    assert.equal(result.status, 0, `${args[0]} failed: ${result.stderr}`);
  }
});


test("all four core commands emit versioned JSON", () => {
  const project = path.resolve("fixtures/demo/conflict/project");
  const home = path.resolve("fixtures/demo/conflict/home");
  const common = [
    "--cwd",
    project,
    "--codex-home",
    home,
    "--trust",
    "trusted",
    "--invocation-complete",
    "--json",
  ];
  for (const args of [
    ["inspect", ...common],
    ["instructions", ...common],
    ["config", ...common],
    ["why", "approval_policy", ...common],
  ]) {
    const result = run(args);
    assert.equal(result.status, 0, `${args[0]} failed: ${result.stderr}`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.schemaVersion, "codex-scope.v0.1");
  }
});

test("parse errors do not echo malformed secret values", () => {
  const base = path.resolve("fixtures/config/secret-parse-error");
  const project = path.join(base, "project");
  const home = path.join(base, "home");
  fs.rmSync(base, { recursive: true, force: true });
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.mkdirSync(path.join(project, ".codex"), { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(project, ".codex", "config.toml"), "api_key = sk-super-secret-value,\n");
  try {
    const result = run([
      "config",
      "--cwd",
      project,
      "--codex-home",
      home,
      "--trust",
      "trusted",
      "--invocation-complete",
    ]);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stderr, /sk-super-secret-value/);
    assert.match(result.stderr, /value omitted for safety/);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
