# Codex Scope V0.1 semantics ledger

Evidence captured: **2026-08-19**.

Source priority for V0.1 is: current official OpenAI Codex documentation, then current public `openai/codex` implementation evidence for edge cases, then this repository's roadmap. If these disagree, the higher source wins.

## Modeled rules

| Behavior | Evidence basis | V0.1 | Caveat |
|---|---|---:|---|
| `CODEX_HOME` defaults to `~/.codex` | Official Codex docs | Supported | `--codex-home` exists for deterministic inspection/testing. |
| Global instructions check `AGENTS.override.md`, then `AGENTS.md` | Official docs + `codex-home/src/instructions/mod.rs` | Supported | Global lookup selects the first **non-empty** readable candidate. |
| Project instructions traverse project root → cwd | Official docs + `openai/codex` implementation | Supported | One candidate is discovered per directory. |
| Project candidate order is override → AGENTS → configured fallbacks | Official docs + implementation | Supported | Duplicate/empty fallback names are ignored by Codex Scope. |
| Project selection is based on first **existing** candidate | `openai/codex` implementation | Supported | Therefore an empty `AGENTS.override.md` blocks same-directory `AGENTS.md`, then contributes no text. Regression-tested. |
| Empty global candidate falls through | `openai/codex` implementation | Supported | Differs from project selection behavior above. |
| `project_doc_max_bytes` defaults to 32768 | Official docs/schema evidence | Supported | Project-document budget only; global instructions are outside this budget. |
| Project instruction byte budget is cumulative root → cwd | `openai/codex` implementation | Supported | This pins an implementation detail where public wording can be read as per-file. Regression-tested. |
| `project_doc_fallback_filenames` defaults to `[]` | Official config schema/docs | Supported | Applied after `AGENTS.md`. |
| Project root markers default to `.git` | Official advanced config/schema evidence | Supported | If no marker is found, V0.1 uses cwd as root. |
| Project configs load root → cwd, closest wins | Official config docs | Supported | Only when trust is explicitly `trusted`. |
| Protected machine-local keys in project config are ignored | Official Config Reference | Supported | Includes provider/auth-adjacent, profile-selection, notify, and OTEL keys listed by current docs. |
| Untrusted project skips project `.codex/config.toml` | Official config docs | Supported | `unknown` trust keeps candidates conditional and final affected values unresolved. |
| Config precedence: CLI > closest project > profile > user > system > modeled defaults | Official config docs | Supported | Repeated CLI `-c` overrides use later occurrence precedence. Only defaults listed below are modeled. |
| Profile selected by `--profile <name>` uses `$CODEX_HOME/<name>.config.toml` | Official CLI/config docs | Supported | Missing selected profile fails safely instead of silently ignoring it. |
| `-c/--config key=value` parses the value as TOML | Official CLI docs | Supported subset | Parser supports the safe V0.1 TOML subset documented below. |
| Missing invocation state must remain explicit | Product accuracy contract + CLI semantics | Supported | `--invocation-complete` is the assertion boundary. |

## Defaults modeled

V0.1 only hard-codes defaults with a defensible evidence basis that are required by its own resolver:

```text
project_doc_max_bytes = 32768
project_doc_fallback_filenames = []
project_root_markers = [".git"]
```

V0.1 semantically validates and claims support for the resolver-critical keys above plus these common decision keys:

```text
approval_policy   (documented string modes)
sandbox_mode
model
model_provider
```

Other parsed keys may still appear with provenance, but are labeled `unsupported` rather than being presented as semantically verified Codex values. Structured/granular `approval_policy` is parsed but labeled `unsupported` in V0.1.

`why <key>` returns unresolved if no supported source/default exists.

## TOML support boundary

The zero-runtime-dependency parser supports the constructs needed for common Codex config:

- basic and literal strings;
- booleans;
- integers and floats;
- dates/datetimes preserved as strings;
- arrays;
- inline tables;
- standard tables (`[a.b]`);
- dotted keys;
- comments;
- multiline arrays/inline tables.

V0.1 deliberately **fails closed** on unsupported/ambiguous syntax such as array-of-tables (`[[...]]`) and TOML features not implemented by the parser. It does not continue with a partial plausible config.

## Resolution semantics

A known source can be visible without being the final answer.

For example, with trust `unknown`:

```text
user config:     approval_policy = never
project config:  approval_policy = on-request  (conditional)
```

Codex Scope reports the user value as the known-so-far winner but marks the key `unresolved`, because trust can activate the higher project source.

Likewise, unless `--invocation-complete` is supplied, unseen Codex invocation inputs can still supersede file-derived values.

## Evidence links

Official documentation:

- `https://developers.openai.com/codex/agent-configuration/agents-md`
- `https://developers.openai.com/codex/config-basic`
- `https://developers.openai.com/codex/config-advanced`
- `https://developers.openai.com/codex/config-reference`
- `https://developers.openai.com/codex/cli/reference`

Implementation evidence:

- `https://github.com/openai/codex/tree/main/codex-rs`
- global instructions: `codex-rs/codex-home/src/instructions/mod.rs`
- project instruction/config loading: current `openai/codex` main implementation inspected on the evidence date above

Implementation links are evidence snapshots in time, not a claim that `main` equals every stable Codex release.
