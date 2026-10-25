import fs from "node:fs";

const DATE = "2026-10-26";
const SHA = "970111f6cb62cc02fe36a82ea7d71b37a2889c97";
const SHORT_SHA = "970111f6";
const SNAPSHOT_ID = `codex-${DATE}-${SHORT_SHA}-corpus57`;
const OLD_SNAPSHOT_ID = "codex-2026-09-24-e0ef5a1a-corpus50";
const VERSION = "0.4.1";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

const permissionFixture = {
  path: "fixtures/config/permission-profiles",
  base: {
    kind: "permissions",
    cwd: "fixtures/config/permission-profiles/project",
    codex_home: "fixtures/config/permission-profiles/home",
    trust: "trusted",
    invocation_complete: true,
    cli_overrides: [],
    managed_config_paths: [],
  },
};

const sources = {
  permissions: [
    `https://github.com/openai/codex/blob/${SHA}/codex-rs/core/src/config/permissions.rs`,
    `https://github.com/openai/codex/blob/${SHA}/codex-rs/config/src/permissions_toml.rs`,
    "https://github.com/openai/codex/pull/54383",
  ],
  overrideBoundary: [
    `https://github.com/openai/codex/blob/${SHA}/codex-rs/core/src/config/mod.rs`,
  ],
  codexHome: [
    `https://github.com/openai/codex/blob/${SHA}/codex-rs/config/src/loader/mod.rs`,
    "https://github.com/openai/codex/issues/54599",
    "https://github.com/openai/codex/issues/54599#issuecomment-6273516550",
  ],
  projectless: [
    `https://github.com/openai/codex/blob/${SHA}/codex-rs/tui/src/projectless.rs`,
    "https://github.com/openai/codex/pull/49160",
  ],
};

function upstream(source) {
  return {
    docs: [],
    repository: "openai/codex",
    commit_or_version: SHA,
    source,
  };
}

