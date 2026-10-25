export const COMPARISON_SCHEMA_VERSION =
  "codex-scope.semantic-comparison.v1" as const;
export const NORMALIZATION_VERSION =
  "codex-scope.semantic-normalization.v1" as const;

export const COMPARISON_CLASSIFICATIONS = [
  "same",
  "semantically_equivalent",
  "behaviorally_different",
  "unsupported_on_one_side",
  "unresolved",
  "evidence_gap",
] as const;

export type ComparisonClassification =
  (typeof COMPARISON_CLASSIFICATIONS)[number];

export type NormalizedRelation =
  | "same"
  | "equivalent"
  | "different"
  | "not_comparable";

export type ComparisonSideStatus =
  | "resolved"
  | "unsupported"
  | "unresolved"
  | "evidence_gap";

export type ComparisonApplicability =
  | "active"
  | "inactive"
  | "conditional"
  | "unknown";

export type RuntimeDependency =
  | "none"
  | "trust"
  | "jit"
  | "runtime"
  | "missing_input"
  | "upstream_ambiguity"
  | "unsupported"
  | "evidence_gap";

export interface ComparisonSourceRef {
  type?: string;
  scope: string;
  path?: string;
  line?: number;
  precedence?: number;
  reason?: string;
}

export interface ComparisonAgentEvidence {
  adapter_version: string;
  evidence_date: string;
  upstream_repository: string;
  upstream_commit: string;
  references: string[];
  rule_ids: string[];
}

export interface ComparisonSide {
  agent: string;
  semantic_dimension: string;
  status: ComparisonSideStatus;
  normalized_value?: unknown;
  applicability: ComparisonApplicability;
  runtime_dependency: RuntimeDependency;
  source_record_count: number;
  reason: string;
}

export interface UnsupportedMetadata {
  side: "left" | "right";
  reason: string;
}

export interface UnresolvedMetadata {
  sides: Array<"left" | "right">;
  reasons: string[];
  dependencies: Array<
    "trust" | "jit" | "runtime" | "missing_input" | "upstream_ambiguity"
  >;
}

export interface SemanticComparisonRecord {
  comparison_id: string;
  agent_a: string;
  agent_b: string;
  semantic_dimension: string;
  left: ComparisonSide;
  right: ComparisonSide;
  classification: ComparisonClassification;
  normalized_relation: NormalizedRelation;
  reason: string;
  provenance: {
    left: ComparisonSourceRef[];
    right: ComparisonSourceRef[];
  };
  evidence: {
    left: ComparisonAgentEvidence;
    right: ComparisonAgentEvidence;
  };
  unsupported_metadata: UnsupportedMetadata | null;
  unresolved_metadata: UnresolvedMetadata | null;
}

export interface SemanticComparisonCounts {
  same: number;
  semantically_equivalent: number;
  behaviorally_different: number;
  unsupported_on_one_side: number;
  unresolved: number;
  evidence_gap: number;
  total: number;
}

export interface SemanticComparisonDocument {
  schema_version: typeof COMPARISON_SCHEMA_VERSION;
  normalization_version: typeof NORMALIZATION_VERSION;
  counts: SemanticComparisonCounts;
  comparisons: SemanticComparisonRecord[];
}

type JsonObject = Record<string, unknown>;

function fail(message: string): never {
  throw new Error("Invalid semantic comparison document: " + message);
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValue(value: unknown, label: string): JsonObject {
  if (!isObject(value)) fail(label + " must be an object");
  return value;
}

function hasOwn(value: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function exactKeys(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  for (const key of required) {
    if (!hasOwn(value, key)) fail(label + " missing " + key);
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(label + " has unknown property " + key);
  }
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(label + " must be a non-empty string");
  }
  return value;
}

function integerValue(value: unknown, label: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    fail(label + " must be an integer >= " + minimum);
  }
  return value as number;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(label + " has unsupported value");
  }
  return value as T;
}

function stringArray(
  value: unknown,
  label: string,
  minItems = 0,
  unique = false,
): string[] {
  if (!Array.isArray(value) || value.length < minItems) {
    fail(label + " must be an array with at least " + minItems + " item(s)");
  }
  const result = value.map((item, index) =>
    stringValue(item, label + "[" + index + "]"),
  );
  if (unique && new Set(result).size !== result.length) {
    fail(label + " must not contain duplicates");
  }
  return result;
}

