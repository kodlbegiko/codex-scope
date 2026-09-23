# Changelog

## Unreleased

## 0.2.0 — 2026-09-23

Conformance-backed compatibility release that preserves the existing Codex diagnostic contract while making its evidence boundary inspectable and testable.

### Added

- Add a 32-rule semantic conformance corpus and 4 regression/change records with pinned evidence metadata.
- Add a generated compatibility matrix and `codex-scope compatibility` terminal/JSON output.
- Add an offline `--codex-version` input that records supplied version context without invoking Codex or guessing compatibility.
- Add a neutral static adapter seam and shared provenance, capability, and evidence records for later evidence-gated agent support.
- Add machine-readable conformance validation with distinct `compatible`, `behavior_drift`, `unsupported`, `unresolved`, and `tool_error` outcomes.

### Changed

- Align project trust, instruction discovery, and historical approval-policy handling with current pinned Codex evidence.
- Make generated compatibility-matrix drift a CI failure.
- Preserve the original four commands and the `codex-scope.v0.1` JSON contract while adding the separate `codex-scope.compatibility.v1` contract.

### Fixed

- Preserve unresolved invocation state when a discovered legacy approval policy is unsupported.
- Propagate report-level instruction uncertainty into neutral adapter records.
- Keep conformance JSON failures machine-readable even when corpus metadata is missing or invalid.

### Safety properties

- Inspection remains read-only, deterministic, and fail-closed.
- No LLM calls, runtime network access, hook/plugin/MCP execution, or inspected-repository mutation were added.

## 0.1.2 — 2026-08-19

Release-readiness and self-reporting correctness patch.

### Fixed

- Derive CLI and compatibility self-reported version from `package.json` so `--version` and JSON compatibility metadata cannot drift independently.

### Changed

- Reframe the public README around a 10-second problem/proof/quickstart flow and a factual comparison with native Codex diagnostics.
- Reorder the roadmap around real-world conformance and compatibility evidence instead of leading with volatile Hooks semantics.
- Add a current-upstream AGENTS/CODEX_HOME parity fixture, safer issue templates, a deterministic demo script, and post-v0.1.1 strategy evidence.

## 0.1.1 — 2026-08-19

Compatibility and onboarding hotfix.

### Fixed

- Skip `$CODEX_HOME` when traversing project `.codex` layers, matching current Codex behavior and preventing home-directory invocations from inventing project-trust uncertainty.
- Add regression coverage for home-directory invocation and for `$CODEX_HOME` located inside a project tree.
- Correct the no-install `npx` Quickstart when the npm package name differs from the CLI binary name.

## 0.1.0 — 2026-08-19

First public release of Codex Scope.

### Added

- `codex-scope inspect` for a concise effective-environment overview.
- `codex-scope instructions` for AGENTS instruction discovery and provenance.
- `codex-scope config` for supported Codex configuration precedence.
- `codex-scope why <key>` for one-value decision-chain explanations.
- Versioned JSON output for all four core commands.
- Explicit resolved, unresolved, unsupported, ignored, and shadowed states.
- Secret redaction, fail-closed TOML parsing, deterministic fixtures, and CI checks.
- Compatibility and semantics documentation for the supported Codex subset.

### Safety properties

- No LLM calls during inspection.
- No OpenAI API key required.
- No runtime network dependency.
- No discovered hooks executed.
- No inspected configuration mutated.

### Known boundaries

V0.1.0 does not claim full Codex compatibility. Hooks, MCP, plugins, snapshots, directory diffs, managed enterprise constraints, and the full Codex config schema remain outside the modeled subset.
