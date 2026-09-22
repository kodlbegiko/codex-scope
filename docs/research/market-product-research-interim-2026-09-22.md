# Market & product research — interim v0.95 (2026-09-22)

Status: **interim research snapshot; approximately 92–95% complete**

This document records the current product decision for Codex Scope after reviewing the repository, PR #11, upstream issue evidence, adjacent OSS tools, native diagnostics, adoption risk, distribution, and commercialization paths.

The remaining research is primarily evidence strengthening and audit work. It may change the preferred second adapter or individual competitor assessments, but there is currently no evidence strong enough to overturn the core decision below.

## Executive decision

> **Decision B — continue Codex Scope, but do demand validation before formal cross-agent adapter development.**

Do **not** begin a production second-agent adapter, rename the project, build a web dashboard, or broaden into a multi-agent configuration platform yet.

The next 30 days should test one narrower hypothesis:

> Can Codex Scope prove cross-agent structural effective-context drift that native single-agent diagnostics cannot answer, and will unfamiliar developers use that diagnosis more than once?

Current evidence supports three distinct statements:

1. **Single-agent config/instruction observability is a real pain.** Repeated upstream issues ask for effective configuration, source/origin visibility, AGENTS discovery debugging, deterministic checks, and precedence explanation.
2. **Multi-agent configuration fragmentation is a real pain.** Rule-sync/generator tools have meaningful adoption.
3. **A standalone third-party cross-agent effective-context inspector is not yet validated.** The most direct inspector category still shows weak adoption, so adjacent demand must not be treated as product-market proof.

## Current project assessment

Codex Scope v0.1.x is already a real, installable deterministic CLI rather than a concept repository.

Current foundation:

- npm package: `codex-scope-inspector`
- CLI: `inspect`, `instructions`, `config`, `why <key>`
- versioned JSON output
- instruction/config provenance
- precedence resolution for the supported subset
- `resolved` / `unresolved` / `unsupported` / `ignored` / `shadowed`
- secret-like redaction
- fail-closed parser/config boundary
- CI, tests, GitHub Releases, Apache-2.0
- read-only, no LLM, no runtime network, no discovered-hook execution
- conformance-oriented fixtures

The current bottleneck is **not** a missing resolver feature. It is the absence of external adoption evidence: unfamiliar users, repeat use, external cases, integrations, and maintainer burden.

PR #11 should therefore remain a **research hypothesis / demand-gated direction**, not a declaration that the product has already become cross-agent.

## Market evidence

### Strongly validated pains

| Pain | Evidence level | Current judgment |
| --- | --- | --- |
| Repeated maintenance of multi-agent config/rule files | A | real pain |
| Unclear single-agent effective config / instruction sources | A | real pain |
| Nested/path/trust/precedence failures | A–B | real pain |
| Same repo producing different effective context across agents | B | structurally real; worth validating |
| Need for a separate deterministic cross-agent inspector | B-/C+ | not yet proven |
| Automatic semantic equivalence of arbitrary Markdown policies | C | premature / high false-positive risk |
| Web provenance graph | C | presentation feature without demand proof |

Important boundary:

> **Instruction loading/applicability is not instruction adherence.**

Codex Scope can make deterministic claims about discovery, scope, precedence, applicability, provenance, and uncertainty. It should not turn model compliance into a `resolved` state.

### Fragmentation is real, but standards are moving

Rule synchronization/generation has adoption, which validates the broader fragmentation problem. However, standardization is also reducing some filename-level fragmentation.

A concrete example is Claude Code v2.1.277 (2026-09-18), which added AGENTS.md fallback support when no CLAUDE.md exists. This lowers the long-term value of a filename scanner while increasing the importance of version-aware precedence and effective-context interpretation.

## Competitor landscape

GitHub stars are only a relative signal here, not an adoption KPI.

