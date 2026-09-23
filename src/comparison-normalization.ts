import type {
  AgentInspection,
  NeutralInspectionRecord,
  NeutralSourceRef,
} from "./core";
import {
  buildComparisonDocument,
  compareNormalizedSides,
  type ComparisonApplicability,
  type ComparisonSide,
  type ComparisonSideStatus,
  type NormalizedComparisonInput,
  type RuntimeDependency,
  type SemanticComparisonDocument,
  type SemanticComparisonRecord,
} from "./comparison";

export interface NormalizedProjection {
  status: ComparisonSideStatus;
  normalizedValue?: unknown;
  applicability: ComparisonApplicability;
  runtimeDependency: RuntimeDependency;
  reason: string;
  representationValue?: unknown;
}

export interface ComparisonSideDefinition {
  agent: string;
  ruleIds: string[];
  missingReason: string;
  select(records: NeutralInspectionRecord[]): NeutralInspectionRecord[];
  project(records: NeutralInspectionRecord[]): NormalizedProjection;
}

export interface ComparisonDimensionDefinition {
  comparisonId: string;
  semanticDimension: string;
  left: ComparisonSideDefinition;
  right: ComparisonSideDefinition;
}

interface NormalizedInspectionSide {
  side: ComparisonSide;
  representationValue: unknown;
  provenance: NeutralSourceRef[];
  evidence: SemanticComparisonRecord["evidence"]["left"];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function stableString(value: unknown): string {
  const result = JSON.stringify(stableValue(value));
  return result === undefined ? "undefined" : result;
}

function collectProvenance(records: NeutralInspectionRecord[]): NeutralSourceRef[] {
  const collected: NeutralSourceRef[] = [];
  for (const record of records) {
    if (record.provenance.winner) collected.push(record.provenance.winner);
    collected.push(
      ...record.provenance.shadowed,
      ...record.provenance.ignored,
      ...record.provenance.conditional,
    );
  }

  const seen = new Set<string>();
  return collected.filter((source) => {
    const key = stableString(source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evidenceFor(
  inspection: AgentInspection<unknown>,
  definition: ComparisonSideDefinition,
): SemanticComparisonRecord["evidence"]["left"] {
  return {
    adapter_version: inspection.adapterVersion,
    evidence_date: inspection.evidence.evidenceDate,
    upstream_repository: inspection.evidence.upstreamRepository,
    upstream_commit: inspection.evidence.upstreamCommit,
    references: [...inspection.evidence.references].sort(),
    rule_ids: [...definition.ruleIds].sort(),
  };
}

function normalizeInspectionSide(
  inspection: AgentInspection<unknown>,
  dimension: string,
  definition: ComparisonSideDefinition,
): NormalizedInspectionSide {
  if (inspection.agent !== definition.agent) {
    throw new Error(
      `comparison definition expects agent ${definition.agent} but received ${inspection.agent}`,
    );
  }

  const records = definition.select(inspection.records);
  if (records.length === 0) {
    return {
      side: {
        agent: inspection.agent,
        semantic_dimension: dimension,
        status: "evidence_gap",
        applicability: "unknown",
        runtime_dependency: "evidence_gap",
        source_record_count: 0,
        reason: definition.missingReason,
      },
      representationValue: null,
      provenance: [],
      evidence: evidenceFor(inspection, definition),
    };
  }

  const projection = definition.project(records);
  const side: ComparisonSide = {
    agent: inspection.agent,
    semantic_dimension: dimension,
    status: projection.status,
    applicability: projection.applicability,
    runtime_dependency: projection.runtimeDependency,
    source_record_count: records.length,
    reason: projection.reason,
  };
  if (projection.status === "resolved") {
    side.normalized_value = projection.normalizedValue;
  }

  return {
    side,
    representationValue:
      projection.representationValue ??
      records.map((record) => ({
        surface: record.surface,
        subject: record.subject,
        status: record.status,
        value: record.value,
      })),
    provenance: collectProvenance(records),
    evidence: evidenceFor(inspection, definition),
  };
}

function relationFor(
  left: NormalizedInspectionSide,
  right: NormalizedInspectionSide,
): NormalizedComparisonInput["resolved_relation"] {
  if (left.side.status !== "resolved" || right.side.status !== "resolved") {
    return undefined;
  }
  if (
    stableString(left.side.normalized_value) !==
    stableString(right.side.normalized_value)
  ) {
    return "different";
  }
  return stableString(left.representationValue) ===
    stableString(right.representationValue)
    ? "same"
    : "equivalent";
}

export function compareInspectionDimension(
  leftInspection: AgentInspection<unknown>,
  rightInspection: AgentInspection<unknown>,
  definition: ComparisonDimensionDefinition,
): SemanticComparisonRecord {
  const left = normalizeInspectionSide(
    leftInspection,
    definition.semanticDimension,
    definition.left,
  );
  const right = normalizeInspectionSide(
    rightInspection,
    definition.semanticDimension,
    definition.right,
  );

  return compareNormalizedSides({
    comparison_id: definition.comparisonId,
    semantic_dimension: definition.semanticDimension,
    left: left.side,
    right: right.side,
    resolved_relation: relationFor(left, right),
    provenance: {
      left: left.provenance,
      right: right.provenance,
    },
    evidence: {
      left: left.evidence,
      right: right.evidence,
    },
  });
}

export function compareInspections(
  leftInspection: AgentInspection<unknown>,
  rightInspection: AgentInspection<unknown>,
  definitions: ComparisonDimensionDefinition[],
): SemanticComparisonDocument {
  return buildComparisonDocument(
    definitions.map((definition) =>
      compareInspectionDimension(
        leftInspection,
        rightInspection,
        definition,
      ),
    ),
  );
}
