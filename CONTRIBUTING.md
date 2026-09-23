# Contributing

Codex Scope treats conformance evidence as part of the code change.

For resolver changes:

1. identify the official Codex behavior or implementation evidence;
2. add the smallest deterministic fixture that demonstrates it;
3. change the resolver;
4. run `npm run check`;
5. update `docs/semantics.md` or `docs/compatibility.md` if support boundaries changed.

Do not add guessed Codex behavior. An explicit `unsupported` or `unresolved` result is preferable to an approximate resolver.

## Cross-agent external case contribution

Phase D external proof requires independent, real user cases where the Codex/Gemini comparison identifies a genuine configuration problem. Use the **Cross-agent configuration case** issue template and provide sanitized Codex input, sanitized Gemini input, the comparison output, independent evidence that the problem existed, and deterministic reproduction steps.

A submission is **not** verified evidence. Repository fixtures, maintainer-created synthetic cases, the Phase C sanitized public-repository snapshots, prior upstream interactions, duplicate reports, pending reports, and unvalidated reports do not count toward the Phase D external gate.

Only after maintainers validate the source, uniqueness, evidence, reproduction, and sanitization may a case be added to `conformance/comparison/external-user-cases.json`. The derived ledger count must remain synchronized with `conformance/comparison/phase-d-status.json`.
