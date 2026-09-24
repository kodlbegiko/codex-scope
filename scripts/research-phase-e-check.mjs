import fs from "node:fs";
import path from "node:path";

const matrixPath = path.resolve(
  process.argv[2] ?? "conformance/research/phase-e/candidates.json",
);
const selectionPath = path.resolve(
  process.argv[3] ?? "conformance/research/phase-e/selection.json",
);

function fail(message) {
  throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

try {
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));

  if (matrix.schema_version !== "codex-scope.phase-e-candidates.v1") {
    fail("unexpected candidate matrix schema_version");
  }
  if (!Array.isArray(matrix.candidates) || matrix.candidates.length !== 3) {
    fail("candidate matrix must contain exactly three candidates");
  }

  const requiredIds = ["claude-code", "cursor", "opencode"];
  const ids = matrix.candidates.map((candidate) => candidate.candidate_id).sort();
  if (JSON.stringify(ids) !== JSON.stringify([...requiredIds].sort())) {
    fail("candidate matrix must contain Claude Code, Cursor, and OpenCode exactly once");
  }

  const duplicateIds = new Set();
  for (const candidate of matrix.candidates) {
    if (duplicateIds.has(candidate.candidate_id)) {
      fail("duplicate candidate_id: " + candidate.candidate_id);
    }
    duplicateIds.add(candidate.candidate_id);

    if (
      !Array.isArray(candidate.official_documentation_evidence) ||
      candidate.official_documentation_evidence.length === 0
    ) {
      fail(candidate.candidate_id + ": official evidence must be non-empty");
    }
    for (const item of candidate.official_documentation_evidence) {
      if (!nonEmptyString(item.kind) || !nonEmptyString(item.url)) {
        fail(candidate.candidate_id + ": malformed official evidence");
      }
    }
    if (!candidate.source_inspection || !nonEmptyString(candidate.source_inspection.status)) {
      fail(candidate.candidate_id + ": source inspection status missing");
    }
    if (!candidate.precedence_evidence || !nonEmptyString(candidate.precedence_evidence.classification)) {
      fail(candidate.candidate_id + ": precedence must be classified");
    }
    if (!candidate.applicability_evidence || !nonEmptyString(candidate.applicability_evidence.classification)) {
      fail(candidate.candidate_id + ": applicability must be classified");
    }
    if (!Array.isArray(candidate.runtime_model_dependent_surfaces)) {
      fail(candidate.candidate_id + ": runtime/model dependent surfaces must be explicit");
    }
    if (
      !Array.isArray(candidate.evidence_provenance) ||
      candidate.evidence_provenance.length === 0 ||
      !candidate.evidence_provenance.every(nonEmptyString)
    ) {
      fail(candidate.candidate_id + ": source/evidence provenance must be non-empty");
    }
    if (candidate.primary_semantic_proof === "filename_only") {
      fail(candidate.candidate_id + ": filename-only heuristic cannot be primary semantic proof");
    }
    if (!nonEmptyString(candidate.inspected_revision)) {
      fail(candidate.candidate_id + ": inspected revision missing");
    }
    if (!nonEmptyString(candidate.native_runtime_authority_boundary)) {
      fail(candidate.candidate_id + ": native runtime authority boundary missing");
    }
  }

  const sourceInspected = matrix.candidates.filter(
    (candidate) => candidate.source_inspection.status === "inspected",
  );
  if (sourceInspected.length < 2) {
    fail("at least two candidates must have upstream source inspection");
  }

  const selected = matrix.candidates.filter(
    (candidate) => candidate.selection_status === "selected",
  );
  if (selected.length !== 1) {
    fail("candidate matrix must select exactly one candidate");
  }
  if (selected[0].deterministic_resolution_feasibility !== "sufficient") {
    fail("selected candidate deterministic surface is not sufficient");
  }

  if (selection.schema_version !== "codex-scope.phase-e-selection.v1") {
    fail("unexpected selection schema_version");
  }
  if (selection.selected_candidate !== selected[0].candidate_id) {
    fail("selection result does not match candidate matrix");
  }
  if (selection.selected_upstream_revision !== selected[0].inspected_revision) {
    fail("selection revision does not match selected candidate evidence");
  }
  if (selection.e1_status !== "complete") {
    fail("E1 selection result must be complete only after matrix validation");
  }
  if (selection.candidate_matrix !== "conformance/research/phase-e/candidates.json") {
    fail("selection result must bind the checked-in candidate matrix");
  }

  console.log(
    "research:phase-e:validate: ok (selected=" +
      selected[0].candidate_id +
      "; source_inspected=" +
      sourceInspected.length +
      "/3)",
  );
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
