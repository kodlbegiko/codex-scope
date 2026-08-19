# Compatibility

## Target

Codex Scope V0.1.0 targets the **current stable OpenAI Codex documentation available on 2026-08-19**, with current public `openai/codex` implementation evidence used to disambiguate supported edge cases.

A local Codex CLI was **not installed in the execution environment**, so this implementation does not claim compatibility with a detected local Codex version and did not run paid/token-consuming Codex sessions.

## Support matrix

| Surface | Status | Notes |
|---|---|---|
| `CODEX_HOME` | Supported | Environment default plus explicit inspection override. |
| Global `AGENTS.override.md` / `AGENTS.md` | Supported | First non-empty global source. |
| Project root → cwd instruction discovery | Supported | `.git` default marker plus configured markers. |
| Project `AGENTS.override.md` / `AGENTS.md` | Supported | First existing candidate per directory. |
| Configured fallback instruction filenames | Supported | Ordered after built-in filenames. |
| Empty instruction files | Supported | Global and project semantics intentionally differ. |
| Cumulative project instruction byte limit | Supported | Deterministic byte truncation covered by fixture. |
| User config | Supported | `$CODEX_HOME/config.toml`. |
| Unix system config | Supported | `/etc/codex/config.toml`; test harness can inject an isolated path. |
| Windows system config | Unsupported | V0.1 does not claim a Windows system layer. |
| Project `.codex/config.toml` root → cwd | Supported | Explicit trust gate required; documented protected machine-local keys are ignored even when trusted. |
| Project trust | Partially supported | Explicit `trusted`, `untrusted`, or `unknown`; no automatic trust-state detection. |
| Profile files | Supported | `$CODEX_HOME/<name>.config.toml` via `--profile`. |
| Known `-c/--config` overrides | Supported | Repeatable; highest modeled precedence. |
| Unknown invocation state | Supported | Remains `unresolved` until `--invocation-complete`. |
| Common decision keys | Partially supported | `approval_policy` string modes, `sandbox_mode`, `model`, and `model_provider`; granular approval policy is unsupported. |
| Other config keys | Unsupported semantics | Parsed provenance may be shown, but V0.1 does not claim schema/effective-value compatibility for them. |
| Built-in Codex defaults | Partially supported | Only three resolver-critical documented defaults are modeled. |
| Full TOML 1.0 grammar | Partially supported | Safe common subset; unsupported syntax fails closed. |
| Managed/enterprise config and `requirements.toml` | Unsupported | Deferred; no guessed enforcement behavior. |
| Hooks inspection | Unsupported | V0.1 never executes hooks. |
| MCP/plugins/rules | Unsupported | Deferred. |
| Network/telemetry/update checks | Unsupported by design | Inspection has no network code. |

## Version claim

The supported claim is intentionally narrow:

> Codex Scope V0.1 models the instruction-discovery and configuration-precedence subset listed in this file, against the evidence basis dated 2026-08-19.

It does **not** claim “100% Codex compatible.”

## Known parser boundary

If an applicable config uses unsupported TOML syntax, Codex Scope exits with a parse error and explains that it stopped rather than guessing. This can reject a configuration that Codex itself accepts; that is a known V0.1 limitation and is safer than silently producing a wrong effective configuration.
