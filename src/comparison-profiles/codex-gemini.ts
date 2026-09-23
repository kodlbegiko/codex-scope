import type { NeutralInspectionRecord } from "../core";
import type {
  ComparisonDimensionDefinition,
  NormalizedProjection,
} from "../comparison-normalization";

function basename(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).at(-1) ?? value;
}

function resolvedProjectInstructions(
  records: NeutralInspectionRecord[],
): NeutralInspectionRecord[] {
  return records.filter(
    (record) =>
      record.surface === "instructions" &&
      record.status === "resolved" &&
      ((record.value &&
        typeof record.value === "object" &&
        !Array.isArray(record.value) &&
        (record.value as Record<string, unknown>).scope === "project") ||
        record.provenance.winner?.scope === "workspace"),
  );
}

function instructionFilenames(
  records: NeutralInspectionRecord[],
): string[] {
  return [...new Set(records.map((record) => basename(record.subject)))].sort();
}

function projectFilenames(
  records: NeutralInspectionRecord[],
): NormalizedProjection {
  return {
    status: "resolved",
    normalizedValue: instructionFilenames(records),
    applicability: "active",
    runtimeDependency: "none",
    reason:
      "Resolved from active project/workspace instruction records in the supplied deterministic fixture.",
  };
}

function projectEntrypointExists(
  records: NeutralInspectionRecord[],
): NormalizedProjection {
  return {
    status: "resolved",
    normalizedValue: records.length > 0,
    representationValue: instructionFilenames(records),
    applicability: "active",
    runtimeDependency: "none",
    reason:
      "The supplied deterministic inspection has at least one active project/workspace instruction entrypoint.",
  };
}

function selectTrust(subject: string) {
  return (records: NeutralInspectionRecord[]): NeutralInspectionRecord[] =>
    records.filter(
      (record) =>
        record.surface === "trust" && record.subject === subject,
    );
}

function codexTrustProjection(
  records: NeutralInspectionRecord[],
): NormalizedProjection {
  const record = records[0];
  if (record.status === "unresolved") {
    return {
      status: "unresolved",
      applicability: "conditional",
      runtimeDependency: "trust",
      reason: record.reason,
    };
  }
  if (record.status !== "resolved") {
    return {
      status: "evidence_gap",
      applicability: "unknown",
      runtimeDependency: "evidence_gap",
      reason: "Codex trust record was not resolved or explicitly unresolved.",
    };
  }
  return {
    status: "resolved",
    normalizedValue: record.value,
    representationValue: record.value,
    applicability: "active",
    runtimeDependency: "none",
    reason: record.reason,
  };
}

function geminiTrustProjection(
  records: NeutralInspectionRecord[],
): NormalizedProjection {
  const record = records[0];
  if (record.status === "unresolved") {
    return {
      status: "unresolved",
      applicability: "conditional",
      runtimeDependency: "trust",
      reason: record.reason,
    };
  }
  if (record.status !== "resolved" || typeof record.value !== "boolean") {
    return {
      status: "evidence_gap",
      applicability: "unknown",
      runtimeDependency: "evidence_gap",
      reason:
        "Gemini trust record lacks a resolved boolean value under the pinned adapter contract.",
    };
  }
  return {
    status: "resolved",
    normalizedValue: record.value ? "trusted" : "untrusted",
    representationValue: record.value,
    applicability: "active",
    runtimeDependency: "none",
    reason: record.reason,
  };
}

function selectMcp(records: NeutralInspectionRecord[]): NeutralInspectionRecord[] {
  return records.filter(
    (record) =>
      record.surface === "instructions" &&
      record.subject === "mcp-instructions",
  );
}

function projectMcp(
  records: NeutralInspectionRecord[],
): NormalizedProjection {
  const record = records[0];
  if (record.status === "unsupported") {
    return {
      status: "unsupported",
      applicability: "unknown",
      runtimeDependency: "unsupported",
      reason: record.reason,
    };
  }
  if (record.status === "unresolved" || record.status === "conditional") {
    return {
      status: "unresolved",
      applicability: "conditional",
      runtimeDependency: "runtime",
      reason: record.reason,
    };
  }
  return {
    status: "evidence_gap",
    applicability: "unknown",
    runtimeDependency: "evidence_gap",
    reason:
      "The selected MCP record does not establish effective runtime instruction content.",
  };
}

export const CODEX_GEMINI_COMPARISON_DIMENSIONS: ComparisonDimensionDefinition[] =
  [
    {
      comparisonId: "instructions.active-project-filenames",
      semanticDimension: "instructions.active_project_instruction_filenames",
      left: {
        agent: "codex",
        ruleIds: ["codex.instructions.project_root_to_cwd"],
        missingReason:
          "No active Codex project instruction record is available for this fixture.",
        select: resolvedProjectInstructions,
        project: projectFilenames,
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.instructions.workspace_hierarchy"],
        missingReason:
          "No active Gemini workspace instruction record is available for this fixture.",
        select: resolvedProjectInstructions,
        project: projectFilenames,
      },
    },
    {
      comparisonId: "instructions.project-entrypoint-exists",
      semanticDimension: "instructions.project_instruction_entrypoint_exists",
      left: {
        agent: "codex",
        ruleIds: ["codex.instructions.project_root_to_cwd"],
        missingReason:
          "No active Codex project instruction record is available for this fixture.",
        select: resolvedProjectInstructions,
        project: projectEntrypointExists,
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.instructions.workspace_hierarchy"],
        missingReason:
          "No active Gemini workspace instruction record is available for this fixture.",
        select: resolvedProjectInstructions,
        project: projectEntrypointExists,
      },
    },
    {
      comparisonId: "runtime.mcp-effective-instructions",
      semanticDimension: "instructions.runtime_mcp_effective_content",
      left: {
        agent: "codex",
        ruleIds: ["comparison.mapping.codex.mcp_effective_content_gap"],
        missingReason:
          "The Codex neutral report has no evidence-backed mapping for effective runtime MCP instruction content.",
        select: selectMcp,
        project: projectMcp,
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.instructions.mcp_instructions"],
        missingReason:
          "The Gemini neutral report has no MCP instruction record.",
        select: selectMcp,
        project: projectMcp,
      },
    },
    {
      comparisonId: "trust.workspace-state",
      semanticDimension: "trust.workspace_state",
      left: {
        agent: "codex",
        ruleIds: [
          "codex.instructions.unknown_project_trust",
          "codex.config.unknown_trust",
        ],
        missingReason: "The Codex neutral report has no project trust record.",
        select: selectTrust("project_trust"),
        project: codexTrustProjection,
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.trust.provenance_sources"],
        missingReason: "The Gemini neutral report has no workspace trust record.",
        select: selectTrust("workspace_trust"),
        project: geminiTrustProjection,
      },
    },
  ];
