# Codex Scope

[![npm version](https://img.shields.io/npm/v/codex-scope-inspector.svg)](https://www.npmjs.com/package/codex-scope-inspector)
[![CI](https://github.com/kodlbegiko/codex-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/kodlbegiko/codex-scope/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/kodlbegiko/codex-scope.svg)](LICENSE)

> **Know which Codex instructions and config win — before you start a session.**

Codex Scope is a deterministic, read-only CLI that explains the supported Codex instruction chain and configuration precedence: **what is active, where it came from, why it won, and what is still unknown.**

**No LLM calls · No OpenAI API key · No runtime network · No hook execution**

> **Status:** V0.3.x is the current release line; use [GitHub Releases](https://github.com/kodlbegiko/codex-scope/releases) or npm for the authoritative latest patch. V0.3 preserves the Codex CLI and V0.1 JSON contract while adding a bounded Gemini CLI conformance-adapter preview. It does not yet add a public cross-agent comparison command or claim full compatibility with either agent. See [`docs/compatibility.md`](docs/compatibility.md).
>
> **Unofficial project:** Codex Scope is an independent community tool and is not affiliated with or endorsed by OpenAI.

## Try it in 60 seconds

From any Codex project directory:

```bash
npx --yes --package=codex-scope-inspector codex-scope inspect
```

Then ask why one supported config value won:

```bash
npx --yes --package=codex-scope-inspector codex-scope why approval_policy
```

Look for three things:

1. **winner** — the highest-precedence applicable source Codex Scope can prove from the supplied inputs;
2. **shadowed / ignored** — files or values that were found but do not win;
3. **unresolved** — an input is missing or conditional, so Codex Scope refuses to pretend the final answer is certain.

`unresolved` is not a crash or a failed scan. It is the explicit result when unseen invocation/profile/trust state could still change the answer.

If the first run is confusing, or Codex behaves differently from the report, submit a **sanitized** [first-run feedback issue](https://github.com/kodlbegiko/codex-scope/issues/new?template=first_run_feedback.md) or [real-world conformance case](https://github.com/kodlbegiko/codex-scope/issues/new?template=real_world_case.md).

If Codex and Gemini CLI behave differently in the same repository and that difference causes a real configuration problem, submit a sanitized [cross-agent configuration case](https://github.com/kodlbegiko/codex-scope/issues/new?template=cross_agent_configuration_case.md). You can report the case with the released v0.3.0 package; a maintainer will reproduce it with the Phase D draft comparison tool.

## See the answer, not the layer stack

```text
$ codex-scope why approval_policy

approval_policy = on-request
state: resolved

winner
  ./.codex/config.toml:1

shadowed
  ~/.codex/dev.config.toml:1
  ~/.codex/config.toml:1

reason
  Highest-precedence applicable known source wins.
```

Use it when you are asking:

- **Which `AGENTS.md` files will Codex load here?**
- **Why did this project config beat my profile or user config?**
- **What can I prove before opening a Codex session, and what is still unresolved?**

## Quickstart

No global install required:

```bash
npx --yes --package=codex-scope-inspector codex-scope inspect
```

Or install the CLI:

```bash
npm install -g codex-scope-inspector
codex-scope inspect
```

If your system blocks global npm installs, prefer the `npx` command above instead of `sudo npm install -g`.

## Core commands

```text
codex-scope inspect          concise environment overview
codex-scope instructions     instruction discovery + provenance
codex-scope config           detailed supported config resolution
codex-scope why <key>        explain one config decision chain
codex-scope compatibility     report evidence/version compatibility boundaries
```

The original four commands continue to use the versioned `codex-scope.v0.1` JSON marker. `codex-scope compatibility --json` emits the additive `codex-scope.compatibility.v1` contract.

An explicit offline Codex version can be supplied with `--codex-version <version>`. Because the current evidence snapshot has no pinned tested Codex binary version, supplied versions remain `unresolved` rather than being guessed compatible.

## Codex Scope vs native Codex diagnostics

They overlap, but they answer different questions.

| Tool | Best for |
|---|---|
| `codex doctor` | Broad installation, configuration, auth, runtime, Git, terminal, app-server, and thread diagnostics. |
| `codex debug prompt-input` | Inspecting the exact model-visible prompt input as JSON, including instruction/session context. |
| **Codex Scope** | Focused, deterministic **pre-session** explanation of the supported instruction/config layers, including winner, shadowed/ignored/conditional sources, provenance, and unresolved inputs. |

Codex Scope does **not** replace native Codex diagnostics or claim to know live session state it was never given. Native Codex is the authoritative runtime; Codex Scope is an independent resolver for its explicitly documented/tested subset.

See [`docs/research/post-v0.1.1-strategy.md`](docs/research/post-v0.1.1-strategy.md) for the current overlap and product-risk analysis.

## Real deterministic demo

The repository includes a fixture where user config, a `dev` profile, and project config disagree.

After building from source:

```bash
node scripts/demo.mjs
```

The script runs the checked-in fixture and prints real `inspect` and `why approval_policy` output. It does not fabricate terminal output and does not require network access.

Equivalent command:

```bash
node dist/cli.js why approval_policy \
  --cwd fixtures/demo/conflict/project \
  --codex-home fixtures/demo/conflict/home \
  --profile dev \
  --trust trusted \
  --invocation-complete
```

## Why results can be `unresolved`

Codex Scope does not guess missing invocation state. If you run:

```text
codex-scope inspect
```

without declaring whether the inspected invocation has additional profile/CLI overrides, a file-derived winner may be visible while the final state remains `unresolved`.

To assert that the known invocation inputs are complete:

```bash
codex-scope inspect \
  --cwd /path/to/repo \
  --trust trusted \
  --invocation-complete
```

If Codex is launched with a profile or config override, supply the same known inputs:

```bash
codex-scope why approval_policy \
  --cwd /path/to/repo \
  --profile dev \
  -c 'sandbox_mode="workspace-write"' \
  --trust trusted \
  --invocation-complete
```

Current Codex profiles are modeled as `$CODEX_HOME/<name>.config.toml`, not as a legacy profile table.

## Resolution states

```text
resolved     deterministically known from supplied inputs
unresolved   a required input is missing or conditional
unsupported  behavior exists outside V0.1's modeled subset
ignored      a discovered source is excluded by modeled Codex semantics
shadowed     a valid source loses precedence
```

No hidden guesses.

## Safety contract

Normal inspection:

- reads only files needed for the supported resolution path;
- performs no LLM or OpenAI API calls;
- performs no runtime network requests;
- never executes discovered hooks;
- never mutates the inspected project, Codex config, or `AGENTS.md` files;
- redacts secret-like config keys in terminal and JSON output.

Redaction is heuristic, not a mathematical guarantee. There is no raw-secret output option in V0.3.

## Accuracy and compatibility

The resolver follows current official Codex documentation first and uses current `openai/codex` implementation evidence to pin supported edge cases that documentation does not fully specify.

The exact supported surface and evidence date are recorded in:

- [`docs/semantics.md`](docs/semantics.md)
- [`docs/compatibility.md`](docs/compatibility.md)
- [`docs/research/post-v0.1.1-strategy.md`](docs/research/post-v0.1.1-strategy.md)

The conformance suite intentionally records evidence. Resolver changes should add or update a focused fixture rather than broaden behavior by guesswork.

## Conformance corpus

Phase 0 keeps the evidence used by the resolver in machine-readable form:

- `conformance/manifest.json` — semantic rules, evidence, fixture probes, assertions, and supported/unsupported boundaries;
- `conformance/regressions.json` — upstream fixes, behavior changes, and current discrepancies that must not silently regress;
- `conformance/compatibility-matrix.json` — generated compatibility record for the pinned evidence snapshot.

Validate the checked-in corpus after building:

```bash
npm run conformance:matrix:check
npm run conformance:validate
npm run conformance:validate:json
```

Conformance validation distinguishes `compatible`, `behavior_drift`, `unsupported`, `unresolved`, and `tool_error`. Expected `unsupported` or `unresolved` cases are evidence, not generic test failures.

The current matrix intentionally records the tested Codex binary version as `unknown`; Codex Scope does not shell out to Codex or infer a version from config shape.

See [`docs/conformance-status.md`](docs/conformance-status.md) for the implementation gate.

## v0.4 Codex Conformance Observatory

The **v0.4 engineering gate is complete** as of 2026-09-24. This is an implementation/readiness statement, not a claim that v0.4 has already been published to npm; V0.3.x remains the current released line until a release is actually published.

Verified v0.4 state:

- **50** deterministic Codex semantic cases: 42 compatible, 3 unsupported, 5 unresolved;
- **5** regression/change records with exact upstream commit/date and deterministic test bindings;
- **3** retained upstream evidence snapshots with immutable historical files;
- deterministic compatibility-history generation and drift classification;
- one evidence-backed post-2026-09-24 upstream finding;
- a machine-readable maintainer-facing upstream feedback artifact linked to `openai/codex#34193`;
- clean package verification through `npm pack` and `npm publish --dry-run`;
- no change to the existing `codex-scope.v0.1` public JSON contract.

The current snapshot deliberately preserves carried-forward evidence and `evidence_gap` classifications instead of rewriting history to make the latest result look fully reverified.

See:

- [`docs/research/codex-conformance-coverage.md`](docs/research/codex-conformance-coverage.md)
- [`docs/release/v0.4-readiness.md`](docs/release/v0.4-readiness.md)

Phase D external proof remains a separate non-blocking track at **0 / 3** qualifying external-user cases; Draft PR #17 is not merged.

## Phase E OpenCode conformance adapter

Phase E has selected **OpenCode** as the third conformance adapter candidate at pinned upstream revision `anomalyco/opencode@0f549842ee746e400b1f72516b0b2e292e267e2c`.

The checked-in Phase E corpus contains **31** evidence-backed semantic rules:

- 17 compatible within the bounded inert-snapshot subset;
- 4 conditional semantic states;
- 3 explicitly unsupported surfaces;
- 11 compatibility outcomes that remain unresolved;
- 0 expected steady-state `tool_error` cases;
- 3 exact upstream behavior-change/regression records.

The adapter is deliberately narrower than the native OpenCode runtime. It can replay explicitly supplied project/global AGENTS.md state, selected inert config snapshots, permission declaration order/last-match behavior, and caller-supplied version provenance. It does **not** fetch remote config or instructions, execute OpenCode, run plugins/hooks/MCP, resolve live session approvals, or infer managed/account/org/provider/tool/model state.

For live runtime state, **native OpenCode diagnostics and runtime state are authoritative**. Codex Scope contributes offline reproducibility, provenance, compatibility boundaries, regression evidence, and a neutral representation that can be compared with the existing Codex and Gemini adapters.

The Phase E machine artifacts live under `conformance/research/phase-e/` and `conformance/research/opencode/`. PR #25 has completed the E1/E2 implementation gates and the E3 machine suite; final adapter authorization remains gated on the final documentation/status PR-head CI pass. This is an engineering-gate statement only: it does not publish a new npm release and it does not change Phase D's external-user requirement.

## Adapter and compatibility core

Phase A routes the existing Codex resolver through a static `codexAdapter` behind shared inspection, provenance, capability, and evidence records. The neutral records are internal architecture: the public `inspect`, `instructions`, `config`, and `why` commands still emit the existing terminal formats and the `codex-scope.v0.1` JSON contract.

Phase B exposes the checked-in compatibility boundary without changing those semantics. The generated matrix pins resolver/adapter/evidence metadata, `codex-scope compatibility` reports rule counts and version provenance, and `conformance:validate:json` records expected versus actual outcome for every rule.

Phase C adds a bounded Gemini CLI adapter and executable evidence corpus. Its 27 deterministic research cases cover only the explicitly pinned subset, including context hierarchy, settings precedence, trust provenance, explicit-target JIT discovery, inert extension snapshots, MCP declarations, and conservative memory-import detection. Run `npm run research:gemini:validate` and `npm run research:gemini:assert` from a source checkout to verify the gate.

The Gemini adapter is a preview of the shared conformance architecture, not a new CLI surface. `codex-scope inspect`, `instructions`, `config`, `why`, and `compatibility` remain Codex-facing; Phase D is responsible for any future versioned comparison command.

The deterministic path still does not add dynamic loading, plugins, subprocess execution, runtime network access, model calls, or mutation. Unknown versions remain unknown; explicit supplied versions do not become compatibility claims without matching tested evidence.

## Build from source

Prerequisites: Node.js 20+ and TypeScript 5.8+ available as `tsc` for source builds.

```bash
npm ci
npm run build
npm run check
```

Development checks:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Current non-goals

Codex Scope V0.3 does **not** execute or fully model hooks, MCP servers, plugins, snapshots, directory diffs, telemetry, a web UI, a public cross-agent comparison command, structured/granular approval-policy semantics, the full Codex/Gemini config schemas, or managed enterprise constraints. Current Codex also no longer supports `approval_policy="untrusted"` and deprecates `on-failure`; V0.3 reports those historical values as `unsupported` rather than current resolved semantics.

The post-v0.1.1 strategy explicitly gates volatile surfaces rather than shipping them because they appear on an older roadmap. See [`ROADMAP.md`](ROADMAP.md).

## Contributing

Accuracy bugs are especially valuable. If Codex Scope resolves something differently from current Codex behavior, please use the bug-report template and provide a minimal **sanitized** reproduction.

For first-run friction — confusing output, unclear wording, or uncertainty about what command to try next — use the [first-run feedback template](https://github.com/kodlbegiko/codex-scope/issues/new?template=first_run_feedback.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
