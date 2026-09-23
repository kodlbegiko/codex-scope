import fs from "node:fs";
import path from "node:path";

const REQUIRED_CASE_FIELDS = [
  "id",
  "case_identity",
  "reporter",
  "issue_url",
  "repository_or_context",
  "source_type",
  "codex_input_reference",
  "gemini_input_reference",
  "comparison_reference",
  "configuration_problem",
  "independent_problem_evidence",
  "reproduction_instructions",
  "validation_status",
  "unique_case",
  "maintainer_validated",
  "sanitization_confirmed",
];

const EVIDENCE_FIELDS = [
  ["codex_input_reference", "Codex input evidence"],
  ["gemini_input_reference", "Gemini input evidence"],
  ["comparison_reference", "comparison output evidence"],
  ["configuration_problem", "configuration problem"],
  ["independent_problem_evidence", "independent problem evidence"],
  ["reproduction_instructions", "reproduction instructions"],
];

const SOURCE_TYPES = new Set([
  "external_reporter",
  "fixture",
  "maintainer_synthetic",
]);

const VALIDATION_STATUSES = new Set(["pending", "verified", "rejected"]);

function readJson(root, relativePath) {
  return JSON.parse(
    fs.readFileSync(path.resolve(root, relativePath), "utf8"),
  );
}

function fail(message) {
  throw new Error("External user case validation failed: " + message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function expectEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      label +
        " is stale: expected " +
        JSON.stringify(expected) +
        " but received " +
        JSON.stringify(actual),
    );
  }
}

function validateCaseShape(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    fail("case[" + index + "] must be an object");
  }

  for (const field of REQUIRED_CASE_FIELDS) {
    if (!Object.hasOwn(item, field)) {
      fail("case[" + index + "] is missing required field " + field);
    }
  }

  for (const field of [
    "id",
    "case_identity",
    "reporter",
    "issue_url",
    "repository_or_context",
  ]) {
    if (!nonEmptyString(item[field])) {
      fail("case[" + index + "]." + field + " must be a non-empty string");
    }
  }

  for (const [field] of EVIDENCE_FIELDS) {
    if (typeof item[field] !== "string") {
      fail("case[" + index + "]." + field + " must be a string");
    }
  }

  if (!SOURCE_TYPES.has(item.source_type)) {
    fail("case[" + index + "].source_type is invalid");
  }
  if (!VALIDATION_STATUSES.has(item.validation_status)) {
    fail("case[" + index + "].validation_status is invalid");
  }

  for (const field of [
    "unique_case",
    "maintainer_validated",
    "sanitization_confirmed",
  ]) {
    if (typeof item[field] !== "boolean") {
      fail("case[" + index + "]." + field + " must be boolean");
    }
  }
}

function validateVerifiedExternalCase(item) {
  for (const [field, label] of EVIDENCE_FIELDS) {
    if (!nonEmptyString(item[field])) {
      fail(item.id + " verified case is missing " + label);
    }
  }

  if (item.unique_case !== true) {
    fail(item.id + " verified case is not marked as a unique case");
  }
  if (item.maintainer_validated !== true) {
    fail(item.id + " verified case lacks maintainer validation");
  }
  if (item.sanitization_confirmed !== true) {
    fail(item.id + " verified case lacks sanitization confirmation");
  }
}

export function validateExternalUserCasesLedger(ledger) {
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
    fail("ledger must be an object");
  }

  expectEqual(
    ledger.schema_version,
    "codex-scope.external-user-cases.v1",
    "schema_version",
  );

  if (!ledger.gate || typeof ledger.gate !== "object") {
    fail("gate must be an object");
  }
  expectEqual(
    ledger.gate.required_verified_cases,
    3,
    "gate.required_verified_cases",
  );
  if (!Array.isArray(ledger.cases)) {
    fail("cases must be an array");
  }

  const ids = new Set();
  const issueUrls = new Set();
  const reporterCaseKeys = new Set();
  let verifiedCount = 0;

  for (const [index, item] of ledger.cases.entries()) {
    validateCaseShape(item, index);

    if (ids.has(item.id)) {
      fail("duplicate case id: " + item.id);
    }
    ids.add(item.id);

    if (issueUrls.has(item.issue_url)) {
      fail("duplicate issue URL: " + item.issue_url);
    }
    issueUrls.add(item.issue_url);

    const reporterCaseKey =
      item.reporter.trim().toLowerCase() +
      "\u0000" +
      item.case_identity.trim().toLowerCase();
    if (reporterCaseKeys.has(reporterCaseKey)) {
      fail(
        "duplicate reporter + case identity: " +
          item.reporter +
          " / " +
          item.case_identity,
      );
    }
    reporterCaseKeys.add(reporterCaseKey);

    if (
      item.validation_status === "verified" &&
      item.source_type !== "external_reporter"
    ) {
      fail(
        item.id +
          " cannot be verified external proof because source_type=" +
          item.source_type,
      );
    }

    if (
      item.validation_status === "verified" &&
      item.source_type === "external_reporter"
    ) {
      validateVerifiedExternalCase(item);
      verifiedCount += 1;
    }
  }

  const required = ledger.gate.required_verified_cases;
  const status = verifiedCount >= required ? "pass" : "blocked";

  expectEqual(
    ledger.gate.verified_count,
    verifiedCount,
    "gate.verified_count",
  );
  expectEqual(ledger.gate.status, status, "gate.status");

  return {
    verified_count: verifiedCount,
    required,
    status,
  };
}

export function loadExternalUserCasesState(root = process.cwd()) {
  return {
    root,
    ledger: readJson(
      root,
      "conformance/comparison/external-user-cases.json",
    ),
    phaseStatus: readJson(
      root,
      "conformance/comparison/phase-d-status.json",
    ),
  };
}

export function validateExternalUserCasesState(state) {
  const result = validateExternalUserCasesLedger(state.ledger);
  const external = state.phaseStatus.external_proof_of_value;

  if (!external || typeof external !== "object") {
    fail("Phase D status external_proof_of_value is missing");
  }

  expectEqual(
    external.required_external_user_cases,
    result.required,
    "Phase D status external required count",
  );
  expectEqual(
    external.verified_external_user_cases,
    result.verified_count,
    "Phase D status external verified count",
  );
  expectEqual(
    external.status,
    result.status,
    "Phase D status external status",
  );
  expectEqual(
    state.phaseStatus.phase_status,
    result.status === "pass" ? "complete" : "blocked_external_proof",
    "Phase D status phase_status",
  );

  return result;
}

export function validateExternalUserCasesRepository(root = process.cwd()) {
  return validateExternalUserCasesState(loadExternalUserCasesState(root));
}
