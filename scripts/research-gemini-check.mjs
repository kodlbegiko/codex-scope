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
const probes = readJson("conformance/research/gemini-cli/probes.json");

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
  const result = validateResearchManifest(manifest, schema, realRepositories);
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
      " adapter_readiness=" +
      manifest.adapter_readiness,
  );
} catch (error) {
  console.error("research:gemini:validate: failed");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
