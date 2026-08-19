# Codex Scope

> **See what Codex will actually use here — and why.**

Codex Scope is a deterministic, read-only inspector for Codex instructions, configuration, hooks, and their provenance.

**No LLM calls · No API key · No token spend · No hook execution**

> 🚧 **Early development:** the CLI is not released yet. This repository currently documents the product direction and implementation plan.

## Why this exists

Codex behavior can depend on several layers at once:

```text
~/.codex/AGENTS.md
repo/AGENTS.md
repo/frontend/AGENTS.override.md

~/.codex/config.toml
repo/.codex/config.toml
profiles
CLI overrides
system config

hooks.json
inline hooks
plugins
project trust
```

That creates simple questions that are surprisingly hard to answer:

- Which instructions are active in **this directory**?
- Which config value actually wins?
- Which hooks will load?
- Which value was shadowed or ignored?
- Why is Codex behaving differently in `frontend/` and `backend/`?

Codex Scope turns those layers into one explainable view.

## Target UX

```text
$ codex-scope inspect

CODEX SCOPE
────────────────────────────────────────
Target
  /Users/sean/project/frontend

Instructions
  ✓ ~/.codex/AGENTS.md
  ✓ ./AGENTS.md
  ✓ ./frontend/AGENTS.override.md
  ○ ./frontend/AGENTS.md
    ignored: AGENTS.override.md wins in this directory

Config
  approval_policy = on-request
  source: ./.codex/config.toml:18

  sandbox_mode = workspace-write
  source: profile:dev

Hooks
  SessionStart   2
  PreToolUse     3
  Stop           1

Warnings
  ⚠ 2 shadowed values
  ⚠ 1 project layer depends on trust state
```

And when you only care about one value:

```text
$ codex-scope why approval_policy

approval_policy = on-request

winner
  ./.codex/config.toml:18

overrides
  profile:dev
  ~/.codex/config.toml:21
```

## Planned commands

```text
codex-scope inspect
codex-scope instructions
codex-scope config
codex-scope hooks
codex-scope why <key>
codex-scope diff <dir-a> <dir-b>
codex-scope snapshot --json
```

Every machine-readable command is planned to support JSON output.

## Accuracy contract

Codex Scope should never pretend to know more than it can prove.

Every result should be classified as one of:

- **resolved** — deterministically derived from known inputs
- **unresolved** — a required input is missing, such as an invocation override or trust state
- **unsupported** — Codex behavior exists, but this version of Codex Scope does not model it yet

If a CLI override was not supplied to Codex Scope, it must not claim to know that override. If a trust decision cannot be determined safely, it must say so.

## Design principles

1. **Deterministic first** — no LLM judge or AI guesswork.
2. **Provenance first** — every effective value should answer “where did this come from?”
3. **Read-only by default** — inspection must not mutate the repository or Codex configuration.
4. **Never execute discovered hooks** — inspect hook definitions; do not run them.
5. **Secret-safe output** — redact sensitive-looking values instead of dumping configuration blindly.
6. **Version-aware** — Codex behavior changes; compatibility must be explicit and tested.
7. **One useful command first** — `codex-scope inspect` should provide value without reading documentation.

## What Codex Scope is not

Codex Scope is **not**:

- an AGENTS.md AI optimizer
- a prompt-writing assistant
- a token dashboard
- a replacement for Codex
- a hook runner
- a generic linter with dozens of subjective rules

The core asset is a **Codex-compatible resolution engine**.

## Roadmap

The public implementation plan lives in [`ROADMAP.md`](./ROADMAP.md).

The first release is intentionally narrow: instructions, configuration, provenance, explanations, JSON output, and conformance tests. Hooks, directory diffs, compatibility snapshots, CI integration, and broader Codex environment inspection follow after the core resolver is trustworthy.

## Why accuracy matters more than feature count

A tool that says “this is what Codex sees” is only useful if that statement can be trusted. Codex Scope will prioritize conformance fixtures and reproducible evidence over shipping many partially-correct integrations.

## Contributing

The project is still at the architecture stage. Once the first implementation lands, the repository will add contribution guidelines, issue templates, compatibility fixtures, and clearly scoped `good first issue` tasks.

If you have a real Codex configuration that behaves unexpectedly, that kind of reproducible case will be especially valuable.

## Official Codex references

- AGENTS.md discovery: https://developers.openai.com/codex/agent-configuration/agents-md
- Config precedence: https://developers.openai.com/codex/config-basic
- Hooks: https://developers.openai.com/codex/hooks

---

**Codex Scope** — make the effective Codex environment explainable.