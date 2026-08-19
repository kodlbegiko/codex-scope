# Codex Scope Roadmap

This roadmap describes how Codex Scope should grow from a small deterministic CLI into a trusted Codex environment inspector.

The goal is not to ship the most features. The goal is to make one promise increasingly reliable:

> **Given a working directory and known Codex inputs, explain what Codex will use and why.**

## Product thesis

Codex configuration is layered. Instructions, project config, profiles, system config, trust, hooks, and invocation overrides can all change behavior.

Most developers do not want to mentally replay those precedence rules. They want answers such as:

```text
Why is approval_policy = on-request?
Why was this AGENTS.md skipped?
Why does Codex behave differently in frontend/ and backend/?
Which hooks are active here?
```

Codex Scope should answer those questions without an LLM, without an API key, and without executing the hooks it discovers.

---

# 1. Product contract

## What we will resolve

Codex Scope will progressively model:

- AGENTS.md discovery and override behavior
- project instruction size limits and fallback filenames
- user, project, profile, system, and supplied CLI config layers
- project trust effects
- hooks from supported active layers
- provenance for every resolved value
- shadowed, ignored, unresolved, and unsupported state
- differences between two working directories
- compatibility with specific Codex behavior versions

## What we will not fake

A standalone inspector cannot infer invocation-specific data that it was never given.

For example, if a user plans to launch Codex with:

```text
codex --profile dev -c approval_policy=never
```

but runs `codex-scope inspect` without supplying those invocation inputs, Codex Scope must not claim that it knows the final CLI override.

Instead, output should make uncertainty explicit:

```text
approval_policy = on-request
status: unresolved-final
reason: no Codex invocation overrides were supplied
file-derived winner: ./.codex/config.toml:18
```

Long term, Codex Scope may provide a wrapper or invocation-aware mode. Until then, the accuracy contract is more important than a stronger marketing sentence.

## Resolution states

Every field should have one of these states:

```text
resolved     deterministic from known inputs
unresolved   required input is unknown
unsupported  behavior is not modeled by this version
ignored      source exists but Codex semantics exclude it
shadowed     source is valid but loses precedence
```

No hidden guesses.

---

# 2. The first magic moment

The first useful release should make this command valuable:

```text
codex-scope inspect
```

A user should immediately see:

1. target directory
2. project root
3. active instruction files
4. skipped instruction files and reasons
5. effective config values with provenance
6. unresolved inputs
7. concise warnings

Then:

```text
codex-scope why <key>
```

should explain one decision in detail.

This `why` experience belongs in the early product, not a distant V1. It is one of the clearest ways to demonstrate why Codex Scope exists.

---

# 3. Architecture principles

## Keep V0 structurally simple

Start as one TypeScript package rather than a premature monorepo.

Suggested structure:

```text
codex-scope/
├── src/
│   ├── cli/
│   ├── scanner/
│   ├── agents/
│   ├── config/
│   ├── hooks/
│   ├── resolver/
│   ├── provenance/
│   ├── redact/
│   └── render/
├── fixtures/
│   ├── agents/
│   ├── config/
│   └── hooks/
├── tests/
├── docs/
├── README.md
└── ROADMAP.md
```

Split into multiple packages only when a real consumer such as a VS Code extension or GitHub Action needs a stable reusable core API.

## Core data model

The implementation should revolve around one environment model instead of command-specific if/else trees.

Conceptually:

```ts
type ResolutionState =
  | "resolved"
  | "unresolved"
  | "unsupported"
  | "ignored"
  | "shadowed";

interface ResolutionSource {
  type: string;
  path?: string;
  scope: string;
  line?: number;
  priority?: number;
}

interface ResolvedValue<T = unknown> {
  key: string;
  state: ResolutionState;
  effectiveValue?: T;
  winner?: ResolutionSource;
  shadowed: ResolutionSource[];
  ignored: ResolutionSource[];
  reason?: string;
}

interface InstructionSource {
  path: string;
  bytes: number;
  state: ResolutionState;
  precedence: number;
  reason?: string;
}

interface HookSource {
  event: string;
  matcher?: string;
  source: ResolutionSource;
  state: ResolutionState;
}

interface EffectiveCodexEnvironment {
  cwd: string;
  projectRoot?: string;
  codexHome: string;
  instructions: InstructionSource[];
  config: Record<string, ResolvedValue>;
  hooks: HookSource[];
  warnings: string[];
}
```

The exact schema can evolve, but provenance and resolution state should be first-class from day one.

---

# 4. Safety and privacy rules

Codex Scope will inspect developer configuration, so safety is part of the product contract.

## Required guarantees

- Do not execute discovered hooks.
- Do not mutate Codex configuration during normal inspection.
- Do not make network requests during inspection.
- Do not print secrets blindly.
- Redact secret-looking values in terminal output and JSON by default.
- Provide explicit opt-in behavior before showing raw sensitive values, if raw output is ever supported.
- Treat unparseable or unsupported configuration as an error or unknown state, not as a guessed value.

