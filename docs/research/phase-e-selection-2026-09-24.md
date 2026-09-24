# Phase E third-adapter candidate selection — 2026-09-24

Phase E uses the existing **C — conformance-first** product rule. This record is a human-readable view of the machine source of truth in `conformance/research/phase-e/candidates.json` and `selection.json`.

## Decision

**Selected candidate: OpenCode**

Pinned upstream evidence revision: `anomalyco/opencode@0f549842ee746e400b1f72516b0b2e292e267e2c`.

OpenCode is selected because the current upstream repository exposes the relevant instruction, config, and permission implementation well enough to define a bounded static resolver. The live loader also makes its network, account, managed, plugin, MCP, and dependency side effects visible, so Codex Scope can exclude those surfaces instead of accidentally reproducing them.

The selection does **not** authorize a full OpenCode runtime emulator. Native OpenCode remains authoritative for live session state.

## Claude Code

Claude Code has strong upstream evidence, including the built-in `agents-md` plugin and tests. Its current instruction behavior, however, includes hook-driven and Read-triggered attachment behavior, managed modes, plugin lifecycle, and session attachment state. Those surfaces are evidence-rich but carry a larger static false-certainty boundary than the OpenCode subset selected here.

Status: **not selected for Phase E third adapter**. This is not a claim that Claude Code is unsupported forever.

## Cursor

Cursor's official rules documentation is detailed and records project, user, team, nested AGENTS.md, path-scoped, manual, and relevance-selected rules. The public `cursor/cursor` repository does not expose the production resolver implementation needed for the same source-level conformance discipline, and some applicability is explicitly Agent/relevance/context selected.

Status: **not selected for Phase E third adapter**.

## E1 machine gate

Run:

```bash
npm run research:phase-e:validate
```

The validator requires exactly the three candidates, official evidence for each, at least two source-inspected candidates, explicit precedence/applicability/runtime classifications, non-empty provenance, exactly one selection, sufficient deterministic surface for the selected candidate, and no filename-only primary semantic proof.

E1 completion authorizes the **OpenCode conformance spike only**. Adapter authorization remains an E3 decision after semantic corpus, regressions, fixtures, assertions, compatibility, false-certainty audit, full test/package gates, and PR-head CI.

Phase D remains independent at **0 / 3** verified external users with status `blocked_external_proof`.
