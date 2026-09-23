import assert from "node:assert/strict";
import test from "node:test";

import {
  loadExternalUserCasesState,
  validateExternalUserCasesState,
} from "../scripts/external-user-cases-lib.mjs";

function clone(value) {
  return structuredClone(value);
}

function validCase(id, reporter, issueNumber, caseIdentity = id) {
  return {
    id,
    case_identity: caseIdentity,
    reporter,
    issue_url:
      "https://github.com/kodlbegiko/codex-scope/issues/" + issueNumber,
    repository_or_context: "external/example-" + id,
    source_type: "external_reporter",
    codex_input_reference: "issue://" + issueNumber + "#codex-input",
    gemini_input_reference: "issue://" + issueNumber + "#gemini-input",
    comparison_reference: "issue://" + issueNumber + "#comparison-output",
    configuration_problem:
      "A real cross-agent configuration problem reproduced independently.",
    independent_problem_evidence:
      "The reporter observed the problem before adapting it into Codex Scope input.",
    reproduction_instructions:
      "Use the sanitized inputs from the issue and run codex-scope compare.",
    validation_status: "verified",
    unique_case: true,
    maintainer_validated: true,
    sanitization_confirmed: true,
  };
}

function setCases(state, cases) {
  state.ledger.cases = cases;
  const verified = cases.filter(
    (item) =>
      item.validation_status === "verified" &&
      item.source_type === "external_reporter" &&
      item.unique_case === true &&
      item.maintainer_validated === true &&
      item.sanitization_confirmed === true,
  ).length;
  state.ledger.gate.verified_count = verified;
  state.ledger.gate.status = verified >= 3 ? "pass" : "blocked";
  state.phaseStatus.external_proof_of_value.verified_external_user_cases =
    verified;
  state.phaseStatus.external_proof_of_value.status =
    verified >= 3 ? "pass" : "blocked";
  state.phaseStatus.phase_status =
    verified >= 3 ? "complete" : "blocked_external_proof";
}

test("external user case ledger is truthful and synchronized with Phase D status", () => {
  const state = loadExternalUserCasesState();
  const result = validateExternalUserCasesState(state);
  assert.equal(result.verified_count, 0);
  assert.equal(result.required, 3);
  assert.equal(result.status, "blocked");
});

test("duplicate external case IDs fail closed", () => {
  const state = clone(loadExternalUserCasesState());
  setCases(state, [
    validCase("duplicate", "alice", 1001),
    validCase("duplicate", "bob", 1002),
  ]);
  assert.throws(
    () => validateExternalUserCasesState(state),
    /duplicate.*id/i,
  );
});

test("duplicate issue URLs fail closed", () => {
  const state = clone(loadExternalUserCasesState());
  const first = validCase("case-a", "alice", 1001);
  const second = validCase("case-b", "bob", 1002);
  second.issue_url = first.issue_url;
  setCases(state, [first, second]);
  assert.throws(
    () => validateExternalUserCasesState(state),
    /duplicate.*issue/i,
  );
});

test("same reporter and case identity cannot be counted twice", () => {
  const state = clone(loadExternalUserCasesState());
  setCases(state, [
    validCase("case-a", "alice", 1001, "same-problem"),
    validCase("case-b", "alice", 1002, "same-problem"),
  ]);
  assert.throws(
    () => validateExternalUserCasesState(state),
    /reporter.*case identity/i,
  );
});

for (const [field, pattern] of [
  ["codex_input_reference", /Codex input/i],
  ["gemini_input_reference", /Gemini input/i],
  ["comparison_reference", /comparison output/i],
  ["configuration_problem", /configuration problem/i],
  ["independent_problem_evidence", /independent.*evidence/i],
]) {
  test("missing " + field + " fails closed", () => {
    const state = clone(loadExternalUserCasesState());
    const item = validCase("missing-" + field, "alice", 1100);
    item[field] = "";
    setCases(state, [item]);
    assert.throws(() => validateExternalUserCasesState(state), pattern);
  });
}

test("unverified external cases do not count", () => {
  const state = clone(loadExternalUserCasesState());
  const pending = validCase("pending", "alice", 1201);
  pending.validation_status = "pending";
  pending.maintainer_validated = false;
  setCases(state, [pending]);
  const result = validateExternalUserCasesState(state);
  assert.equal(result.verified_count, 0);
  assert.equal(result.status, "blocked");
});

test("fixture and maintainer-synthetic records never count as external proof", () => {
  const state = clone(loadExternalUserCasesState());
  const fixture = validCase("fixture", "maintainer", 1202);
  fixture.source_type = "fixture";
  fixture.validation_status = "rejected";
  fixture.maintainer_validated = false;
  const synthetic = validCase("synthetic", "maintainer", 1203);
  synthetic.source_type = "maintainer_synthetic";
  synthetic.validation_status = "rejected";
  synthetic.maintainer_validated = false;
  setCases(state, [fixture, synthetic]);
  const result = validateExternalUserCasesState(state);
  assert.equal(result.verified_count, 0);
});

test("verified count is derived from ledger contents rather than trusted as input", () => {
  const state = clone(loadExternalUserCasesState());
  setCases(state, [validCase("case-a", "alice", 1301)]);
  state.ledger.gate.verified_count = 2;
  assert.throws(
    () => validateExternalUserCasesState(state),
    /verified_count.*stale/i,
  );
});

test("Phase D status external count must equal the external ledger", () => {
  const state = clone(loadExternalUserCasesState());
  setCases(state, [validCase("case-a", "alice", 1302)]);
  state.phaseStatus.external_proof_of_value.verified_external_user_cases = 0;
  assert.throws(
    () => validateExternalUserCasesState(state),
    /Phase D status.*external/i,
  );
});

test("three claimed verified cases still fail when one lacks independent evidence", () => {
  const state = clone(loadExternalUserCasesState());
  const cases = [
    validCase("case-a", "alice", 1401),
    validCase("case-b", "bob", 1402),
    validCase("case-c", "carol", 1403),
  ];
  cases[2].independent_problem_evidence = "";
  setCases(state, cases);
  assert.throws(
    () => validateExternalUserCasesState(state),
    /independent.*evidence/i,
  );
});
