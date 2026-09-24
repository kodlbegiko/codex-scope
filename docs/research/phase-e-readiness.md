# Phase E readiness — OpenCode third adapter

Date: **2026-09-24**

## Current state

E1 and E2 are complete. The E3 machine suite has passed on PR #25, including the shared adapter contracts, generated compatibility check, false-certainty audit, full repository tests, build, and package dry-run gates.

Final `adapter_authorized=true` remains intentionally withheld until the documentation/status synchronization commit itself receives green PR-head CI. The machine source of truth is `conformance/research/phase-e/status.json`.

## Candidate decision

Selected: **OpenCode**

Pinned source evidence: `anomalyco/opencode@0f549842ee746e400b1f72516b0b2e292e267e2c`.

Claude Code and Cursor are not rejected as products. They were not selected for this gate because their current false-certainty surface is larger for the specific static conformance job.

## Runtime authority boundary

Codex Scope is authoritative only for what it deterministically derives from the explicit inputs inside its documented subset.

For live OpenCode state, **native OpenCode diagnostics/runtime state are authoritative**, including remote, session, managed/account/org, plugin, MCP, provider, tool, and model-dependent behavior.

## Release boundary

Phase E engineering readiness is separate from release state:

- engineering gate: pending final authorization CI;
- release-ready: not declared by this document;
- npm published: no Phase E release has been published by this work;
- package version: unchanged from the existing package line.

## Phase D invariant

Phase D remains:

```text
external users: 0 / 3
status: blocked_external_proof
```

No Phase E fixture, maintainer test, public repository scan, or upstream source record counts toward that external-user gate.
