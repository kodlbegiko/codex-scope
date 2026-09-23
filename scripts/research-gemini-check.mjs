import fs from "node:fs";
import path from "node:path";
import { assertSchema, readJson, repoPath } from "./conformance-lib.mjs";

function valueAfter(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(flag + " requires a path");
  }
  return value;
}

const manifestPath = valueAfter(
  "--manifest",
  "conformance/research/gemini-cli/manifest.json",
);
const schemaPath = valueAfter(
  "--schema",
  "conformance/schema/agent-research.schema.json",
);
const realRepositoriesPath = valueAfter(
  "--real-repositories",
  "conformance/research/gemini-cli/real-repositories.json",
);
const probesPath = valueAfter(
  "--probes",
  "conformance/research/gemini-cli/probes.json",
);
const coveragePath = valueAfter(
  "--coverage",
  "conformance/research/phase-2-coverage.json",
);
const codexManifestPath = valueAfter(
  "--codex-manifest",
  "conformance/manifest.json",
);
const externalEvidencePath = valueAfter(
  "--external-evidence",
  "conformance/research/external-evidence.json",
);
const probes = readJson(probesPath);

function fail(message) {
  throw new Error(message);
}

const fixturesRoot = path.resolve(repoPath("fixtures"));

function fixturePath(relativePath, label) {
  const candidate = path.resolve(repoPath(relativePath));
  const relativeToFixtures = path.relative(fixturesRoot, candidate);
  if (
    relativeToFixtures === ".." ||
    relativeToFixtures.startsWith(".." + path.sep) ||
    path.isAbsolute(relativeToFixtures)
  ) {
    fail(label + " must remain inside fixtures/: " + relativePath);
  }
  return candidate;
}

function validatePinnedEvidence(manifest, rule) {
  for (const evidence of rule.evidence) {
    if (
      evidence.kind === "official_docs" ||
      evidence.kind === "upstream_source" ||
      evidence.kind === "upstream_test"
    ) {
      const expectedPrefix =
        "https://github.com/" +
        manifest.upstream.repository +
        "/blob/" +
        manifest.upstream.commit +
        "/";
      if (!evidence.url.startsWith(expectedPrefix)) {
        fail(
          rule.rule_id +
            ": evidence URL is not pinned to upstream commit: " +
            evidence.url,
        );
      }
      if (!evidence.url.endsWith("/" + evidence.path)) {
        fail(
          rule.rule_id +
            ": evidence URL/path mismatch for " +
            evidence.path,
        );
      }
    }
  }
}

function validateRealRepositories(ledger, rulesById) {
  if (ledger.schema_version !== "codex-scope.real-repository-validation.v1") {
    fail("unexpected real repository validation schema_version");
  }
  if (ledger.agent !== "gemini-cli") {
    fail("real repository validation agent must be gemini-cli");
  }
  if (!Array.isArray(ledger.validations) || ledger.validations.length < 3) {
    fail("Phase C requires at least 3 sanitized real repository validations");
  }
  const repositories = new Set();
  for (const validation of ledger.validations) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(validation.source_repository ?? "")) {
      fail(validation.id + ": invalid source_repository");
    }
    if (!/^[0-9a-f]{40}$/.test(validation.source_commit ?? "")) {
      fail(validation.id + ": invalid source_commit");
    }
    if (validation.source_visibility !== "public") {
      fail(validation.id + ": source repository must be recorded as public");
    }
    if (!validation.license_spdx || !validation.safety || !validation.removed?.length) {
      fail(validation.id + ": license, safety, and sanitization record are required");
    }
    repositories.add(validation.source_repository);
    const root = fixturePath(validation.sanitized_root, validation.id + ": sanitized_root");
    if (!fs.existsSync(root)) fail(validation.id + ": sanitized_root does not exist");
    for (const sanitizedPath of validation.sanitized_paths ?? []) {
      const candidate = fixturePath(sanitizedPath, validation.id + ": sanitized_path");
      if (!fs.existsSync(candidate)) fail(validation.id + ": sanitized path does not exist: " + sanitizedPath);
    }
    if (!validation.validates_rules?.length) {
      fail(validation.id + ": validates_rules must not be empty");
    }
    for (const ruleId of validation.validates_rules) {
      if (!rulesById.has(ruleId)) fail(validation.id + ": references unknown rule_id " + ruleId);
    }
  }
  if (repositories.size < 3) {
    fail("Phase C real repository gate requires 3 distinct public repositories");
  }
  return ledger.validations.length;
}


