# Reproducible demo

Use the checked-in deterministic fixture; do not fabricate terminal output.

## From a source checkout

```bash
npm ci
npm run build
node scripts/demo.mjs
```

The demo exercises a fixture where user config, the `dev` profile, and project config disagree, then shows the real `inspect` and `why approval_policy` result produced by the built CLI.

Equivalent focused command:

```bash
node dist/cli.js why approval_policy \
  --cwd fixtures/demo/conflict/project \
  --codex-home fixtures/demo/conflict/home \
  --profile dev \
  --trust trusted \
  --invocation-complete
```

## Public-package smoke after release

Run outside the Codex Scope repository:

```bash
tmp="$(mktemp -d)"
cd "$tmp"

npx --yes \
  --package=codex-scope-inspector@<VERSION> \
  codex-scope --version

npx --yes \
  --package=codex-scope-inspector@<VERSION> \
  codex-scope inspect
```

Replace `<VERSION>` with the exact published version. A local source checkout is not proof that the npm registry artifact works.