function validateSourceRef(value: unknown, label: string): void {
  const source = objectValue(value, label);
  exactKeys(
    source,
    ["scope"],
    ["type", "path", "line", "precedence", "reason"],
    label,
  );
  stringValue(source.scope, label + ".scope");
  for (const key of ["type", "path", "reason"]) {
    if (hasOwn(source, key)) stringValue(source[key], label + "." + key);
  }
  if (hasOwn(source, "line")) integerValue(source.line, label + ".line", 1);
  if (hasOwn(source, "precedence")) {
    if (!Number.isInteger(source.precedence)) {
      fail(label + ".precedence must be an integer");
    }
  }
}

function validateProvenance(value: unknown, label: string): void {
  const provenance = objectValue(value, label);
  exactKeys(provenance, ["left", "right"], [], label);
  for (const side of ["left", "right"] as const) {
    if (!Array.isArray(provenance[side])) {
      fail(label + "." + side + " must be an array");
    }
    provenance[side].forEach((source, index) =>
      validateSourceRef(source, label + "." + side + "[" + index + "]"),
    );
  }
}

function validateAgentEvidence(value: unknown, label: string): void {
  const evidence = objectValue(value, label);
  exactKeys(
    evidence,
    [
      "adapter_version",
      "evidence_date",
      "upstream_repository",
      "upstream_commit",
      "references",
      "rule_ids",
    ],
    [],
    label,
  );
  stringValue(evidence.adapter_version, label + ".adapter_version");
  const date = stringValue(evidence.evidence_date, label + ".evidence_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(label + ".evidence_date must be YYYY-MM-DD");
  }
  const repository = stringValue(
    evidence.upstream_repository,
    label + ".upstream_repository",
  );
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail(label + ".upstream_repository must be owner/name");
  }
  const commit = stringValue(
    evidence.upstream_commit,
    label + ".upstream_commit",
  );
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail(label + ".upstream_commit must be a 40-character lowercase SHA");
  }
  stringArray(evidence.references, label + ".references", 1, true);
  stringArray(evidence.rule_ids, label + ".rule_ids", 1, true);
}

function validateEvidence(value: unknown, label: string): void {
  const evidence = objectValue(value, label);
  exactKeys(evidence, ["left", "right"], [], label);
  validateAgentEvidence(evidence.left, label + ".left");
  validateAgentEvidence(evidence.right, label + ".right");
}

const SIDE_STATUSES = [
  "resolved",
  "unsupported",
  "unresolved",
  "evidence_gap",
] as const;
const APPLICABILITY = [
  "active",
  "inactive",
  "conditional",
  "unknown",
] as const;
const RUNTIME_DEPENDENCIES = [
  "none",
  "trust",
  "jit",
  "runtime",
  "missing_input",
  "upstream_ambiguity",
  "unsupported",
  "evidence_gap",
] as const;
const UNRESOLVED_DEPENDENCIES = [
  "trust",
  "jit",
  "runtime",
  "missing_input",
  "upstream_ambiguity",
] as const;
const RELATIONS = [
  "same",
  "equivalent",
  "different",
  "not_comparable",
] as const;

function validateSide(value: unknown, label: string): ComparisonSide {
  const side = objectValue(value, label);
  exactKeys(
    side,
    [
      "agent",
      "semantic_dimension",
      "status",
      "applicability",
      "runtime_dependency",
      "source_record_count",
      "reason",
    ],
    ["normalized_value"],
    label,
  );
  const status = enumValue(side.status, SIDE_STATUSES, label + ".status");
  if (status === "resolved" && !hasOwn(side, "normalized_value")) {
    fail(label + ".normalized_value is required when status=resolved");
  }
  if (status !== "resolved" && hasOwn(side, "normalized_value")) {
    fail(label + ".normalized_value is forbidden when status=" + status);
  }
  return {
    agent: stringValue(side.agent, label + ".agent"),
    semantic_dimension: stringValue(
      side.semantic_dimension,
      label + ".semantic_dimension",
    ),
    status,
    normalized_value: side.normalized_value,
    applicability: enumValue(
      side.applicability,
      APPLICABILITY,
      label + ".applicability",
    ),
    runtime_dependency: enumValue(
      side.runtime_dependency,
      RUNTIME_DEPENDENCIES,
      label + ".runtime_dependency",
    ),
    source_record_count: integerValue(
      side.source_record_count,
      label + ".source_record_count",
    ),
    reason: stringValue(side.reason, label + ".reason"),
  };
}

