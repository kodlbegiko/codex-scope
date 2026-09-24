# OpenCode conformance coverage — Phase E

Evidence date: **2026-09-24**

Pinned upstream revision: `anomalyco/opencode@0f549842ee746e400b1f72516b0b2e292e267e2c`.

## Scope

This corpus models a bounded deterministic subset of OpenCode. The adapter consumes only explicitly supplied repository paths and inert JSON snapshots. It never invokes the OpenCode executable or upstream live config loader.

The manifest contains **31** semantic rules:

| Classification | Count |
| --- | ---: |
| compatible | 17 |
| conditional semantic state | 4 |
| unsupported | 3 |
| unresolved compatibility outcome | 11 |
| expected steady-state tool_error | 0 |

Conditional semantic states are also compatibility-unresolved; therefore the semantic-state and compatibility-outcome counts intentionally overlap rather than summing to the same buckets.

## Evidence-backed supported subset

The compatible subset covers:

- explicit project-root/cwd AGENTS.md discovery and nested directory applicability;
- explicit global and custom-config-directory AGENTS.md handling;
- path deduplication;
- explicit project-config-disabled state;
- inert config snapshot precedence for remote → global → custom → project → inline;
- supported deep merge behavior;
- instructions-array concatenation and deduplication;
- permission declaration order;
- last matching permission rule;
- supported wildcard matching;
- caller-supplied version provenance.

The corpus does not claim that a supplied snapshot is the current live OpenCode state. It only replays the supplied state.

## Fail-closed boundaries

The following remain unresolved/conditional or unsupported:

- unreadable project instruction state;
- cwd outside supplied project root;
- complete Claude Code fallback behavior;
- incomplete config snapshot sets;
- custom instruction glob expansion;
- live session approvals;
- live remote config;
- remote instruction content;
- plugins and hooks;
- MCP;
- managed/MDM/account/org state;
- externally detected version provenance;
- unknown version;
- upstream revisions outside the pinned evidence revision.

Native OpenCode diagnostics/runtime state remain authoritative for live state.

## Regression/change corpus

Three exact upstream changes are machine-bound to rules, fixtures, and assertions:

| Commit | Behavior |
| --- | --- |
| `4ba0b22b04fb593fde23ba72c75735af3cb29af6` | local config precedence over remote base |
| `0276885181da3a7f32491069e36836fbb4ae0dbc` | preserve permission config key order |
| `6daa962aaa38058a29d30fcfa824d61c128b8a19` | prioritize custom config directory AGENTS.md |

The machine source of truth is `conformance/research/opencode/regressions.json`; prose does not override it.

## Validation

```bash
npm run research:phase-e:validate
npm run research:opencode:validate
npm run research:opencode:assert
npm run test:adapter-contracts
npm run conformance:opencode:compatibility:check
npm run audit:phase-e
npm run phase-e:gate
```

The existing Codex `codex-scope.v0.1` public JSON contract is unchanged.