const newRules = [
  {
    rule_id: "codex.permissions.builtin_workspace",
    agent: "codex",
    surface: "permissions",
    description: "An explicit default_permissions=:workspace selection has a deterministic built-in profile identity.",
    evidence_date: DATE,
    upstream: upstream(sources.permissions),
    expected_behavior: "An explicit :workspace selection is identified as the built-in workspace permission profile with workspace-write sandbox identity.",
    supported_boundary: "Static profile selection, provenance, and built-in identity from supplied local configuration.",
    unsupported_boundary: "Filesystem/network enforcement, approvals, Windows sandbox provisioning, and live permission switching are not executed or simulated.",
    fixture: {
      path: permissionFixture.path,
      probe: {
        ...permissionFixture.base,
        cli_overrides: ['default_permissions=\":workspace\"'],
      },
    },
    assertions: [
      { path: ["records", 0, "status"], operator: "equals", value: "resolved" },
      { path: ["records", 0, "value", "id"], operator: "equals", value: ":workspace" },
      { path: ["records", 0, "value", "staticSandboxIdentity"], operator: "equals", value: "workspace-write" },
    ],
    expected_outcome: "compatible",
    regression: false,
  },
  {
    rule_id: "codex.permissions.named_profile_selection",
    agent: "codex",
    surface: "permissions",
    description: "An explicit named default_permissions profile can be selected from [permissions.<id>] static configuration.",
    evidence_date: DATE,
    upstream: upstream(sources.permissions),
    expected_behavior: "The configured child permission profile is selected by identity from the loaded local configuration.",
    supported_boundary: "Static named-profile discovery, selection, and provenance.",
    unsupported_boundary: "Runtime enforcement and live /permissions selection remain outside the deterministic inspector.",
    fixture: {
      path: permissionFixture.path,
      probe: { ...permissionFixture.base },
    },
    assertions: [
      { path: ["records", 0, "status"], operator: "equals", value: "resolved" },
      { path: ["records", 0, "value", "id"], operator: "equals", value: "child" },
      { path: ["records", 0, "value", "kind"], operator: "equals", value: "named" },
    ],
    expected_outcome: "compatible",
    regression: false,
  },
  {
    rule_id: "codex.permissions.profile_extends",
    agent: "codex",
    surface: "permissions",
    description: "Named permission profiles preserve deterministic extends ancestry, including supported built-in parents.",
    evidence_date: DATE,
    upstream: upstream(sources.permissions),
    expected_behavior: "The child profile resolves the static inheritance chain child -> base -> :read-only, with child identity retained.",
    supported_boundary: "Static inheritance identity and cycle/undefined-parent validation.",
    unsupported_boundary: "Codex Scope does not claim to compile or enforce the merged filesystem/network permission policy.",
    fixture: {
      path: permissionFixture.path,
      probe: { ...permissionFixture.base },
    },
    assertions: [
      { path: ["records", 0, "value", "extends"], operator: "equals", value: "base" },
      { path: ["records", 0, "value", "inheritance"], operator: "array_equals", value: ["child", "base", ":read-only"] },
    ],
    expected_outcome: "compatible",
    regression: false,
  },
  {
    rule_id: "codex.permissions.unknown_profile_fail_closed",
    agent: "codex",
    surface: "permissions",
    description: "An explicit default_permissions reference to an undefined named profile fails closed.",
    evidence_date: DATE,
    upstream: upstream(sources.permissions),
    expected_behavior: "Selecting an undefined permission profile raises UNSUPPORTED_CONFIG_VALUE instead of inventing a fallback profile.",
    supported_boundary: "Deterministic validation of explicit static profile identity.",
    unsupported_boundary: "No fallback or runtime profile discovery is inferred after an invalid explicit selection.",
    fixture: {
      path: permissionFixture.path,
      probe: {
        ...permissionFixture.base,
        cli_overrides: ['default_permissions=\"missing\"'],
        expected_error_code: "UNSUPPORTED_CONFIG_VALUE",
      },
    },
    assertions: [],
    expected_outcome: "compatible",
    regression: false,
  },
  {
    rule_id: "codex.permissions.legacy_sandbox_mode_override_boundary",
    agent: "codex",
    surface: "permissions",
    description: "Codex invocation overrides do not permit sandbox_mode and default_permissions to be set together.",
    evidence_date: DATE,
    upstream: upstream(sources.overrideBoundary),
    expected_behavior: "Supplying both invocation overrides fails with UNSUPPORTED_CONFIG_VALUE instead of composing legacy sandbox_mode with a permission-profile selection.",
    supported_boundary: "The current explicit invocation-override exclusivity check.",
    unsupported_boundary: "This rule does not claim that all file-layer legacy keys are mutually exclusive with permission-profile configuration.",
    fixture: {
      path: permissionFixture.path,
      probe: {
        ...permissionFixture.base,
        cli_overrides: ['sandbox_mode=\"workspace-write\"', 'default_permissions=\":workspace\"'],
        expected_error_code: "UNSUPPORTED_CONFIG_VALUE",
      },
    },
    assertions: [],
    expected_outcome: "compatible",
    regression: false,
  },
  {
    rule_id: "codex.config.default_home_project_layer_when_codex_home_overridden",
    agent: "codex",
    surface: "config",
    description: "Overriding CODEX_HOME does not isolate a separate $HOME/.codex directory from project-layer discovery when cwd/project root is $HOME.",
    evidence_date: DATE,
    upstream: upstream(sources.codexHome),
    expected_behavior: "With active CODEX_HOME elsewhere and a trusted cwd at the synthetic home directory, home/.codex/config.toml is discovered as a project layer and can override the active user config.",
    supported_boundary: "Deterministic local project-layer discovery for an explicitly supplied cwd, CODEX_HOME, and trust state.",
    unsupported_boundary: "Codex Scope does not infer the operating-system user home, saved trust, hooks, plugins, MCP, or runtime thread state beyond supplied inspection inputs.",
    fixture: {
      path: "fixtures/config/codex-home-converse",
      probe: {
        kind: "config",
        cwd: "fixtures/config/codex-home-converse/home",
        codex_home: "fixtures/config/codex-home-converse/active-home",
        trust: "trusted",
        invocation_complete: true,
        cli_overrides: [],
        managed_config_paths: [],
      },
    },
    assertions: [
      { path: ["values", "approval_policy", "effectiveValue"], operator: "equals", value: "never" },
      { path: ["values", "approval_policy", "winner", "type"], operator: "equals", value: "project" },
      { path: ["projectConfigPaths", 0], operator: "ends_with", value: "fixtures/config/codex-home-converse/home/.codex/config.toml" },
    ],
    expected_outcome: "compatible",
    regression: false,
  },
  {
    rule_id: "codex.runtime.projectless_permission_defaults",
    agent: "codex",
    surface: "runtime",
    description: "Projectless TUI workspace permission defaults are an explicit runtime/session-dependent boundary.",
    evidence_date: DATE,
    upstream: upstream(sources.projectless),
    expected_behavior: "Codex Scope reports projectless permission defaults as unsupported rather than inferring a final workspace/trust state from static files alone.",
    supported_boundary: "Evidence-backed recognition that the upstream semantic surface exists and depends on runtime conditions.",
    unsupported_boundary: "TUI session state, saved trust, restored task permissions, live /cd transitions, Windows sandbox setup, managed policy, and execution-locality checks are not simulated.",
    fixture: {
      path: permissionFixture.path,
      probe: { kind: "projectless_permission_boundary" },
    },
    assertions: [
      { path: ["status"], operator: "equals", value: "unsupported" },
    ],
    expected_outcome: "unsupported",
    regression: false,
  },
];

