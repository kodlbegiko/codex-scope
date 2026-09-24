import fs from "node:fs";
import path from "node:path";
import { assertSchema, readJson } from "./conformance-lib.mjs";

const manifestPath = path.resolve(
  process.argv[2] ?? "conformance/research/opencode/manifest.json",
);
const regressionsPath = path.resolve(
  process.argv[3] ?? "conformance/research/opencode/regressions.json",
);
const assertionsPath = path.resolve(
  process.argv[4] ?? "conformance/research/opencode/assertions.json",
);

function fail(message) {
  throw new Error(message);
}

function safeFixture(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (!normalized.startsWith("fixtures/opencode/") || normalized.includes("../")) {
    fail("fixture binding must remain inside fixtures/opencode: " + relativePath);
  }
  if (!fs.existsSync(path.resolve(relativePath))) {
    fail("fixture binding does not exist: " + relativePath);
  }
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const regressions = JSON.parse(fs.readFileSync(regressionsPath, "utf8"));
  const assertions = JSON.parse(fs.readFileSync(assertionsPath, "utf8"));

  assertSchema(
    manifest,
    readJson("conformance/schema/opencode-manifest.schema.json"),
    "OpenCode manifest",
  );
  assertSchema(
    regressions,
    readJson("conformance/schema/opencode-regressions.schema.json"),
    "OpenCode regressions",
  );
  assertSchema(
    assertions,
    readJson("conformance/schema/opencode-assertions.schema.json"),
    "OpenCode assertions",
  );

  if (manifest.rules.length < 20) fail("OpenCode manifest requires at least 20 semantic rules");
  if (manifest.inspected_revision !== "0f549842ee746e400b1f72516b0b2e292e267e2c") {
    fail("OpenCode manifest inspected revision drifted from Phase E selection");
  }

  const ruleIds = new Set();
  const assertionIds = new Set();
  const assertionById = new Map();
  for (const assertion of assertions.assertions) {
    if (assertionIds.has(assertion.id)) fail("duplicate assertion id: " + assertion.id);
    assertionIds.add(assertion.id);
    assertionById.set(assertion.id, assertion);
    safeFixture(assertion.fixture_path);
  }

  for (const rule of manifest.rules) {
    if (ruleIds.has(rule.id)) fail("duplicate OpenCode rule id: " + rule.id);
    ruleIds.add(rule.id);
    safeFixture(rule.fixture_binding);
    if (rule.upstream_revision !== manifest.inspected_revision) {
      fail(rule.id + ": upstream revision must match inspected revision");
    }
    if (!Array.isArray(rule.upstream_evidence) || rule.upstream_evidence.length === 0) {
      fail(rule.id + ": upstream evidence is empty");
    }
    for (const evidence of rule.upstream_evidence) {
      if (!evidence.repository || !evidence.commit || !evidence.url) {
        fail(rule.id + ": malformed upstream evidence");
      }
      if (evidence.repository !== "anomalyco/opencode") {
        fail(rule.id + ": evidence repository must be anomalyco/opencode");
      }
      if (!/^[0-9a-f]{40}$/.test(evidence.commit)) {
        fail(rule.id + ": evidence commit must be exact");
      }
    }
    if (rule.primary_semantic_proof === "filename_only") {
      fail(rule.id + ": filename-only semantic proof is forbidden");
    }
    const assertion = assertionById.get(rule.assertion_binding);
    if (!assertion || assertion.rule_id !== rule.id) {
      fail(rule.id + ": assertion binding is missing or points at another rule");
    }
    if (assertion.fixture_path !== rule.fixture_binding) {
      fail(rule.id + ": assertion fixture binding drifted");
    }
    if (
      assertion.expected_semantic_state !== rule.expected_semantic_state ||
      assertion.expected_compatibility_outcome !== rule.compatibility_outcome
    ) {
      fail(rule.id + ": assertion expectation drifted from manifest");
    }
  }

  if (assertions.assertions.length !== manifest.rules.length) {
    fail("OpenCode assertion corpus must bind every manifest rule exactly once");
  }

  if (regressions.records.length < 3) {
    fail("OpenCode regression corpus requires at least three records");
  }
  const regressionIds = new Set();
  for (const record of regressions.records) {
    if (regressionIds.has(record.id)) fail("duplicate regression id: " + record.id);
    regressionIds.add(record.id);
    const rule = manifest.rules.find((candidate) => candidate.id === record.affected_semantic_rule_id);
    if (!rule) fail(record.id + ": affected semantic rule does not exist");
    if (record.affected_fixture_id !== rule.fixture_binding) {
      fail(record.id + ": regression fixture must match manifest fixture binding");
    }
    if (record.affected_assertion_id !== rule.assertion_binding) {
      fail(record.id + ": regression assertion must match manifest assertion binding");
    }
    if (!record.provenance_url.includes(record.upstream_commit)) {
      fail(record.id + ": provenance URL must pin exact upstream commit");
    }
    if (!rule.upstream_evidence.some((evidence) => evidence.commit === record.upstream_commit)) {
      fail(record.id + ": manifest rule must carry the regression commit as evidence");
    }
  }

  const stateCounts = {};
  const outcomeCounts = {};
  for (const rule of manifest.rules) {
    stateCounts[rule.expected_semantic_state] =
      (stateCounts[rule.expected_semantic_state] ?? 0) + 1;
    outcomeCounts[rule.compatibility_outcome] =
      (outcomeCounts[rule.compatibility_outcome] ?? 0) + 1;
  }
  if (JSON.stringify(stateCounts) !== JSON.stringify(manifest.counts.semantic_states)) {
    fail("manifest semantic state counts are stale");
  }
  if (JSON.stringify(outcomeCounts) !== JSON.stringify(manifest.counts.compatibility_outcomes)) {
    fail("manifest compatibility outcome counts are stale");
  }
  if (manifest.counts.total !== manifest.rules.length) {
    fail("manifest total count is stale");
  }

  console.log(
    "research:opencode:validate: ok (rules=" +
      manifest.rules.length +
      "; regressions=" +
      regressions.records.length +
      ")",
  );
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
