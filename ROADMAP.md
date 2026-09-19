# Codex Scope Roadmap

Codex Scope grows by making one promise increasingly reliable:

> **Given a working directory and known invocation inputs, explain what can be proven about the instructions and configuration an AI coding agent will use, where each value came from, why it won, and what remains unknown.**

Codex remains the fully modeled foundation. Cross-agent work is a gated evolution of the same provenance model, not permission to replace semantic depth with filename detection.

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

## Product direction — evidence-based cross-agent context diagnostics

Repositories increasingly contain overlapping instructions and settings for Codex, Claude Code, Cursor, Gemini CLI, OpenCode, and other coding agents. The opportunity is not another rules generator or synchronization tool. It is a read-only diagnostic that can answer:

- which sources are discovered for a specific agent and working context;
- which sources are active, shadowed, ignored, conditional, or available only on demand;
- which conclusions are proven and which depend on runtime, task, trust, policy, or model decisions;
- where two supported agents have a proven effective-context difference.

Cross-agent work must preserve these constraints:

1. **Depth before breadth.** One conformance-backed adapter is more valuable than many filename scanners.
2. **Per-agent evidence.** Every modeled rule records its upstream source, evidence date, fixture, and compatibility boundary.
3. **No false “agent sees” claims.** Task-dependent or model-selected rules remain conditional or unresolved unless the required context is supplied.
4. **Read-only by default.** Codex Scope does not generate, synchronize, or rewrite agent configuration.
5. **No semantic guessing.** Arbitrary prose is not converted into normalized commands or policy claims by regex or hidden LLM calls.
6. **Backward compatibility.** Existing Codex commands and versioned JSON remain stable through any internal adapter refactor.

See [`docs/research/cross-agent-evolution-blueprint.md`](docs/research/cross-agent-evolution-blueprint.md) for the proposed architecture, gates, and phased validation plan.

## NOW — trust and adoption foundation

### 1. Real-world Codex conformance corpus

Convert confirmed current Codex semantics and merged bug fixes into small deterministic fixtures with evidence metadata.

Required fixture metadata:

```text
agent
source
evidence_date
upstream_version_or_channel
upstream_behavior
expected_scope_behavior
reason_for_fixture
```

Unresolved issue speculation is never a test oracle by itself.

### 2. Public onboarding

Make the repository answer within one viewport:

```text
What problem is this?
What command do I run?
What proof do I get?
Why not just use native diagnostics?
```

Maintain one reproducible real demo rather than fabricated screenshots.

### 3. Real feedback

Prioritize reproducible resolution mismatches, sanitized real-world cases, and external usage evidence over feature-count milestones.

## NEXT — adapter-ready core and compatibility awareness

The next implementation candidate is an internal architecture seam, not immediate support for many agents.

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

After the adapter seam is proven, validate the cross-agent thesis with **one** additional agent. Claude Code is the leading research candidate because it has documented project/global instruction, rule, settings, permission, and MCP surfaces that meaningfully test the neutral model.

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
codex-scope compare codex claude
codex-scope compare codex claude --json
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

Cursor, Gemini CLI, and OpenCode are research candidates, not promised support. Each requires its own decision gate.

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

The moat is not agent count or feature count. It is independently reproducible evidence that each adapter matches the behavior it claims to model, and an honest boundary around everything it cannot prove.

See [`docs/research/post-v0.1.1-strategy.md`](docs/research/post-v0.1.1-strategy.md) for the original V0.1 decision matrix.
