# Codex Conformance Coverage

Evidence date: **2026-09-24**

This document records the verified v0.4 Codex Conformance Observatory coverage. It is derived from checked-in machine-readable artifacts and does not replace them.

## Semantic corpus

Source: `conformance/manifest.json`

| Classification | Cases |
| --- | ---: |
| compatible | 42 |
| unsupported | 3 |
| unresolved | 5 |
| **total** | **50** |

Every manifest rule has a unique rule id, pinned upstream evidence, a deterministic fixture/probe, deterministic assertions, an explicit compatibility outcome, and a fail-closed execution path through `scripts/conformance-check.mjs`.

The current retained observatory snapshot contains **51 semantic records**: the 50 manifest rules plus the evidence-only unsupported network-policy finding `codex.network.application_policy_extension_backends`. That additional record does not expand the deterministic runtime support boundary.

## Regression corpus

Source: `conformance/regressions.json` (`codex-scope.regressions.v2`)

| Regression | Kind | Upstream commit | Date | Compatibility | Binding |
| --- | --- | --- | --- | --- | --- |
| `codex-config-home-project-layer-exclusion` | upstream fix | `dd6c1d3787aa3c8032f6e6496e2bf25c47ddb37a` | 2026-01-30 | compatible | full supported boundary |
| `codex-agents-home-project-root-duplication` | current upstream discrepancy | `94174e44cbc54cece45f6052328ca0c2cd7a8a2a` | 2026-09-22 | compatible parity record | full supported boundary |
| `codex-profile-v2-file-selection` | upstream behavior change | `8a511d5881e9e8c449aeb53b471170111f859e48` | 2026-05-21 | compatible | full supported boundary |
| `codex-approval-policy-untrusted-removed` | upstream semantic change | `942af8447b1d1addc81fb3c3135293497d479a06` | 2026-08-20 | unsupported | full supported boundary |
| `codex-project-doc-budget-shared-across-environments` | upstream semantic change | `85e0661c3baacc62db7b006d2b8085b006d0795e` | 2026-08-07 | unresolved | partial supported boundary |

The v2 regression schema requires exact upstream repository, commit, date, compatibility classification, fixture binding, assertion count, and coverage boundary. `scripts/conformance-check.mjs` cross-checks those fields against the manifest so a JSON-only regression entry cannot satisfy the gate.

The multi-environment project-doc budget change remains intentionally **unresolved** beyond the single-environment deterministic fixture. Codex Scope does not simulate unsupported multi-environment runtime composition.

## Retained historical evidence

Source: `conformance/snapshots/index.json` (`codex-scope.snapshot-index.v2`)

| Snapshot | Upstream commit | Evidence date | Lifecycle role | Semantic records |
| --- | --- | --- | --- | ---: |
| `codex-2026-09-22-94174e44` | `94174e44cbc54cece45f6052328ca0c2cd7a8a2a` | 2026-09-22 | historical | 32 |
| `codex-2026-09-24-e0ef5a1a` | `e0ef5a1a0f6421601baaa679fb37eddaa4e9c8c1` | 2026-09-24 | historical | 33 |
| `codex-2026-09-24-e0ef5a1a-corpus50` | `e0ef5a1a0f6421601baaa679fb37eddaa4e9c8c1` | 2026-09-24 | current | 51 |

Retained snapshot files are immutable evidence. Lifecycle role changes are authoritative in the v2 index so superseding a current snapshot does not require rewriting the older retained file.

## Compatibility history and drift

Source: `conformance/compatibility-history.json`

### `codex-2026-09-22-94174e44` → `codex-2026-09-24-e0ef5a1a`

- unchanged: 0
- behavior_drift: 0
- evidence_gap: 32
- support_boundary_change: 0
- added_rule: 1
- removed_rule: 0
- tool_error: 0

### `codex-2026-09-24-e0ef5a1a` → `codex-2026-09-24-e0ef5a1a-corpus50`

- unchanged: 1
- behavior_drift: 0
- evidence_gap: 32
- support_boundary_change: 0
- added_rule: 18
- removed_rule: 0
- tool_error: 0

`evidence_gap` is not treated as `unchanged`. `tool_error` is reserved for Codex Scope parser/generator/validation/runtime failure and is not used to hide upstream semantic changes or missing evidence.

## Upstream finding

`conformance/upstream-findings.json` records:

- `codex-network-policy-extension-http-client-fix-2026-09-24`
- upstream commit `1d87af5faa75c2c09785cd088353d3236333673f`
- evidence date 2026-09-24
- related rule `codex.network.application_policy_extension_backends`

This remains an evidence-backed **unsupported runtime/network semantic**. The deterministic inspector does not execute extension HTTP clients, network requests, hooks, plugins, or MCP servers.

## Maintainer-facing upstream feedback

`conformance/upstream-feedback.json` records the source-level recheck posted to `openai/codex#34193` on 2026-09-22:

- interaction: <https://github.com/openai/codex/issues/34193#issuecomment-5773697356>
- tested upstream commit: `94174e44cbc54cece45f6052328ca0c2cd7a8a2a`
- rule: `codex.instructions.codex_home_project_root_duplication`
- regression: `codex-agents-home-project-root-duplication`

The feedback explicitly states its verification boundary: source-level recheck plus existing upstream runtime reproductions, not a fresh current binary execution by Codex Scope. No duplicate upstream issue was created to satisfy a milestone.

## v0.4 engineering gate

The v0.4 Observatory engineering gate is satisfied when the PR head passes the repository CI workflow:

- semantic cases ≥ 50
- true regression/change records ≥ 5
- retained snapshots ≥ 2
- deterministic compatibility history
- deterministic drift classification
- evidence-backed upstream finding
- machine-verifiable maintainer-facing feedback
- zero known false-certainty blocker in the supported subset
- `npm pack`
- `npm publish --dry-run`

Phase D external proof remains a separate non-blocking track at **0 / 3** verified external-user cases.