const manifest = readJson("conformance/manifest.json");
manifest.evidence_date = DATE;
manifest.upstream.commit = SHA;
for (const rule of newRules) {
  const index = manifest.rules.findIndex((item) => item.rule_id === rule.rule_id);
  if (index >= 0) manifest.rules[index] = rule;
  else manifest.rules.push(rule);
}
writeJson("conformance/manifest.json", manifest);

const regressions = readJson("conformance/regressions.json");
regressions.evidence_date = DATE;
regressions.upstream.current_commit = SHA;
writeJson("conformance/regressions.json", regressions);

const pkg = readJson("package.json");
pkg.version = VERSION;
writeJson("package.json", pkg);
const lock = readJson("package-lock.json");
lock.version = VERSION;
if (lock.packages?.[""]) lock.packages[""].version = VERSION;
writeJson("package-lock.json", lock);

const index = readJson("conformance/snapshots/index.json");
const oldSnapshotPath = index.snapshots.find((item) => item.snapshot_id === OLD_SNAPSHOT_ID)?.path;
if (!oldSnapshotPath) throw new Error(`missing old current snapshot ${OLD_SNAPSHOT_ID}`);
const oldSnapshot = readJson(oldSnapshotPath);
const oldRules = new Map(oldSnapshot.semantic_rules.map((rule) => [rule.rule_id, rule]));
const reverifiedExisting = new Set(["codex.config.codex_home_project_layer_exclusion"]);
const manifestIds = new Set(manifest.rules.map((rule) => rule.rule_id));

const semanticRules = manifest.rules.map((rule) => {
  const old = oldRules.get(rule.rule_id);
  const isNew = !old;
  const reverified = isNew || reverifiedExisting.has(rule.rule_id);
  return {
    rule_id: rule.rule_id,
    expected_outcome: rule.expected_outcome,
    evidence_state: reverified ? "verified" : "carried_forward",
    regression: rule.regression,
    evidence_date: reverified ? DATE : old?.evidence_date ?? rule.evidence_date,
    evidence_commit_or_version: reverified ? SHA : old?.evidence_commit_or_version ?? rule.upstream.commit_or_version,
    semantic_signature: {
      expected_outcome: rule.expected_outcome,
      expected_behavior: rule.expected_behavior,
      supported_boundary: rule.supported_boundary,
      unsupported_boundary: rule.unsupported_boundary,
    },
    source_references: reverified
      ? [...rule.upstream.docs, ...rule.upstream.source]
      : old?.source_references ?? [...rule.upstream.docs, ...rule.upstream.source],
  };
});

