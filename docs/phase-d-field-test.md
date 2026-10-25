# Phase D field test (unreleased)

The published v0.4.0 package does **not** include `compare`. This guide runs the Draft PR implementation from source so an external user can evaluate it without treating the draft as a release. The tool reads only local files supplied in explicit input JSON; it does not invoke Codex or Gemini CLI.

## Try the deterministic example

Requirement: Node.js 20+. The command below obtains a pinned TypeScript compiler for the source build without changing project dependencies.

```bash
git clone https://github.com/kodlbegiko/codex-scope.git
cd codex-scope
git fetch origin pull/17/head:phase-d-field-test
git switch phase-d-field-test
npm ci
npm exec --yes --package=typescript@5.8.3 -- npm run build
node dist/cli.js compare codex gemini \
  --codex-input fixtures/comparison/cli-codex-input.json \
  --gemini-input fixtures/comparison/cli-gemini-input.json \
  --json
```

These checked-in inputs are **maintainer fixtures**, not external proof. They demonstrate the input shape and output classifications. A valid comparison exits `0` even when it finds proven drift; inspect `ci_summary` and individual classifications in the JSON.

## Report a real problem

If the two agents behaved differently in a repository you use, open a [cross-agent configuration case](https://github.com/kodlbegiko/codex-scope/issues/new?template=cross_agent_configuration_case.md). Include the expected and observed behavior, a minimal sanitized file layout, agent versions if known, reproducible steps, and evidence that the problem existed independently of this tool. You do **not** have to build this Draft PR or attach comparison JSON: a maintainer can reproduce the comparison from your report.

If you do adapt the input fixtures, point `cwd`, `codexHome`, `trustedRoot`, and `geminiHome` only to a **sanitized local reproduction**. Remove tokens, private instructions, confidential repository content, and personal paths before posting inputs or output. Do not attach live home-directory configuration or unsanitized JSON. State any trust, target-path, profile, or invocation assumptions explicitly; unknown inputs should remain unresolved rather than guessed.

A maintainer counts a case toward the Phase D exit gate only after verifying that it is independent, unique, reproducible, sanitized, and that the comparison identifies a real configuration problem. Public repository snapshots, the example above, and maintainer-created cases do not count. The gate remains 0/3 until three qualifying reports are verified.