| Tool | Category | Approx. snapshot | Core JTBD | Implication |
| --- | --- | ---: | --- | --- |
| Agent Config Inspector | direct inspector | 0 stars | predicted effective instruction graph, provenance, compare, SARIF/CI | closest direct overlap; category pull remains unproven |
| Rulesync | sync/generator | ~1.46k stars | single source of truth to tool-specific config | fragmentation demand is real, but JTBD is generation |
| Ruler | sync/generator | ~2.93k stars | same rules across coding agents | strong adjacent validation; not effective-context proof |
| LNAI | sync/generator | ~243 stars | `.ai/` to native configs | same adjacent category |
| agentlint | readiness auditor | ~3 stars | repository agent-readiness audit | adjacent audit/remediation |
| claude-md-doctor | instruction effectiveness | ~38 stars | memory/instruction audit and backtesting | adjacent, partly model-behavior oriented |
| MCP Inspector | protocol debugger | ~10.9k stars | inspect/test MCP servers | shows debugging can be a painkiller category, but different layer |

The strategic distinction is:

- **Generator:** what configuration did we write?
- **Native diagnostic:** what does this installed agent report about itself?
- **Codex Scope thesis:** what can be independently proven about effective structural context, and where do supported agents differ?

## Native replacement risk

Single-agent inspection is at substantial risk of being absorbed by native tooling.

| Agent | Native observability trend | Third-party single-agent replacement risk |
| --- | --- | --- |
| Codex | doctor/status/permissions/debug/prompt/config-source surfaces are expanding | high |
| Claude Code | memory/permissions/config/MCP/managed settings are expanding | medium-high |
| Gemini CLI | memory/settings/MCP diagnostics | high |
| Cursor | active rules, team/project/user scopes, applicability UI | medium |
| OpenCode | debug agents/config/paths | very high |

Likely to be commoditized in 6–18 months:

- filename discovery
- config dumps
- generic doctor/status
- single-agent instruction source lists
- permission/MCP visibility
- single-agent why/explain where the vendor can expose authoritative runtime state

A single vendor has much less incentive to provide:

- vendor-neutral Codex vs Claude/Gemini/Cursor comparison
- independent compatibility regression evidence
- heterogeneous-agent conformance
- organization-wide cross-agent structural drift checks

## Defensible core

The moat is **not** the number of supported agents.

Weak or easily copied:

- many-agent support
- filename discovery
- generic config normalization

Potentially defensible only as a system:

> **Independent cross-agent effective-context conformance engine**

Built from:

- deterministic provenance
- precedence resolution
- explicit uncertainty
- version-aware conformance fixtures
- evidence ledger / compatibility boundaries
- structural cross-agent comparison
- later, CI drift detection if real teams adopt it

The user-facing moat is cross-agent structural comparison. The technical moat is reproducible per-version conformance evidence.

## Second-agent selection

The current research preference is **Gemini CLI**, but this is not an implementation commitment.

| Dimension | Claude | Gemini | OpenCode | Cursor |
| --- | ---: | ---: | ---: | ---: |
| Adoption | 9.5 | 8.5 | 9.5 | 10 |
| Config pain | 9 | 8 | 8 | 9 |
| Cross-agent overlap | 9.5 | 8.5 | 8 | 9 |
| Official documentation | 9 | 9.5 | 8.5 | 8 |
| Implementation verifiability | 5.5 | 10 | 10 | 3 |
| Scope/precedence complexity | 9 | 8.5 | 8 | 9.5 |
| Native tooling gap | 5.5 | 5.5 | 2 | 6 |
| Maintenance cost, higher is better | 5 | 7 | 7 | 2.5 |

Weighted decision aid in the interim research: **Claude 8.28, Gemini 8.28, OpenCode 7.90, Cursor 7.93.**

Interpretation:

- easiest to model: **OpenCode**, but native debug overlap is high;
- best for validating user/commercial demand: **Claude Code**, because Codex overlap and configuration complexity are large;
- best correctness-first engineering candidate: **Gemini CLI**, because it is fully inspectable, documented, and complex enough to test the adapter model.

**Demand override:** if the 30-day validation finds at least 2× as many real Codex+Claude cases as Codex+Gemini cases, choose Claude despite the harder implementation boundary.

## Product scope if demand is validated

Positioning:

> **Prove structural effective-context drift across coding agents.**

A useful early comparison can say:

```text
For target: packages/web/src/Button.tsx

Codex
  ./AGENTS.md                   resolved
  ./packages/web/AGENTS.md      resolved

Gemini
  ./GEMINI.md                   resolved
  ./packages/web/GEMINI.md      conditional/JIT

Proven drift
  Codex has a directory-scoped active instruction source with no
  currently active Gemini counterpart.

Unresolved
  Gemini JIT loading depends on target access state.
```

It must not claim:

