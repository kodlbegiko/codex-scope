import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { assertSchema, evaluateAssertion, readJson, repoPath } from "./conformance-lib.mjs";

const require = createRequire(import.meta.url);
const { buildEnvironment } = require("../dist/environment.js");
const { defaultCodexHome, resolveConfig } = require("../dist/config.js");
const { codexAdapter } = require("../dist/adapters/codex.js");

const jsonMode = process.argv.includes("--json");
let manifest;
let manifestSchema;
let regressions;
let regressionSchema;
let matrix;
let matrixSchema;

function loadCorpus() {
  manifest = readJson("conformance/manifest.json");
  manifestSchema = readJson("conformance/schema/manifest.schema.json");
  regressions = readJson("conformance/regressions.json");
  const regressionSchemaPath = {
    "codex-scope.regressions.v1": "conformance/schema/regressions.schema.json",
    "codex-scope.regressions.v2": "conformance/schema/regressions-v2.schema.json"
  }[regressions.schema_version];
  if (!regressionSchemaPath) {
    throw new Error("unsupported regression schema_version: " + regressions.schema_version);
  }
  regressionSchema = readJson(regressionSchemaPath);
  matrix = readJson("conformance/compatibility-matrix.json");
  matrixSchema = readJson("conformance/schema/compatibility.schema.json");
}

function validateCorpus() {
  assertSchema(manifest, manifestSchema, "conformance manifest");
  assertSchema(regressions, regressionSchema, "regression corpus");
  assertSchema(matrix, matrixSchema, "compatibility matrix");

  const ids = new Set();
  for (const rule of manifest.rules) {
    if (ids.has(rule.rule_id)) throw new Error("duplicate rule_id: " + rule.rule_id);
    ids.add(rule.rule_id);
    if (rule.evidence_date > manifest.evidence_date) {
      throw new Error(rule.rule_id + ": evidence_date is newer than manifest evidence_date");
    }
    if (!fs.existsSync(repoPath(rule.fixture.path))) {
      throw new Error(rule.rule_id + ": fixture path does not exist: " + rule.fixture.path);
    }
    if (rule.upstream.repository !== manifest.upstream.repository) {
      throw new Error(rule.rule_id + ": upstream repository mismatch");
    }
  }

  if (manifest.rules.length < 50) throw new Error("conformance corpus requires at least 50 rules");
  if (regressions.cases.length < 5) throw new Error("regression corpus requires at least 5 cases");

  for (const item of regressions.cases) {
    const rule = manifest.rules.find((candidate) => candidate.rule_id === item.rule_id);
    if (!rule) throw new Error(item.regression_id + ": references unknown rule_id " + item.rule_id);
    if (!rule.regression) {
      throw new Error(item.regression_id + ": referenced rule is not marked regression=true");
    }
    if (regressions.schema_version === "codex-scope.regressions.v2") {
      if (item.upstream_repository !== regressions.upstream.repository) {
        throw new Error(item.regression_id + ": upstream repository mismatch");
      }
      if (item.upstream_date > regressions.evidence_date) {
        throw new Error(item.regression_id + ": upstream_date is newer than corpus evidence_date");
      }
      if (!item.evidence.some((url) => url.includes(item.upstream_commit))) {
        throw new Error(item.regression_id + ": evidence does not pin upstream_commit");
      }
      if (item.test_binding.fixture_path !== rule.fixture.path) {
        throw new Error(item.regression_id + ": fixture_path must match manifest fixture");
      }
      if (item.test_binding.assertion_count !== rule.assertions.length) {
        throw new Error(item.regression_id + ": assertion_count must match manifest assertions");
      }
      if (item.current_implementation_expected_outcome !== rule.expected_outcome) {
        throw new Error(
          item.regression_id + ": current implementation outcome must match manifest rule"
        );
      }
      if (item.compatibility_classification !== item.expected_result) {
        throw new Error(
          item.regression_id + ": compatibility_classification must match expected_result"
        );
      }
      if (
        item.test_binding.coverage === "partial_supported_boundary" &&
        (!item.test_binding.limitation || item.test_binding.limitation.trim().length === 0)
      ) {
        throw new Error(item.regression_id + ": partial test binding requires a limitation");
      }
      if (
        item.test_binding.coverage === "full_supported_boundary" &&
        item.test_binding.limitation !== null
      ) {
        throw new Error(item.regression_id + ": full test binding must not declare a limitation");
      }
    }
  }

  const matrixIds = new Set([
    ...matrix.supported_rules,
    ...matrix.unsupported_rules,
    ...matrix.unresolved_rules
  ]);
  if (matrixIds.size !== manifest.rules.length) {
    throw new Error("compatibility matrix does not cover every manifest rule exactly once");
  }
  for (const id of ids) {
    if (!matrixIds.has(id)) throw new Error("compatibility matrix missing rule " + id);
  }
  if (matrix.adapter_version !== codexAdapter.adapterVersion) {
    throw new Error("compatibility matrix adapter_version differs from the runtime Codex adapter");
  }
  if (matrix.tested_codex_version !== "unknown") {
    throw new Error("tested_codex_version must remain unknown until a deterministic tested binary version is supplied");
  }
  if (matrix.tested_upstream_commit !== manifest.upstream.commit) {
    throw new Error("compatibility matrix upstream commit differs from manifest");
  }
}

