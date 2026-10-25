# Codex Conformance Coverage

Evidence date: **2026-10-26**
Audited upstream: **openai/codex@970111f6cb62cc02fe36a82ea7d71b37a2889c97**

This document records the October 2026 bounded Codex conformance refresh. Machine-readable artifacts remain authoritative.

## Semantic corpus

| Classification | Cases |
| --- | ---: |
| compatible | 48 |
| unsupported | 4 |
| unresolved | 5 |
| **total** | **57** |

The October delta adds seven evidence-backed rules: five bounded Permission Profile rules, the CODEX_HOME/default-home project-layer converse case, and one explicit unsupported projectless runtime boundary. Permission enforcement itself is not simulated.

## Permission Profiles

Supported static coverage now includes explicit built-in identity for `:workspace`, named profile selection, named `extends` ancestry, unknown-profile fail-closed behavior, and the current invocation-override boundary that rejects `sandbox_mode` together with `default_permissions`.

Codex Scope still does not execute filesystem/network enforcement, approvals, live `/permissions` switching, resumed-thread permission state, Windows sandbox provisioning, hooks, plugins, or MCP.

## CODEX_HOME converse case

Current upstream source and `openai/codex#54599` confirm that setting CODEX_HOME to another directory does **not** isolate a separate `$HOME/.codex` from project-layer discovery. If cwd/project root is the home directory and that directory is trusted, `$HOME/.codex/config.toml` can participate as a project layer above the active user config. The existing active-CODEX_HOME self-duplication exclusion remains intact.

## Projectless trust / permission defaults

`openai/codex#49160` and current `tui/src/projectless.rs` make these defaults conditional on runtime project discovery, saved trust, explicit overrides, managed policy, execution locality, platform sandbox state, and session restoration. Codex Scope therefore records this surface as **unsupported** rather than inventing a static final state.

## Regression corpus

The regression/change corpus remains at **5** records. The October Permission Profile work is added semantic support, not a fabricated regression. The CODEX_HOME converse case is expected current behavior, not an upstream fix/change record.

## Retained snapshots

| Snapshot | Upstream commit | Evidence date | Lifecycle role |
| --- | --- | --- | --- |
| `codex-2026-09-22-94174e44` | `94174e44...` | 2026-09-22 | historical |
| `codex-2026-09-24-e0ef5a1a` | `e0ef5a1a...` | 2026-09-24 | historical |
| `codex-2026-09-24-e0ef5a1a-corpus50` | `e0ef5a1a...` | 2026-09-24 | historical |
| `codex-2026-10-26-970111f6-corpus57` | `970111f6cb62cc02fe36a82ea7d71b37a2889c97` | 2026-10-26 | current |

The new snapshot carries forward older rules unless they were specifically reverified. Carried-forward evidence is intentionally classified as `evidence_gap`, not silently promoted to unchanged.

## October drift edge

Expected deterministic classification for `codex-2026-09-24-e0ef5a1a-corpus50` → `codex-2026-10-26-970111f6-corpus57`:

- unchanged: 2
- behavior_drift: 0
- evidence_gap: 49
- support_boundary_change: 0
- added_rule: 7
- removed_rule: 0
- tool_error: 0

The two reverified existing rules are the active CODEX_HOME project-layer exclusion and the compatibility metadata pin. The 49 evidence gaps are deliberate: this refresh did not pretend to fully revalidate every older semantic rule against 1272 upstream commits.

## Safety / false-certainty boundary

The deterministic inspector still performs no LLM calls, Codex subprocess execution, runtime network inspection, hooks, plugins, MCP execution, arbitrary inspected-repository code execution, or inspected-repository mutation. Unknown runtime/session state remains unresolved or unsupported.

Phase D external proof remains **0 / 3** and is not changed by upstream issues, maintainer comments, public-repository scans, or maintainer-authored fixtures.
