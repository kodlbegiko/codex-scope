# Conformance status

Evidence dates: **Codex 2026-09-22 · Gemini CLI 2026-09-23**

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
- [x] Full clean-checkout CI run on the Phase 0 PR
- [x] Current upstream feedback-loop interaction: source-level recheck posted to `openai/codex#34193` after green CI

### Current exit-gate accounting

| Gate | Evidence | Status |
|---|---|---|
| ≥20 semantic fixtures | 32 manifest rules with deterministic fixture probes | satisfied |
| ≥3 regression/change fixtures | 4 records in `conformance/regressions.json` | satisfied |
| Machine-readable evidence metadata | `conformance/manifest.json` + schemas | satisfied |
| Machine-readable compatibility matrix | generated `conformance/compatibility-matrix.json` | satisfied |
| Deterministic clean-checkout reproduction | GitHub Actions PR run #31 from a fresh checkout | satisfied |
| Corpus/schema/expected-output/regression/matrix validation | `scripts/conformance-check.mjs` + generator check | satisfied |
| supported / unsupported / unresolved separation | explicit expected outcomes + CI taxonomy | satisfied |
| zero known false-certainty blocker | trust and approval-policy drift fixed in this branch; CI green | satisfied |
| meaningful upstream interaction | current-main source recheck posted to `openai/codex#34193`, linked to PR #13 | satisfied |

Phase 0 therefore satisfies the **current Phase 0 exit gate (9/9 tracked gates)**. This does not freeze the corpus; future upstream changes are expected to create deliberate behavior drift and evidence updates.

## Phase A — adapter-ready neutral core

- [x] Neutral inspection / provenance / evidence records
- [x] Minimal static `AgentAdapter` contract
- [x] Codex-specific semantics routed through `codexAdapter`
- [x] Existing `buildEnvironment` API preserved as a compatibility wrapper
- [x] Existing `inspect`, `instructions`, `config`, and `why` behavior preserved
- [x] `codex-scope.v0.1` JSON marker and shape preserved
- [x] Adapter contract and neutral-record tests
- [x] Byte-for-byte renderer equivalence tests across wrapper and direct adapter paths
- [x] All Phase 0 conformance checks remain green
- [x] Clean-checkout PR CI passes without runtime network, subprocesses, LLMs, API keys, hooks, plugins, MCP, or project mutation

### Phase A exit gate

| Gate | Evidence | Status |
|---|---|---|
| Neutral internal model exists | `src/core.ts` shared records/provenance/evidence/capabilities | satisfied |
| Codex semantics enter through adapter | `src/adapters/codex.ts` builds the Codex environment and neutral records | satisfied |
| Shared resolver entry is not Codex-only architecture | `src/environment.ts` delegates through the static adapter contract | satisfied |
| Phase 0 conformance remains green | unchanged corpus + CI conformance validation | satisfied |
| Original CLI tests remain green | existing CLI suite unchanged and passing | satisfied |
| No semantic regression | conformance outcome remains free of `behavior_drift` | satisfied |
| No schema regression | legacy JSON remains `codex-scope.v0.1`; adapter metadata stays internal | satisfied |
| Deterministic behavior preserved | adapter contract tests + unchanged resolver inputs | satisfied |
| Clean checkout reproducible | GitHub Actions PR checkout passes full workflow | satisfied |
| Security constraints preserved | static lint + architecture; no network/subprocess/model/plugin execution | satisfied |

Phase A satisfies the current exit gate. Phase B may proceed; second-agent work remains blocked until the Phase B core gate is also satisfied.

## Phase B — compatibility awareness / drift detection

- [x] Generated matrix pins resolver version, adapter version, evidence date, upstream commit, and rule classifications
- [x] Matrix generator remains the deterministic source of truth and stale output fails CI
- [x] `codex-scope compatibility` exposes a deterministic human-readable summary
- [x] `codex-scope.compatibility.v1` machine-readable summary
- [x] Explicit offline `--codex-version` input
- [x] Unknown tested/local version remains `unknown` / `unresolved`
- [x] No subprocess-based local version probe in deterministic core
- [x] Per-rule machine-readable expected vs actual conformance result
- [x] `compatible` / `behavior_drift` / `unsupported` / `unresolved` / `tool_error` taxonomy retained
- [x] Semantic drift and tool failure use distinct fail-closed exit status
- [x] Existing known discrepancy remains regression-covered
- [x] Clean-checkout GitHub Actions run #37 passes the full workflow

### Phase B exit gate

| Gate | Evidence | Status |
|---|---|---|
| Matrix generated from source of truth | `scripts/generate-compatibility.mjs` | satisfied |
| Generated drift detected by CI | `conformance:matrix:check` in CI | satisfied |
| Evidence provenance machine-readable | matrix + `codex-scope compatibility --json` | satisfied |
| Upstream commit/date explicit | compatibility matrix/summary | satisfied |
| Outcome taxonomy stable | shared core type + conformance harness | satisfied |
| Unknown version avoids false certainty | supplied/unknown version tests keep outcome unresolved | satisfied |
| Known discrepancy regression-covered | `openai/codex#34193` fixture/regression record | satisfied |
| Semantic drift vs tool failure distinguishable | per-rule JSON + exit 1 vs exit 2 | satisfied |
| Phase A/B tests and clean checkout green | GitHub Actions run #37 | satisfied |

Phase B satisfies the Codex core exit gate. Phase C subsequently completed its independent research, authorization, and implementation gates.

## Phase C — second-agent research spike

Status: **complete**.

Gemini CLI was selected and implemented for the bounded deterministic subset recorded in [`conformance/research/gemini-cli/manifest.json`](../conformance/research/gemini-cli/manifest.json).

| Gate | Evidence | Status |
|---|---|---|
| Candidate selection pinned | Gemini/Claude/Cursor evidence comparison | satisfied |
| Deterministic corpus threshold | 32 Codex + 27 Gemini = 59 cases | satisfied |
| Sanitized repository validation | three public repository fixtures | satisfied |
| External evidence | three distinct upstream interactions | satisfied |
| Adapter boundary explicit | supported/unresolved/unsupported manifest states | satisfied |
| Runtime safety | no CLI/model/network/hook/plugin/MCP execution | satisfied |
| Implementation integrity | source, fixture, contract tests, and machine gates | satisfied |

The Gemini adapter remains a preview of the shared conformance core. No public cross-agent comparison command is included in Phase C.

## Phase D — cross-agent compare

Status: **not started**.

## Phase E — additional adapters

Status: **not started**.
