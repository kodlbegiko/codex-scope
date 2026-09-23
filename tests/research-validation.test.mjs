import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = path.resolve("scripts/research-gemini-check.mjs");
const sourceManifest = path.resolve(
  "conformance/research/gemini-cli/manifest.json",
);

function run(manifestPath = sourceManifest) {
  return spawnSync(process.execPath, [script, "--manifest", manifestPath], {
    encoding: "utf8",
    env: { ...process.env },
  });
}

function withManifest(mutator, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-research-"));
  const manifestPath = path.join(tempDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(sourceManifest, "utf8"));
  mutator(manifest);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  try {
    callback(manifestPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("Gemini research corpus passes deterministic validation", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /research:gemini:validate: ok/);
  assert.match(result.stdout, /adapter_readiness=blocked/);
});

test("Gemini research validation rejects duplicate rule ids", () => {
  withManifest(
    (manifest) => {
      manifest.rules.push({ ...manifest.rules[0] });
    },
    (manifestPath) => {
      const result = run(manifestPath);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /duplicate rule_id/);
    },
  );
});

test("Gemini research validation rejects missing fixtures", () => {
  withManifest(
    (manifest) => {
      manifest.rules[0].fixture_path =
        "fixtures/gemini-research/__missing_fixture__";
    },
    (manifestPath) => {
      const result = run(manifestPath);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /fixture path does not exist/);
    },
  );
});

test("Gemini research validation keeps readiness blocked by open blockers", () => {
  withManifest(
    (manifest) => {
      manifest.adapter_readiness = "ready_for_implementation";
    },
    (manifestPath) => {
      const result = run(manifestPath);
      assert.equal(result.status, 1);
      assert.match(
        result.stderr,
        /adapter_readiness must remain blocked/,
      );
    },
  );
});