- which natural-language policy is “stronger”;
- semantic equivalence of arbitrary instructions;
- that an agent will obey a loaded instruction;
- equivalence of unmodeled config keys merely because their names look similar.

## Demand Gate — must precede adapter refactor

Do not start Phase A solely because the architecture is technically attractive.

### Minimum evidence — all required

- at least 5 unrelated external target users from at least 3 repos/orgs;
- at least 3 real repos using at least 2 coding agents;
- at least 2 reproducible cross-agent structural drift cases;
- the drift is not merely model non-adherence;
- native diagnostics cannot by themselves answer the full cross-agent question;
- at least 2 users run a zero-install prototype or provide a sanitized fixture;
- at least 1 user produces a second interaction: repeat test, issue, fixture, or bug report.

### Strong evidence

- at least 10 external users;
- at least 5 repos/orgs;
- at least 5 reproducible drift cases;
- at least 3 repeat users;
- at least 2 inbound issues/fixtures;
- at least 1 external PR or conformance contribution;
- at least 1 CI/local-script integration.

### Kill signals

Stop formal cross-agent work if after 30 days:

- fewer than 3 meaningful external users actually used the tool/prototype;
- no reproducible cross-agent structural drift is found;
- more than 70% of the reported pain is instruction adherence rather than resolution;
- users mainly want sync/generation and are unwilling to install an inspector;
- most valuable state is runtime/model-only and cannot be inspected reliably offline.

## Adoption Gates

Priority of evidence:

```text
repeat users
> real repo integrations
> external conformance cases
> external issues / PRs
> unique successful runs
> npm downloads
> stars
```

### Phase 1 — current

Required before authorizing a second adapter:

- 10 external unique users;
- 3 meaningful feedback cases;
- 2 repeat users;
- 1 external case converted into a regression fixture.

### Phase 2 — cross-agent MVP

Required before shipping compare as a durable product surface:

- 5 real repos;
- 3 confirmed structural drift cases;
- 3 repeat users;
- 1 CI/local integration;
- 0 false-certainty release blockers.

### Phase 3 — sustained investment

Required before a third adapter, rename, or team product:

- 25 active external users/repos;
- 10 repeat users;
- 5 CI integrations;
- 3 organizations;
- 5 external issues/PRs/fixtures;
- organic referrals.

## Kill criteria

| Review point | Trigger | Action |
| --- | --- | --- |
| 30 days | <3 meaningful external users | stop new cross-agent features; return to Codex-only maintenance/distribution |
| 30–45 days | <2 reproducible cross-agent drift cases | do not perform adapter architecture refactor |
| 30 days after second adapter | <3 repeat users and 0 integration | do not build a third adapter |
| two consecutive upstream releases | >50% of valuable state becomes non-deterministically inspectable | freeze/drop that adapter |
| monthly per agent | >1 developer-day maintenance with no adoption growth | freeze/drop that adapter |
| 60–90 days | native tools cover >=80% of observed use cases and compare sees no use | return to Codex-only/conformance niche |
| case mix | >=70% are adherence problems | do not pivot deterministic core into an LLM policy judge |
| interviews | >=50% reject an extra CLI and no CI need appears | stop standalone cross-agent product |

## 30-day execution plan

### Week 1 — demand discovery

Do not write an adapter.

- contact 10 target users;
- complete at least 5 interviews;
- identify 3 multi-agent repos;
- manually reproduce at least 2 structural drift cases;
- keep PR #11 explicitly research/demand-gated.

Exit gate: **5 interviews + 3 repos + 2 cases.**

### Week 2 — concierge prototype

Use Codex Scope, native diagnostics, and one-off analysis to produce manual Codex-vs-X reports for at least 3 users.

Exit gate: **at least 2 different users say the report found a real problem or materially reduced debugging effort.**

### Week 3 — thin adapter, only if the gate passed

Current engineering preference: Gemini CLI.

Scope:

- instructions
- scope/precedence
- conditional/unresolved state
- compatibility evidence
- experimental compare
- JSON
- 10–20 high-value fixtures
- 3 sanitized repositories

Do not add MCP execution, hooks execution, skill-runtime claims, dashboard, SaaS, or semantic Markdown diff.

### Week 4 — external validation

At least 5 external users run the prototype.

Record:

- useful diagnosis;
- false result;
- repeat use;
- integration;
- issue/fixture contribution.