function validateUnsupportedMetadata(
  value: unknown,
  label: string,
): UnsupportedMetadata | null {
  if (value === null) return null;
  const metadata = objectValue(value, label);
  exactKeys(metadata, ["side", "reason"], [], label);
  return {
    side: enumValue(metadata.side, ["left", "right"] as const, label + ".side"),
    reason: stringValue(metadata.reason, label + ".reason"),
  };
}

function validateUnresolvedMetadata(
  value: unknown,
  label: string,
): UnresolvedMetadata | null {
  if (value === null) return null;
  const metadata = objectValue(value, label);
  exactKeys(metadata, ["sides", "reasons", "dependencies"], [], label);
  if (!Array.isArray(metadata.sides) || metadata.sides.length === 0) {
    fail(label + ".sides must contain at least one side");
  }
  const sides = metadata.sides.map((side, index) =>
    enumValue(
      side,
      ["left", "right"] as const,
      label + ".sides[" + index + "]",
    ),
  );
  if (new Set(sides).size !== sides.length) {
    fail(label + ".sides must not contain duplicates");
  }
  if (!Array.isArray(metadata.dependencies) || metadata.dependencies.length === 0) {
    fail(label + ".dependencies must contain at least one dependency");
  }
  const dependencies = metadata.dependencies.map((dependency, index) =>
    enumValue(
      dependency,
      UNRESOLVED_DEPENDENCIES,
      label + ".dependencies[" + index + "]",
    ),
  );
  if (new Set(dependencies).size !== dependencies.length) {
    fail(label + ".dependencies must not contain duplicates");
  }
  return {
    sides,
    reasons: stringArray(metadata.reasons, label + ".reasons", 1),
    dependencies,
  };
}

