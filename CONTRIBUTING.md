# Contributing

Codex Scope treats conformance evidence as part of the code change.

For resolver changes:

1. identify the official Codex behavior or implementation evidence;
2. add the smallest deterministic fixture that demonstrates it;
3. change the resolver;
4. run `npm run check`;
5. update `docs/semantics.md` or `docs/compatibility.md` if support boundaries changed.

Do not add guessed Codex behavior. An explicit `unsupported` or `unresolved` result is preferable to an approximate resolver.

## Cross-agent configuration cases

If Codex and Gemini CLI behaved differently in a real repository and that difference caused a configuration problem, use the **Cross-agent configuration case** issue template. Include a sanitized minimal reproduction, expected and observed behavior, the relevant agent versions if known, and evidence independent of Codex Scope that the problem existed.

The published v0.3.0 CLI does not yet expose `compare`. Comparison artifacts are optional for reporters; maintainers can run the Phase D draft against the supplied reproduction. Do not post secrets, private instructions, confidential repository content, or sensitive absolute paths.

The Phase D external gate counts only cases from distinct independent external reporters that maintainers validate for uniqueness, reproducibility, a real configuration problem, and an evidence-backed comparison result. One reporter cannot satisfy more than one verified gate slot. Fixtures, maintainer-created synthetic cases, earlier upstream interactions, and unverified reports do not count.

Only after validation may a case be added to `conformance/comparison/external-user-cases.json`. The derived ledger count must remain synchronized with `conformance/comparison/phase-d-status.json`.
