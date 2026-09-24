# Cross-agent evolution blueprint

Status: **research direction; not an implementation commitment**

This document describes how Codex Scope should evolve from a Codex-specific resolver into a **conformance-first compatibility infrastructure project**, with the existing user-facing CLI remaining a thin diagnostic surface over the same evidence base. Cross-agent support remains a later extension of the conformance model, not the immediate product goal.

## Strategic revision — 2026-09-22

The previous version of this blueprint put a 30-day external-user Demand Gate in front of the next architectural phase. That gate was useful for testing a user-facing cross-agent product hypothesis, but it over-weighted distribution for the maintainer environment Codex Scope currently has.

The project will now optimize first for **ecosystem importance that can be demonstrated through reproducible technical evidence**, rather than for broad early adoption.

The new primary loop is:

```text
upstream Codex docs / source / releases
                ↓
      explicit semantic rule
                ↓
    reproducible conformance fixture
                ↓
       deterministic test / CI
                ↓
 compatibility or behavior-drift result
                ↓
  upstream issue / fix / evidence update
                ↓
       Codex Scope compatibility record
```

This does **not** mean users, downloads, issues, or stars are irrelevant. They remain useful secondary evidence. They are no longer the gate that authorizes core conformance work.

## Strategic revision — 2026-09-24

Phase D now has a deterministic Codex ↔ Gemini comparison implementation in Draft PR #17, but its final proof-of-value gate depends on three distinct external users submitting real configuration cases. That dependency has high and unpredictable wall-clock cost.

The project will **not** weaken or remove that gate. Instead, the roadmap is decoupled:

- **Phase D remains an opportunistic external-validation track** and stays `blocked_external_proof` until three qualifying independent users are verified.
- **The active engineering mainline becomes v0.4 Codex Conformance Observatory**, which can advance from reproducible upstream evidence without waiting for external user acquisition.
- Candidate repository scans, maintainer fixtures, sanitized demonstrations, and synthetic cases still do not count toward Phase D external proof.
- A third adapter is not authorized merely because Phase D is waiting. Breadth remains subordinate to conformance depth.

The active v0.4 loop is:

```text
pinned Codex upstream snapshot
            ↓
 semantic corpus + regression corpus
            ↓
 deterministic conformance validation
            ↓
 compare against prior evidence snapshot
            ↓
 same / behavior_drift / evidence_gap
            ↓
 compatibility history
            ↓
 upstream issue / docs correction / patch
            ↓
 release when a verified semantic change warrants it
```

### v0.4 Codex Conformance Observatory exit gate

The v0.4 mainline is complete only when all of the following are true:

1. **≥50 evidence-backed Codex semantic cases** are checked in and deterministic.
2. **≥5 regression / behavior-change records** are checked in.
3. **≥2 pinned Codex upstream evidence snapshots** are retained so change-over-time can be reproduced.
4. A **machine-readable compatibility history** records snapshot-to-snapshot semantic outcomes rather than only the latest state.
5. A deterministic **upstream drift detector** classifies supported changes without LLM calls or runtime network access during inspection.
6. At least **1 newly discovered post-2026-09-24 upstream discrepancy, ambiguity, semantic change, or evidence correction** is converted into a durable Codex Scope record and, when appropriate, an upstream issue, patch, or documentation correction.
7. **Zero known false-certainty blockers** remain in the supported subset.
8. The complete clean-checkout CI and package verification suite passes.

Progress toward this gate is evidence-counted. External user adoption may strengthen the case for the project, but it does not block v0.4 engineering.

### v0.4 completion record — 2026-09-24

The v0.4 engineering exit gate is now satisfied:

- 50 deterministic Codex semantic cases;
- 5 regression/change records with exact upstream provenance and manifest-linked test bindings;
- 3 retained snapshots and 2 deterministic comparison edges;
- deterministic compatibility-history generation and drift detection;
- an evidence-backed post-2026-09-24 upstream finding;
- a machine-verifiable maintainer-facing feedback artifact for `openai/codex#34193`;
- zero known false-certainty blockers in the supported subset;
- clean package gates including `npm pack` and `npm publish --dry-run`.

This completion does **not** change Phase D's independent proof requirement. Phase D remains at 0 / 3 qualifying external-user cases and PR #17 remains unmerged until its own gate is met.

Historical snapshots remain immutable; the v2 index owns lifecycle role transitions so a retained file is not rewritten merely because it is no longer current. Carried-forward evidence remains explicit `evidence_gap` where appropriate.

## 1. Problem

