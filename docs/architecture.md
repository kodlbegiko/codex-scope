# V0.1 architecture

The runtime path is intentionally small:

```text
CLI arguments / explicit invocation state
            ↓
configuration scanner + conservative TOML parser
            ↓
project-root and precedence resolver
            ↓
instruction discovery resolver
            ↓
EffectiveCodexEnvironment
            ↓
central redaction
            ↓
terminal renderer / JSON renderer
```

Terminal and JSON output consume the same environment model. Command renderers do not independently resolve Codex semantics.

## Modules

- `src/config.ts` — source discovery, trust gating, precedence, missing-state handling.
- `src/agents.ts` — global/project instruction discovery and byte accounting.
- `src/toml.ts` — fail-closed parser for the supported subset.
- `src/environment.ts` — single reusable environment model.
- `src/redact.ts` — centralized secret-like key redaction.
- `src/render.ts` — human/JSON views only.
- `src/cli.ts` — argument boundary and safe error handling.

There is no hook runner, network client, OpenAI SDK, telemetry client, or subprocess execution module in the inspection implementation.