function exactObject(actual, expected, label) {
  const actualKeys = Object.keys(actual ?? {}).sort();
  const expectedKeys = Object.keys(expected ?? {}).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail(
      label +
        ": keys are stale: expected " +
        expectedKeys.join(", ") +
        " but received " +
        actualKeys.join(", "),
    );
  }
  for (const key of expectedKeys) {
    if (actual[key] !== expected[key]) {
      fail(
        label +
          "." +
          key +
          " is stale: expected " +
          JSON.stringify(expected[key]) +
          " but received " +
          JSON.stringify(actual[key]),
      );
    }
  }
}

function uniqueCaseIds(cases, label) {
  const ids = new Set();
  for (const entry of cases) {
    if (!entry?.id || typeof entry.id !== "string") {
      fail(label + ": every case requires a string id");
    }
    if (ids.has(entry.id)) fail(label + ": duplicate case id " + entry.id);
    ids.add(entry.id);
  }
  return ids;
}

function expandedProbeCases(probe, realRepositories) {
  if (probe.kind === "trust_provenance" || probe.kind === "settings_scalar_cases") {
    const expectedCount = probe.expected?.case_count;
    const casesPath = probe.input?.cases_path;
    if (!Number.isInteger(expectedCount) || expectedCount < 1) {
      fail(probe.probe_id + ": expected.case_count must be a positive integer");
    }
    if (!casesPath || typeof casesPath !== "string") {
      fail(probe.probe_id + ": multi-case probe requires input.cases_path");
    }
    const casesDocument = readJson(casesPath);
    if (!Array.isArray(casesDocument.cases)) {
      fail(probe.probe_id + ": cases_path must contain a cases array");
    }
    uniqueCaseIds(casesDocument.cases, probe.probe_id);
    if (casesDocument.cases.length !== expectedCount) {
      fail(
        probe.probe_id +
          ": expected.case_count is stale: expected " +
          casesDocument.cases.length +
          " from " +
          casesPath +
          " but received " +
          expectedCount,
      );
    }
    return expectedCount;
  }

  if (probe.kind === "user_project_memory") {
    const cases = probe.input?.cases;
    if (!Array.isArray(cases) || cases.length < 1) {
      fail(probe.probe_id + ": user_project_memory requires input.cases");
    }
    const ids = uniqueCaseIds(cases, probe.probe_id);
    const expectedCases = probe.expected?.cases;
    if (!expectedCases || typeof expectedCases !== "object" || Array.isArray(expectedCases)) {
      fail(probe.probe_id + ": user_project_memory requires expected.cases");
    }
    exactObject(
      Object.fromEntries([...ids].map((id) => [id, true])),
      Object.fromEntries(Object.keys(expectedCases).map((id) => [id, true])),
      probe.probe_id + ".expected.cases",
    );
    return cases.length;
  }

  if (probe.kind === "real_repository_snapshots") {
    const expectedCount = probe.expected?.validation_count;
    const actualCount = realRepositories.validations?.length ?? 0;
    if (!Number.isInteger(expectedCount) || expectedCount < 1) {
      fail(probe.probe_id + ": expected.validation_count must be a positive integer");
    }
    if (expectedCount !== actualCount) {
      fail(
        probe.probe_id +
          ": expected.validation_count is stale: expected " +
          actualCount +
          " but received " +
          expectedCount,
      );
    }
    return expectedCount;
  }

  return 1;
}

