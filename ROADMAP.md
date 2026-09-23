# Codex Scope Roadmap

Codex Scope grows by making one promise increasingly reliable:

> **Given a working directory and known invocation inputs, explain what can be proven about the instructions and configuration an AI coding agent will use, where each value came from, why it won, and what remains unknown.**

Codex remains the conformance-backed foundation for its explicitly supported V0.1 subset. Cross-agent work is a gated evolution of the same provenance model, not permission to replace semantic depth with filename detection.

The roadmap is evidence-gated. A feature appearing here does not authorize implementation when upstream semantics are unstable, cannot be inspected safely, or are already better answered by a native diagnostic.

## Shipped — V0.1.x Codex foundation

Current public line: **V0.1.x**. Use [GitHub Releases](https://github.com/kodlbegiko/codex-scope/releases) or npm for the authoritative latest patch.

Shipped surfaces:

- `codex-scope inspect`
- `codex-scope instructions`
- `codex-scope config`
- `codex-scope why <key>`
- versioned JSON output
- Codex instruction/config provenance
- explicit resolved/unresolved/unsupported/ignored/shadowed state
- secret-like value redaction
- fail-closed TOML/config handling for the modeled subset
- read-only, no-model, no-runtime-network inspection
- conformance-oriented fixtures

V0.1.x intentionally does **not** claim full Codex compatibility.

## Product direction — Codex conformance first, cross-agent later

Codex Scope's primary near-term role is to become **reproducible conformance and compatibility infrastructure for Codex instruction/configuration semantics**.

The user-facing CLI remains a supported diagnostic surface, but the core asset is the checked-in evidence corpus:

- explicit semantic rules;
- deterministic fixtures;
- upstream documentation/source references;
- evidence dates and tested versions/commits;
- compatibility boundaries;
- regression and behavior-drift detection;
- reproducible upstream issues, fixes, and documentation corrections.

Cross-agent support remains a valid later direction for Claude Code, Gemini CLI, Cursor, OpenCode, and others, but only as an extension of this evidence model. The project will not trade semantic depth for agent count.

Core constraints remain:

1. **Evidence before breadth.** Every modeled rule needs reproducible upstream support.
2. **No false certainty.** Runtime/task/model-dependent state remains conditional, unresolved, or unsupported.
3. **Read-only deterministic core.** No LLM calls, runtime network dependency, hook/plugin/MCP execution, or inspected-repo mutation.
4. **Compatibility awareness.** Supported claims are tied to evidence dates and version/commit boundaries where possible.
5. **Backward compatibility.** Existing Codex commands and the V0.1 JSON contract remain stable while the conformance core evolves.

See [`docs/research/cross-agent-evolution-blueprint.md`](docs/research/cross-agent-evolution-blueprint.md) for the revised conformance-first architecture and gates.

## NOW — Codex conformance foundation

The current product decision is **C: conformance-first**.

External adoption is useful evidence but is **not** the gate for core progress. The immediate goal is to turn confirmed Codex semantics and upstream behavior changes into a durable regression/compatibility corpus.

### 0. Conformance harness and evidence ledger

Priorities:

- formalize fixture metadata for agent, surface, evidence source, evidence date, upstream version/commit, expected behavior, and unsupported boundaries;
- expand deterministic fixtures for instructions, config precedence, project/trust behavior, profiles/overrides, and CODEX_HOME interactions;
- distinguish compatibility success, behavior drift, unsupported state, unresolved state, and tool failure in CI;
- keep evidence reproducible from a clean checkout;
- convert verified upstream discrepancies into high-quality upstream issues, patches, or documentation corrections.

Initial evidence gate:

- at least 20 explicit semantic fixtures;
- at least 3 regression/behavior-change fixtures;
- at least 1 verified upstream discrepancy, ambiguity, issue, patch, or evidence correction;
- zero known false-certainty blockers in the supported subset.

Implementation status is tracked from repository evidence in [`docs/conformance-status.md`](docs/conformance-status.md). As of the 2026-09-22 Phase 0 branch, the corpus contains 32 explicit semantic rules and 4 regression/change records; the gate is not considered complete until the full CI run and upstream-interaction check are green.

### 1. Compatibility matrix

Generate a machine-readable record of what Codex Scope has actually tested, including evidence date and version/commit boundaries. Unknown versions remain unknown; configuration shape is not used as a version guess.

### 2. Preserve the CLI as a thin diagnostic surface

Keep the existing `inspect`, `instructions`, `config`, and `why` commands stable. User feedback remains valuable, but new CLI features do not outrank conformance coverage.

### 3. Ecosystem contribution loop

Prefer this maintenance loop:

```text
upstream change
→ reproduce semantics
→ fixture/test
→ detect drift or ambiguity
→ upstream issue/fix/docs correction
→ compatibility record
→ release when warranted
```

This produces externally verifiable maintainer evidence without requiring broad early user acquisition.

## COMPLETED CORE GATES — Phase A + Phase B

Phase A established the neutral static adapter seam without changing the V0.1 Codex resolver contract.

Phase B now makes the compatibility boundary deterministic and queryable:

- generated matrix pins resolver version, adapter version, evidence date, upstream commit, and rule classifications;
- `codex-scope compatibility` exposes the checked-in evidence summary;
- `--codex-version` records explicit offline version input without invoking Codex;
- an unknown tested binary version keeps supplied/detected compatibility `unresolved`;
- `conformance:validate:json` emits per-rule expected/actual outcomes;
- `behavior_drift` and `tool_error` remain distinct fail-closed CI outcomes;
- generated matrix drift remains a CI failure;
- the existing four commands and `codex-scope.v0.1` JSON stay backward compatible.

Clean-checkout CI run #37 validates the Phase B implementation before this documentation update.

## COMPLETED — Phase C second-agent conformance adapter

Phase C selected **Gemini CLI** after evidence-first candidate research and completed the conformance gate before adapter implementation.

The checked-in Phase C baseline includes:

- pinned official documentation, upstream source, and upstream tests;
- deterministic Gemini probes and fixtures;
- explicit supported, unresolved, and unsupported boundaries;
- three sanitized real-repository validations;
- external evidence gating;
- `gemini-adapter.v1` limited to the authorized deterministic subset.

Runtime/JIT-dependent state, omitted Folder Trust defaults, live extension activation, effective MCP instruction content, and recursive memory imports remain unresolved or unsupported rather than guessed.

## ACTIVE — Phase D neutral semantic comparison

Phase D now has an internal deterministic comparison core on top of the two proven adapters.

Implemented internal milestones:

- versioned `codex-scope.semantic-comparison.v1` JSON schema;
- versioned `codex-scope.semantic-normalization.v1` normalization contract;
- closed classifications: `same`, `semantically_equivalent`, `behaviorally_different`, `unsupported_on_one_side`, `unresolved`, and `evidence_gap`;
- deterministic fixture coverage for every classification and negative contract cases;
- Codex + Gemini neutral-report integration without agent-specific branches in the shared comparison engine;
- adapter/upstream/rule/reference provenance retention;
- three existing sanitized repositories exercised through cross-agent instruction comparison;
- sanitized byte-stable machine-readable demonstration enforced by `npm run comparison:demo:check`.

The public V0.1 CLI has **not** gained a compare command. Phase D is intentionally proving the machine-readable core before any human-facing CLI surface.

Machine-readable status is recorded in
[`conformance/comparison/phase-d-status.json`](conformance/comparison/phase-d-status.json).

The blueprint's external proof-of-value gate is still open: **0 / 3 qualifying external user cases** where comparison identifies a real configuration problem. Repository fixtures, sanitized public snapshots, and prior upstream interactions do not count as external user cases. Therefore Phase D is not declared complete and Phase E remains blocked.

## AFTER PHASE D — compare CLI and later expansion

Only after the comparison contract remains stable and the external Phase D gate is satisfied should a public surface such as the following be considered:

```text
codex-scope compare codex gemini --json
```

Any future public compare command must preserve the same fail-closed distinctions between proven differences, unresolved state, unsupported semantics, and evidence gaps. It must not rank agents or infer semantic equivalence from arbitrary instruction prose.

## SECONDARY CANDIDATES

### Sanitized diagnostic report

Potential use case:

```text
codex-scope report --json
```

Only proceed with explicit path-privacy policy, versioned schema, default redaction, and clear differentiation from native diagnostics.

### Directory diff

Potential use case:

```text
codex-scope diff ./frontend ./backend
```

It must compare effective behavior, not arbitrary text. Candidate differences include instruction chain, effective config values, winner source, ignored/shadowed state, trust effects, and compatibility state.

## LATER ADAPTER CANDIDATES

Claude Code, Cursor, and OpenCode remain research candidates after the first validated second adapter. Gemini CLI is the current provisional second-adapter candidate, not promised support. Every adapter requires its own decision gate.

Cursor is especially sensitive to target files, rule types, manual invocation, and model-selected applicability. Gemini CLI and OpenCode include configurable or remote instruction sources that may conflict with no-runtime-network inspection. These behaviors must remain conditional, unresolved, or unsupported unless they can be modeled without violating the safety contract.

Other later candidates:

- snapshots after the environment/report schema is stable;
- richer managed-constraint modeling when semantics can be verified;
- hooks only after discovery and merge behavior is stable;
- richer provenance graphs when they improve diagnosis rather than presentation alone.

Codex Scope must never execute discovered hooks during inspection.

## EXPLICIT NON-GOALS

### Rules synchronization or generation

Codex Scope will not become a source-of-truth compiler that rewrites `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, or agent settings. Existing tools already serve that category, and mutation would weaken the read-only trust boundary.

### Shallow cross-agent detection

Finding known filenames is useful inventory, but it is not evidence of effective context. An adapter that cannot explain applicability and uncertainty should remain experimental or unsupported.

### Heuristic interpretation of arbitrary instructions

The deterministic core will not infer that prose contains equivalent or conflicting build, test, security, or architecture policy unless the claim can be derived from an explicit supported structure. Future heuristic or model-assisted analysis, if ever explored, must be opt-in and clearly separated from deterministic results.

### Premature rename

The repository, npm package, and CLI remain Codex Scope until a second adapter demonstrates real demand, durable differentiation, migration feasibility, and an available non-conflicting name. A rename is a product decision, not a prerequisite for adapter research.

### Web UI

Do not build a browser UI merely because provenance graphs are visually attractive. Reconsider only if real users demonstrate a CLI limitation that a web interface meaningfully solves.

## Long-term direction

If the adapter thesis earns trust and repeated real-world usage, later versions may evolve toward:

```text
Effective agent context
├── Codex adapter (conformance-backed foundation)
├── one validated second-agent adapter
├── instructions and config provenance
├── applicability and uncertainty
├── compatibility evidence
├── safe reports / snapshots
├── directory and cross-agent compare
├── managed constraints
├── MCP declarations (evidence-gated)
└── hooks metadata (evidence-gated, never executed)
```

The moat is not agent count, feature count, or early star count. It is independently reproducible evidence that each supported semantic rule matches the behavior it claims to model, plus an honest compatibility boundary around everything the project cannot prove.

See [`docs/research/post-v0.1.1-strategy.md`](docs/research/post-v0.1.1-strategy.md) for the original V0.1 decision matrix and [`docs/research/market-product-research-interim-2026-09-22.md`](docs/research/market-product-research-interim-2026-09-22.md) for the current demand-validation decision.
