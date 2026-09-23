# Phase C second-agent selection — 2026-09-23

Status: **Phase C complete; Gemini adapter authorized and implemented for the bounded deterministic subset**

## Decision

Phase C selects **Gemini CLI** as the single research candidate.

Gemini CLI is the second agent carried through the full Phase C evidence and
implementation gate. The adapter is intentionally narrower than Gemini CLI as a
whole: it implements only the deterministic subset authorized by the pinned
corpus, preserves unresolved and unsupported boundaries, and does not infer live
runtime state.

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
- `docs/reference/configuration.md` and
  `packages/cli/src/config/settingsSchema.ts` describe
  `security.folderTrust.enabled` with a default of `true`;
- `packages/cli/src/config/settings.ts` materializes schema defaults through
  `getDefaultsFromSchema()` before merging system-default, user, trusted
  workspace, and system-override settings;
- `packages/cli/src/config/trustedFolders.ts` then consumes the merged value
  and also has a `?? true` fallback;
- `packages/cli/src/config/config.ts` contains a separate `?? false`
  fallback, but the normal merged-settings path already materializes schema
  defaults before this point;
- pinned upstream tests assert the schema default and trust-enabled/disabled
  behavior, but the official trusted-folders guide still says the feature is
  disabled by default.

The evidence therefore strongly identifies the current normal source path while
still leaving an official-doc/source contradiction. Codex Scope continues to
classify the **omitted-setting default** as `unresolved`.

The discrepancy is now **bounded rather than silently resolved**: a future
adapter may only make a resolved trust-dependent claim when trust/folder-trust
state is supplied explicitly or otherwise covered by a deterministic supported
input. If that input is absent, the adapter must return `unresolved`; it must
not choose `true` or `false` from the conflicting evidence.

## Fixture policy

The `fixtures/gemini-research/` directory remains the evidence corpus for
hierarchy, layered settings, trust, JIT, user-project memory, extension
snapshots, MCP declarations, imports, and sanitized real repositories.
`fixtures/gemini-adapter/` supplies the adapter contract input. All fixtures
are inert.

No fixture contains hooks, executable configuration, live MCP servers, plugin
execution, or network-dependent behavior.

## Deterministic research validation

Phase C research data is now executable evidence rather than documentation-only
state:

- `conformance/schema/agent-research.schema.json` validates the research
  ledger;
- `npm run research:gemini:validate` validates the schema, pinned evidence
  links, duplicate rule IDs, fixture paths, discrepancy references, assertion
  coverage, and adapter-readiness blockers;
- `conformance/research/gemini-cli/probes.json` defines deterministic
  hierarchy, JIT-target, configurable-filename, settings-precedence, and
  untrusted-workspace probes;
- `npm run research:gemini:assert` executes those probes without a model call,
  Gemini CLI subprocess, runtime network access, hooks, plugins, or MCP;
- JIT descendant context is only asserted from an explicit target path and is
  not pre-activated in the pre-session result.

Pinned `MemoryContextManager` evidence also covers instruction channels beyond
the basic filesystem hierarchy. The implemented adapter resolves user-project
memory only from an explicit directory snapshot, reports extension memory only
from an inert already-materialized activation snapshot, and reports MCP
instruction content as unsupported without connecting to any server.

Memory-import evidence remains intentionally fail-closed. The adapter detects
the conservative local-import subset covered by the corpus, does not recursively
expand imports, and reports effective content as unresolved when a candidate can
change the instruction set.

## Phase C completion gate

The Phase C authorization and implementation gates are satisfied:

- pinned official documentation, source, and upstream-test evidence are recorded;
- the machine-recalculated corpus contains 32 Codex rule cases plus 27 Gemini
  deterministic cases, for 59 total against the 50-case authorization threshold;
- three sanitized public repositories validate useful Gemini output;
- three distinct externally verifiable upstream interactions are recorded in
  `conformance/research/external-evidence.json`;
- Folder Trust's omitted-setting default remains explicitly `unresolved`, while
  explicit values and provenance are deterministic;
- JIT context is only resolved from an explicit target/access path inside a
  trusted root and remains conditional before access;
- user-project memory, extension memory, MCP instructions, and memory imports
  retain their supported/unresolved/unsupported boundaries;
- `src/adapters/gemini.ts` implements the authorized subset without model calls,
  runtime network access, subprocess probing, extension execution, or MCP
  execution;
- `tests/gemini-adapter.test.mjs` verifies adapter behavior and
  `scripts/research-gemini-check.mjs` rejects stale coverage, dishonest gate
  state, missing implementation artifacts, and loss of the external-evidence
  threshold after authorization.

Current result:

```text
Phase C research infrastructure: PASS
3 sanitized real repositories: PASS
Second-adapter corpus authorization: PASS (59 / 50)
Folder-trust omitted default: UNRESOLVED, safely bounded
External evidence: PASS (3 / 3)
Gemini adapter authorization: PASS
Gemini adapter implementation: PASS
Phase C exit gate: PASS
```

Phase D may now build on the neutral adapter seam. Phase C does not authorize
human-facing cross-agent comparison semantics or additional agents.

## Additional instruction-channel boundaries — 2026-09-23

Pinned `MemoryContextManager` and `memoryDiscovery` evidence is now encoded as deterministic research boundaries. User-project memory source selection is supported from an explicit project-memory directory; extension memory is inspectable only from an inert already-materialized activation snapshot; MCP-provided instruction content is unsupported because it is runtime client-manager output; and detected local memory imports fail closed as unresolved rather than being ignored. No extension or MCP code is executed.