function validateCoverageLedger(coverage, codexManifest, realRepositories) {
  if (coverage.schema_version !== "codex-scope.phase-2-coverage.v1") {
    fail("unexpected Phase 2 coverage schema_version");
  }
  if (coverage.gate_id !== "phase-2.second_adapter_corpus_threshold") {
    fail("unexpected Phase 2 coverage gate_id");
  }
  if (coverage.metric !== "deterministic_semantic_cases") {
    fail("unexpected Phase 2 coverage metric");
  }
  if (coverage.threshold !== 50) {
    fail("Phase 2 coverage threshold must remain 50");
  }
  if (coverage.codex?.manifest !== "conformance/manifest.json") {
    fail("Phase 2 coverage codex.manifest is stale");
  }
  if (coverage.gemini?.probes !== "conformance/research/gemini-cli/probes.json") {
    fail("Phase 2 coverage gemini.probes is stale");
  }
  if (
    coverage.gemini?.real_repository_ledger !==
    "conformance/research/gemini-cli/real-repositories.json"
  ) {
    fail("Phase 2 coverage real_repository_ledger is stale");
  }

  if (!Array.isArray(codexManifest.rules) || codexManifest.rules.length === 0) {
    fail("Codex conformance manifest must contain rules");
  }
  const codexIds = new Set();
  const fixturePaths = new Set();
  const fixtureProbeShapes = new Set();
  const surfaces = {};
  let assertions = 0;
  let regressionRules = 0;
  for (const rule of codexManifest.rules) {
    if (!rule?.rule_id || codexIds.has(rule.rule_id)) {
      fail("Codex coverage requires unique rule_id values");
    }
    codexIds.add(rule.rule_id);
    if (!rule.fixture?.path || !rule.fixture?.probe) {
      fail(rule.rule_id + ": Codex coverage case requires fixture.path and fixture.probe");
    }
    if (!fs.existsSync(repoPath(rule.fixture.path))) {
      fail(rule.rule_id + ": Codex coverage fixture does not exist: " + rule.fixture.path);
    }
    fixturePaths.add(rule.fixture.path);
    fixtureProbeShapes.add(
      JSON.stringify({ path: rule.fixture.path, probe: rule.fixture.probe }),
    );
    assertions += Array.isArray(rule.assertions) ? rule.assertions.length : 0;
    if (rule.regression === true) regressionRules += 1;
    surfaces[rule.surface] = (surfaces[rule.surface] ?? 0) + 1;
  }
  const codexRuleCases = codexManifest.rules.length;

  if (!Array.isArray(probes.probes) || probes.probes.length === 0) {
    fail("Gemini research probes must contain probes");
  }
  const probeIds = new Set();
  const caseExpansion = [];
  let geminiCases = 0;
  for (const probe of probes.probes) {
    if (!probe?.probe_id || probeIds.has(probe.probe_id)) {
      fail("Gemini coverage requires unique probe_id values");
    }
    probeIds.add(probe.probe_id);
    const cases = expandedProbeCases(probe, realRepositories);
    caseExpansion.push({
      probe_id: probe.probe_id,
      kind: probe.kind,
      cases,
    });
    geminiCases += cases;
  }

  const realValidations = realRepositories.validations?.length ?? 0;
  const distinctRepositories = new Set(
    (realRepositories.validations ?? []).map((entry) => entry.source_repository),
  ).size;
  const total = codexRuleCases + geminiCases;

  exactObject(
    coverage.calculation,
    {
      codex_rule_fixture_cases: codexRuleCases,
      gemini_research_cases: geminiCases,
      total,
    },
    "coverage.calculation",
  );
  exactObject(
    {
      rule_fixture_cases: coverage.codex?.rule_fixture_cases,
      unique_fixture_paths: coverage.codex?.unique_fixture_paths,
      unique_fixture_probe_shapes: coverage.codex?.unique_fixture_probe_shapes,
      assertions: coverage.codex?.assertions,
      regression_rules: coverage.codex?.regression_rules,
    },
    {
      rule_fixture_cases: codexRuleCases,
      unique_fixture_paths: fixturePaths.size,
      unique_fixture_probe_shapes: fixtureProbeShapes.size,
      assertions,
      regression_rules: regressionRules,
    },
    "coverage.codex",
  );
  exactObject(coverage.codex?.surfaces, surfaces, "coverage.codex.surfaces");

  exactObject(
    {
      top_level_probes: coverage.gemini?.top_level_probes,
      deterministic_cases: coverage.gemini?.deterministic_cases,
      real_repository_validations: coverage.gemini?.real_repository_validations,
      distinct_real_repositories: coverage.gemini?.distinct_real_repositories,
    },
    {
      top_level_probes: probes.probes.length,
      deterministic_cases: geminiCases,
      real_repository_validations: realValidations,
      distinct_real_repositories: distinctRepositories,
    },
    "coverage.gemini",
  );

  if (!Array.isArray(coverage.gemini?.case_expansion)) {
    fail("coverage.gemini.case_expansion must be an array");
  }
  if (coverage.gemini.case_expansion.length !== caseExpansion.length) {
    fail(
      "coverage.gemini.case_expansion length is stale: expected " +
        caseExpansion.length +
        " but received " +
        coverage.gemini.case_expansion.length,
    );
  }
  for (let index = 0; index < caseExpansion.length; index += 1) {
    exactObject(
      coverage.gemini.case_expansion[index],
      caseExpansion[index],
      "coverage.gemini.case_expansion[" + index + "]",
    );
  }

  const expectedStatus = total >= coverage.threshold ? "pass" : "fail";
  if (coverage.status !== expectedStatus) {
    fail(
      "coverage.status is dishonest or stale: expected " +
        expectedStatus +
        " for total=" +
        total +
        " threshold=" +
        coverage.threshold +
        " but received " +
        coverage.status,
    );
  }
  if (total < 50 || total < coverage.threshold) {
    fail(
      "Phase 2 second-adapter corpus coverage is below required threshold: total=" +
        total +
        " threshold=" +
        coverage.threshold,
    );
  }

  return {
    codexRuleCases,
    geminiCases,
    total,
    status: expectedStatus,
  };
}

