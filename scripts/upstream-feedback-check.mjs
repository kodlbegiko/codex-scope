import { assertSchema, readJson } from "./conformance-lib.mjs";

try {
  const feedback = readJson("conformance/upstream-feedback.json");
  const schema = readJson("conformance/schema/upstream-feedback.schema.json");
  const manifest = readJson("conformance/manifest.json");
  const regressions = readJson("conformance/regressions.json");
  assertSchema(feedback, schema, "upstream feedback");

  const feedbackIds = new Set();
  const interactionUrls = new Set();
  const rules = new Map(manifest.rules.map((rule) => [rule.rule_id, rule]));
  const regressionCases = new Map(
    regressions.cases.map((regression) => [regression.regression_id, regression]),
  );

  for (const artifact of feedback.artifacts) {
    if (feedbackIds.has(artifact.feedback_id)) {
      throw new Error("duplicate feedback_id: " + artifact.feedback_id);
    }
    feedbackIds.add(artifact.feedback_id);

    if (interactionUrls.has(artifact.interaction_url)) {
      throw new Error("duplicate upstream interaction_url: " + artifact.interaction_url);
    }
    interactionUrls.add(artifact.interaction_url);

    for (const [label, url] of [
      ["issue_url", artifact.issue_url],
      ["interaction_url", artifact.interaction_url],
    ]) {
      if (!url.startsWith("https://github.com/openai/codex/")) {
        throw new Error(artifact.feedback_id + ": " + label + " must target openai/codex");
      }
    }

    const rule = rules.get(artifact.rule_id);
    if (!rule) {
      throw new Error(artifact.feedback_id + ": unknown rule_id " + artifact.rule_id);
    }

    const regression = regressionCases.get(artifact.regression_id);
    if (!regression) {
      throw new Error(
        artifact.feedback_id + ": unknown regression_id " + artifact.regression_id,
      );
    }
    if (regression.rule_id !== artifact.rule_id) {
      throw new Error(
        artifact.feedback_id + ": regression_id and rule_id do not reference the same semantic rule",
      );
    }
    if (
      regressions.schema_version === "codex-scope.regressions.v2" &&
      regression.upstream_commit !== artifact.tested_upstream_commit
    ) {
      throw new Error(
        artifact.feedback_id + ": tested_upstream_commit must match regression provenance",
      );
    }
    if (artifact.date > manifest.evidence_date) {
      throw new Error(
        artifact.feedback_id + ": feedback date is newer than manifest evidence_date",
      );
    }
    if (!artifact.evidence.includes(artifact.interaction_url)) {
      throw new Error(
        artifact.feedback_id + ": evidence must include the maintainer-facing interaction URL",
      );
    }
    if (!artifact.evidence.some((url) => url.includes(artifact.tested_upstream_commit))) {
      throw new Error(
        artifact.feedback_id + ": evidence must pin tested_upstream_commit",
      );
    }
  }

  console.log("upstream feedback: valid (" + feedback.artifacts.length + ")");
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