Repositories increasingly carry overlapping AI coding-agent configuration:

```text
AGENTS.md
AGENTS.override.md
CLAUDE.md
GEMINI.md
.codex/config.toml
.claude/settings.json
.claude/rules/*.md
.cursor/rules/*.mdc
opencode.json
```

A filename inventory can show that these files exist. It cannot prove that a particular agent will load them for a particular working directory, target file, invocation, trust state, policy state, or version.

The product opportunity is to explain effective context with provenance:

> For each supported agent, what is active, where did it come from, why does it apply, what lost precedence, and what remains conditional or unknown?

## 2. Positioning

Codex Scope should occupy the diagnostic layer between native agent tooling and cross-agent configuration generators.

| Category | Primary job | Codex Scope boundary |
| --- | --- | --- |
| Native diagnostics | Explain one installed agent/runtime | Authoritative for live runtime state |
| Rules sync/generation | Write one policy and emit tool-specific files | Out of scope; mutation conflicts with read-only inspection |
| Filename inventory | Find likely agent configuration | Useful discovery input, not an effective-context conclusion |
| Codex Scope | Explain supported resolution semantics and uncertainty | Independent, deterministic, evidence-backed subset |

The differentiator is not the number of recognized tools. It is trustworthy provenance and explicit uncertainty.

## 3. Safety and accuracy contract

Cross-agent work inherits the V0.1 contract:

- no LLM or hosted-model calls in deterministic inspection;
- no runtime network requests;
- no execution of hooks, commands, plugins, MCP servers, or discovered scripts;
- no mutation of inspected repositories or agent configuration;
- default redaction of secret-like values;
- fail closed on unsupported syntax that could change the result;
- never convert a conditional source into a resolved claim;
- never present parsed-but-unmodeled values as semantically supported.

Remote instruction references may be reported as declarations, but their content remains unresolved unless supplied as an explicit offline input under a future reviewed design.

## 4. Resolution vocabulary

The neutral model needs more precision than a boolean loaded/not-loaded result.

| State | Meaning |
| --- | --- |
| `resolved` | Deterministically active from the supplied inputs |
| `shadowed` | Valid source that loses modeled precedence |
| `ignored` | Discovered source excluded by modeled semantics |
| `conditional` | Applicability depends on a known missing condition, such as target path or trust |
| `available` | Discoverable on demand but not automatically active |
| `unresolved` | Missing invocation/runtime/policy information can change the answer |
| `unsupported` | Surface exists, but this adapter does not claim its semantics |

Agent adapters may use only states represented in the shared schema. Adapter-specific detail belongs in structured reasons and evidence, not invented near-synonyms.

## 5. Proposed architecture

```text
filesystem + explicit invocation inputs
                  ↓
          source discovery layer
                  ↓
       agent adapter resolution
       ├── Codex adapter
       └── candidate adapter
                  ↓
     EffectiveAgentEnvironment[]
                  ↓
     central redaction + evidence
                  ↓
 inspect / why / compare / JSON / CI
```

### Shared source record

Each discovered source should be representable with:

```text
agent
surface
path_or_declaration
scope
state
precedence_or_order
applicability_reason
missing_inputs
evidence_reference
evidence_date
adapter_version
upstream_version_range_or_unknown
```

### Adapter contract

Each adapter must declare:

- supported instruction surfaces;
- supported config/permission/MCP surfaces;
- required invocation inputs;
- version detection strategy and failure behavior;
- precedence and merge rules;
- task/path-dependent behavior;
- protected or secret-bearing keys;
- unsupported syntax and fail-closed boundaries;
- evidence ledger and conformance fixtures.

An adapter must not silently fall back to generic filename detection when semantic resolution fails.

## 6. Cross-agent comparison contract

Comparison operates only on facts with a defensible shared meaning.

Safe early comparisons:

- active instruction-source coverage;
- source scope and path applicability;
- whether a source is automatic, conditional, or on demand;
- proven precedence outcomes;
- explicitly modeled permission modes;
- declared MCP server presence after agent-specific merge resolution;
- adapter compatibility and evidence status.

Unsafe early comparisons:

- extracting a canonical test command from arbitrary prose;
- declaring two natural-language policies equivalent;
- deciding which instruction is stronger across unrelated formats;
- claiming a relevance-selected rule was included without task context;
- comparing unmodeled config keys because their names look similar.

Example output shape:

