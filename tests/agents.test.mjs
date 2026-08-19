import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const { buildEnvironment } = require("../dist/environment.js");

const root = path.resolve("fixtures/agents");

function env(caseName, relativeCwd, extra = {}) {
  const base = path.join(root, caseName);
  return buildEnvironment({
    cwd: path.join(base, "project", relativeCwd),
    codexHome: path.join(base, "home"),
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    ...extra,
  });
}

test("global + root + child override discovery and provenance", () => {
  const result = env("root-child", "frontend");
  const active = result.instructions.active.map((source) => source.filename);
  assert.deepEqual(active, ["AGENTS.md", "AGENTS.md", "AGENTS.override.md"]);
  const ordinary = result.instructions.sources.find(
    (source) => source.path.endsWith(path.join("frontend", "AGENTS.md")),
  );
  assert.equal(ordinary?.state, "ignored");
  assert.match(ordinary?.reason ?? "", /wins filename discovery precedence/);
});

test("empty project override blocks same-directory AGENTS fallback", () => {
  const result = env("empty-override", "child");
  const override = result.instructions.sources.find((source) => source.filename === "AGENTS.override.md");
  const agents = result.instructions.sources.find((source) => source.filename === "AGENTS.md");
  assert.equal(override?.state, "ignored");
  assert.match(override?.reason ?? "", /Selected by existence precedence/);
  assert.equal(agents?.state, "ignored");
  assert.equal(result.instructions.active.length, 0);
});

test("configured fallback filename is discovered", () => {
  const result = env("fallback", "child");
  assert.deepEqual(result.instructions.fallbackFilenames, ["TEAM.md"]);
  assert.equal(result.instructions.active.at(-1)?.filename, "TEAM.md");
});

test("project instruction byte limit is cumulative root to cwd", () => {
  const result = env("size-limit", "child");
  const projectActive = result.instructions.active.filter((source) => source.scope === "project");
  assert.equal(result.instructions.totalProjectBytes, 10);
  assert.equal(projectActive[0].includedBytes, 9);
  assert.equal(projectActive[1].includedBytes, 1);
  assert.equal(projectActive[1].truncated, true);
});

test("unknown invocation state is explicit for instruction discovery", () => {
  const base = path.join(root, "root-child");
  const result = buildEnvironment({
    cwd: path.join(base, "project", "frontend"),
    codexHome: path.join(base, "home"),
    trust: "trusted",
    invocationComplete: false,
    cliOverrides: [],
  });
  assert.equal(result.instructions.state, "unresolved");
  assert.ok(result.instructions.missingInformation.length > 0);
});
