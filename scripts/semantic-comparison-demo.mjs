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
  sanitizeComparisonDocumentPaths,
  serializeComparisonDocument,
} = require("../dist/comparison-output.js");
const { inspectWithAdapter } = require("../dist/core.js");

const repositoryRoot = path.resolve(process.cwd());
const expectedPath = path.resolve(
  "conformance/comparison/codex-gemini-demo.json",
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
  return serializeComparisonDocument(sanitized);
}

const output = generateDemo();
if (output.includes(repositoryRoot)) {
  throw new Error("sanitized comparison demo leaked the checkout path");
}

if (process.argv.includes("--check")) {
  if (!fs.existsSync(expectedPath)) {
    console.error("comparison demo snapshot is missing");
    console.error("----- generated comparison demo -----");
    console.error(output);
    process.exit(1);
  }
  const expected = fs.readFileSync(expectedPath, "utf8");
  if (expected !== output) {
    console.error("comparison demo snapshot is stale");
    console.error("----- generated comparison demo -----");
    console.error(output);
    process.exit(1);
  }
  console.log(
    "comparison:demo:check: ok (schema, provenance, sanitization, deterministic snapshot)",
  );
} else {
  process.stdout.write(output);
}