```text
Cross-agent context comparison

Codex
  resolved     ./AGENTS.md
  resolved     ./frontend/AGENTS.md

Claude Code
  resolved     ./CLAUDE.md
  conditional  ./.claude/rules/testing.md

Proven drift
  Codex has a directory-scoped active instruction source with no
  supported Claude Code counterpart.

Unresolved
  Claude rule applicability requires a target path.
```

## 7. Phased plan

### Phase 0 — Codex conformance foundation

Do not make a second adapter or broad user acquisition the prerequisite for progress. The first job is to turn Codex Scope's existing resolver, fixtures, research, and CI into a maintainable **Codex semantics conformance corpus**.

Minimum evidence before broadening scope:

- at least 20 explicit Codex semantic rules represented by deterministic fixtures;
- each rule records upstream documentation and/or implementation evidence, evidence date, tested version or commit, expected behavior, and unsupported boundaries;
- at least 3 historical or current upstream behavior changes are represented as regression fixtures;
- CI can distinguish expected compatibility, behavior drift, unsupported state, and tool failure;
- the corpus can be reproduced from a clean checkout without LLM calls or runtime network access during inspection;
- at least 1 real upstream discrepancy, regression, or ambiguity is converted into a high-quality issue, patch, or evidence correction.

Strong evidence:

- at least 50 conformance fixtures across instructions, config precedence, trust/project-root behavior, profiles/overrides, and compatibility boundaries;
- multiple upstream Codex releases or commits tracked over time;
- at least 3 externally verifiable upstream issues, fixes, or documentation corrections informed by the corpus;
- a machine-readable compatibility matrix generated from checked-in evidence;
- at least one release caused by a verified upstream semantic change rather than a planned feature milestone.

Stop or narrow this direction if repeated work shows that the important state is predominantly runtime/model-only and cannot be reproduced under the deterministic/no-network contract, or if native Codex diagnostics expose the same evidence more authoritatively with no remaining conformance gap.

### Phase A — neutralize the core without changing behavior

Deliverables:

- define the shared source, resolution, compatibility, and evidence records;
- wrap the existing implementation in a Codex adapter;
- preserve current terminal output and `codex-scope.v0.1` JSON;
- add adapter contract tests;
- add schema migration tests before introducing a new JSON version;
- record performance and path-redaction baselines.

Exit gate:

- all existing tests pass unchanged;
- real Codex fixtures produce byte-for-byte compatible output where promised;
- no new filesystem, network, subprocess, or secret exposure is introduced.

### Phase B — compatibility evidence

Deliverables:

- expose resolver version, adapter version, and evidence date;
- detect a local agent version only when safe and deterministic;
- accept an explicit version for offline inspection;
- return `unknown` rather than infer a version from config shape;
- warn when a supplied version is outside tested evidence.

Exit gate:

- compatibility output distinguishes detected, supplied, unknown, supported, and outside-evidence states;
- native diagnostics remain clearly identified as authoritative for live runtime state.

### Phase C — second-agent research spike

The second agent is selected **after the Codex conformance foundation is useful on its own**. Cross-agent work is an extension of the evidence model, not the reason the evidence model exists.

Current research preference: **Gemini CLI** as the correctness-first engineering candidate because its implementation is inspectable, its documentation is strong, and its hierarchical/JIT context behavior can test path/applicability uncertainty without abandoning the deterministic contract.

Claude Code remains a demand-relevant alternative, but no user-count threshold automatically selects it. The deciding factors are evidence quality, reproducibility, maintenance cost, and whether the adapter can preserve the same deterministic contract.

For Gemini, research surfaces include:

- global/project `GEMINI.md` and hierarchical context behavior;
- target/path/JIT applicability;
- settings and precedence;
- MCP declarations where merge/discovery semantics are documented;
- version-specific and runtime-only state.

For Claude, the alternative research surface includes:

- `CLAUDE.md` / AGENTS.md fallback behavior and version boundaries;
- `.claude/rules/` and path-scoped applicability;
- user, project, local, and managed settings;
- permissions;
- MCP declarations;
- runtime/JIT states that may remain unresolved or unsupported.

Exit gate:

- official sources and implementation evidence are recorded;
- precedence and conditional behavior are covered by fixtures;
- at least three sanitized real repositories validate useful output;
- unsupported surfaces are explicit;
- a reviewer can reproduce every claimed semantic rule without a model call.

If the exit gate fails, keep the adapter experimental or do not ship it.

### Phase D — compare proof of value (opportunistic external-validation track)

Implementation status as of 2026-09-24:

- internal deterministic comparison milestone: **PASS** in Draft PR #17;
- versioned comparison/normalization/CI contracts: **PASS**;
- deterministic compare CLI, provenance, structural differences, demonstrations, and package checks: **PASS**;
- external proof-of-value: **BLOCKED (0 / 3 distinct qualifying external users)**.

