# X thread draft

1/ Codex config can be layered across user config, profiles, project config, AGENTS files, trust state, and invocation overrides. When behavior is surprising, the hard question is often: **what actually won, and why?**

2/ I built **Codex Scope**, an independent deterministic CLI focused on that question.

```bash
npx --yes --package=codex-scope-inspector codex-scope inspect
```

3/ For a supported key:

```bash
npx --yes --package=codex-scope-inspector codex-scope why approval_policy
```

It shows the winning source, shadowed/ignored sources, provenance, and what is still unresolved instead of guessing.

4/ Design constraints:

- read-only inspection
- no LLM calls
- no OpenAI API key
- no discovered hook execution
- explicit unsupported/unresolved state

5/ It does **not** claim full Codex compatibility and does not replace native Codex runtime diagnostics. The project uses evidence-dated conformance fixtures so semantic drift can be tested instead of hand-waved.

6/ The feedback I want most is a minimal sanitized case where Codex Scope disagrees with current Codex behavior.

https://github.com/kodlbegiko/codex-scope

Independent community project; not affiliated with OpenAI.
