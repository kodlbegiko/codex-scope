# Phase E readiness — OpenCode third adapter

Date: **2026-09-24**

## Current state

E1 and E2 are complete. The E3 machine suite has passed on PR #25, including the shared adapter contracts, generated compatibility check, false-certainty audit, full repository tests, build, and package dry-run gates.

`adapter_authorized=true` is now recorded in `conformance/research/phase-e/status.json`, based on green PR-head CI Run #187 for `62cd1e6ff68389709c007c48a3e666dac15bb2b9`. The authorization commit and documentation synchronization still require their own final current-head CI before merge.

## Candidate decision

Selected: **OpenCode**

Pinned source evidence: `anomalyco/opencode@0f549842ee746e400b1f72516b0b2e292e267e2c`.

Claude Code and Cursor are not rejected as products. They were not selected for this gate because their current false-certainty surface is larger for the specific static conformance job.

## Runtime authority boundary

Codex Scope is authoritative only for what it deterministically derives from the explicit inputs inside its documented subset.

For live OpenCode state, **native OpenCode diagnostics/runtime state are authoritative**, including remote, session, managed/account/org, plugin, MCP, provider, tool, and model-dependent behavior.

## Release boundary

Phase E engineering readiness is separate from release state:

- engineering gate: complete;
- adapter authorized: true;
- release-ready: true for the bounded engineering subset, subject to final current-head CI before merge;
- npm published: false; no Phase E release has been published by this work;
- package version: unchanged from the existing package line.

## Phase D invariant

Phase D remains:

```text
external users: 0 / 3
status: blocked_external_proof
```

No Phase E fixture, maintainer test, public repository scan, or upstream source record counts toward that external-user gate.
