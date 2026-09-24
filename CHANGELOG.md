# Changelog

## Unreleased

### Added

- Add the v0.4 Codex Conformance Observatory with three retained upstream evidence snapshots, deterministic compatibility history, and cross-snapshot drift classification.
- Expand the Codex semantic corpus to 50 deterministic cases and the regression/change corpus to five records.
- Add regression provenance schema v2 with exact upstream commit/date, compatibility classification, fixture binding, assertion count, and explicit partial-boundary limitations.
- Add a durable upstream finding for the Codex application-network-policy extension HTTP-client fix.
- Add a machine-verifiable maintainer-facing upstream feedback ledger tied to the existing `openai/codex#34193` source-level recheck.

### Changed

- Make snapshot lifecycle roles index-authoritative so retained immutable snapshots can be superseded without rewriting historical files.
- Treat carried-forward evidence as `evidence_gap` rather than silently upgrading it to unchanged/reverified state.
- Extend CI with snapshot, compatibility-history, drift, upstream-finding, and upstream-feedback gates plus `npm pack` and `npm publish --dry-run`.
- Preserve the existing Codex CLI and `codex-scope.v0.1` JSON contract; observatory artifacts are additive and separately versioned.

### Safety properties

- The deterministic inspection runtime still performs no LLM calls, runtime network access, binary execution, hook/plugin/MCP execution, arbitrary shell execution, or inspected-repository mutation.
- Runtime/network semantics discovered upstream remain evidence-only and unsupported unless they can be modeled inside the deterministic safety boundary.
- Phase D external proof remains separate at 0 / 3 and is not counted as a v0.4 failure.


## 0.3.0 — 2026-09-23

Gemini CLI conformance-adapter preview built on the evidence-gated neutral core.

### Added

- Add a pinned Gemini CLI evidence manifest with 27 deterministic research cases covering context discovery, settings precedence, trust provenance, JIT target boundaries, extension-memory snapshots, MCP declarations, and conservative import handling.
- Add a bounded, read-only Gemini adapter for the evidence-backed deterministic subset.
- Add three sanitized real-repository validations and three distinct external upstream evidence records.
- Add machine-enforced Gemini research validation, semantic assertions, fixture containment checks, and honest authorization/implementation gates.

### Changed

- Raise the combined deterministic semantic corpus to 59 cases across Codex and Gemini CLI.
- Record Gemini CLI as the selected second-agent research adapter while keeping public cross-agent comparison deferred to Phase D.
- Extend CI with Gemini research validation and semantic assertion steps.

### Safety properties

- The Gemini adapter does not invoke Gemini CLI, an LLM, extensions, plugins, hooks, or MCP servers.
- Runtime/JIT state that cannot be proven from explicit inputs remains unresolved or unsupported.
- Existing Codex commands and the `codex-scope.v0.1` JSON contract remain unchanged.

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