function validateExternalEvidence(ledger) {
  if (ledger.schema_version !== "codex-scope.external-evidence.v1") {
    fail("unexpected external evidence schema_version");
  }
  if (!Array.isArray(ledger.interactions)) {
    fail("external evidence interactions must be an array");
  }
  const ids = new Set();
  const urls = new Set();
  const allowedTypes = new Set([
    "issue",
    "comment",
    "pr",
    "correction",
    "acknowledgement",
  ]);
  const allowedStatuses = new Set([
    "submitted",
    "acknowledged",
    "corrected",
    "merged",
  ]);
  for (const interaction of ledger.interactions) {
    if (!interaction.id || typeof interaction.id !== "string") {
      fail("external evidence interaction requires id");
    }
    if (ids.has(interaction.id)) {
      fail("external evidence duplicate id: " + interaction.id);
    }
    ids.add(interaction.id);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(interaction.upstream_repository ?? "")) {
      fail(interaction.id + ": invalid upstream_repository");
    }
    let url;
    try {
      url = new URL(interaction.url);
    } catch {
      fail(interaction.id + ": invalid url");
    }
    if (url.protocol !== "https:" || url.hostname !== "github.com") {
      fail(interaction.id + ": external evidence url must be an https GitHub URL");
    }
    if (urls.has(interaction.url)) {
      fail("external evidence duplicate interaction url: " + interaction.url);
    }
    urls.add(interaction.url);
    if (!allowedTypes.has(interaction.interaction_type)) {
      fail(interaction.id + ": invalid interaction_type");
    }
    if (!allowedStatuses.has(interaction.status)) {
      fail(interaction.id + ": invalid status");
    }
    for (const field of [
      "date",
      "independent_finding",
      "external_verification",
      "impact",
    ]) {
      if (typeof interaction[field] !== "string" || !interaction[field].trim()) {
        fail(interaction.id + ": " + field + " must be non-empty");
      }
    }
  }
  const required = ledger.gate?.required_distinct_interactions;
  if (!Number.isInteger(required) || required < 3) {
    fail("external evidence gate requires at least 3 distinct interactions");
  }
  const expectedStatus = urls.size >= required ? "pass" : "fail";
  if (ledger.gate?.status !== expectedStatus) {
    fail(
      "external evidence gate status is dishonest or stale: expected " +
        expectedStatus +
        " but received " +
        ledger.gate?.status,
    );
  }
  return { interactions: urls.size, required, status: expectedStatus };
}

