# Phase C second-agent selection — 2026-09-23

Status: **research spike; no second-agent adapter is authorized by this document**

## Decision

Phase C selects **Gemini CLI** as the single research candidate.

This is not an adapter-completion claim. The selection means Gemini CLI is the
only second agent whose semantics should be expanded into the Phase C evidence
corpus until the research exit gate is either satisfied or evidence quality
proves insufficient.

The decision is evidence-driven:

- current official documentation describes hierarchical context files, settings
  precedence, and folder trust;
- the upstream implementation is publicly inspectable and can be pinned to an
  exact commit;
- relevant resolution paths are implemented in TypeScript and accompanied by
  tests;
- a useful deterministic subset can be investigated without an API key, model
  call, runtime network request, hook execution, MCP execution, or mutation;
- unresolved runtime/JIT behavior can be represented explicitly instead of
  guessed.

## Pinned candidate snapshots

| Candidate | Pinned upstream snapshot | Evidence quality for deterministic conformance |
| --- | --- | --- |
| Gemini CLI | `google-gemini/gemini-cli@62364cb2000795537a6895261b37ec668e4cf527` | Official docs plus public resolver/config/trust implementation and tests |
| Claude Code | `anthropics/claude-code@56f36532530f88b572854538d685fcf781141e8c` | Strong official memory/settings docs and public built-in mods, but the current public repository does not expose an equally direct full core settings/instruction resolver path for the surfaces under study |
| Cursor | `cursor/cursor@654b1b4775ca67aef473bd31a14c8c04a1abde2d` | Official rules documentation exists, but the pinned public `cursor/cursor` repository contains support/issue material rather than the core resolver implementation; agent-decided rule applicability also creates a runtime evidence boundary |

The comparison is about inspectability and evidence quality, not which product is
better.

## Gemini evidence snapshot

Pinned repository:

```text
repository: google-gemini/gemini-cli
commit:     62364cb2000795537a6895261b37ec668e4cf527
commit date: 2026-09-22T21:52:46Z
evidence date: 2026-09-23
```

Primary documentation:

- `docs/cli/gemini-md.md`
- `docs/reference/configuration.md`
- `docs/cli/trusted-folders.md`

Primary implementation evidence:

- `packages/core/src/utils/memoryDiscovery.ts`
- `packages/cli/src/config/settings.ts`
- `packages/cli/src/config/config.ts`
- `packages/cli/src/config/trustedFolders.ts`

Pinned source URLs use the exact commit, for example:

- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/docs/cli/gemini-md.md
- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/docs/reference/configuration.md
- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/docs/cli/trusted-folders.md
- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/packages/core/src/utils/memoryDiscovery.ts
- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/packages/cli/src/config/settings.ts
- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/packages/cli/src/config/config.ts
- https://github.com/google-gemini/gemini-cli/blob/62364cb2000795537a6895261b37ec668e4cf527/packages/cli/src/config/trustedFolders.ts

## Confirmed research surfaces

The current pinned evidence is strong enough to research these semantics without
running Gemini CLI:

1. default and configurable context filenames;
2. global plus workspace/ancestor hierarchical context discovery;
3. settings-file precedence;
4. trust-aware exclusion of workspace settings;
5. trust provenance inputs exposed by the trust implementation.

The machine-readable ledger is
[`../../conformance/research/gemini-cli/manifest.json`](../../conformance/research/gemini-cli/manifest.json).

## Important unresolved boundary — JIT context

Gemini CLI documents just-in-time context discovery: when a tool accesses a file
or directory, additional context files can be discovered up to a trusted root.

That means a static pre-session inspector can describe the discovery rule, but
cannot truthfully claim the complete future effective instruction set unless it
also has the relevant access trace or target context. Phase C therefore keeps
JIT applicability **unresolved** rather than treating all descendant context
files as active.

This is a meaningful test of the neutral model: a second adapter must preserve
conditional/runtime-dependent applicability instead of flattening filename
presence into `resolved`.

## Current discrepancy — folder trust default

The pinned evidence is internally inconsistent and must not be normalized away:

- `docs/cli/trusted-folders.md` says Trusted Folders is **disabled by default**;
- `docs/reference/configuration.md` says
  `security.folderTrust.enabled` defaults to `true`;
- `packages/cli/src/config/trustedFolders.ts` uses
  `settings.security?.folderTrust?.enabled ?? true` when deciding whether
  trust checking is enabled;
- `packages/cli/src/config/config.ts` separately computes a
  `folderTrust` value using `settings.security?.folderTrust?.enabled ?? false`.

Until the upstream semantics are reconciled and the effective call path is
proven with a deterministic fixture, Codex Scope records the default as
**unresolved**.

This is exactly the kind of evidence conflict the project must surface rather
than silently choosing documentation or implementation.

## Research-only fixture policy

The `fixtures/gemini-research/` directory contains inert files representing
hierarchical context, layered settings, and an untrusted-workspace case. They
are not proof that a Gemini adapter exists. Their purpose is to make the
research claims concrete and ready for deterministic adapter tests if the
remaining evidence gate is later satisfied.

No fixture contains hooks, executable configuration, MCP servers, plugin code,
or network-dependent behavior.

## Adapter authorization gate

Do **not** add `src/adapters/gemini.ts` yet.

A formal Gemini adapter remains blocked until at least:

- the folder-trust default discrepancy is resolved or explicitly bounded away
  from the supported subset;
- JIT context is modeled as conditional/unresolved with a deterministic input
  boundary;
- import behavior and trusted-root boundaries are sufficiently pinned for the
  chosen instruction subset;
- each promoted semantic rule has a deterministic assertion, not only a
  research fixture;
- zero known false-certainty blocker remains in the proposed supported subset.

If those conditions cannot be met, Phase C should remain a research spike rather
than shipping a speculative adapter.
