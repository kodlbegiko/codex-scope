# Reddit draft

Use only in a community whose current rules permit project sharing. Adapt the wording to that community instead of cross-posting identical copy.

## Suggested title

I built a read-only CLI to explain which Codex AGENTS/config values win

## Draft

I built **Codex Scope**, an independent CLI for one narrow problem: explaining the supported Codex instruction/config layers before a session starts.

If user config, a selected profile, project config, and AGENTS files disagree, you can run:

```bash
npx --yes --package=codex-scope-inspector codex-scope inspect
npx --yes --package=codex-scope-inspector codex-scope why approval_policy
```

The output focuses on:

- the winning known source;
- shadowed / ignored sources;
- provenance;
- unresolved inputs that could still change the answer.

It is deterministic for the modeled subset, read-only during inspection, does not call an LLM, does not require an OpenAI API key, and does not execute discovered hooks.

It deliberately does **not** claim full Codex compatibility. Native Codex remains authoritative at runtime; this is an independent pre-session resolver with evidence-dated conformance fixtures.

I am looking for reproducible cases where Codex Scope disagrees with current Codex behavior, especially around AGENTS discovery and config precedence.

Repository: https://github.com/kodlbegiko/codex-scope

If you try it, the most useful feedback is the smallest sanitized reproduction rather than a general feature wishlist.
