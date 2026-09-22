# Conformance status

Evidence date: **2026-09-22**

This file tracks implementation state from checked-in code and reproducible evidence. It is not a wishlist.

## Phase 0 — Codex conformance foundation

- [x] Machine-readable evidence schema
- [x] Explicit semantic corpus: **32 rules**
- [x] Instruction/config/trust/invocation fixtures and deterministic probes
- [x] Regression / behavior-change corpus: **4 records**
- [x] Machine-readable compatibility matrix
- [x] Generated-matrix freshness check
- [x] Conformance-aware CI outcome taxonomy
- [x] Current upstream source pinned to `openai/codex@94174e44cbc54cece45f6052328ca0c2cd7a8a2a`
- [x] 2026-09-22 evidence freshness review
- [x] False-certainty corrections found during the review: project instruction trust gating and legacy approval-policy classification
- [ ] Full clean-checkout CI run on the Phase 0 PR
- [ ] Current upstream feedback-loop interaction after CI validates the reproduction

### Current exit-gate accounting

| Gate | Evidence | Status |
|---|---|---|
| ≥20 semantic fixtures | 32 manifest rules with deterministic fixture probes | satisfied |
| ≥3 regression/change fixtures | 4 records in `conformance/regressions.json` | satisfied |
| Machine-readable evidence metadata | `conformance/manifest.json` + schemas | satisfied |
| Machine-readable compatibility matrix | generated `conformance/compatibility-matrix.json` | satisfied |
| Deterministic clean-checkout reproduction | GitHub Actions PR run | pending |
| Corpus/schema/expected-output/regression/matrix validation | `scripts/conformance-check.mjs` + generator check | implemented; CI pending |
| supported / unsupported / unresolved separation | explicit expected outcomes + CI taxonomy | satisfied |
| zero known false-certainty blocker | trust and approval-policy drift fixed in this branch | satisfied after current audit; CI pending |
| meaningful upstream interaction | existing #34193 discrepancy re-verified; follow-up waits for green CI | pending |

Phase 0 is therefore **not yet declared exit-gate complete** in this file.

## Phase A — adapter-ready neutral core

- [ ] Neutral records
- [ ] Minimal `CodexAdapter` seam
- [ ] Existing CLI behavior-preservation contract
- [ ] Byte-for-byte compatibility tests where promised

Status: **not started**. Phase 0 must close first.

## Phase B — compatibility awareness

- [x] Evidence date and resolver version exist in the internal compatibility corpus
- [x] Unknown installed Codex version remains explicitly `unknown`
- [ ] Public/supplied version input design
- [ ] Safe version-range warning behavior
- [ ] Adapter version field

Status: **partial infrastructure only**; no Phase B public feature is claimed.

## Phase C — second-agent research spike

Status: **not started**.

No Gemini CLI, Claude Code, Cursor, or OpenCode adapter is implemented by Phase 0.

## Phase D — cross-agent compare

Status: **not started**.

## Phase E — additional adapters

Status: **not started**.
