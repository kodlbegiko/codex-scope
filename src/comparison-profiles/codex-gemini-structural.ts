import type { NeutralInspectionRecord } from "../core";
import type {
  ComparisonDimensionDefinition,
  NormalizedProjection,
} from "../comparison-normalization";

function basename(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).at(-1) ?? value;
}

function unresolvedFrom(records: NeutralInspectionRecord[]): NormalizedProjection | undefined {
  const record = records.find(
    (item) => item.status === "unresolved" || item.status === "conditional",
  );
  if (!record) return undefined;
  return {
    status: "unresolved",
    applicability: "conditional",
    runtimeDependency:
      record.surface === "trust" ? "trust" : "missing_input",
    reason: record.reason,
  };
}

function resolvedInstructionBasenames(
  records: NeutralInspectionRecord[],
): string[] {
  return [
    ...new Set(
      records
        .filter((record) => record.status === "resolved")
        .map((record) => basename(record.subject)),
    ),
  ].sort();
}

function isCodexProjectInstruction(record: NeutralInspectionRecord): boolean {
  return (
    record.agent === "codex" &&
    record.surface === "instructions" &&
    record.value !== undefined &&
    typeof record.value === "object" &&
    !Array.isArray(record.value) &&
    (record.value as Record<string, unknown>).scope === "project"
  );
}

function isGeminiWorkspaceInstruction(
  record: NeutralInspectionRecord,
): boolean {
  return (
    record.agent === "gemini" &&
    record.surface === "instructions" &&
    (record.provenance.winner?.scope === "workspace" ||
      record.provenance.conditional.some(
        (source) => source.scope === "workspace",
      ))
  );
}

function selectCodexProjectInstructions(
  records: NeutralInspectionRecord[],
): NeutralInspectionRecord[] {
  return records.filter(isCodexProjectInstruction);
}

function selectGeminiWorkspaceInstructions(
  records: NeutralInspectionRecord[],
): NeutralInspectionRecord[] {
  return records.filter(isGeminiWorkspaceInstruction);
}

function projectDefaultFilename(
  expectedFilename: string,
  label: string,
) {
  return (records: NeutralInspectionRecord[]): NormalizedProjection => {
    const unresolved = unresolvedFrom(records);
    if (unresolved) return unresolved;
    const active = resolvedInstructionBasenames(records);
    if (!active.includes(expectedFilename)) {
      return {
        status: "evidence_gap",
        applicability: "unknown",
        runtimeDependency: "evidence_gap",
        reason:
          label +
          " default filename contract is not demonstrated by the selected deterministic instruction evidence.",
      };
    }
    return {
      status: "resolved",
      normalizedValue: expectedFilename,
      representationValue: active,
      applicability: "active",
      runtimeDependency: "none",
      reason:
        label +
        " pinned instruction evidence demonstrates its built-in project/workspace default filename.",
    };
  };
}

function selectCodexGlobal(
  records: NeutralInspectionRecord[],
): NeutralInspectionRecord[] {
  return records.filter(
    (record) =>
      record.agent === "codex" &&
      record.surface === "instructions" &&
      record.value !== undefined &&
      typeof record.value === "object" &&
      !Array.isArray(record.value) &&
      (record.value as Record<string, unknown>).scope === "global",
  );
}

function selectGeminiGlobal(
  records: NeutralInspectionRecord[],
): NeutralInspectionRecord[] {
  return records.filter(
    (record) =>
      record.agent === "gemini" &&
      record.surface === "instructions" &&
      (record.provenance.winner?.scope === "global" ||
        record.provenance.conditional.some(
          (source) => source.scope === "global",
        )),
  );
}