This does **not** make Phase D complete. Public repository scans, maintainer-created cases, fixtures, sanitized snapshots, and earlier upstream interactions are not counted as external user cases.

Phase D is now a parallel validation track rather than the active engineering mainline. While the external gate is below 3 / 3, the truthful status remains `blocked_external_proof`; v0.4 Observatory work may continue without claiming Phase D completion.

Deliverables:

- compare two supported adapter reports;
- separate proven drift from unresolved and unsupported differences;
- version the comparison JSON schema;
- define stable CI outcomes;
- expose a deterministic explicit-input compare CLI;
- publish sanitized, reproducible demonstrations;
- validate external proof fail-closed.

Current CI outcome taxonomy:

```text
clean
proven_drift
unresolved
unsupported
tool_error
```

Exit gate:

- at least three **different external users** each provide an independent qualifying case where comparison finds a real configuration problem;
- output remains actionable without requiring knowledge of adapter internals;
- false certainty is treated as a release-blocking defect.
### Phase E — third adapter: evidence-gated OpenCode subset

Phase E runs in parallel with Phase D. Phase D remains blocked on its independent 3-user external proof gate; Phase E cannot alter or satisfy that count.

The third-adapter candidate set is:

1. Claude Code
2. Cursor
3. OpenCode

Gemini CLI is already the bounded second adapter and is not a Phase E candidate.

The machine-readable candidate matrix selected **OpenCode** at `anomalyco/opencode@0f549842ee746e400b1f72516b0b2e292e267e2c`. The decision is based on source inspectability, deterministic resolution feasibility, explicit regression provenance, and the ability to separate static semantics from live runtime state.

Claude Code remains a strong later candidate, but the inspected upstream behavior includes hook-driven and Read-triggered instruction attachment plus managed/session/plugin state. Cursor's official rules documentation is detailed, but the public repository does not expose the production resolver needed for the same source-level conformance standard, and some applicability is relevance/model/context selected.

The OpenCode adapter is authorized only for a bounded deterministic subset:

- explicit project root and cwd;
- project/global AGENTS.md discovery;
- explicit custom config directory precedence;
- explicitly supplied inert config snapshots;
- supported deep-merge plus instructions concat/dedup behavior;
- permission declaration order and last matching rule;
- caller-supplied version/revision provenance;
- shared neutral provenance and compatibility vocabulary.

It does not execute or fetch:

- OpenCode binaries/loaders;
- remote .well-known config;
- remote instruction content;
- plugins or hooks;
- MCP servers;
- live session approvals;
- managed/MDM/account/org state;
- provider/tool availability or model adherence.

Those surfaces remain conditional, unresolved, or unsupported. Native OpenCode diagnostics/runtime state are authoritative for live state.

The checked-in Phase E corpus contains 31 semantic rules and 3 exact upstream change/regression records. E3 requires candidate validation, corpus/fixture/regression validation, deterministic assertions, Codex/Gemini/OpenCode shared contract tests, generated compatibility data, a false-certainty audit, lint/format/typecheck/tests/build, `npm pack`, `npm publish --dry-run`, and green PR-head CI before `adapter_authorized` may become true.

This third-adapter gate does not rename the project, publish a new release, or change `codex-scope.v0.1`.

## 8. Backward compatibility

The cross-agent architecture must not strand current users.

- Keep `codex-scope` commands operational through the validation phases.
- Preserve the `codex-scope.v0.1` JSON schema for existing commands.
- Add new schema markers rather than silently changing field meaning.
- Treat the Codex adapter as the conformance reference implementation.
- Document any future command or package migration before deprecation.
- Provide at least one release line where old and new command names coexist if a rename is approved.

## 9. Naming and repository gate

Do not rename the repository, npm package, or binary during the research spike.

A rename requires:

- a working second adapter;
- evidence of recurring cross-agent user demand;
- a distinct name available across npm, GitHub, and relevant search results;
- a package migration and command-alias plan;
- clear differentiation from agent observability, orchestration, and configuration-sync products;
- documentation and issue-template migration;
- no loss of trust for existing Codex Scope users.

“Agent Scope” is a descriptive working concept, not an approved release name.

## 10. Success measures

Prefer **reproducible ecosystem evidence** over raw feature count or early distribution.

Evidence priority:

