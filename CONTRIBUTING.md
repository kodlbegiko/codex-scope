# Contributing

Codex Scope treats conformance evidence as part of the code change.

For resolver changes:

1. identify the official Codex behavior or implementation evidence;
2. add the smallest deterministic fixture that demonstrates it;
3. change the resolver;
4. run `npm run check`;
5. update `docs/semantics.md` or `docs/compatibility.md` if support boundaries changed.

Do not add guessed Codex behavior. An explicit `unsupported` or `unresolved` result is preferable to an approximate resolver.