This matters because a debugging tool that leaks credentials is worse than having no debugging tool.

---

# 5. Version strategy

Codex behavior changes over time. Codex Scope must not silently pretend that one resolver matches every Codex release forever.

The project should eventually expose:

```text
codex-scope version
codex-scope compatibility
```

A compatibility report should identify:

- Codex Scope version
- detected or supplied Codex version
- semantics version used by the resolver
- known unsupported behavior

If local Codex version detection cannot be done safely or reliably, accept an explicit version input instead of guessing.

The repository should maintain a compatibility matrix backed by conformance fixtures.

---

# 6. Release roadmap

## V0.0 — Foundation

**Goal:** make the repository trustworthy before making large product claims.

Deliverables:

- TypeScript CLI skeleton
- parser and resolver boundaries
- stable internal provenance model
- terminal renderer
- JSON renderer
- error model
- secret redaction utility
- fixture harness
- unit test setup
- CI for lint, typecheck, and tests

Exit criteria:

- CLI starts cleanly
- tests run in CI
- fixture tests are easy for contributors to add
- no network dependency in the resolution path

---

## V0.1 — Instructions + config + `why`

**Goal:** deliver the smallest genuinely useful Codex Scope.

### Instruction resolver

Implement:

- `CODEX_HOME` support
- global `AGENTS.override.md` / `AGENTS.md`
- project root → cwd traversal
- one instruction file per directory
- `AGENTS.override.md` precedence
- `AGENTS.md` fallback behavior
- configured fallback filenames
- empty-file handling
- project instruction byte accounting
- configured instruction size limit
- provenance and skip reasons

Commands:

```text
codex-scope instructions
codex-scope instructions <path>
```

### Config resolver

Implement known layers:

```text
supplied CLI overrides
project .codex/config.toml layers
selected profile
user config
system config
built-in defaults that are explicitly modeled
```

The project must distinguish between:

- “no CLI override supplied to Codex Scope”
- “CLI override known to be absent”

Those are not the same thing.

Commands:

```text
codex-scope config
codex-scope why <key>
```

### Main command

```text
codex-scope inspect
```

should summarize instructions and config without overwhelming the terminal.

### Machine output

All core commands support:

```text
--json
```

### V0.1 exit criteria

- instruction resolver covers official discovery semantics in the supported subset
- config precedence works for supported layers
- every effective value has provenance
- unknown invocation state is visible
- output is secret-redacted by default
- no hook execution
- conformance fixtures cover normal and adversarial layering cases

This is the first release worth showing publicly.

---

## V0.2 — Hooks + context + directory diff

**Goal:** make Codex Scope useful for monorepos and hook-heavy setups.

### Hook inspector

Read and explain supported hook definitions from:

- user `hooks.json`
- user inline hooks
- project `hooks.json`
- project inline hooks
- supported plugin hook sources when their discovery behavior is modeled confidently

Important behavior:

- matching hooks can coexist
- higher-precedence config layers do not simply replace lower-precedence hooks
- Codex Scope inspects definitions only; it never executes them

Command:

```text
codex-scope hooks
```

Useful output:

```text
PreToolUse:Bash
├── ~/.codex/hooks/security.py
├── repo/.codex/hooks/repo-policy.py
└── plugin:example/check.py

⚠ multiple hooks may match this event
```

### Context budget

Command:

```text
codex-scope context
```

Only report context quantities that can be deterministically calculated.

Do not add subjective judgments such as “this instruction is useless.”

### Directory diff

Command:

```text
codex-scope diff ./frontend ./backend
```

Show only environment differences that can change Codex behavior.

This should become one of the strongest monorepo demos.

---

## V0.3 — Trust, managed constraints, and compatibility

**Goal:** stop treating environment resolution as only a collection of files.

Planned work:

- explicit `--trust trusted|untrusted|auto` input
- safe trust-state detection if Codex exposes a stable source
- explain project layers skipped because of trust
- model supported `requirements.toml` constraints
- detect unsupported or newer Codex semantics
- compatibility command
- compatibility matrix in docs
- snapshot format versioning

Command ideas:

```text
codex-scope compatibility
codex-scope inspect --trust untrusted
```

A trust state that cannot be proven must remain unresolved.

---

## V0.4 — Snapshots and CI

**Goal:** make the effective Codex environment reviewable over time.

Commands:

```text
codex-scope snapshot
codex-scope snapshot --json
codex-scope compare <snapshot-a> <snapshot-b>
```

Use cases:

- catch accidental config drift
- review environment changes in pull requests
- reproduce configuration bugs
- attach deterministic evidence to bug reports

Potential GitHub Action:

```text
codex-scope/action@v1
```

A PR could report:

```text
Codex environment changed

+ frontend/AGENTS.override.md became active
~ sandbox_mode: read-only -> workspace-write
+ 2 PreToolUse hooks
```

Do not build the Action before the local resolver is stable.

---

## V1 — Full Codex environment graph

**Goal:** move from “config inspector” to “Codex environment inspector.”

Candidate surfaces:

- rules
- MCP configuration
- plugins
- permission profiles
- sandbox/network-related settings
- subagent configuration where deterministic discovery is available
- managed constraints
- richer provenance graph

Possible command:

```text
codex-scope graph
```

The graph should explain relationships, not just dump files.

---

## V2 — Developer integrations

Only after the CLI proves real demand:

- VS Code extension
- richer GitHub Action
- interactive graph viewer
- shareable sanitized snapshots
- shell completion
- structured API package if external consumers appear

Do not build a web app just because graphs look good in a browser.

---

## V3 — Cross-agent expansion

Only consider this if Codex Scope has already proven useful and accurate.

Possible future agents:

- Claude Code
- Gemini CLI
- GitHub Copilot agent workflows

At that point the broader product could become an agent environment inspection layer.

Until then:

> **Codex semantics depth beats shallow support for many agents.**

---

# 7. Conformance testing is the moat

The hardest failure mode is not a crash. It is confidently reporting behavior that differs from real Codex behavior.

Build a fixture matrix early.

Minimum categories:

```text
001 global instruction only
002 root + child instructions
003 AGENTS.override.md
004 fallback filename
005 empty instruction file
006 instruction size limit
007 CODEX_HOME override
008 root + nested project config
009 selected profile
010 user config
011 system config
012 supplied CLI override
013 unknown CLI invocation state
014 trusted project
015 untrusted project
016 hooks.json
017 inline hooks
018 multiple matching hook sources
019 malformed TOML
020 secret-looking config values
```

Then grow this into 100+ focused fixtures rather than one giant integration test.

For supported semantics, compare:

```text
Expected Codex Scope resolution
vs.
Observed Codex behavior
```

Record enough evidence to reproduce failures.

## Compatibility claims

Do not claim “100% Codex compatible” until the supported surface and tested Codex versions are explicitly defined.

Prefer statements like:

```text
Codex Scope 0.1 supports the documented AGENTS.md and config precedence subset listed in compatibility.md.
```

That is more credible and easier to maintain.

---

# 8. CLI UX rules

The CLI should optimize for the confused developer, not the resolver author.

## Default output

Default output should answer:

```text
What is active?
What is surprising?
Where did it come from?
What is still unknown?
```

Do not dump every parsed field by default.

## Progressive disclosure

```text
codex-scope inspect       concise overview
codex-scope config        detailed config
codex-scope why <key>     one provenance chain
codex-scope --json        automation
```

## Error messages

Bad:

```text
ConfigParseError: TOML token invalid
```

Better:

```text
Could not parse repo/.codex/config.toml:18

approval_policy = on-request,
                            ^ unexpected comma

Codex Scope stopped instead of guessing the remaining config.
```

---

# 9. Public repository strategy

A strong technical project can still fail if nobody understands it in 30 seconds.

Before the first public launch, the repository should have:

- a short README with one clear promise
- a real terminal demo or GIF
- a working one-command quickstart
- an explicit project status
- `LICENSE`
- `CONTRIBUTING.md`
- issue templates
- reproducible fixtures
- `good first issue` tasks
- release notes
- a social preview image
- useful GitHub topics

The README should stay shorter than the engineering roadmap. Detailed semantics belong in docs.

## Demo priority

The best demos are conflict-resolution stories.

Example 1:

```text
"Why is Codex using on-request?"
→ shows winning file and shadowed values
```

Example 2:

```text
frontend/ vs backend/
→ different AGENTS.md chain
→ different effective sandbox setting
```

Example 3:

```text
"Why did my project hook not run?"
→ project is untrusted
→ project .codex layer skipped
```

These are easier to understand and share than a long feature list.

---

# 10. Metrics

Do not optimize the first release for revenue.

## Trust metrics

- confirmed resolution bugs
- conformance coverage
- reproducible real-world config cases
- compatibility regressions

## Adoption metrics

- GitHub stars
- npm downloads
- repeat users
- issue quality
- external pull requests
- real screenshots / terminal recordings shared by users

The most important validation question is still:

> Are developers using Codex Scope to answer “why is Codex behaving like this?”

If not, more features will not fix the product thesis.

---

# 11. Things we intentionally postpone

Do not spend early cycles on:

- AI-generated AGENTS.md advice
- LLM-based config scoring
- UI quality judgments
- token analytics
- a hosted dashboard
- a custom testing framework
- cross-agent support
- a complex plugin marketplace
- a Rust rewrite

Those can all become distractions before the core resolver has earned trust.

---

# 12. North-star definition of done

Codex Scope becomes meaningfully valuable when a developer can enter a confusing repository, run one command, and get a result like:

```text
Codex behaves this way because:

1. frontend/AGENTS.override.md replaced frontend/AGENTS.md
2. repo/.codex/config.toml set approval_policy = on-request
3. profile:dev set sandbox_mode = workspace-write
4. project hooks were skipped because this project is untrusted
5. no CLI invocation overrides were supplied, so final invocation-specific values remain unresolved
```

And every line can be traced back to deterministic evidence.

That is the product.