function activeGlobalFilename(
  label: string,
): (records: NeutralInspectionRecord[]) => NormalizedProjection {
  return (records) => {
    const unresolved = unresolvedFrom(records);
    if (unresolved) return unresolved;
    const active = resolvedInstructionBasenames(records);
    if (active.length !== 1) {
      return {
        status: "evidence_gap",
        applicability: "unknown",
        runtimeDependency: "evidence_gap",
        reason:
          label +
          " active global instruction filename is not uniquely demonstrated by the selected deterministic evidence.",
      };
    }
    return {
      status: "resolved",
      normalizedValue: active[0],
      representationValue: active,
      applicability: "active",
      runtimeDependency: "none",
      reason:
        label +
        " active global instruction filename is resolved from deterministic adapter provenance.",
    };
  };
}

function selectConfig(subject: string) {
  return (records: NeutralInspectionRecord[]): NeutralInspectionRecord[] =>
    records.filter(
      (record) =>
        record.surface === "config" && record.subject === subject,
    );
}

function configuredFilenameRole(
  role: "fallback_after_builtin_candidates" | "replaces_default_candidate_set",
  label: string,
) {
  return (records: NeutralInspectionRecord[]): NormalizedProjection => {
    const record = records[0];
    if (record.status === "unresolved" || record.status === "conditional") {
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
        reason:
          label +
          " configured-filename record is not resolved under the pinned adapter contract.",
      };
    }
    if (
      !Array.isArray(record.value) &&
      typeof record.value !== "string"
    ) {
      return {
        status: "evidence_gap",
        applicability: "unknown",
        runtimeDependency: "evidence_gap",
        reason:
          label +
          " configured-filename value is not a supported string/list representation.",
      };
    }
    return {
      status: "resolved",
      normalizedValue: role,
      representationValue: record.value,
      applicability: "active",
      runtimeDependency: "none",
      reason:
        label +
        " configured filename semantics are resolved from pinned adapter evidence.",
    };
  };
}

export const CODEX_GEMINI_STRUCTURAL_DIMENSIONS: ComparisonDimensionDefinition[] =
  [
    {
      comparisonId: "instructions.default-project-filename-contract",
      semanticDimension:
        "instructions.default_project_instruction_filename_contract",
      left: {
        agent: "codex",
        ruleIds: [
          "codex.instructions.project_root_to_cwd",
          "codex.instructions.fallback_filename",
        ],
        missingReason:
          "No resolved Codex project instruction record demonstrates the built-in filename contract.",
        select: selectCodexProjectInstructions,
        project: projectDefaultFilename("AGENTS.md", "Codex"),
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.instructions.default_filename"],
        missingReason:
          "No resolved Gemini workspace instruction record demonstrates the built-in filename contract.",
        select: selectGeminiWorkspaceInstructions,
        project: projectDefaultFilename("GEMINI.md", "Gemini"),
      },
    },
    {
      comparisonId: "instructions.active-global-filename",
      semanticDimension: "instructions.active_global_instruction_filename",
      left: {
        agent: "codex",
        ruleIds: ["codex.instructions.global_agents_base"],
        missingReason:
          "No active Codex global instruction source is available.",
        select: selectCodexGlobal,
        project: activeGlobalFilename("Codex"),
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.instructions.global_context"],
        missingReason:
          "No active Gemini global context source is available.",
        select: selectGeminiGlobal,
        project: activeGlobalFilename("Gemini"),
      },
    },
    {
      comparisonId: "instructions.configured-filename-role",
      semanticDimension: "instructions.configured_project_filename_role",
      left: {
        agent: "codex",
        ruleIds: ["codex.instructions.fallback_filename"],
        missingReason:
          "No Codex project_doc_fallback_filenames record is available.",
        select: selectConfig("project_doc_fallback_filenames"),
        project: configuredFilenameRole(
          "fallback_after_builtin_candidates",
          "Codex",
        ),
      },
      right: {
        agent: "gemini",
        ruleIds: ["gemini.instructions.configurable_filenames"],
        missingReason:
          "No Gemini context.fileName record is available.",
        select: selectConfig("context.fileName"),
        project: configuredFilenameRole(
          "replaces_default_candidate_set",
          "Gemini",
        ),
      },
    },
  ];
