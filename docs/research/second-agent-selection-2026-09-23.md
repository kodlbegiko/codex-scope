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

## Research-only fixture policy

The `fixtures/gemini-research/` directory contains inert files representing
hierarchical context, layered settings, and an untrusted-workspace case. They
are not proof that a Gemini adapter exists. Their purpose is to make the
research claims concrete and ready for deterministic adapter tests if the
remaining evidence gate is later satisfied.

No fixture contains hooks, executable configuration, MCP servers, plugin code,
or network-dependent behavior.

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

Pinned `MemoryContextManager` evidence also shows that a complete Gemini
instruction surface includes channels beyond the current filesystem-context
subset: extension memory, user-project memory, and MCP-provided instructions.
Those channels remain outside the supported research subset and must not be
silently omitted by a formal adapter.

Memory-import evidence is also pinned: imports are recursively processed,
bounded by project-root/path validation and a maximum depth. The current spike
does not implement that processor. A future adapter must either model it
deterministically or fail closed when potential imports can change the effective
instruction result.

## Adapter authorization gate

Do **not** add `src/adapters/gemini.ts` yet.

The folder-trust discrepancy and JIT boundary are now sufficiently bounded for
continued research, but the repository's actual blueprint imposes stronger
authorization gates that are not yet satisfied:

- Phase C requires at least **three sanitized real repositories** validating
  useful output; none are currently recorded in the Phase C corpus;
- the Codex conformance manifest currently contains **32 rules**, while the
  blueprint's second-adapter authorization gate requires at least 50 total
  conformance fixtures or equivalent coverage evidence; equivalent coverage has
  not been demonstrated;
- three externally verifiable upstream interactions/corrections, or equivalent
  evidence that the corpus matters beyond this repository, are not recorded as
  satisfied;
- extension memory, user-project memory, and MCP instruction channels still
  need an explicit supported/unsupported boundary;
- trust provenance still lacks a deterministic assertion for the selected
  subset.

These blockers are also machine-readable in
`conformance/research/gemini-cli/manifest.json`. Adapter readiness must remain
`blocked` while any open blocker exists.

Current result:

```text
Phase C research infrastructure: PASS
Folder-trust ambiguity: BOUNDED, default remains UNRESOLVED
JIT explicit-target boundary: PASS
Gemini adapter authorization: BLOCKED
Phase C exit gate: FAIL
```

This is an intentional conformance-first stop, not a reason to weaken the gate
or ship a filename-only adapter.
