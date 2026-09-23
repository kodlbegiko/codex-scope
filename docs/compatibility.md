# Compatibility

## Target

Codex Scope V0.1.x targets the explicitly supported instruction/configuration subset recorded in the conformance corpus.

Current evidence snapshot:

```text
evidence date:          2026-09-22
openai/codex commit:    94174e44cbc54cece45f6052328ca0c2cd7a8a2a
tested Codex version:   unknown
resolver version:       codex-resolver.v0.1
adapter version:        codex-adapter.v1
```

A local Codex binary version was not safely detected for this evidence pass. Codex Scope does **not** shell out to Codex or infer its version from configuration shape. The machine-readable record therefore keeps `tested_codex_version = "unknown"`.

See [`../conformance/compatibility-matrix.json`](../conformance/compatibility-matrix.json).

## Deterministic compatibility reporting

Phase B exposes the evidence boundary through:

```text
codex-scope compatibility
codex-scope compatibility --json
codex-scope compatibility --codex-version <version>
npm run conformance:validate:json
```

The compatibility summary is generated from the checked-in matrix and reports the resolver version, adapter version, evidence date, pinned upstream commit, supported/unsupported/unresolved rule counts, known discrepancies, and version provenance.

Automatic local Codex version detection is deliberately not performed. The core does not shell out. An explicitly supplied version is labeled `supplied`; because this evidence snapshot has `tested_codex_version = "unknown"`, that version remains `unresolved` rather than being labeled compatible.

The generated matrix includes `adapter_version`, and CI validates it against the built `codexAdapter`. A stale generated matrix fails the matrix freshness check.

`conformance:validate:json` emits `codex-scope.conformance-run.v1` with per-rule `expected_outcome`, `actual_outcome`, and details. Exit status remains distinct: semantic `behavior_drift` fails with status 1, harness/corpus `tool_error` with status 2, while expected `unsupported` and `unresolved` results do not fail the run.

## Conformance outcome taxonomy

| Outcome | Meaning in CI |
|---|---|
| `compatible` | Deterministic assertions matched the pinned supported/fail-closed behavior. |
| `behavior_drift` | A deterministic expected assertion no longer matches. CI fails distinctly. |
| `unsupported` | The case intentionally reaches a known semantic boundary. This is not a generic test failure. |
| `unresolved` | Missing or conditional inputs intentionally prevent a final compatibility claim. This is not a generic test failure. |
| `tool_error` | The corpus, fixture, or harness failed before a semantic result could be evaluated. CI fails distinctly. |

## Support matrix

| Surface | Status | Notes |
|---|---|---|
| `CODEX_HOME` | Supported | Environment default plus explicit inspection override. |
| Global `AGENTS.override.md` / `AGENTS.md` | Supported | First non-empty global source. |
| Project root → cwd instruction discovery | Supported | One selected candidate per directory. |
| Project instruction trust gating | Supported | Untrusted = ignored; unknown trust = unresolved/conditional, never active. |
| Project override/base/fallback precedence | Supported | Current source pins existing-file selection behavior. |
| Empty instruction files | Supported | Global and project semantics intentionally differ. |
| Cumulative project instruction byte limit | Supported | Deterministic truncation fixture. |
| User config | Supported | `$CODEX_HOME/config.toml`. |
| Unix system config | Supported subset | `/etc/codex/config.toml`; test harness injects an isolated path. |
| Windows system config | Unsupported | No V0.1 system-layer claim. |
| Project `.codex/config.toml` root → cwd | Supported | Explicit trust gate; CODEX_HOME excluded from project traversal. |
| Project trust | Partially supported | Explicit trusted/untrusted/unknown; no automatic detection. |
| Profile-v2 files | Supported | `$CODEX_HOME/<name>.config.toml`; Codex 0.134.0+ boundary. |
| Known `-c/--config` overrides | Supported | Repeatable; later duplicate wins. |
| Unknown invocation state | Unresolved | Remains unresolved until `--invocation-complete`. |
| `approval_policy=on-request/never` | Supported | Current string modes modeled by V0.1. |
| `approval_policy=untrusted` | Unsupported current semantics | Historical value; current docs say no longer supported. |
| `approval_policy=on-failure` | Unsupported current semantics | Deprecated upstream. |
| Structured/granular approval policy | Unsupported | Parsed value may be visible, but V0.1 does not validate semantics. |
| Other config keys | Unsupported semantics | Provenance may be shown without semantic compatibility claim. |
| Built-in Codex defaults | Partially supported | Only three resolver-critical defaults are modeled. |
| Full TOML 1.0 grammar | Partially supported | Safe common subset; unsupported syntax fails closed. |
| Managed/cloud/enterprise constraints | Unsupported / unresolved boundary | Presence can invalidate a complete local-layer claim. |
| Hooks inspection/execution | Unsupported | V0.1 never executes hooks. |
| MCP/plugins/rules | Unsupported | Deferred. |
| Runtime network/telemetry/update checks | Unsupported by design | Inspection has no runtime network code. |
| Automatic Codex version detection | Unsupported by design in V0.1 | Unknown is retained instead of shelling out or guessing. |

## Regression / behavior-change evidence

The machine-readable regression corpus currently records:

1. `CODEX_HOME` project-layer exclusion fixed upstream by commit `dd6c1d3787aa3c8032f6e6496e2bf25c47ddb37a`;
2. open current discrepancy `openai/codex#34193` for duplicate AGENTS when CODEX_HOME is also project root;
3. profile-v2 selection change documented for Codex 0.134.0+;
4. removal of the historical `approval_policy="untrusted"` current-support claim.

See [`../conformance/regressions.json`](../conformance/regressions.json).

## Version claim

The supported claim is intentionally narrow:

> Codex Scope V0.1 models only the rules listed in its evidence-dated corpus. The current source snapshot is pinned, while the tested installed Codex version remains unknown.

It does **not** claim “100% Codex compatible.”

## Known parser boundary

If an applicable config uses unsupported TOML syntax, Codex Scope exits with a parse error and explains that it stopped rather than guessing. This can reject configuration that Codex itself accepts; that is a known V0.1 limitation.