If there are at least 3 useful diagnoses and at least 2 repeat users, the project may move from **B** to **C**. Otherwise remain Codex-first.

## Distribution

First users should come from narrow, evidence-rich channels:

1. upstream issue reporters already asking for config/provenance/debugging;
2. maintainers of repos that visibly contain configuration for multiple coding agents;
3. rule-generator ecosystems, positioning Codex Scope as **generate → verify**, not another source-of-truth generator;
4. Show HN / Reddit only after a real reproducible case exists;
5. Claude/Gemini communities only when the corresponding case or adapter can actually be reproduced.

The strongest adjacent workflow hypothesis is:

```text
Rulesync / Ruler
      ↓ generate
native agent configs
      ↓ verify
Codex Scope / future cross-agent compare
```

## Codex for Open Source readiness

The program should remain an **outcome of real OSS maintenance**, not the product objective.

Current strengths:

- public OSS;
- releases;
- tests/CI;
- Apache-2.0;
- active maintenance;
- direct relevance to the Codex ecosystem.

Current gaps:

- meaningful external usage;
- repeat adoption;
- ecosystem reliance;
- external maintainer burden;
- contributors and integrations.

The research found no public fixed threshold for stars, downloads, contributors, or repository age. A reasonable self-imposed readiness gate is:

- 25+ verified external users/repos;
- 5+ repeat users;
- 3+ external issues/cases;
- 1+ external contributor;
- 3+ integrations;
- 2–3 months of sustained maintenance.

## Commercialization

Do not monetize the individual CLI yet.

Potential long-term structure:

- **OSS core:** inspect / compare / verify / JSON / local-first;
- **Team:** GitHub App, PR checks, org policy, drift history, centralized reports, compatibility alerts;
- **Enterprise:** heterogeneous-agent governance, audit/evidence export, managed baselines.

Do not build SaaS until there are at least 5 real CI integrations and at least 2 organizations independently asking for history, policy, reporting, or enforcement.

## Final decision

> **B — continue Codex Scope, but only do demand validation now.**

Why not A: adjacent multi-agent configuration and observability pain is real enough to justify a narrow 30-day test.

Why not C: external adoption is currently too weak to justify paying market risk with adapter engineering.

Why not D: a direct Agent Scope transition introduces branding, schema, adapter, migration, and maintenance cost before product pull is proven.

Why not E: repeated upstream provenance/config-debug needs and adjacent OSS adoption justify one disciplined validation cycle.

The most important rule is:

> **Cross-agent work is allowed only if it can prove effective-context drift that no single-agent native diagnostic can answer.**

## Evidence index

Repository evidence:

- https://github.com/kodlbegiko/codex-scope
- https://github.com/kodlbegiko/codex-scope/pull/11
- https://github.com/kodlbegiko/codex-scope/blob/main/README.md
- https://github.com/kodlbegiko/codex-scope/blob/main/docs/semantics.md
- https://github.com/kodlbegiko/codex-scope/blob/main/docs/compatibility.md

Selected upstream evidence:

- https://github.com/openai/codex
- https://github.com/openai/codex/issues/26255
- https://github.com/openai/codex/issues/30788
- https://github.com/openai/codex/issues/35276
- https://github.com/openai/codex/issues/37242
- https://github.com/openai/codex/issues/37391
- https://github.com/openai/codex/issues/34193
- https://github.com/anthropics/claude-code
- https://github.com/anthropics/claude-code/releases/tag/v2.1.277
- https://github.com/google-gemini/gemini-cli
- https://github.com/anomalyco/opencode

Selected adjacent OSS:

- https://github.com/intellectronica/ruler
- https://github.com/PanisHandsome/ai-rules-sync
- https://github.com/east-true/agent-config-inspector
- https://github.com/modelcontextprotocol/inspector

## Remaining research work

The remaining 5–8% is audit/evidence strengthening:

- more Reddit/Hacker News/Stack Overflow/public-forum cases to check selection bias;
- competitor npm/download/release/CI/business-model verification;
- command-level native-diagnostics checklist for Codex, Claude, Gemini, Cursor, and OpenCode;
- stricter Fact / Evidence / Inference / Recommendation labeling;
- final competitor matrix with source dates.

These items may alter the second-agent ordering or individual scores. They currently do not justify changing Decision B.