function optionsFor(probe) {
  return {
    cwd: repoPath(probe.cwd),
    codexHome: repoPath(probe.codex_home),
    trust: probe.trust,
    invocationComplete: probe.invocation_complete,
    profile: probe.profile,
    cliOverrides: probe.cli_overrides ?? [],
    systemConfigPath: probe.system_config_path
      ? repoPath(probe.system_config_path)
      : repoPath("conformance/__missing_system_config.toml"),
    managedConfigPaths: (probe.managed_config_paths ?? []).map((item) => repoPath(item))
  };
}

function runProbe(probe) {
  if (probe.kind === "environment") return buildEnvironment(optionsFor(probe));
  if (probe.kind === "config") return resolveConfig(optionsFor(probe));
  if (probe.kind === "json_file") return readJson(probe.path);
  if (probe.kind === "default_codex_home") {
    const previous = process.env.CODEX_HOME;
    try {
      process.env.CODEX_HOME = repoPath(probe.env_codex_home);
      return defaultCodexHome();
    } finally {
      if (previous === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previous;
    }
  }
  throw new Error("unknown probe kind: " + probe.kind);
}

function executeRule(rule) {
  const probe = rule.fixture.probe;
  let result;
  try {
    result = runProbe(probe);
  } catch (error) {
    if (probe.expected_error_code) {
      if (error?.code === probe.expected_error_code) {
        return { outcome: rule.expected_outcome, details: [] };
      }
      return {
        outcome: "behavior_drift",
        details: [
          "expected error " + probe.expected_error_code + ", got " + (error?.code ?? error?.name ?? "unknown")
        ]
      };
    }
    return {
      outcome: "tool_error",
      details: [error instanceof Error ? error.stack ?? error.message : String(error)]
    };
  }

  if (probe.expected_error_code) {
    return {
      outcome: "behavior_drift",
      details: ["expected error " + probe.expected_error_code + " but probe completed successfully"]
    };
  }

  const failures = [];
  for (const assertion of rule.assertions) {
    const failure = evaluateAssertion(result, assertion);
    if (failure) failures.push(failure + " for " + JSON.stringify(assertion));
  }
  if (failures.length > 0) return { outcome: "behavior_drift", details: failures };
  return { outcome: rule.expected_outcome, details: [] };
}

function runMetadata() {
  const manifestObject = manifest && typeof manifest === "object" ? manifest : {};
  const matrixObject = matrix && typeof matrix === "object" ? matrix : {};
  const upstream = manifestObject.upstream && typeof manifestObject.upstream === "object"
    ? manifestObject.upstream
    : {};
  return {
    schema_version: "codex-scope.conformance-run.v1",
    resolver_version: typeof manifestObject.resolver_version === "string" ? manifestObject.resolver_version : "unknown",
    adapter_version: typeof matrixObject.adapter_version === "string"
      ? matrixObject.adapter_version
      : codexAdapter.adapterVersion,
    evidence_date: typeof manifestObject.evidence_date === "string" ? manifestObject.evidence_date : "unknown",
    tested_upstream_commit: typeof upstream.commit === "string" ? upstream.commit : "unknown",
    tested_codex_version: typeof upstream.tested_codex_version === "string"
      ? upstream.tested_codex_version
      : "unknown"
  };
}

try {
  loadCorpus();
  validateCorpus();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  if (jsonMode) {
    console.log(JSON.stringify({
      ...runMetadata(),
      counts: { compatible: 0, behavior_drift: 0, unsupported: 0, unresolved: 0, tool_error: 1 },
      results: [],
      error: message
    }, null, 2));
  } else {
    console.error("conformance: tool_error");
    console.error(message);
  }
  process.exit(2);
}

const counts = { compatible: 0, behavior_drift: 0, unsupported: 0, unresolved: 0, tool_error: 0 };
const failures = [];
const results = [];

for (const rule of manifest.rules) {
  const result = executeRule(rule);
  counts[result.outcome] += 1;
  const record = {
    rule_id: rule.rule_id,
    expected_outcome: rule.expected_outcome,
    actual_outcome: result.outcome,
    details: result.details
  };
  results.push(record);
  if (result.outcome === "behavior_drift" || result.outcome === "tool_error") {
    failures.push(record);
  }
}

if (jsonMode) {
  console.log(JSON.stringify({
    ...runMetadata(),
    counts,
    results
  }, null, 2));
} else {
  console.log(
    "conformance: " +
      Object.entries(counts)
        .map(([key, value]) => key + "=" + value)
        .join(" ")
  );

  for (const failure of failures) {
    console.error(failure.actual_outcome + ": " + failure.rule_id);
    for (const detail of failure.details) console.error("  - " + detail);
  }
}

if (counts.tool_error > 0) process.exit(2);
if (counts.behavior_drift > 0) process.exit(1);
