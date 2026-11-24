# Human–Agent Engineering Reliability Research

Status: proposed research direction (2026-11-24). No study results, new runtime capabilities, validated human outcomes, or release authorization are claimed by this document.

## Mission

Extend human engineering judgment through auditable AI collaboration. Codex Scope's conformance-first inspector is the foundation: before relying on an agent, a developer should be able to establish what can be proven about its effective configuration, what remains unknown, and which evidence supports that conclusion. The broader research question is whether such evidence improves human oversight and software reliability without increasing total engineering burden.

## Scope and architectural boundary

- Preserve the supported deterministic read-only CLI, `codex-scope.v0.1` and `codex-scope.compatibility.v1` contracts, offline behavior, secret redaction, and evidence-gated compatibility claims.
- Keep Codex conformance maintenance upstream-driven. Do not add adapters or change the public CLI merely to increase coverage counts.
- Research instrumentation, any human study, and any experimental agent/task execution must be separate, explicitly opted-in, and never part of default inspection. No telemetry or collection of private prompts, repositories, or credentials by default.
- Phase D remains blocked until its existing three independent qualifying external-user cases are verified. A study participant, internal fixture, or synthetic case does not automatically count toward Phase D.
- Native agent runtime is authoritative for live behavior; static conformance is not evidence of task correctness or human understanding.

## Research questions and hypotheses (unvalidated)

1. Does a provenance report improve a developer's ability to identify the winning instruction/configuration and recognize unresolved inputs, compared with existing native diagnostics and normal manual inspection?
2. Does explicit uncertainty reduce unwarranted confidence and improve detection of agent configuration errors without increasing review time excessively?
3. In a bounded engineering task, does an evidence-supported review workflow improve detection of seeded defects and subsequent independent maintenance versus the ordinary agent-assisted workflow?

Start with questions 1–2. Question 3 is contingent on meaningful first-pilot evidence, not an immediate implementation mandate. Do not conflate task throughput with durable human capability.

## Phase F — human oversight pilot (proposed; not implemented)

### F0 — protocol and feasibility

Select one reproducible failure mode within the supported Codex semantic corpus (e.g., conflicting config precedence or incomplete invocation). Use a pinned agent/documentation revision, sanitized fixtures, a frozen answer key derived from authoritative evidence, and equivalent but non-identical task variants. Log provenance, exact inputs, expected outputs, and known limitations.

Compare at least:
- Baseline A: ordinary manual inspection plus relevant native diagnostic output where available;
- Intervention B: same permitted resources plus Codex Scope's existing provenance/uncertainty output.

Counterbalance order where practical, separate practice from held-out tasks, record prior expertise, avoid answer leakage, and use a fixed rubric. If native diagnostics require inputs unavailable in an offline environment, document that limitation and do not claim a runtime-equivalent comparison.

Start with a maintainer-only feasibility run (not evidence about a population, and not Phase D proof). Before recruiting anyone or collecting identifiable data, establish informed consent, data minimization, withdrawal, secure storage and deletion, and any required institutional ethics review. Publish only sanitized/aggregated results and appropriately licensed artifacts.

### F1 — pilot measurements

| Metric | Operational definition |
| --- | --- |
| Configuration comprehension | Fraction of prespecified rubric items correctly answered: winner, source, reason, scope and unresolved conditions; report numerator and denominator |
| False certainty | Incorrect definitive conclusions on unresolved/unsupported tasks divided by the number of such tasks |
| Error detection | Seeded defects correctly identified / seeded defects present; record false positives separately |
| Calibration | Record confidence on a common 0–100 scale per answer; report calibration error or Brier score for binary correctness where justified |
| Review effort | Active human review minutes, including tool use and correction; report timeouts and incomplete tasks separately |
| Independent transfer | Correctness on a held-out matched task without the experimental report (all other allowed resources held constant) |
| Evidence completeness | Fraction of conclusions supported by a relevant traceable source; independent rubric review where feasible |

Primary proposed endpoint: comprehension on held-out tasks, with false certainty and review effort as guardrail outcomes. Specify scoring, exclusions, task budget, sample plan and analysis before collecting data. Report absolute differences, denominators, uncertainty intervals where appropriate, and negative/null results. Small pilots are descriptive; no population-level claims or composite leaderboard.

### F2 — bounded engineering reliability extension (conditional)

Only after F1 produces an inspectable protocol and useful evidence:
- select one small, licensed, reproducible task and a held-out maintenance change;
- compare normal agent-assisted workflow against an evidence-supported human review workflow under matched time/model/tool budgets, recording exact model versions and environment;
- measure initial task acceptance, seeded defect detection, test adequacy using task-relevant mutation/negative tests, independent explanation and repair success, review/rework time, and later maintenance outcome;
- record agent cost separately from human time, including failed attempts, retries, and infrastructure costs; never infer actual correctness from green CI alone;
- record confounders (model drift, prior familiarity, task difficulty, order effects), task leakage and missing observations.

Use existing repositories only with authorization and sanitized inputs; Taiwan Mahjong Trainer may be a maintainer-only exploratory case, not an independent validation dataset. Require a distinct project or independent replication before broader claims.

## Gates and deliverables

| Gate | Required evidence |
| --- | --- |
| F0 protocol-ready | One bounded problem, fixed rubric and answer key, two comparable conditions, privacy/ethics plan, predefined measurement and analysis |
| F1 pilot-ready | Reproducible fixtures and scripts, baseline, explicit limitations, dry run and versioned artifacts |
| F1 pilot complete | Raw sanitized observations or appropriate aggregates, documented analysis, null/failure cases and reproducibility instructions; no claims beyond the design |
| F2 authorized | F1 reviewed; clear reason to extend, budget, testable question, and separate opt-in architecture |
| Public product change | Evidence of developer need, compatibility/security review, tests and independent review; explicitly authorized release decision |

Initial target: a small protocol, one working baseline, and a reproducible maintainer-only pilot within 90 days of starting active research. Treat counts and deadlines as planning targets, not passed gates. Stop or redesign if the question is not measurable, native tools already solve the problem adequately, or the report adds more burden than value. Do not require new public CLI commands, web UI, extra adapters, or paid services for F0.

## Long-term research direction

If evidence supports the approach, explore how auditable human–AI collaboration improves independent understanding, error recognition and maintenance over time. Durable contributions are reproducible protocols, transparent evidence, well-defined metrics and usable developer tools; model rankings and feature counts are not success criteria. Cross-domain cognitive or scientific augmentation is a separate future hypothesis, not a current Codex Scope feature.

## Relationship to existing work

- [Current roadmap](../../ROADMAP.md)
- [Compatibility boundaries](../compatibility.md)
- [Cross-agent evolution blueprint](cross-agent-evolution-blueprint.md)
- [Conformance coverage](codex-conformance-coverage.md)

The existing observatory, immutable historical evidence, and external validation gate remain authoritative for current product claims.
