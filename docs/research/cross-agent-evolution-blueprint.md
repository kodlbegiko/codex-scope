# Cross-agent evolution blueprint

Status: **research direction; not an implementation commitment**

This document describes how Codex Scope could evolve from a Codex-specific resolver into an evidence-based cross-agent effective-context debugger without weakening its deterministic, read-only safety contract.

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

### Phase 0 — 30-day Demand Gate

Do not refactor the core or build a second adapter until the cross-agent product hypothesis clears a market-evidence gate.

Minimum evidence — **all required**:

- at least 5 unrelated external target users from at least 3 repos/orgs;
- at least 3 real repositories using at least 2 coding agents;
- at least 2 reproducible cross-agent structural drift cases;
- the drift is not merely model non-adherence;
- native diagnostics cannot individually answer the complete cross-agent question;
- at least 2 users run a zero-install prototype or provide a sanitized fixture;
- at least 1 repeat interaction: a second test, issue, fixture, or bug report.

Strong evidence:

- at least 10 external users across 5 repos/orgs;
- at least 5 reproducible drift cases;
- at least 3 repeat users;
- at least 2 inbound issues/fixtures;
- at least 1 external PR or conformance contribution;
- at least 1 CI/local-script integration.

Kill signals after 30 days:

- fewer than 3 meaningful external users actually used the prototype;
- zero reproducible cross-agent structural drift cases;
- more than 70% of observed pain is instruction adherence rather than resolution;
- users mainly want sync/generation and will not adopt an inspector;
- most valuable state is runtime/model-only and cannot be inspected reliably under the deterministic/no-network contract.

If the Demand Gate fails, remain Codex-first and invest in distribution, conformance, or maintenance rather than adapter architecture.

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

The second agent is selected **after** the Demand Gate.

Current research preference: **Gemini CLI** as the correctness-first engineering candidate because its implementation is inspectable, its documentation is strong, and its hierarchical/JIT context behavior can test path/applicability uncertainty without abandoning the deterministic contract.

This is not a commitment. Use the following override:

> If the 30-day Demand Gate produces at least twice as many real Codex+Claude cases as Codex+Gemini cases, select Claude Code instead. User evidence outranks architecture preference.

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

### Phase D — compare proof of value

Deliverables:

- compare two supported adapter reports;
- separate proven drift from unresolved and unsupported differences;
- version the comparison JSON schema;
- define stable CI outcomes;
- publish a sanitized, reproducible demonstration.

Candidate CI outcome taxonomy:

```text
clean
proven_drift
unresolved
unsupported
tool_error
```

Numeric exit codes are not frozen until common CI conventions and composability are reviewed.

Exit gate:

- external users provide at least three cases where comparison finds a real configuration problem;
- output remains actionable without requiring knowledge of adapter internals;
- false certainty is treated as a release-blocking defect.

### Phase E — additional adapters

Evaluate Cursor, Gemini CLI, and OpenCode individually. Do not batch them into one milestone.

Each decision considers:

- official documentation quality;
- inspectable implementation evidence;
- conditional/task-dependent loading;
- availability of sanitized fixtures;
- native diagnostic overlap;
- maintenance volatility;
- ability to preserve the no-network/no-execution contract.

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

Prefer evidence of diagnostic value over raw feature count.

Evidence priority:

```text
repeat users
> real repository integrations
> external conformance cases
> external issues / pull requests
> unique successful runs
> package downloads
> stars
```

### Phase 1 — authorize a second adapter

Require:

- at least 10 external unique users;
- at least 3 meaningful feedback cases;
- at least 2 repeat users;
- at least 1 external case converted into a regression fixture.

### Phase 2 — ship cross-agent compare as a durable surface

Require:

- at least 5 real repositories;
- at least 3 confirmed structural drift cases;
- at least 3 repeat users;
- at least 1 CI/local integration;
- zero known false-certainty release blockers.

### Phase 3 — authorize sustained expansion

Before a third adapter, rename, or team product, require:

- at least 25 active external users/repos;
- at least 10 repeat users;
- at least 5 CI integrations;
- at least 3 organizations;
- at least 5 external issues/PRs/fixtures;
- organic referrals.

Downloads and stars are useful secondary adoption signals, but they do not replace correctness or repeat-use evidence.

## 11. Kill criteria

| Review point | Trigger | Action |
| --- | --- | --- |
| 30 days | fewer than 3 meaningful external users | stop new cross-agent features; return to Codex-only maintenance/distribution |
| 30–45 days | fewer than 2 reproducible cross-agent drift cases | do not perform adapter architecture refactor |
| 30 days after second adapter | fewer than 3 repeat users and zero integrations | do not build a third adapter |
| two consecutive upstream releases | more than 50% of valuable state becomes non-deterministically inspectable | freeze/drop that adapter |
| monthly per agent | maintenance exceeds one developer-day with no adoption growth | freeze/drop that adapter |
| 60–90 days | native tools cover at least 80% of observed use cases and compare sees no use | return to Codex-only / conformance niche |
| observed case mix | at least 70% are model-adherence problems | do not pivot the deterministic core into an LLM policy judge |
| user interviews | at least 50% reject an extra CLI and no CI need appears | stop the standalone cross-agent product hypothesis |

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

The previous strategy rejected broad cross-agent expansion because shallow breadth offered weak differentiation. This blueprint changes the hypothesis, not the quality bar:

> Cross-agent work is worth validating only if it extends Codex Scope's deterministic provenance model and can expose proven effective-context drift that no single-agent native diagnostic can explain.

Until that hypothesis passes the gates above, Codex Scope remains a Codex-first resolver.

Current product decision as of 2026-09-22: **B — continue Codex Scope, but perform demand validation before formal cross-agent implementation.**

See [market-product-research-interim-2026-09-22.md](market-product-research-interim-2026-09-22.md) for the current market evidence, competitor snapshot, second-agent decision aid, distribution plan, and 30-day execution plan.
