# Codex Scope post-v0.1.1 strategy

Evidence date: **2026-08-19**

This report applies the repository's evidence-gated product contract to the next step after v0.1.1. It separates observed demand, current native Codex capabilities, current implementation evidence, competitor overlap, and product decisions.

## Decision

```text
PRIMARY NEXT MOVE: real-world conformance corpus expansion
SECONDARY CANDIDATE: compatibility / version awareness
RUNTIME V0.2: NOT YET
```

Launch/readiness work is authorized now because the public repository still makes the core value harder to understand and discover than necessary. Hooks, broad context inspection, cross-agent expansion, and a web UI are not authorized now.

## Why the V0.1 thesis is still real

Several independent upstream requests ask for the same class of deterministic pre-session observability that Codex Scope targets:

| Signal | Status on evidence date | What users are asking for |
|---|---|---|
| openai/codex #26255 | OPEN | Effective config, provenance/origins/layers, cwd/profile context, JSON, redaction. |
| openai/codex #30788 | OPEN | A pre-session `debug agents-md` command with root/walk/bytes/truncation/override/skip reasons and JSON. |
| openai/codex #35276 | OPEN | A deterministic config-only check with effective layering, validation, provenance, JSON, no model/network/mutation. |
| openai/codex #37242 | OPEN | Broader context/config investigation and source/precedence visibility. |

These are demand signals, not specifications. Unresolved issue reports are not used as conformance oracles by themselves.

## Native Codex overlap

Current official Codex CLI documentation exposes:

- `codex doctor` (stable): broad local installation/config/auth/runtime/Git/terminal/app-server/thread diagnostics, including JSON support;
- `codex debug prompt-input` (experimental): exact model-visible prompt input as JSON;
- `codex debug models` (experimental): model catalog diagnostics;
- `--strict-config` on `codex review`: reject unrecognized config fields in that runtime command.

The current documented command catalog does **not** expose a documented `codex config inspect`, `codex config explain`, `codex config check`, or `codex debug agents-md` command on this evidence date.

Native internals already track effective config layer metadata/origins, so a future first-party provenance command is plausible. Generic "show effective config" therefore has **high native-replacement risk**.

### Native capability matrix

| Capability | Native Codex | Codex Scope v0.1.1 | Gap / risk |
|---|---|---|---|
| Broad installation/runtime support report | Strong (`codex doctor`) | Not a goal | Do not compete. |
| Exact model-visible prompt input | Strong experimental debug surface | Not a goal | Native is authoritative session input. |
| AGENTS pre-session explanation | No dedicated documented command | Supported subset | Strong current fit; native replacement risk is material. |
| Effective config provenance CLI | Requested; no dedicated documented command | Supported subset | Strong fit, but native internals make replacement plausible. |
| Winner + shadowed + ignored + conditional + missing | No dedicated documented user-facing command found | Core product model | Current differentiation. |
| Version-pinned independent conformance | Native does not need an independent compatibility layer | Partial docs/evidence tracking | Strategic moat candidate. |
| Directory-to-directory effective-environment diff | No dedicated documented command found | Not implemented | Demo/use-case candidate, but not first priority. |

## Upstream semantics are moving

### Project root / trust

openai/codex #37391 is open and reports different project-local trust/config behavior when Git is present inside a tree using custom `project_root_markers`. This is a warning against pretending automatic trust/project-root inference is stable across surfaces and versions.

### CODEX_HOME project config

openai/codex #9932 is closed/completed. It reported `$CODEX_HOME` being double-loaded as a project config from the home directory. Codex Scope v0.1.1 added the corresponding exclusion and regression coverage.

### AGENTS / CODEX_HOME deduplication

openai/codex #34193 remains open. The current `openai/codex` `agents_md.rs` implementation still builds user instructions separately and then discovers project AGENTS files from root to cwd without canonical-path deduplication between those two sources. Codex Scope therefore records this as an **observed implementation-parity fixture**, not as desired behavior. The fixture must change if upstream behavior changes.

### Hooks

The hook surface has recent churn. #25645 was closed after reporting profile-related duplicate hook discovery/execution. #35382 is still open, but its own report contains contradictory claims about the JSON timeout field versus the cited serde source. That makes it unsuitable as a specification oracle and reinforces the decision to keep Hooks evidence-gated.

## Competitive audit

The strongest direct repository found was `east-true/agent-config-inspector`.

It is an offline multi-provider instruction inspector covering Codex CLI plus Claude Code, Gemini CLI, Kimi Code CLI, and GitHub Copilot CLI, with instruction explanation/comparison and broader snapshot/CI/SARIF ambitions.

| Capability | Codex Scope | Native Codex | agent-config-inspector |
|---|---|---|---|
| Codex AGENTS discovery | Yes, Codex-specific subset | Runtime authoritative; dedicated debug request open | Yes |
| Codex config provenance | Yes, supported subset | Internals exist; dedicated CLI request open | Not its primary focus |
| `why <key>` config chain | Yes | No dedicated documented equivalent found | No equivalent config-key focus found |
| Multi-agent support | No | N/A | Yes |
| Instruction diff / CI / SARIF | Not yet | No dedicated documented environment diff | Stronger current direction |
| Independent Codex-specific conformance | Emerging | N/A | Provider adapters/support matrix |