```text
confirmed upstream regressions / semantic changes captured by fixtures
> upstream issues / fixes / documentation corrections
> compatibility coverage across versions
> deterministic conformance fixtures with evidence metadata
> external conformance contributions
> repeat users / real repository integrations
> package downloads
> stars
```

### Phase 1 — establish Codex conformance value

Require:

- at least 20 evidence-backed semantic fixtures;
- at least 3 behavior-change or regression fixtures;
- a documented compatibility/evidence record for the supported Codex surface;
- at least 1 verified upstream discrepancy, regression, or ambiguity converted into an issue, patch, or evidence correction;
- zero known false-certainty release blockers in the supported subset.

### Phase 2 — authorize a second adapter

Require:

- the Codex conformance corpus is stable enough to serve as a reference implementation;
- at least 50 total conformance fixtures or equivalent coverage evidence;
- compatibility boundaries are version-aware and machine-readable;
- at least 3 externally verifiable upstream interactions or corrections, or equivalent evidence that the corpus matters beyond its own repository;
- the candidate second agent has sufficiently inspectable semantics to reproduce the same evidence standard.

External user demand may accelerate this phase, but lack of broad adoption alone does not block it.

### Phase 3 — authorize sustained cross-agent expansion

Before a third adapter, rename, or team product, require:

- two conformance-backed adapters with documented compatibility boundaries;
- at least 5 proven cross-agent structural differences or drift cases;
- at least 3 external issues/PRs/fixtures or upstream interactions across the project;
- evidence that maintaining another adapter adds diagnostic or ecosystem value rather than only filename coverage;
- acceptable maintenance cost across consecutive upstream releases.

Downloads, stars, and repeat users remain useful secondary signals, but they do not replace correctness, reproducibility, or ecosystem contribution.

## 11. Kill criteria

| Review point | Trigger | Action |
| --- | --- | --- |
| 2 consecutive upstream Codex releases | corpus detects no meaningful semantic surface and adds no reusable evidence | narrow the supported surface instead of expanding fixture count |
| evidence review | a claimed rule cannot be reproduced from official docs, source, or deterministic behavior | mark unsupported/unresolved; do not encode it as an oracle |
| 2 consecutive upstream releases | more than 50% of valuable state becomes non-deterministically inspectable | freeze or narrow that adapter |
| monthly per agent | maintenance exceeds one developer-day without new compatibility, regression, or ecosystem evidence | freeze/drop that adapter |
| native-tool review | native diagnostics provide the same authoritative evidence with no remaining compatibility gap | deprecate the redundant surface |
| cross-agent review | fewer than 2 proven structural differences after a serious second-adapter spike | do not build compare/third-adapter surfaces |
| observed case mix | at least 70% are model-adherence problems | do not pivot the deterministic core into an LLM policy judge |
| security review | evidence collection requires fetching secrets, executing hooks/plugins/MCP, or mutating inspected repos | keep that surface unresolved/unsupported |

## 12. Primary risks

| Risk | Mitigation |
| --- | --- |
| Shallow breadth erodes trust | Require an evidence ledger and fixtures per adapter |
| Upstream behavior changes quickly | Version/evidence boundaries and compatibility warnings |
| Task-dependent rules create false certainty | Conditional/unresolved states and explicit target inputs |
| Natural-language diff produces false positives | Compare supported structural facts only |
| Secret-bearing config appears in reports | Central redaction, negative fixtures, no raw-secret mode |
| Native tools make an adapter redundant | Re-evaluate differentiation at every adapter gate |
| Rename fragments users | Defer naming until product proof and provide aliases/migration |
| Remote config violates safety contract | Report declarations without fetching content |

## 13. Decision record

The previous strategy rejected broad cross-agent expansion because shallow breadth offered weak differentiation. The 2026-09-22 revision keeps that quality bar but changes the immediate optimization target:

> Codex Scope should first become a reproducible Codex conformance and compatibility corpus. Cross-agent work is justified only when it extends that evidence model without weakening determinism or provenance.

The user-facing CLI remains useful, but it is no longer the only or primary source of project value. Ecosystem contribution may be demonstrated through regression detection, compatibility evidence, upstream issues/fixes, and a maintained semantics corpus even before broad adoption exists.

Current product decision as of 2026-09-22: **C — conformance-first. Build Codex compatibility/regression infrastructure now; treat external adoption as secondary evidence and cross-agent adapters as a later extension.**

See [market-product-research-interim-2026-09-22.md](market-product-research-interim-2026-09-22.md) for the earlier demand-validation analysis. Its market findings remain useful, but the Demand Gate no longer controls whether Codex conformance work proceeds.
