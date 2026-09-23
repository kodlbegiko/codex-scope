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

function fail(message) {
  throw new Error(message);
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

function validateResearchManifest(manifest, schema) {
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

  for (const rule of manifest.rules) {
    if (ids.has(rule.rule_id)) {
      fail("duplicate rule_id: " + rule.rule_id);
    }
    ids.add(rule.rule_id);
    rulesById.set(rule.rule_id, rule);

    if (!rule.fixture_path.startsWith("fixtures/")) {
      fail(rule.rule_id + ": fixture_path must remain inside fixtures/");
    }
    if (!fs.existsSync(repoPath(rule.fixture_path))) {
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

    validatePinnedEvidence(manifest, rule);
  }

  for (const root of manifest.fixture_roots) {
    if (!root.startsWith("fixtures/")) {
      fail("fixture root must remain inside fixtures/: " + root);
    }
    if (!fs.existsSync(repoPath(root))) {
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
  if (
    manifest.implementation_status === "research_only" &&
    manifest.adapter_readiness === "implemented"
  ) {
    fail("research_only corpus cannot claim adapter_readiness=implemented");
  }

  const counts = { supported: 0, unsupported: 0, unresolved: 0 };
  for (const rule of manifest.rules) counts[rule.semantic_status] += 1;

  return { counts, blockingDiscrepancies };
}

try {
  const manifest = readJson(manifestPath);
  const schema = readJson(schemaPath);
  const result = validateResearchManifest(manifest, schema);
  console.log(
    "research:gemini:validate: ok " +
      Object.entries(result.counts)
        .map(([key, value]) => key + "=" + value)
        .join(" ") +
      " blockers=" +
      result.blockingDiscrepancies +
      " adapter_readiness=" +
      manifest.adapter_readiness,
  );
} catch (error) {
  console.error("research:gemini:validate: failed");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
