import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { codexAdapter } = require("../dist/adapters/codex.js");
const { geminiAdapter } = require("../dist/adapters/gemini.js");
const {
  compareInspections,
} = require("../dist/comparison-normalization.js");
const {
  CODEX_GEMINI_COMPARISON_DIMENSIONS,
} = require("../dist/comparison-profiles/codex-gemini.js");
const {
  validateComparisonDocument,
} = require("../dist/comparison.js");
const {
  summarizeComparisonForCi,
} = require("../dist/comparison-ci.js");
const {
  sanitizeComparisonDocumentPaths,
  serializeComparisonDocument,
} = require("../dist/comparison-output.js");
const { inspectWithAdapter } = require("../dist/core.js");

const repositoryRoot = path.resolve(process.cwd());
const expectedPath = path.resolve(
  "conformance/comparison/codex-gemini-demo.json",
);
const expectedCiPath = path.resolve(
  "conformance/comparison/codex-gemini-demo-ci.json",
);

function codexOptions() {
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

function geminiOptions() {
  return JSON.parse(
    fs.readFileSync(
      path.resolve("fixtures/gemini-adapter/adapter-options.json"),
      "utf8",
    ),
  );
}

function generateDemo() {
  const raw = compareInspections(
    inspectWithAdapter(codexAdapter, codexOptions()),
    inspectWithAdapter(geminiAdapter, geminiOptions()),
    CODEX_GEMINI_COMPARISON_DIMENSIONS,
  );
  const sanitized = sanitizeComparisonDocumentPaths(raw, repositoryRoot);
  validateComparisonDocument(sanitized);
  const comparisonOutput = serializeComparisonDocument(sanitized);
  const ciSummary = summarizeComparisonForCi(sanitized);
  const ciOutput = JSON.stringify(ciSummary, null, 2) + "\n";
  return { comparisonOutput, ciOutput };
}

const { comparisonOutput, ciOutput } = generateDemo();
if (
  comparisonOutput.includes(repositoryRoot) ||
  ciOutput.includes(repositoryRoot)
) {
  throw new Error("sanitized comparison demo leaked the checkout path");
}

if (process.argv.includes("--check")) {
  const checks = [
    {
      path: expectedPath,
      label: "comparison demo",
      marker: "----- generated comparison demo -----",
      output: comparisonOutput,
    },
    {
      path: expectedCiPath,
      label: "comparison CI summary",
      marker: "----- generated comparison CI summary -----",
      output: ciOutput,
    },
  ];

  for (const check of checks) {
    if (!fs.existsSync(check.path)) {
      console.error(check.label + " snapshot is missing");
      console.error(check.marker);
      console.error(check.output);
      process.exit(1);
    }
    const expected = fs.readFileSync(check.path, "utf8");
    if (expected !== check.output) {
      console.error(check.label + " snapshot is stale");
      console.error(check.marker);
      console.error(check.output);
      process.exit(1);
    }
  }

  const ciSummary = JSON.parse(ciOutput);
  console.log(
    "comparison:demo:check: ok (schema, provenance, sanitization, deterministic snapshots; ci_outcome=" +
      ciSummary.outcome +
      ")",
  );
} else if (process.argv.includes("--ci")) {
  process.stdout.write(ciOutput);
} else {
  process.stdout.write(comparisonOutput);
}