function validateRecord(
  value: unknown,
  index: number,
): SemanticComparisonRecord {
  const label = "comparisons[" + index + "]";
  const record = objectValue(value, label);
  exactKeys(
    record,
    [
      "comparison_id",
      "agent_a",
      "agent_b",
      "semantic_dimension",
      "left",
      "right",
      "classification",
      "normalized_relation",
      "reason",
      "provenance",
      "evidence",
      "unsupported_metadata",
      "unresolved_metadata",
    ],
    [],
    label,
  );

  const comparisonId = stringValue(
    record.comparison_id,
    label + ".comparison_id",
  );
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(comparisonId)) {
    fail(label + ".comparison_id has invalid format");
  }

  const agentA = stringValue(record.agent_a, label + ".agent_a");
  const agentB = stringValue(record.agent_b, label + ".agent_b");
  if (agentA === agentB) fail("agent_a and agent_b must differ");

  const semanticDimension = stringValue(
    record.semantic_dimension,
    label + ".semantic_dimension",
  );
  const left = validateSide(record.left, label + ".left");
  const right = validateSide(record.right, label + ".right");
  if (
    left.semantic_dimension !== semanticDimension ||
    right.semantic_dimension !== semanticDimension
  ) {
    fail(label + " semantic_dimension must match both sides");
  }
  if (left.agent !== agentA || right.agent !== agentB) {
    fail(label + " side agents must match agent_a and agent_b");
  }

  if (
    typeof record.classification !== "string" ||
    !COMPARISON_CLASSIFICATIONS.includes(
      record.classification as ComparisonClassification,
    )
  ) {
    fail("unknown classification " + String(record.classification));
  }
  const classification =
    record.classification as ComparisonClassification;
  const normalizedRelation = enumValue(
    record.normalized_relation,
    RELATIONS,
    label + ".normalized_relation",
  );
  validateProvenance(record.provenance, label + ".provenance");
  validateEvidence(record.evidence, label + ".evidence");
  const unsupportedMetadata = validateUnsupportedMetadata(
    record.unsupported_metadata,
    label + ".unsupported_metadata",
  );
  const unresolvedMetadata = validateUnresolvedMetadata(
    record.unresolved_metadata,
    label + ".unresolved_metadata",
  );

  const bothResolved =
    left.status === "resolved" && right.status === "resolved";

  if (classification === "same") {
    if (!bothResolved || normalizedRelation !== "same") {
      fail(label + " same requires two resolved sides and normalized_relation=same");
    }
  } else if (classification === "semantically_equivalent") {
    if (!bothResolved || normalizedRelation !== "equivalent") {
      fail(
        label +
          " semantically_equivalent requires two resolved sides and normalized_relation=equivalent",
      );
    }
  } else if (classification === "behaviorally_different") {
    if (!bothResolved || normalizedRelation !== "different") {
      fail(
        label +
          " behaviorally_different requires two resolved sides and normalized_relation=different",
      );
    }
  } else if (classification === "unsupported_on_one_side") {
    const unsupportedSide =
      left.status === "unsupported" && right.status === "resolved"
        ? "left"
        : right.status === "unsupported" && left.status === "resolved"
          ? "right"
          : undefined;
    if (
      !unsupportedSide ||
      normalizedRelation !== "not_comparable" ||
      !unsupportedMetadata ||
      unsupportedMetadata.side !== unsupportedSide
    ) {
      fail(
        label +
          " unsupported_metadata must identify exactly one unsupported side opposite a resolved side",
      );
    }
  } else if (classification === "unresolved") {
    const unresolvedSides = [
      left.status === "unresolved" ? "left" : undefined,
      right.status === "unresolved" ? "right" : undefined,
    ].filter((side): side is "left" | "right" => Boolean(side));
    if (
      unresolvedSides.length === 0 ||
      normalizedRelation !== "not_comparable" ||
      !unresolvedMetadata ||
      unresolvedSides.some((side) => !unresolvedMetadata.sides.includes(side))
    ) {
      fail(
        label +
          " unresolved requires unresolved_metadata for every unresolved side",
      );
    }
  } else {
    if (
      left.status !== "evidence_gap" &&
      right.status !== "evidence_gap"
    ) {
      fail(label + " evidence_gap requires an evidence_gap side");
    }
    if (normalizedRelation !== "not_comparable") {
      fail(label + " evidence_gap requires normalized_relation=not_comparable");
    }
  }

  if (
    classification !== "unsupported_on_one_side" &&
    unsupportedMetadata !== null
  ) {
    fail(label + ".unsupported_metadata must be null for " + classification);
  }
  if (classification !== "unresolved" && unresolvedMetadata !== null) {
    fail(label + ".unresolved_metadata must be null for " + classification);
  }

  return {
    comparison_id: comparisonId,
    agent_a: agentA,
    agent_b: agentB,
    semantic_dimension: semanticDimension,
    left,
    right,
    classification,
    normalized_relation: normalizedRelation,
    reason: stringValue(record.reason, label + ".reason"),
    provenance: record.provenance as SemanticComparisonRecord["provenance"],
    evidence: record.evidence as SemanticComparisonRecord["evidence"],
    unsupported_metadata: unsupportedMetadata,
    unresolved_metadata: unresolvedMetadata,
  };
}

function validateCounts(
  value: unknown,
  comparisons: SemanticComparisonRecord[],
): SemanticComparisonCounts {
  const counts = objectValue(value, "counts");
  const keys = [...COMPARISON_CLASSIFICATIONS, "total"] as const;
  exactKeys(counts, keys, [], "counts");

  const actual: SemanticComparisonCounts = {
    same: 0,
    semantically_equivalent: 0,
    behaviorally_different: 0,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 0,
    total: comparisons.length,
  };
  for (const comparison of comparisons) {
    actual[comparison.classification] += 1;
  }

  for (const key of keys) {
    const supplied = integerValue(counts[key], "counts." + key);
    if (supplied !== actual[key]) fail("stale comparison counts");
  }
  return actual;
}