function validateAdapterGateState(manifest, externalEvidenceResult) {
  if (
    manifest.adapter_readiness !== "blocked" &&
    externalEvidenceResult.status !== "pass"
  ) {
    fail(
      "adapter readiness requires external evidence gate status=pass; received " +
        externalEvidenceResult.status,
    );
  }

  if (
    manifest.adapter_readiness === "implemented" &&
    manifest.implementation_status !== "implemented"
  ) {
    fail(
      "adapter_readiness=implemented requires implementation_status=implemented",
    );
  }
  if (
    manifest.implementation_status === "implemented" &&
    manifest.adapter_readiness !== "implemented"
  ) {
    fail(
      "implementation_status=implemented requires adapter_readiness=implemented",
    );
  }

  if (manifest.adapter_readiness === "implemented") {
    for (const requiredPath of [
      "src/adapters/gemini.ts",
      "tests/gemini-adapter.test.mjs",
      "fixtures/gemini-adapter/adapter-options.json",
    ]) {
      if (!fs.existsSync(repoPath(requiredPath))) {
        fail(
          "implemented Gemini adapter requires checked-in artifact: " +
            requiredPath,
        );
      }
    }
  }
}

function validateResearchManifest(manifest, schema, realRepositories) {
  assertSchema(manifest, schema, "agent research manifest");

  if (manifest.agent !== "gemini-cli") {
    fail("Gemini research validator received agent=" + manifest.agent);
  }
  if (manifest.upstream.repository !== "google-gemini/gemini-cli") {
    fail(
      "Gemini research validator received upstream=" +
        manifest.upstream.repository,
    );
  }

  const ids = new Set();
  const rulesById = new Map();
  const probeIds = new Set(probes.probes.map((probe) => probe.probe_id));

  for (const rule of manifest.rules) {
    if (ids.has(rule.rule_id)) {
      fail("duplicate rule_id: " + rule.rule_id);
    }
    ids.add(rule.rule_id);
    rulesById.set(rule.rule_id, rule);

    const resolvedFixturePath = fixturePath(
      rule.fixture_path,
      rule.rule_id + ": fixture_path",
    );
    if (!fs.existsSync(resolvedFixturePath)) {
      fail(
        rule.rule_id +
          ": fixture path does not exist: " +
          rule.fixture_path,
      );
    }
    if (rule.evidence.length === 0) {
      fail(rule.rule_id + ": every research rule requires evidence");
    }
    if (rule.semantic_status === "unresolved") {
      if (!rule.unresolved_boundary.trim()) {
        fail(rule.rule_id + ": unresolved rule requires unresolved_boundary");
      }
    }

    if (rule.assertion_status === "covered" && rule.probe_ids.length === 0) {
      fail(rule.rule_id + ": covered rule requires at least one probe_id");
    }
    for (const probeId of rule.probe_ids) {
      if (!probeIds.has(probeId)) {
        fail(rule.rule_id + ": references unknown probe_id " + probeId);
      }
    }

    validatePinnedEvidence(manifest, rule);
  }

  for (const probe of probes.probes) {
    for (const ruleId of probe.rules) {
      if (!rulesById.has(ruleId)) {
        fail(probe.probe_id + ": references unknown rule_id " + ruleId);
      }
    }
  }

  const realRepositoryValidations = validateRealRepositories(realRepositories, rulesById);

  for (const root of manifest.fixture_roots) {
    const resolvedFixtureRoot = fixturePath(root, "fixture root");
    if (!fs.existsSync(resolvedFixtureRoot)) {
      fail("fixture root does not exist: " + root);
    }
  }

  let blockingDiscrepancies = 0;
  for (const discrepancy of manifest.discrepancies) {
    const rule = rulesById.get(discrepancy.rule_id);
    if (!rule) {
      fail(
        discrepancy.discrepancy_id +
          ": references unknown rule_id " +
          discrepancy.rule_id,
      );
    }
    if (
      discrepancy.classification === "unresolved" &&
      rule.semantic_status !== "unresolved"
    ) {
      fail(
        discrepancy.discrepancy_id +
          ": unresolved discrepancy must reference an unresolved rule",
      );
    }
    if (discrepancy.blocker_for_adapter) {
      blockingDiscrepancies += 1;
      if (discrepancy.status === "resolved") {
        fail(
          discrepancy.discrepancy_id +
            ": resolved discrepancy cannot remain an adapter blocker",
        );
      }
    }
  }

  if (
    blockingDiscrepancies > 0 &&
    manifest.adapter_readiness !== "blocked"
  ) {
    fail(
      "adapter_readiness must remain blocked while blocker_for_adapter discrepancies exist",
    );
  }

  const openAdapterBlockers = manifest.adapter_blockers.filter(
    (blocker) => blocker.status === "open",
  );
  if (
    openAdapterBlockers.length > 0 &&
    manifest.adapter_readiness !== "blocked"
  ) {
    fail(
      "adapter_readiness must remain blocked while adapter_blockers are open: " +
        openAdapterBlockers.map((blocker) => blocker.blocker_id).join(", "),
    );
  }
  if (
    manifest.adapter_readiness !== "blocked" &&
    manifest.adapter_blockers.length > 0
  ) {
    fail("ready adapter corpus must not retain adapter_blockers");
  }
  if (
    manifest.implementation_status === "research_only" &&
    manifest.adapter_readiness === "implemented"
  ) {
    fail("research_only corpus cannot claim adapter_readiness=implemented");
  }

  if (manifest.adapter_readiness !== "blocked") {
    const pendingSupported = manifest.rules
      .filter(
        (rule) =>
          rule.semantic_status === "supported" &&
          rule.assertion_status !== "covered",
      )
      .map((rule) => rule.rule_id);
    if (pendingSupported.length > 0) {
      fail(
        "adapter readiness requires deterministic assertions for supported rules: " +
          pendingSupported.join(", "),
      );
    }
  }

  const counts = { supported: 0, unsupported: 0, unresolved: 0 };
  for (const rule of manifest.rules) counts[rule.semantic_status] += 1;

  return {
    counts,
    blockingDiscrepancies,
    openAdapterBlockers: openAdapterBlockers.length,
    realRepositoryValidations,
  };
}

