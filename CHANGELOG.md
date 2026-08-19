# Changelog

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
