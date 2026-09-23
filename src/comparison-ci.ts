import {
  validateComparisonDocument,
  type SemanticComparisonCounts,
  type SemanticComparisonDocument,
} from "./comparison";

export const COMPARISON_CI_SCHEMA_VERSION =
  "codex-scope.semantic-comparison-ci.v1" as const;

export const COMPARISON_CI_OUTCOMES = [
  "clean",
  "proven_drift",
  "unresolved",
  "unsupported",
  "tool_error",
] as const;

export type ComparisonCiOutcome =
  (typeof COMPARISON_CI_OUTCOMES)[number];

export interface ComparisonCiSummary {
  schema_version: typeof COMPARISON_CI_SCHEMA_VERSION;
  outcome: ComparisonCiOutcome;
  observed_outcomes: ComparisonCiOutcome[];
  counts: SemanticComparisonCounts | null;
  reason: string;
}

function cloneCounts(
  counts: SemanticComparisonCounts,
): SemanticComparisonCounts {
  return { ...counts };
}

export function summarizeComparisonForCi(
  document: SemanticComparisonDocument,
): ComparisonCiSummary {
  validateComparisonDocument(document);

  const observed: ComparisonCiOutcome[] = [];
  if (document.counts.behaviorally_different > 0) {
    observed.push("proven_drift");
  }
  if (document.counts.unsupported_on_one_side > 0) {
    observed.push("unsupported");
  }
  if (
    document.counts.unresolved > 0 ||
    document.counts.evidence_gap > 0
  ) {
    observed.push("unresolved");
  }

  if (observed.length === 0) {
    return {
      schema_version: COMPARISON_CI_SCHEMA_VERSION,
      outcome: "clean",
      observed_outcomes: ["clean"],
      counts: cloneCounts(document.counts),
      reason: "All comparison records are resolved without proven drift.",
    };
  }

  if (observed.includes("unresolved")) {
    return {
      schema_version: COMPARISON_CI_SCHEMA_VERSION,
      outcome: "unresolved",
      observed_outcomes: observed,
      counts: cloneCounts(document.counts),
      reason:
        "At least one comparison record is unresolved or has an evidence gap; the overall result remains fail-closed.",
    };
  }

  if (observed.includes("unsupported")) {
    return {
      schema_version: COMPARISON_CI_SCHEMA_VERSION,
      outcome: "unsupported",
      observed_outcomes: observed,
      counts: cloneCounts(document.counts),
      reason:
        "At least one comparison dimension is unsupported on one side and no unresolved or evidence-gap state is present.",
    };
  }

  return {
    schema_version: COMPARISON_CI_SCHEMA_VERSION,
    outcome: "proven_drift",
    observed_outcomes: observed,
    counts: cloneCounts(document.counts),
    reason:
      "At least one fully resolved semantic dimension has proven behavioral drift.",
  };
}

export function toolErrorComparisonCiSummary(
  reason: string,
): ComparisonCiSummary {
  if (reason.length === 0) {
    throw new Error("tool_error reason must be non-empty");
  }
  return {
    schema_version: COMPARISON_CI_SCHEMA_VERSION,
    outcome: "tool_error",
    observed_outcomes: ["tool_error"],
    counts: null,
    reason,
  };
}
