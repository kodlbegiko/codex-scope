# Codex Scope

> **Know which Codex instructions and config win — before you start a session.**

Codex Scope is a deterministic, read-only CLI that explains the supported Codex instruction chain and configuration precedence: **what is active, where it came from, why it won, and what is still unknown.**

**No LLM calls · No OpenAI API key · No runtime network · No hook execution**

> **Status:** V0.1.x is the current public release line; use [GitHub Releases](https://github.com/kodlbegiko/codex-scope/releases) or npm for the authoritative latest patch. V0.1 intentionally covers a documented subset rather than claiming full Codex compatibility. See [`docs/compatibility.md`](docs/compatibility.md).
>
> **Unofficial project:** Codex Scope is an independent community tool and is not affiliated with or endorsed by OpenAI.

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
```

All four commands support `--json` with a versioned `codex-scope.v0.1` schema marker.

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

Redaction is heuristic, not a mathematical guarantee. There is no raw-secret output option in V0.1.

## Accuracy and compatibility

The resolver follows current official Codex documentation first and uses current `openai/codex` implementation evidence to pin supported edge cases that documentation does not fully specify.

The exact supported surface and evidence date are recorded in:

- [`docs/semantics.md`](docs/semantics.md)
- [`docs/compatibility.md`](docs/compatibility.md)
- [`docs/research/post-v0.1.1-strategy.md`](docs/research/post-v0.1.1-strategy.md)

The conformance suite intentionally records evidence. Resolver changes should add or update a focused fixture rather than broaden behavior by guesswork.

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

Codex Scope V0.1 does **not** model hooks, MCP, plugins, snapshots, directory diffs, telemetry, a web UI, cross-agent behavior, structured/granular approval-policy semantics, the full Codex config schema, or managed enterprise constraints.

The post-v0.1.1 strategy explicitly gates volatile surfaces rather than shipping them because they appear on an older roadmap. See [`ROADMAP.md`](ROADMAP.md).

## Contributing

Accuracy bugs are especially valuable. If Codex Scope resolves something differently from current Codex behavior, please use the bug-report template and provide a minimal **sanitized** reproduction.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