export function validateComparisonDocument(
  input: unknown,
): asserts input is SemanticComparisonDocument {
  const document = objectValue(input, "document");
  exactKeys(
    document,
    ["schema_version", "normalization_version", "counts", "comparisons"],
    [],
    "document",
  );
  if (document.schema_version !== COMPARISON_SCHEMA_VERSION) {
    fail("schema_version must be " + COMPARISON_SCHEMA_VERSION);
  }
  if (document.normalization_version !== NORMALIZATION_VERSION) {
    fail("normalization_version must be " + NORMALIZATION_VERSION);
  }
  if (!Array.isArray(document.comparisons) || document.comparisons.length === 0) {
    fail("comparisons must contain at least one record");
  }

  const comparisons = document.comparisons.map(validateRecord);
  const ids = new Set<string>();
  let previousId: string | undefined;
  for (const comparison of comparisons) {
    if (ids.has(comparison.comparison_id)) {
      fail("duplicate comparison_id " + comparison.comparison_id);
    }
    ids.add(comparison.comparison_id);
    if (
      previousId !== undefined &&
      comparison.comparison_id.localeCompare(previousId) < 0
    ) {
      fail("comparisons must use stable comparison_id ordering");
    }
    previousId = comparison.comparison_id;
  }

  validateCounts(document.counts, comparisons);
}

export type ResolvedRelation = "same" | "equivalent" | "different";

export interface NormalizedComparisonInput {
  comparison_id: string;
  semantic_dimension: string;
  left: ComparisonSide;
  right: ComparisonSide;
  resolved_relation?: ResolvedRelation;
  provenance: SemanticComparisonRecord["provenance"];
  evidence: SemanticComparisonRecord["evidence"];
}

const UNRESOLVED_RUNTIME_DEPENDENCIES = new Set<RuntimeDependency>([
  "trust",
  "jit",
  "runtime",
  "missing_input",
  "upstream_ambiguity",
]);

