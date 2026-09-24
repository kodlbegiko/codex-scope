import assert from "node:assert/strict";
import test from "node:test";

import {
  loadPhaseDStatusState,
  validatePhaseDStatusState,
} from "../scripts/phase-d-status-lib.mjs";

function clone(value) {
  return structuredClone(value);
}

test("Phase D hardened machine status matches repository artifacts", () => {
  const state = loadPhaseDStatusState();
  assert.doesNotThrow(() => validatePhaseDStatusState(state));
});

test("Phase D status rejects a stale structural difference count", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.structural_differences.proven_behaviorally_different_count += 1;
  assert.throws(
    () => validatePhaseDStatusState(state),
    /structural.*count/i,
  );
});

test("Phase D status rejects stale compare CLI implementation state", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.compare_cli.status = "blocked";
  assert.throws(
    () => validatePhaseDStatusState(state),
    /compare_cli\.status/i,
  );
});

test("Phase D status cannot pass when compare CLI source is absent", () => {
  const state = clone(loadPhaseDStatusState());
  state.compareCliSourceExists = false;
  assert.throws(
    () => validatePhaseDStatusState(state),
    /compare CLI source/i,
  );
});

test("Phase D status rejects schema/version contract mismatches", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.version_compatibility.comparison_schema =
    "codex-scope.semantic-comparison.v2";
  assert.throws(
    () => validatePhaseDStatusState(state),
    /version_compatibility\.comparison_schema/i,
  );
});

test("Phase D cannot be complete below the external 3-case gate", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.phase_status = "complete";
  state.status.external_proof_of_value.verified_external_user_cases = 0;
  state.status.external_proof_of_value.status = "blocked";
  assert.throws(
    () => validatePhaseDStatusState(state),
    /phase_status/i,
  );
});

test("internal PASS is forbidden while false-certainty blockers exist", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.false_certainty_blockers.count = 1;
  state.status.false_certainty_blockers.status = "blocked";
  assert.throws(
    () => validatePhaseDStatusState(state),
    /false-certainty/i,
  );
});

test("package verification cannot pass when its repository gate is absent", () => {
  const state = clone(loadPhaseDStatusState());
  state.packageContentsScriptExists = false;
  assert.throws(
    () => validatePhaseDStatusState(state),
    /package.*gate/i,
  );
});

test("exit semantics are frozen at 0, 1, and 2", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.exit_semantics.input_or_usage_tool_error = 1;
  assert.throws(
    () => validatePhaseDStatusState(state),
    /exit_semantics/i,
  );
});

test("real-repository proof count must be derived from the pinned ledger", () => {
  const state = clone(loadPhaseDStatusState());
  state.status.real_repository_proof.repository_count += 1;
  assert.throws(
    () => validatePhaseDStatusState(state),
    /real_repository_proof\.repository_count/i,
  );
});
