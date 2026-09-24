import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = path.resolve("scripts/research-phase-e-check.mjs");
const matrixPath = path.resolve("conformance/research/phase-e/candidates.json");
const selectionPath = path.resolve("conformance/research/phase-e/selection.json");

function run(matrix = matrixPath, selection = selectionPath) {
  return spawnSync(process.execPath, [script, matrix, selection], {
    encoding: "utf8",
  });
}

test("Phase E candidate research passes the machine gate", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /selected=opencode/);
});

test("Phase E candidate research rejects filename-only semantic proof", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-phase-e-"));
  try {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    matrix.candidates.find((candidate) => candidate.candidate_id === "opencode")
      .primary_semantic_proof = "filename_only";
    const mutated = path.join(temp, "candidates.json");
    fs.writeFileSync(mutated, JSON.stringify(matrix, null, 2) + "\n");
    const result = run(mutated);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /filename-only heuristic/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("Phase E candidate research rejects multiple selected candidates", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-scope-phase-e-"));
  try {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    matrix.candidates.find((candidate) => candidate.candidate_id === "claude-code")
      .selection_status = "selected";
    const mutated = path.join(temp, "candidates.json");
    fs.writeFileSync(mutated, JSON.stringify(matrix, null, 2) + "\n");
    const result = run(mutated);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /select exactly one candidate/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
