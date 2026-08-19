# Hacker News draft

## Suggested title

Show HN: Codex Scope – explain which Codex instructions and config win

## Draft

I built Codex Scope, a small deterministic CLI for debugging Codex instruction/config precedence before starting a session.

The problem I kept running into was simple: with user config, profiles, project `.codex/config.toml`, `AGENTS.md`, trust state, and invocation overrides, it can be hard to answer "which value actually wins, and why?"

Example:

```bash
npx --yes --package=codex-scope-inspector codex-scope inspect
codex-scope why approval_policy
```

For the supported subset it reports the winning source, shadowed/ignored sources, provenance, and anything that is still unresolved rather than guessing.

It is read-only during inspection, makes no LLM calls, requires no OpenAI API key, does not execute discovered hooks, and does not claim full Codex compatibility.

The project also keeps evidence-dated conformance fixtures because Codex semantics are moving quickly. I am especially interested in reproducible resolution mismatches or real configurations that expose a case the resolver models incorrectly.

Repository: https://github.com/kodlbegiko/codex-scope

Codex Scope is an independent community project and is not affiliated with OpenAI.