for (const old of oldSnapshot.semantic_rules) {
  if (!manifestIds.has(old.rule_id)) {
    semanticRules.push({ ...old, evidence_state: "carried_forward" });
  }
}
semanticRules.sort((a, b) => a.rule_id.localeCompare(b.rule_id));

const byOutcome = (outcome) => semanticRules
  .filter((rule) => rule.expected_outcome === outcome)
  .map((rule) => rule.rule_id)
  .sort();

const snapshot = {
  schema_version: "codex-scope.upstream-snapshot.v1",
  snapshot_id: SNAPSHOT_ID,
  agent: "codex",
  upstream_repository: "openai/codex",
  upstream_commit: SHA,
  upstream_version_if_known: "unknown",
  evidence_date: DATE,
  coverage: "partial_revalidation",
  source_references: [
    `https://github.com/openai/codex/commit/${SHA}`,
    "https://github.com/openai/codex/pull/54383",
    "https://github.com/openai/codex/issues/54599",
    "https://github.com/openai/codex/pull/49160",
  ],
  semantic_rules: semanticRules,
  regression_references: [...oldSnapshot.regression_references],
  compatibility_boundary: {
    supported_rules: byOutcome("compatible"),
    unsupported_rules: byOutcome("unsupported"),
    unresolved_rules: byOutcome("unresolved"),
  },
  retention: {
    role: "current",
    immutable: true,
    migration_policy: "Historical snapshot content is immutable. Future schema changes require an explicit migration artifact; current evidence updates create a new snapshot.",
  },
};
const snapshotPath = `conformance/snapshots/${SNAPSHOT_ID}.json`;
writeJson(snapshotPath, snapshot);

for (const entry of index.snapshots) {
  if (entry.role === "current") entry.role = "historical";
}
if (!index.snapshots.some((entry) => entry.snapshot_id === SNAPSHOT_ID)) {
  index.snapshots.push({ snapshot_id: SNAPSHOT_ID, path: snapshotPath, role: "current" });
} else {
  index.snapshots.find((entry) => entry.snapshot_id === SNAPSHOT_ID).role = "current";
}
index.current_snapshot_id = SNAPSHOT_ID;
if (!index.comparison_pairs.some((pair) => pair.from_snapshot_id === OLD_SNAPSHOT_ID && pair.to_snapshot_id === SNAPSHOT_ID)) {
  index.comparison_pairs.push({ from_snapshot_id: OLD_SNAPSHOT_ID, to_snapshot_id: SNAPSHOT_ID });
}
writeJson("conformance/snapshots/index.json", index);

