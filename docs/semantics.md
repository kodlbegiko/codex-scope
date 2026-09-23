# Codex Scope V0.1 semantics ledger

Evidence captured: **2026-09-22**.

Pinned implementation snapshot: `openai/codex@94174e44cbc54cece45f6052328ca0c2cd7a8a2a`.

Source priority is current official OpenAI Codex documentation, then pinned public `openai/codex` implementation evidence for details the docs do not fully specify, then this repository's own historical expectations. If reality changes, the conformance corpus changes with it.

The machine-readable source of truth for this snapshot is [`../conformance/manifest.json`](../conformance/manifest.json).

## Modeled rules

| Behavior | Evidence basis | V0.1 | Caveat |
|---|---|---:|---|
| `CODEX_HOME` defaults to `~/.codex` and can be explicitly supplied | Official Codex docs | Supported | `--codex-home` exists for deterministic inspection/testing. |
| Global instructions check `AGENTS.override.md`, then `AGENTS.md` | Official docs + `codex-home/src/instructions/mod.rs` | Supported | Global lookup selects the first non-empty readable candidate. |
| Empty global override falls through to global `AGENTS.md` | Pinned upstream source | Supported | Read failures are not treated as empty. |
| Project instructions traverse project root → cwd | Official docs + pinned `agents_md.rs` | Supported | One candidate is discovered per directory. |
| Project candidate order is override → AGENTS → configured fallbacks | Official docs + pinned source | Supported | V0.1 models safe plain fallback filenames. |
| Project selection is based on first existing candidate | Pinned `agents_md.rs` | Supported | An empty `AGENTS.override.md` blocks same-directory `AGENTS.md`, then contributes no text. Public wording about skipping empty files does not spell out this filename-reconsideration detail. |
| Explicitly untrusted project skips project instruction contribution | Pinned `agents_md.rs` + trust docs | Supported | Global instructions can remain active. |
| Unknown project trust | Accuracy contract + upstream trust behavior | Unresolved | Project candidates are reported `unresolved`, never promoted to active. |
| `project_doc_max_bytes` defaults to 32768 | Official docs/schema | Supported | Project-document budget only. |
| Project instruction byte budget is cumulative root → cwd | Official schema + pinned source | Supported | Regression-oriented fixture pins truncation across directories. |
| `project_doc_fallback_filenames` defaults to `[]` | Official config reference/source | Supported | Applied after built-in filenames. |
| Project root markers default to `.git` | Official config reference | Supported | If no marker is found, V0.1 uses cwd as the diagnostic root. |
| Project configs load root → cwd, closest wins | Official config docs | Supported | Only when trust is explicitly `trusted`. |
| `$CODEX_HOME` is not loaded again as a project `.codex` layer | Upstream fix commit `dd6c1d3787aa3c8032f6e6496e2bf25c47ddb37a` | Supported | Normalized/canonical best-effort identity; regression-tested. |
| Protected machine-local project keys are ignored | Official config reference | Supported subset | V0.1 pins its documented protected-prefix set to this evidence date. |
| Untrusted project skips project config | Official config/security docs | Supported | `unknown` trust keeps project values conditional and affected values unresolved. |
| Local modeled precedence: CLI > closest project > profile > user > system > defaults | Official config docs | Supported subset | Managed/cloud constraints can change the full runtime answer and remain outside this local subset. |
| Profile selection uses `$CODEX_HOME/<name>.config.toml` | Official docs for Codex 0.134.0+ | Supported | Legacy `[profiles.<name>]` selection is historical, not current modeled behavior. |
| Repeated `-c/--config` overrides | Official CLI semantics | Supported | Later supplied override wins in the modeled invocation list. |
| Missing invocation state | Product accuracy contract + CLI semantics | Unresolved | `--invocation-complete` is the assertion boundary. |
| Missing selected profile | Current profile-v2 boundary | Fail closed | V0.1 raises `PROFILE_NOT_FOUND`. |
| `approval_policy="on-request"` / `"never"` | Current config reference | Supported | Structured/granular policy remains outside V0.1 semantic validation. |
| `approval_policy="untrusted"` | Current config/security docs | Unsupported | Historical value; current Codex documentation says it is no longer supported. |
| `approval_policy="on-failure"` | Current config reference | Unsupported | Deprecated upstream; provenance is preserved without claiming current semantics. |
| Unknown config keys | V0.1 boundary | Unsupported semantics | Parsed provenance may be shown, but semantic compatibility is not claimed. |
| Malformed / unsupported TOML syntax | V0.1 safety boundary | Fail closed | V0.1 deliberately prefers rejection to plausible partial resolution. |

## Current upstream discrepancy: CODEX_HOME / AGENTS duplication

`openai/codex#34193` remains open on this evidence date. Its reproduction shows that when `CODEX_HOME`, project root, and cwd are the same directory, the same canonical `AGENTS.md` can contribute once as global instructions and again as project instructions.

The pinned current source still assembles user instructions separately from project-discovered entries without canonical-path deduplication across those two sources. Codex Scope therefore records the duplicate as **implementation parity, not desired behavior**. If upstream fixes it, the fixture must intentionally drift and be updated.

## Defaults modeled

V0.1 hard-codes only resolver-critical defaults with a defensible evidence basis:

