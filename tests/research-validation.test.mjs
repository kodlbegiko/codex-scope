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
const sourceCoverage = path.resolve("conformance/research/phase-2-coverage.json");
const sourceCodexManifest = path.resolve("conformance/manifest.json");
const sourceProbes = path.resolve("conformance/research/gemini-cli/probes.json");

function run(manifestPath = sourceManifest, realRepositoriesPath, options = {}) {
  const args = [script, "--manifest", manifestPath];
  if (realRepositoriesPath) args.push("--real-repositories", realRepositoriesPath);
  if (options.coveragePath) args.push("--coverage", options.coveragePath);
  if (options.codexManifestPath) {
    args.push("--codex-manifest", options.codexManifestPath);
  }
  if (options.probesPath) args.push("--probes", options.probesPath);
  return spawnSync(process.execPath, args, {
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

function withJson(sourcePath, mutator, callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-json-"));
  const targetPath = path.join(tempDir, path.basename(sourcePath));
  const value = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  mutator(value);
  fs.writeFileSync(targetPath, JSON.stringify(value, null, 2) + "\n");
  try {
    callback(targetPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function synchronizeCodexCoverage(coverage, codexManifest) {
  const rules = codexManifest.rules;
  coverage.calculation.codex_rule_fixture_cases = rules.length;
  coverage.codex.rule_fixture_cases = rules.length;
  coverage.codex.unique_fixture_paths = new Set(
    rules.map((rule) => rule.fixture.path),
  ).size;
  coverage.codex.unique_fixture_probe_shapes = new Set(
    rules.map((rule) =>
      JSON.stringify({ path: rule.fixture.path, probe: rule.fixture.probe }),
    ),
  ).size;
  coverage.codex.assertions = rules.reduce(
    (total, rule) => total + (rule.assertions?.length ?? 0),
    0,
  );
  coverage.codex.regression_rules = rules.filter(
    (rule) => rule.regression === true,
  ).length;
  coverage.codex.surfaces = {};
  for (const rule of rules) {
    coverage.codex.surfaces[rule.surface] =
      (coverage.codex.surfaces[rule.surface] ?? 0) + 1;
  }
  coverage.calculation.total =
    coverage.calculation.codex_rule_fixture_cases +
    coverage.calculation.gemini_research_cases;
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

test("Gemini research validation rejects fixture path traversal", () => {
  withManifest(
    (manifest) => {
      manifest.rules[0].fixture_path = "fixtures/../package.json";
    },
    (manifestPath) => {
      const result = run(manifestPath);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /fixture_path must remain inside fixtures/);
    },
  );
});

test("Gemini research validation rejects fixture root traversal", () => {
  withManifest(
    (manifest) => {
      manifest.fixture_roots[0] = "fixtures/../package.json";
    },
    (manifestPath) => {
      const result = run(manifestPath);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /fixture root must remain inside fixtures/);
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


test("Gemini research validation rejects fewer than three real repositories", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-real-repos-"));
  const ledgerPath = path.join(tempDir, "real-repositories.json");
  const source = JSON.parse(
    fs.readFileSync(
      path.resolve("conformance/research/gemini-cli/real-repositories.json"),
      "utf8",
    ),
  );
  source.validations = source.validations.slice(0, 2);
  fs.writeFileSync(ledgerPath, JSON.stringify(source, null, 2) + "\n");
  try {
    const result = run(sourceManifest, ledgerPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /at least 3 sanitized real repository validations/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});


test("Gemini research validation rejects stale Phase 2 total", () => {
  withJson(
    sourceCoverage,
    (coverage) => {
      coverage.calculation.total = 58;
    },
    (coveragePath) => {
      const result = run(sourceManifest, undefined, { coveragePath });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /coverage\.calculation\.total is stale/);
    },
  );
});

test("Gemini research validation rejects stale Codex coverage count", () => {
  withJson(
    sourceCoverage,
    (coverage) => {
      coverage.calculation.codex_rule_fixture_cases = 31;
    },
    (coveragePath) => {
      const result = run(sourceManifest, undefined, { coveragePath });
      assert.equal(result.status, 1);
      assert.match(
        result.stderr,
        /coverage\.calculation\.codex_rule_fixture_cases is stale/,
      );
    },
  );
});

test("Gemini research validation rejects stale Gemini case expansion", () => {
  withJson(
    sourceCoverage,
    (coverage) => {
      const entry = coverage.gemini.case_expansion.find(
        (item) => item.probe_id === "gemini.trust.provenance_precedence",
      );
      entry.cases = 8;
    },
    (coveragePath) => {
      const result = run(sourceManifest, undefined, { coveragePath });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /case_expansion\[5\]\.cases is stale/);
    },
  );
});

test("Gemini research validation rejects probe case_count drift", () => {
  withJson(
    sourceProbes,
    (document) => {
      const probe = document.probes.find(
        (item) => item.probe_id === "gemini.trust.provenance_precedence",
      );
      probe.expected.case_count = 8;
    },
    (probesPath) => {
      const result = run(sourceManifest, undefined, { probesPath });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /expected\.case_count is stale/);
    },
  );
});

test("Gemini research validation enforces the 50-case threshold", () => {
  withJson(
    sourceCodexManifest,
    (manifest) => {
      manifest.rules = manifest.rules.slice(0, 22);
    },
    (codexManifestPath) => {
      const reducedManifest = JSON.parse(
        fs.readFileSync(codexManifestPath, "utf8"),
      );
      withJson(
        sourceCoverage,
        (coverage) => {
          synchronizeCodexCoverage(coverage, reducedManifest);
          coverage.status = "fail";
        },
        (coveragePath) => {
          const result = run(sourceManifest, undefined, {
            coveragePath,
            codexManifestPath,
          });
          assert.equal(result.status, 1);
          assert.match(result.stderr, /below required threshold/);
        },
      );
    },
  );
});

test("Gemini research validation rejects dishonest pass below threshold", () => {
  withJson(
    sourceCodexManifest,
    (manifest) => {
      manifest.rules = manifest.rules.slice(0, 22);
    },
    (codexManifestPath) => {
      const reducedManifest = JSON.parse(
        fs.readFileSync(codexManifestPath, "utf8"),
      );
      withJson(
        sourceCoverage,
        (coverage) => {
          synchronizeCodexCoverage(coverage, reducedManifest);
          coverage.status = "pass";
        },
        (coveragePath) => {
          const result = run(sourceManifest, undefined, {
            coveragePath,
            codexManifestPath,
          });
          assert.equal(result.status, 1);
          assert.match(result.stderr, /dishonest or stale/);
        },
      );
    },
  );
});