const researchDoc = `# Codex Conformance Coverage

Evidence date: **${DATE}**  
Audited upstream: **openai/codex@${SHA}**

This document records the October 2026 bounded Codex conformance refresh. Machine-readable artifacts remain authoritative.

## Semantic corpus

| Classification | Cases |
| --- | ---: |
| compatible | 48 |
| unsupported | 4 |
| unresolved | 5 |
| **total** | **57** |

The October delta adds seven evidence-backed rules: five bounded Permission Profile rules, the CODEX_HOME/default-home project-layer converse case, and one explicit unsupported projectless runtime boundary. Permission enforcement itself is not simulated.

## Permission Profiles

Supported static coverage now includes explicit built-in identity for \`:workspace\`, named profile selection, named \`extends\` ancestry, unknown-profile fail-closed behavior, and the current invocation-override boundary that rejects \`sandbox_mode\` together with \`default_permissions\`.

Codex Scope still does not execute filesystem/network enforcement, approvals, live \`/permissions\` switching, resumed-thread permission state, Windows sandbox provisioning, hooks, plugins, or MCP.

## CODEX_HOME converse case

Current upstream source and \`openai/codex#54599\` confirm that setting CODEX_HOME to another directory does **not** isolate a separate \`$HOME/.codex\` from project-layer discovery. If cwd/project root is the home directory and that directory is trusted, \`$HOME/.codex/config.toml\` can participate as a project layer above the active user config. The existing active-CODEX_HOME self-duplication exclusion remains intact.

## Projectless trust / permission defaults

\`openai/codex#49160\` and current \`tui/src/projectless.rs\` make these defaults conditional on runtime project discovery, saved trust, explicit overrides, managed policy, execution locality, platform sandbox state, and session restoration. Codex Scope therefore records this surface as **unsupported** rather than inventing a static final state.

## Regression corpus

The regression/change corpus remains at **5** records. The October Permission Profile work is added semantic support, not a fabricated regression. The CODEX_HOME converse case is expected current behavior, not an upstream fix/change record.

## Retained snapshots

| Snapshot | Upstream commit | Evidence date | Lifecycle role |
| --- | --- | --- | --- |
| \`codex-2026-09-22-94174e44\` | \`94174e44...\` | 2026-09-22 | historical |
| \`codex-2026-09-24-e0ef5a1a\` | \`e0ef5a1a...\` | 2026-09-24 | historical |
| \`codex-2026-09-24-e0ef5a1a-corpus50\` | \`e0ef5a1a...\` | 2026-09-24 | historical |
| \`${SNAPSHOT_ID}\` | \`${SHA}\` | ${DATE} | current |

The new snapshot carries forward older rules unless they were specifically reverified. Carried-forward evidence is intentionally classified as \`evidence_gap\`, not silently promoted to unchanged.

## October drift edge

Expected deterministic classification for \`${OLD_SNAPSHOT_ID}\` → \`${SNAPSHOT_ID}\`:

- unchanged: 1
- behavior_drift: 0
- evidence_gap: 50
- support_boundary_change: 0
- added_rule: 7
- removed_rule: 0
- tool_error: 0

The single reverified existing rule is the active CODEX_HOME project-layer exclusion. The 50 evidence gaps are deliberate: this refresh did not pretend to fully revalidate every older semantic rule against 1272 upstream commits.

## Safety / false-certainty boundary

The deterministic inspector still performs no LLM calls, Codex subprocess execution, runtime network inspection, hooks, plugins, MCP execution, arbitrary inspected-repository code execution, or inspected-repository mutation. Unknown runtime/session state remains unresolved or unsupported.

Phase D external proof remains **0 / 3** and is not changed by upstream issues, maintainer comments, public-repository scans, or maintainer-authored fixtures.
`;
fs.writeFileSync("docs/research/codex-conformance-coverage.md", researchDoc);

let status = fs.readFileSync("docs/conformance-status.md", "utf8");
status = status.replace(
  /Evidence dates: \*\*Codex [^*]+ · Gemini CLI 2026-09-23\*\*/,
  `Evidence dates: **Codex ${DATE} · Gemini CLI 2026-09-23**`,
);
const octoberStatus = `## October 2026 Codex upstream refresh\n\n- audited \`openai/codex@${SHA}\` from prior evidence pin \`e0ef5a1a0f6421601baaa679fb37eddaa4e9c8c1\` (+1272 commits)\n- Codex semantic corpus: **57** cases (48 compatible, 4 unsupported, 5 unresolved)\n- regression/change records: **5** (unchanged; no synthetic regression inflation)\n- retained snapshots: **4**, current \`${SNAPSHOT_ID}\`\n- bounded Permission Profile static semantics added; runtime enforcement remains unsupported\n- CODEX_HOME/default-home converse project-layer behavior explicitly covered\n- projectless trust/permission defaults recorded as a runtime/session boundary\n- Phase D external proof remains **0 / 3**\n\n`;
if (!status.includes("## October 2026 Codex upstream refresh")) {
  status = status.replace("## Phase 0 — Codex conformance foundation\n", octoberStatus + "## Phase 0 — Codex conformance foundation\n");
}
status = status.replace(
  /## v0\.4 — Codex Conformance Observatory[\s\S]*?(?=## Phase D — cross-agent compare external proof)/,
  `## v0.4 — Codex Conformance Observatory\n\nStatus: **engineering gate complete; October 2026 conformance refresh prepared as v0.4.1**.\n\nThe current Codex corpus contains **57** deterministic cases: 48 compatible, 4 unsupported, and 5 unresolved. The regression/change ledger remains **5** records. Four immutable upstream snapshots are retained, with \`${SNAPSHOT_ID}\` current in the index.\n\nThe October refresh adds bounded Permission Profile static semantics, explicit CODEX_HOME/default-home project-layer evidence, and an unsupported projectless runtime boundary while preserving the public \`codex-scope.v0.1\` result contract.\n\nSee [\`docs/research/codex-conformance-coverage.md\`](research/codex-conformance-coverage.md).\n\n`,
);
fs.writeFileSync("docs/conformance-status.md", status);

