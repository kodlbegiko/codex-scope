# Codex Scope Roadmap

Codex Scope grows by making one promise increasingly reliable:

> **Given a working directory and known invocation inputs, explain what can be proven about the instructions and configuration an AI coding agent will use, where each value came from, why it won, and what remains unknown.**

Codex remains the conformance-backed foundation for its explicitly supported V0.1 subset. Cross-agent work is a gated evolution of the same provenance model, not permission to replace semantic depth with filename detection.

The roadmap is evidence-gated. A feature appearing here does not authorize implementation when upstream semantics are unstable, cannot be inspected safely, or are already better answered by a native diagnostic.

## Shipped — V0.3.x Codex foundation + Gemini adapter preview

Current release line: **V0.3.x**. Use [GitHub Releases](https://github.com/kodlbegiko/codex-scope/releases) or npm for the authoritative latest patch. V0.3 preserves the V0.1 Codex semantic subset and JSON contract while shipping the evidence-backed Gemini CLI adapter as a bounded preview.

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
- a 32-rule semantic corpus and 4 regression/change records
- generated compatibility matrix and `compatibility` command
- neutral static adapter seam for evidence-gated expansion
- 27 deterministic Gemini CLI research cases, for 59 combined semantic cases
- a bounded Gemini adapter with explicit unresolved/unsupported boundaries
- three sanitized real-repository validations and three external evidence records
- machine-enforced Gemini research and implementation gates

V0.3.x intentionally does **not** claim full Codex or Gemini CLI compatibility, and does not yet expose a public cross-agent comparison command.

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

## COMPLETED ENGINEERING GATE — v0.4 Codex Conformance Observatory

The current product decision remains **C: conformance-first**.

Phase D still depends on three distinct external users and remains a parallel external-validation track. Its waiting time does not block Codex conformance engineering.

### Verified v0.4 result

| Gate | Verified evidence | Status |
| --- | --- | --- |
| ≥50 Codex semantic cases | 50 manifest rules: 42 compatible, 3 unsupported, 5 unresolved | satisfied |
| ≥5 regression/change records | 5 records in `conformance/regressions.json` using the v2 provenance schema | satisfied |
| ≥2 retained upstream snapshots | 3 retained snapshots in snapshot-index v2 | satisfied |
| Machine-readable compatibility history | `conformance/compatibility-history.json` generated deterministically | satisfied |
| Deterministic drift detector | `unchanged`, `behavior_drift`, `evidence_gap`, `support_boundary_change`, `added_rule`, `removed_rule`, `tool_error` | satisfied |
| ≥1 post-2026-09-24 upstream finding | network-policy extension HTTP-client fix at `1d87af5f...` | satisfied |
| Maintainer-facing feedback loop | source-level recheck recorded against `openai/codex#34193` | satisfied |
| Zero known false-certainty blocker | no known blocker in the supported deterministic subset | satisfied |
| Clean checkout / package verification | CI enforces tests, observatory checks, `npm pack`, and `npm publish --dry-run` | satisfied |

The old 2026-09-22 and earlier 2026-09-24 snapshot files remain retained evidence. The current snapshot was added rather than created by silently rewriting those files. Snapshot-index v2 makes lifecycle roles index-authoritative so a previously current immutable snapshot can become historical without file mutation.

The regression corpus is also machine-bound to exact upstream commit/date, manifest fixture path, assertion count, compatibility classification, and explicit coverage limitations. The multi-environment project-doc budget semantic remains unresolved outside the deterministic supported boundary rather than being simulated.

Coverage and readiness records:

- [`docs/research/codex-conformance-coverage.md`](docs/research/codex-conformance-coverage.md)
- [`docs/release/v0.4-readiness.md`](docs/release/v0.4-readiness.md)

Publication is a separate release action. Completing the v0.4 engineering gate does not claim an npm release occurred.

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

The Phase B implementation and follow-up review fixes are validated by clean-checkout CI on the release line.

## COMPLETED — Phase C second-agent adapter

Phase C selected **Gemini CLI** after comparing current official documentation and inspectable upstream source for Gemini CLI, Claude Code, and Cursor.

The implemented gate contains:

- a pinned `google-gemini/gemini-cli` evidence snapshot;
- 27 deterministic Gemini cases and 59 combined Codex/Gemini cases;
- three sanitized real-repository validations;
- three distinct external upstream evidence records;
- a bounded static adapter with explicit unresolved/unsupported states;
- validation that rejects stale coverage, dishonest readiness, unsafe fixture paths, and missing implementation artifacts.

See [`docs/research/second-agent-selection-2026-09-23.md`](docs/research/second-agent-selection-2026-09-23.md) for the evidence and selection record.

## SHIPPED PREVIEW — one second adapter

Gemini CLI is the first evidence-backed second adapter. The preview covers only the deterministic subset authorized by its corpus; it does not claim complete runtime context or semantic equivalence with Codex.

The accepted adapter has:

- an official-documentation and implementation-evidence ledger;
- version/evidence-date boundaries;
- deterministic fixtures for precedence and path-scoped behavior;
- explicit conditional/unresolved handling;
- redaction and path-privacy review;
- a documented native-diagnostics comparison;
- sanitized real-repository validation.

The first cross-agent release should compare provenance and applicability facts. It must not claim semantic equivalence between arbitrary Markdown instructions.

## PARALLEL TRACK — Phase D external proof of value

Phase D's deterministic comparison core is implemented in Draft PR #17. Internal schema, normalization, classifications, provenance, compare CLI, demonstrations, package checks, and CI gates pass.

The remaining exit condition is deliberately external:

```text
required distinct external users: 3
verified qualifying cases: 0
status: blocked_external_proof
```

This state is truthful and non-blocking for v0.4. Public-repository scans, maintainer fixtures, sanitized demos, and synthetic examples cannot satisfy the gate. When a qualifying external report arrives, it is reproduced and validated independently; otherwise the count remains unchanged.

Phase D becomes review-ready only after **3 / 3** distinct external user cases pass the repository validator and evidence review. Until then PR #17 remains Draft.
## PHASE E — OpenCode third-adapter engineering gate

Phase E is decoupled from Phase D's external-user proof gate. It does not weaken Phase D and does not use adapter breadth as a substitute for external validation.

Candidate research evaluates exactly three third-adapter candidates:

- **OpenCode** — selected because the instruction/config/permission implementation is source-inspectable and can be bounded to inert deterministic snapshots.
- **Claude Code** — evidence-rich, but current instruction behavior has a larger hook/Read/attachment/managed runtime surface.
- **Cursor** — documentation-rich, but the production resolver source is not sufficiently inspectable and some applicability is Agent/relevance/context selected.

The selected OpenCode evidence revision is `0f549842ee746e400b1f72516b0b2e292e267e2c`. The implementation is constrained to the shared adapter architecture and preserves `codex-scope.v0.1`.

Current checked-in gate:

- E1 candidate matrix/selection: complete;
- E2 semantic corpus: 31 rules with 3 verified regression/change records and deterministic fixtures/assertions;
- E3 shared contracts, compatibility artifact, false-certainty audit, package gates: machine-complete in PR #25;
- final adapter authorization: pending the final documentation/status PR-head CI pass.

Native OpenCode remains authoritative for live runtime/session state. No OpenCode binary, hook, plugin, MCP server, or remote configuration/instruction source is executed or fetched by the adapter.

This gate does not imply npm publication or a GitHub release. Package version remains on the existing V0.3.x release line unless a separate release decision is made.

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

Claude Code, Cursor, and OpenCode remain research candidates after the first validated second adapter. Gemini CLI is now the bounded preview adapter; every additional adapter requires its own decision gate.

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
