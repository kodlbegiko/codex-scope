# Codex Scope Roadmap

Codex Scope grows by making one promise increasingly reliable:

> **Given a working directory and known Codex inputs, explain what can be proven about what Codex will use, where it came from, why it won, and what remains unknown.**

The roadmap is evidence-gated. A feature appearing here does not authorize implementation when current Codex semantics are unstable or native Codex has already made the feature redundant.

## Shipped — V0.1.x foundation

Current public line: **V0.1.x**. Use [GitHub Releases](https://github.com/kodlbegiko/codex-scope/releases) or npm for the authoritative latest patch.

Shipped surfaces:

- `codex-scope inspect`
- `codex-scope instructions`
- `codex-scope config`
- `codex-scope why <key>`
- versioned JSON output
- instruction/config provenance
- explicit resolved/unresolved/unsupported/ignored/shadowed state
- secret-like value redaction
- fail-closed TOML/config handling for the modeled subset
- read-only, no-model, no-runtime-network inspection
- conformance-oriented fixtures

V0.1.x intentionally does **not** claim full Codex compatibility.

## NOW — trust and adoption foundation

### 1. Real-world conformance corpus

Convert confirmed current Codex semantics and merged bug fixes into small deterministic fixtures with evidence metadata.

Required fixture metadata:

```text
source
evidence_date
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
Why not just use native Codex diagnostics?
```

Maintain one reproducible real demo rather than fabricated screenshots.

### 3. Real feedback

Prioritize reproducible resolution mismatches, sanitized real-world cases, and external usage evidence over feature-count milestones.

## NEXT — compatibility / version awareness

Primary next runtime candidate after the NOW gate.

Research/design goals:

- safely detect a local Codex version when deterministic;
- otherwise return `unknown`, never guess;
- expose Codex Scope version and semantics evidence date;
- explain supported and unsupported surfaces;
- warn when the detected/supplied Codex version falls outside tested evidence.

Possible surface:

```text
codex-scope compatibility
```

Implementation requires an evidence-backed design and a new decision gate.

## SECONDARY CANDIDATES

### Sanitized diagnostic report

Potential use case:

```text
codex-scope report --json
```

Only proceed with explicit path-privacy policy, versioned schema, default redaction, and clear differentiation from `codex doctor --json` and any future native config provenance command.

### Directory diff

Potential use case:

```text
codex-scope diff ./frontend ./backend
```

It must compare effective behavior, not arbitrary text. Candidate differences include instruction chain, effective config values, winner source, ignored/shadowed state, trust effects, and compatibility state.

## LATER

- snapshots after an environment/report schema is stable;
- CI integration after local snapshot/diff behavior proves useful;
- richer managed-constraint modeling when semantics can be verified;
- MCP/plugin surfaces only when discovery semantics are stable enough for deterministic inspection.

## GATED — Hooks

Hooks are **not** the current V0.2 lead.

Before implementation, re-verify:

- official hook schema;
- discovery and merge behavior;
- profile interaction;
- project trust behavior;
- managed hook behavior;
- current runtime regressions.

Codex Scope must never execute discovered hooks during inspection.

If discovery semantics are volatile or contradictory, keep the surface unsupported rather than approximate it.

## REJECTED FOR NOW

### Cross-agent expansion

Codex-specific semantic depth currently offers stronger differentiation than shallow breadth across Claude Code, Gemini CLI, Copilot, or other agents. Reconsider only with strong user demand and a defensible differentiation plan.

### Web UI

Do not build a browser UI merely because provenance graphs are visually attractive. Reconsider only if real users demonstrate a CLI limitation that a web interface meaningfully solves.

## Long-term direction

If Codex Scope earns trust and repeated real-world usage, later versions may evolve toward:

```text
Codex effective environment
├── instructions
├── config provenance
├── compatibility
├── safe reports / snapshots
├── environment diff
├── managed constraints
├── hooks (evidence-gated)
├── MCP/plugins (evidence-gated)
└── richer provenance graph
```

The moat is not feature count. It is independently reproducible evidence that the resolver matches the Codex behavior it claims to model.

See [`docs/research/post-v0.1.1-strategy.md`](docs/research/post-v0.1.1-strategy.md) for the evidence and decision matrix behind this ordering.