function unique<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function compareNormalizedSides(
  input: NormalizedComparisonInput,
): SemanticComparisonRecord {
  if (input.left.agent === input.right.agent) {
    throw new Error("agent_a and agent_b must differ");
  }
  if (
    input.left.semantic_dimension !== input.semantic_dimension ||
    input.right.semantic_dimension !== input.semantic_dimension
  ) {
    throw new Error("semantic_dimension must match both normalized sides");
  }

  let classification: ComparisonClassification;
  let normalizedRelation: NormalizedRelation = "not_comparable";
  let reason: string;
  let unsupportedMetadata: UnsupportedMetadata | null = null;
  let unresolvedMetadata: UnresolvedMetadata | null = null;

  const gapSides = [
    input.left.status === "evidence_gap" ? "left" : undefined,
    input.right.status === "evidence_gap" ? "right" : undefined,
  ].filter((side): side is "left" | "right" => Boolean(side));

  if (gapSides.length > 0) {
    classification = "evidence_gap";
    reason = gapSides
      .map((side) => (side === "left" ? input.left.reason : input.right.reason))
      .join(" ");
  } else {
    const unresolvedSides = [
      input.left.status === "unresolved" ? "left" : undefined,
      input.right.status === "unresolved" ? "right" : undefined,
    ].filter((side): side is "left" | "right" => Boolean(side));

    if (unresolvedSides.length > 0) {
      const dependencies = unique(
        unresolvedSides.map((side) =>
          side === "left"
            ? input.left.runtime_dependency
            : input.right.runtime_dependency,
        ),
      );
      for (const dependency of dependencies) {
        if (!UNRESOLVED_RUNTIME_DEPENDENCIES.has(dependency)) {
          throw new Error(
            "unresolved normalized sides require an explicit unresolved runtime_dependency",
          );
        }
      }

      classification = "unresolved";
      reason = unresolvedSides
        .map((side) => (side === "left" ? input.left.reason : input.right.reason))
        .join(" ");
      unresolvedMetadata = {
        sides: unresolvedSides,
        reasons: unresolvedSides.map((side) =>
          side === "left" ? input.left.reason : input.right.reason,
        ),
        dependencies: dependencies as UnresolvedMetadata["dependencies"],
      };
    } else {
      const unsupportedSides = [
        input.left.status === "unsupported" ? "left" : undefined,
        input.right.status === "unsupported" ? "right" : undefined,
      ].filter((side): side is "left" | "right" => Boolean(side));

      if (unsupportedSides.length > 0) {
        if (
          unsupportedSides.length !== 1 ||
          (unsupportedSides[0] === "left"
            ? input.right.status !== "resolved"
            : input.left.status !== "resolved")
        ) {
          throw new Error(
            "unsupported_on_one_side requires exactly one unsupported side opposite a resolved side",
          );
        }
        const side = unsupportedSides[0];
        const sideReason =
          side === "left" ? input.left.reason : input.right.reason;
        classification = "unsupported_on_one_side";
        reason = sideReason;
        unsupportedMetadata = {
          side,
          reason: sideReason,
        };
      } else {
        if (
          input.left.status !== "resolved" ||
          input.right.status !== "resolved"
        ) {
          throw new Error(
            "normalized sides are not comparable without resolved, unsupported, unresolved, or evidence_gap status",
          );
        }
        if (!input.resolved_relation) {
          throw new Error(
            "resolved_relation is required when both normalized sides are resolved",
          );
        }
        normalizedRelation = input.resolved_relation;
        if (input.resolved_relation === "same") {
          classification = "same";
          reason =
            "Both sides resolve the same normalized semantic state for this dimension.";
        } else if (input.resolved_relation === "equivalent") {
          classification = "semantically_equivalent";
          reason =
            "Both sides resolve equivalent behavior under the versioned normalization contract.";
        } else {
          classification = "behaviorally_different";
          reason =
            "Both sides are resolved with sufficient evidence and the normalized behavior differs.";
        }
      }
    }
  }

  return {
    comparison_id: input.comparison_id,
    agent_a: input.left.agent,
    agent_b: input.right.agent,
    semantic_dimension: input.semantic_dimension,
    left: { ...input.left },
    right: { ...input.right },
    classification,
    normalized_relation: normalizedRelation,
    reason,
    provenance: {
      left: input.provenance.left.map((source) => ({ ...source })),
      right: input.provenance.right.map((source) => ({ ...source })),
    },
    evidence: {
      left: {
        ...input.evidence.left,
        references: [...input.evidence.left.references],
        rule_ids: [...input.evidence.left.rule_ids],
      },
      right: {
        ...input.evidence.right,
        references: [...input.evidence.right.references],
        rule_ids: [...input.evidence.right.rule_ids],
      },
    },
    unsupported_metadata: unsupportedMetadata,
    unresolved_metadata: unresolvedMetadata,
  };
}

export function buildComparisonDocument(
  records: SemanticComparisonRecord[],
): SemanticComparisonDocument {
  const comparisons = records
    .map((record) => ({
      ...record,
      left: { ...record.left },
      right: { ...record.right },
      provenance: {
        left: record.provenance.left.map((source) => ({ ...source })),
        right: record.provenance.right.map((source) => ({ ...source })),
      },
      evidence: {
        left: {
          ...record.evidence.left,
          references: [...record.evidence.left.references],
          rule_ids: [...record.evidence.left.rule_ids],
        },
        right: {
          ...record.evidence.right,
          references: [...record.evidence.right.references],
          rule_ids: [...record.evidence.right.rule_ids],
        },
      },
      unsupported_metadata: record.unsupported_metadata
        ? { ...record.unsupported_metadata }
        : null,
      unresolved_metadata: record.unresolved_metadata
        ? {
            sides: [...record.unresolved_metadata.sides],
            reasons: [...record.unresolved_metadata.reasons],
            dependencies: [...record.unresolved_metadata.dependencies],
          }
        : null,
    }))
    .sort((left, right) =>
      left.comparison_id.localeCompare(right.comparison_id),
    );

  const counts: SemanticComparisonCounts = {
    same: 0,
    semantically_equivalent: 0,
    behaviorally_different: 0,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 0,
    total: comparisons.length,
  };
  for (const comparison of comparisons) {
    counts[comparison.classification] += 1;
  }

  const document: SemanticComparisonDocument = {
    schema_version: COMPARISON_SCHEMA_VERSION,
    normalization_version: NORMALIZATION_VERSION,
    counts,
    comparisons,
  };
  validateComparisonDocument(document);
  return document;
}
