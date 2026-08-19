# Codex Scope

> **See what Codex will use here — where it came from, and what is still unknown.**

Codex Scope is a deterministic, read-only CLI for inspecting the Codex instruction chain and supported configuration precedence.

**No LLM calls · No OpenAI API key · No runtime network · No hook execution**

> **Status:** V0.1.0 is the first public release. It intentionally covers a documented subset rather than claiming full Codex compatibility. See [`docs/compatibility.md`](docs/compatibility.md).

> **Unofficial project:** Codex Scope is an independent community tool and is not affiliated with or endorsed by OpenAI.

## The problem

Codex behavior can change because of several layers at once: global and project `AGENTS.md` files, project-local config, profiles, user/system config, trust, and invocation overrides.

Codex Scope answers four practical questions:

```text
codex-scope inspect
codex-scope instructions
codex-scope config
codex-scope why <key>
```

It does not guess missing invocation state. If you did not tell Codex Scope whether the inspected invocation is complete, the result stays `unresolved` even when a file-derived winner is visible.

## Quickstart

Install from npm:

```bash
npm install -g codex-scope-inspector
codex-scope inspect
```

Or run without a global install:

```bash
npx --yes codex-scope-inspector inspect
```

### Build from source

Prerequisites: Node.js 20+ and TypeScript 5.8+ available as `tsc` for source builds.

```bash
npm ci
npm run build
node dist/cli.js inspect
```

To inspect a specific repository and assert the known invocation state is complete:

```bash
node dist/cli.js inspect \
  --cwd /path/to/repo \
  --trust trusted \
  --invocation-complete
```

If Codex is launched with a profile or config override, supply the same known inputs:

```bash
node dist/cli.js why approval_policy \
  --cwd /path/to/repo \
  --profile dev \
  -c 'sandbox_mode="workspace-write"' \
  --trust trusted \
  --invocation-complete
```

Current Codex profiles are modeled as `$CODEX_HOME/<name>.config.toml`, not as a legacy profile table.

## Real deterministic demo

The repository includes a fixture where user config, a `dev` profile, and project config disagree:

```bash
node dist/cli.js why approval_policy \
  --cwd fixtures/demo/conflict/project \
  --codex-home fixtures/demo/conflict/home \
  --profile dev \
  --trust trusted \
  --invocation-complete
```

Output:

```text
approval_policy = on-request
state: resolved

winner
  ./.codex/config.toml:1

shadowed
  .../home/dev.config.toml:1
  .../home/config.toml:1

reason
  Highest-precedence applicable known source wins.
```

Without `--trust` and `--invocation-complete`, Codex Scope does not pretend the project layer or future Codex CLI overrides are known:

```text
state: unresolved

conditional
  ./.codex/config.toml:1

missing
  Codex invocation overrides/profile state were not declared complete
  Project trust state is unknown for one or more candidate project values
```

## Commands

### `codex-scope inspect`

Concise overview: target, project root, instruction sources, important config, unresolved state, and warnings.

### `codex-scope instructions [path]`

Explains global and project instruction discovery, ignored sources, configured fallback filenames, and cumulative project instruction byte usage.

### `codex-scope config`

Shows supported configuration values with winner, shadowed/ignored/conditional sources, and missing information. Parsed keys outside the V0.1 semantic subset are labeled `unsupported` rather than silently treated as valid Codex settings.

### `codex-scope why <key>`

Shows one supported config decision chain in detail.

All four commands support `--json` with a versioned `codex-scope.v0.1` schema marker.

## Known invocation inputs

```text
--trust trusted|untrusted|unknown
--profile <name>
-c, --config <key=value>   repeatable
--invocation-complete
--codex-home <path>
--cwd <path>
```

`--invocation-complete` is deliberately explicit. Without it, “no override supplied to Codex Scope” is **not** treated as “Codex definitely has no invocation override.”

## Safety contract

Normal inspection:

- reads only the files needed for the supported Codex resolution path;
- performs no LLM or OpenAI API calls;
- performs no runtime network requests;
- never executes discovered hooks;
- never mutates the inspected project, Codex config, or `AGENTS.md` files;
- redacts secret-like config keys in terminal and JSON output.

Redaction is heuristic, not a mathematical guarantee. There is no raw-secret output option in V0.1.

## Accuracy contract

A result is classified as one of:

```text
resolved     deterministically known from supplied inputs
unresolved   a required input is missing or conditional
unsupported  Codex behavior exists outside V0.1's modeled subset
ignored      a discovered source is excluded by Codex semantics
shadowed     a valid source loses precedence
```

The resolver follows current official Codex documentation first and uses current `openai/codex` implementation evidence to pin edge cases that documentation does not fully specify. The exact supported surface and evidence date are recorded in [`docs/semantics.md`](docs/semantics.md) and [`docs/compatibility.md`](docs/compatibility.md).

## Development

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run check
```

The conformance fixtures are intentionally small. Resolver changes should add or update a fixture tied to evidence rather than broaden behavior by guesswork.

## V0.1 non-goals

V0.1 does **not** model hooks, MCP, plugins, snapshots, directory diffs, telemetry, a web UI, cross-agent behavior, structured/granular approval policy semantics, the full Codex config schema, or managed enterprise constraints. It also does not execute hooks. Planned expansion remains in [`ROADMAP.md`](ROADMAP.md).

## Official evidence

- OpenAI Codex AGENTS instructions documentation
- OpenAI Codex configuration basics / precedence documentation
- OpenAI Codex advanced configuration documentation
- OpenAI Codex CLI reference
- `openai/codex` implementation for instruction discovery and configuration loading

Precise evidence notes and compatibility boundaries are maintained in `docs/` so the README stays usable.

## License

Licensed under the [Apache License 2.0](LICENSE).