let readme = fs.readFileSync("README.md", "utf8");
const readmeBlock = `\n### October 2026 Codex conformance refresh\n\nThe v0.4.1 maintenance refresh is pinned to \`openai/codex@${SHA}\`. It adds bounded static Permission Profile coverage, records the CODEX_HOME/default-home project-layer interaction, and explicitly leaves projectless TUI/session permission defaults unsupported. Runtime permission enforcement is not simulated, and the public \`codex-scope.v0.1\` result contract is unchanged.\n`;
if (!readme.includes("### October 2026 Codex conformance refresh")) {
  readme = readme.replace("## Try it in 60 seconds\n", readmeBlock + "\n## Try it in 60 seconds\n");
}
fs.writeFileSync("README.md", readme);

let changelog = fs.readFileSync("CHANGELOG.md", "utf8");
const releaseNotes = `## 0.4.1 — ${DATE}\n\nOctober 2026 Codex upstream conformance refresh.\n\n### Added\n\n- Add bounded static Permission Profile coverage for explicit built-in/named selection, inheritance identity, unknown-profile fail-closed behavior, and the current \`sandbox_mode\` / \`default_permissions\` invocation-override boundary.\n- Add an explicit CODEX_HOME converse fixture showing that a separate \`$HOME/.codex\` can still participate as a trusted project layer when the active CODEX_HOME points elsewhere.\n- Add a projectless trust/permission boundary record without simulating TUI/session runtime state.\n- Retain a fourth immutable upstream snapshot at \`openai/codex@${SHA}\` and add deterministic compatibility history from the September corpus.\n\n### Changed\n\n- Refresh Codex adapter evidence metadata to ${DATE}.\n- Expand the Codex semantic corpus from 50 to 57 cases while keeping the true regression/change ledger at 5 records.\n- Preserve the existing Codex-facing commands and \`codex-scope.v0.1\` public JSON contract.\n\n### Safety properties\n\n- No filesystem/network permission enforcement, live approvals, thread/session permission state, Windows sandbox provisioning, hooks, plugins, MCP, LLM calls, Codex subprocess execution, runtime network inspection, or inspected-repository mutation is performed.\n- Phase D external proof remains 0 / 3.\n\n`;
if (!changelog.includes(`## ${VERSION} — ${DATE}`)) {
  changelog = changelog.replace("## Unreleased\n\n", `## Unreleased\n\n${releaseNotes}`);
}
fs.writeFileSync("CHANGELOG.md", changelog);

for (const path of [
  "scripts/materialize-october-refresh.mjs",
  ".github/workflows/october-refresh-materialize.yml",
]) {
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

console.log(JSON.stringify({
  manifest_rules: manifest.rules.length,
  regression_records: regressions.cases.length,
  snapshot_id: SNAPSHOT_ID,
  snapshot_semantic_records: semanticRules.length,
  version: VERSION,
}, null, 2));
