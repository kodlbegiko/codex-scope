# Adapter-ready architecture

The runtime path remains intentionally small and read-only:

```text
CLI arguments / explicit invocation state
            ↓
      static Codex adapter
            ↓
configuration scanner + conservative TOML parser
            ↓
project-root and precedence resolver
            ↓
instruction discovery resolver
            ↓
EffectiveCodexEnvironment ─────→ neutral inspection records
            ↓                         │
       central redaction              └→ internal provenance/evidence seam
            ↓
terminal renderer / codex-scope.v0.1 JSON renderer
```

The neutral seam is internal in Phase A. Existing terminal output and the `codex-scope.v0.1` JSON contract still consume the same `EffectiveCodexEnvironment`; neutral records are not silently added to the legacy schema.

## Modules

- `src/core.ts` — agent-neutral inspection records, provenance, compatibility outcome vocabulary, evidence metadata, capabilities, and static adapter contract.
- `src/adapters/codex.ts` — Codex-specific semantics, evidence declaration, neutral-record projection, and construction of the legacy Codex environment.
- `src/config.ts` — Codex config source discovery, trust gating, precedence, and missing-state handling.
- `src/agents.ts` — Codex global/project instruction discovery and byte accounting.
- `src/toml.ts` — fail-closed parser for the supported Codex subset.
- `src/environment.ts` — backward-compatible wrapper that delegates to the Codex adapter.
- `src/redact.ts` — centralized secret-like key redaction for public output.
- `src/render.ts` — human/`codex-scope.v0.1` JSON views only.
- `src/cli.ts` — argument boundary and safe error handling.

## Compatibility path

`src/compatibility.ts` reads the packaged, generated compatibility matrix and returns a deterministic summary containing resolver/adapter versions, evidence date, pinned upstream commit, rule counts, known discrepancies, and explicit version provenance.

The compatibility path does not discover a local Codex binary. `--codex-version` is an offline supplied input only. While `tested_codex_version` is `unknown`, a supplied version remains `unresolved`.

The conformance harness can emit `codex-scope.conformance-run.v1` JSON with an expected and actual outcome per rule. Its process status remains fail-closed: `behavior_drift` exits 1 and `tool_error` exits 2; expected `unsupported` and `unresolved` cases do not fail CI.

## Phase A/B boundaries

The adapter is statically registered at compile time. There is no plugin runtime, dynamic loading, hook runner, MCP execution, network client, OpenAI SDK, telemetry client, or subprocess execution module in the deterministic inspection implementation.

Codex-specific rules remain Codex-specific. The neutral core carries their results and provenance; it does not guess common semantics or coerce `unsupported` / `unresolved` states into compatibility claims.