try {
  const manifest = readJson(manifestPath);
  const schema = readJson(schemaPath);
  const realRepositories = readJson(realRepositoriesPath);
  const coverage = readJson(coveragePath);
  const codexManifest = readJson(codexManifestPath);
  const externalEvidence = readJson(externalEvidencePath);
  const externalEvidenceResult = validateExternalEvidence(externalEvidence);
  const coverageResult = validateCoverageLedger(
    coverage,
    codexManifest,
    realRepositories,
  );
  const result = validateResearchManifest(manifest, schema, realRepositories);
  validateAdapterGateState(manifest, externalEvidenceResult);
  console.log(
    "research:gemini:validate: ok " +
      Object.entries(result.counts)
        .map(([key, value]) => key + "=" + value)
        .join(" ") +
      " discrepancy_blockers=" +
      result.blockingDiscrepancies +
      " adapter_blockers=" +
      result.openAdapterBlockers +
      " real_repository_validations=" +
      result.realRepositoryValidations +
      " coverage_cases=" +
      coverageResult.total +
      " coverage_status=" +
      coverageResult.status +
      " external_evidence=" +
      externalEvidenceResult.interactions +
      "/" +
      externalEvidenceResult.required +
      " external_evidence_status=" +
      externalEvidenceResult.status +
      " adapter_readiness=" +
      manifest.adapter_readiness,
  );
} catch (error) {
  console.error("research:gemini:validate: failed");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