Conclusion: **cross-agent breadth is not a good near-term differentiation strategy.** Codex-specific config/instruction provenance and independently reproducible conformance are more defensible.

## Moat test

If OpenAI ships a strong `codex config inspect` tomorrow, Codex Scope should still have value only if it continues to provide more than a config dump:

1. **Independent conformance** — evidence-dated fixtures that detect semantic drift.
2. **Provenance depth** — winner + shadowed + ignored + conditional + missing + reason.
3. **Pre-session deterministic reproduction** — no model/session/network required for the modeled subset.
4. **Behavioral comparison** — eventually compare effective environments, not text files.
5. **Sanitized reproducibility** — eventually produce a shareable diagnostic artifact without pretending to be live runtime truth.

The independent conformance corpus is the strongest moat because first-party diagnostics can replace surface-level inspection more easily than they can replace an independent compatibility oracle.

## Decision matrix

Scores are 0–10. Formula:

```text
PositiveScore =
0.25*Pain + 0.20*Evidence + 0.15*Differentiation + 0.15*Moat +
0.10*Demo + 0.10*Adoption + 0.05*Leverage

RiskScore =
0.30*Volatility + 0.30*NativeReplacement + 0.20*Maintenance + 0.20*Cost

PriorityScore = PositiveScore - 0.45*RiskScore
```

| Candidate | Positive | Risk | Priority | Confidence |
|---|---:|---:|---:|---|
| Real-world conformance corpus | 8.60 | 3.30 | **7.11** | HIGH |
| Sanitized diagnostic report | 7.90 | 5.30 | **5.51** | MEDIUM |
| Compatibility / version awareness | 7.60 | 4.90 | **5.40** | HIGH |
| Directory diff | 7.55 | 5.60 | **5.03** | MEDIUM |
| Snapshots | 6.10 | 4.80 | 3.94 | MEDIUM |
| CI integration | 5.55 | 5.50 | 3.08 | MEDIUM |
| Context inspection | 6.25 | 7.80 | 2.74 | LOW |
| Hooks | 6.15 | 8.20 | 2.46 | LOW |
| Managed constraints | 5.50 | 7.70 | 2.04 | LOW |
| Cross-agent expansion | 5.15 | 7.10 | 1.96 | LOW |
| MCP inspection | 5.20 | 8.70 | 1.29 | LOW |
| Web UI | 3.55 | 6.20 | 0.76 | LOW |

Although sanitized report scores slightly above compatibility, `codex doctor --json` already owns the broad diagnostic-report space and #26255 makes a first-party config-provenance report plausible. Compatibility/version awareness is therefore selected as the **secondary strategic candidate** because it strengthens the independent-conformance moat rather than competing head-on with a likely native surface.

## Launch-readiness audit

| Surface | Status before this mission | Action |
|---|---|---|
| Core runtime / npm | PASS | Preserve v0.1 behavior. |
| README technical accuracy | PASS | Preserve safety/accuracy language. |
| README 10-second comprehension | WEAK | Move proof + zero-install quickstart + use cases above engineering detail. |
| Native Codex differentiation | MISSING | Add a factual comparison. |
| Deterministic demo | WEAK | Existing fixture exists; add one reproducible demo script and surface it. |
| Repository description | MISSING | GitHub metadata is empty; provide exact setting text. |
| Repository topics | MISSING | GitHub topics are empty; provide a focused topic set. |
| Social preview | MISSING | Prepare separately in GitHub settings; do not block correctness work. |
| SECURITY | WEAK | Add explicit prohibited secret/private-data examples. |
| Bug report template | WEAK | Ask for command, expected/actual, redacted evidence, versions, minimal reproduction. |
| Real-world case intake | MISSING | Add a safe conformance-case template. |
| ROADMAP | STALE | Old V0.2 leads with Hooks despite current volatility. |

## Decision Gate A

```text
PRIMARY NEXT MOVE:
  Real-world conformance corpus expansion + launch conversion hardening

SECONDARY CANDIDATE:
  Compatibility / version awareness

DEFERRED:
  Sanitized report, directory diff, snapshots, CI integration,
  context inspection, managed constraints, MCP inspection, Hooks

REJECTED FOR NOW:
  Cross-agent expansion, Web UI

Is runtime V0.2 implementation justified now?
  NOT YET
```

No V0.2 runtime feature is authorized by this mission. The next runtime milestone should be reconsidered after launch/readiness improvements and additional real-world conformance evidence.

## Sources

Primary OpenAI / upstream evidence:

- https://developers.openai.com/codex/cli/reference
- https://github.com/openai/codex/issues/26255
- https://github.com/openai/codex/issues/30788
- https://github.com/openai/codex/issues/35276
- https://github.com/openai/codex/issues/37242
- https://github.com/openai/codex/issues/37391
- https://github.com/openai/codex/issues/9932
- https://github.com/openai/codex/issues/34193
- https://github.com/openai/codex/issues/35382
- https://github.com/openai/codex/issues/25645
- https://github.com/openai/codex/blob/main/codex-rs/core/src/agents_md.rs

Competitor evidence:

- https://github.com/east-true/agent-config-inspector