```text
project_doc_max_bytes = 32768
project_doc_fallback_filenames = []
project_root_markers = [".git"]
```

V0.1 semantically validates the resolver-critical keys above plus this narrow decision-key set:

```text
approval_policy
sandbox_mode
model
model_provider
```

Other parsed keys may appear with provenance but are labeled `unsupported`.

## TOML support boundary

The zero-runtime-dependency parser supports the constructs needed for common modeled Codex config: strings, booleans, numbers, dates/datetimes preserved as strings, arrays, inline tables, standard tables, dotted keys, comments, and multiline arrays/inline tables.

V0.1 deliberately **fails closed** on unsupported or ambiguous syntax such as array-of-tables and other TOML features it has not implemented. This can reject valid Codex TOML and is a documented compatibility limitation.

## Resolution semantics

A source can be visible without being a final answer.

With trust `unknown`, a higher-precedence project config remains conditional and the value is `unresolved`. For instructions, project sources are likewise not marked active when trust is unknown.

Unless `--invocation-complete` is supplied, unseen invocation/profile inputs can still supersede file-derived values, so affected results remain unresolved.

## Adapter boundary

Phase A does not change any Codex semantic rule in this ledger. The same Codex-specific resolver is now reached through `codexAdapter`, which projects deterministic results into shared internal inspection/provenance records while preserving `EffectiveCodexEnvironment` for the V0.1 CLI.

The neutral layer is deliberately non-authoritative about Codex semantics: precedence, trust gating, instruction discovery, parser boundaries, and fail-closed behavior remain owned by the Codex adapter and the machine-readable conformance corpus. An `unresolved` or `unsupported` Codex result remains unresolved or unsupported after projection.

Adapter version: `codex-adapter.v1`.

## Compatibility reporting

Phase B does not change the semantic rules above. It exposes their evidence boundary.

The generated compatibility matrix records `codex-resolver.v0.1`, `codex-adapter.v1`, the 2026-09-22 evidence date, the pinned upstream commit, and the current supported / unsupported / unresolved rule sets.

The tested Codex binary version remains `unknown`. `codex-scope compatibility --codex-version <version>` may record a supplied version, but the result remains `unresolved` until checked-in evidence contains a matching tested binary version. No version is inferred from config shape and no Codex subprocess is executed.

`conformance:validate:json` reports each rule's `expected_outcome` separately from its `actual_outcome`, so semantic drift cannot be hidden by relabeling an expectation.

## Cross-agent comparison semantics

Phase D comparison consumes neutral adapter records through a dedicated, versioned normalization layer. The shared comparison engine does not encode Codex- or Gemini-specific branches.

The machine-readable contract is `codex-scope.semantic-comparison.v1`; normalization is `codex-scope.semantic-normalization.v1`.

Classification is fail-closed:

- `same`: both sides are resolved and have the same normalized value and representation for the selected semantic dimension;
- `semantically_equivalent`: both sides are resolved and normalize to the same behavior even though their source representation differs;
- `behaviorally_different`: both sides are resolved with sufficient evidence and their normalized behavior differs;
- `unsupported_on_one_side`: exactly one side is formally unsupported while the other is resolved;
- `unresolved`: at least one side depends on trust, JIT/runtime state, missing explicit input, or bounded upstream ambiguity;
- `evidence_gap`: a comparison mapping is not sufficiently evidenced to claim equality, equivalence, or difference.

An unresolved side is never downgraded to `behaviorally_different`. An evidence gap is never guessed into a stronger classification. Provenance retains adapter version, pinned upstream commit, rule/source references, and normalized source provenance.

The current comparison layer only covers explicit structural semantic dimensions. It does not compare arbitrary instruction prose, execute agents, query MCP servers, activate extensions, or use a model to judge meaning.

For CI composition, `codex-scope.semantic-comparison-ci.v1` derives a conservative report-level outcome without rewriting record classifications. Precedence is `unresolved > unsupported > proven_drift > clean`. A record-level `evidence_gap` contributes to the report-level `unresolved` outcome while remaining `evidence_gap` in the comparison document. `tool_error` is reserved for failures that prevent a valid comparison document from being formed. Numeric exit codes remain unfrozen.


## Evidence links

Official documentation:

- https://developers.openai.com/codex/agent-configuration/agents-md
- https://developers.openai.com/codex/config-file/config-basic
- https://developers.openai.com/codex/config-file/config-advanced
- https://developers.openai.com/codex/config-file/config-reference
- https://developers.openai.com/codex/cli/reference
- https://developers.openai.com/codex/security

Pinned implementation evidence:

- https://github.com/openai/codex/tree/94174e44cbc54cece45f6052328ca0c2cd7a8a2a/codex-rs
- https://github.com/openai/codex/blob/94174e44cbc54cece45f6052328ca0c2cd7a8a2a/codex-rs/core/src/agents_md.rs
- https://github.com/openai/codex/blob/94174e44cbc54cece45f6052328ca0c2cd7a8a2a/codex-rs/codex-home/src/instructions/mod.rs
- https://github.com/openai/codex/commit/dd6c1d3787aa3c8032f6e6496e2bf25c47ddb37a
- https://github.com/openai/codex/issues/34193
