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

## NEXT — adapter-ready core and compatibility awareness

The next implementation candidate, **after the Codex conformance foundation is useful on its own**, is an internal architecture seam, not immediate support for many agents.

Research/design goals:

- represent discovered sources, applicability, precedence, uncertainty, and evidence without hard-coding the output model to one agent;
- wrap current Codex resolution behind a Codex adapter without changing V0.1 behavior;
- safely detect or accept a local agent version when deterministic, otherwise return `unknown`;
- expose resolver version, adapter version, semantics evidence date, and supported surfaces;
- warn when a detected or supplied version falls outside tested evidence;
- add contract tests proving terminal and JSON output remain backward compatible.

Possible Codex-only surface:

```text
codex-scope compatibility
```

Implementation requires an evidence-backed design, fixtures, and a new decision gate.

## VALIDATION CANDIDATE — one second agent

After the Codex conformance corpus and adapter seam are proven, validate the cross-agent thesis with **one** additional agent.

The current correctness-first engineering candidate is **Gemini CLI** because its implementation is inspectable, its documentation is strong, and its hierarchical/JIT context behavior is complex enough to test the neutral model. This is not an implementation commitment.

Claude Code remains a demand-relevant alternative, but no user-count threshold automatically selects it. Choose the second adapter using evidence quality, reproducibility, maintenance cost, upstream inspectability, and whether the deterministic contract can be preserved.

An adapter is not accepted until it has:

- an official-documentation and implementation-evidence ledger;
- version/evidence-date boundaries;
- deterministic fixtures for precedence and path-scoped behavior;
- explicit conditional/unresolved handling;
- redaction and path-privacy review;
- a documented native-diagnostics comparison;
- sanitized real-repository validation.

The first cross-agent release should compare provenance and applicability facts. It must not claim semantic equivalence between arbitrary Markdown instructions.

## AFTER TWO PROVEN ADAPTERS — compare and CI

Potential surfaces:

```text
codex-scope agents
codex-scope compare codex <second-agent>
codex-scope compare codex <second-agent> --json
```

Candidate proven differences include:

- instruction source coverage;
- scope and applicability;
- winner, shadowed, ignored, and conditional sources;
- supported permission/config values with a defensible common meaning;
- MCP server declarations when discovery and merge semantics are verified;
- adapter compatibility and evidence state.

CI behavior requires a stable, versioned comparison schema and separate outcomes for proven drift, unresolved state, unsupported semantics, and tool failure.

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
