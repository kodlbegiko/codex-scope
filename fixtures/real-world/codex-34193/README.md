# openai/codex #34193 parity fixture

- source: https://github.com/openai/codex/issues/34193
- source implementation: https://github.com/openai/codex/blob/94174e44cbc54cece45f6052328ca0c2cd7a8a2a/codex-rs/core/src/agents_md.rs
- evidence date: 2026-09-22
- upstream issue status on evidence date: OPEN
- pinned upstream commit: `94174e44cbc54cece45f6052328ca0c2cd7a8a2a`

## Current implementation behavior being recorded

When the same directory is both `CODEX_HOME` and the project root/cwd, the user/global `AGENTS.md` content can also be discovered through the project instruction walk. Current upstream `agents_md.rs` keeps user instructions separately and then appends project-discovered instruction entries without canonical-path deduplication across those sources.

## Expected Codex Scope result for this fixture

The same physical `AGENTS.md` is represented twice in the active instruction sources:

1. once with `scope = global`;
2. once with `scope = project`.

The paths are identical.

This fixture records **implementation parity, not desired behavior**. If upstream Codex deduplicates these sources in a future release, update this fixture and resolver expectation rather than preserving the historical bug.
