import fs from "node:fs";
import path from "node:path";
import { readJson, repoPath } from "./conformance-lib.mjs";

const probeFile = readJson("conformance/research/gemini-cli/probes.json");
const jsonMode = process.argv.includes("--json");

function canonical(relativePath) {
  return path.resolve(relativePath);
}

function relative(absolutePath) {
  return path.relative(process.cwd(), absolutePath).replaceAll("\\", "/");
}

function deepMerge(...layers) {
  const mergeTwo = (left, right) => {
    if (
      left &&
      right &&
      typeof left === "object" &&
      typeof right === "object" &&
      !Array.isArray(left) &&
      !Array.isArray(right)
    ) {
      const out = { ...left };
      for (const [key, value] of Object.entries(right)) {
        out[key] = key in out ? mergeTwo(out[key], value) : value;
      }
      return out;
    }
    return right;
  };
  return layers.reduce((result, layer) => mergeTwo(result, layer), {});
}

function isWithin(root, candidate) {
  const rel = path.relative(canonical(root), canonical(candidate));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function upwardContextFiles(startDir, ceiling, filenames) {
  const results = [];
  let current = canonical(startDir);
  const stop = canonical(ceiling);

  while (true) {
    const found = filenames
      .map((filename) => path.join(current, filename))
      .filter((candidate) => fs.existsSync(candidate))
      .map(relative);
    results.unshift(...found);

    if (current === stop) break;
    const parent = path.dirname(current);
    if (parent === current || !isWithin(stop, parent)) break;
    current = parent;
  }
  return results;
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      label +
        ": expected " +
        JSON.stringify(expected) +
        ", got " +
        JSON.stringify(actual),
    );
  }
}

function resolveTrustProvenance(input) {
  if (input.restricted_mode === true || input.env_workspace === "false") {
    return { outcome: "resolved", is_trusted: false, source: "env" };
  }
  if (input.env_workspace === "true") {
    return { outcome: "resolved", is_trusted: true, source: "env" };
  }
  if (input.folder_trust_enabled === false) {
    return { outcome: "resolved", is_trusted: true, source: null };
  }
  if (typeof input.ide_trust === "boolean") {
    return { outcome: "resolved", is_trusted: input.ide_trust, source: "ide" };
  }
  if (input.file_error === true) {
    return { outcome: "tool_error", is_trusted: null, source: null };
  }
  if (typeof input.file_trust === "boolean") {
    return { outcome: "resolved", is_trusted: input.file_trust, source: "file" };
  }
  return { outcome: "unresolved", is_trusted: null, source: null };
}

function findConservativeLocalImportCandidates(content) {
  const candidates = [];
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = trimmed.match(/^@(\.\.?\/[^\s]+)\s*$/);
    if (match) candidates.push(match[1]);
  }
  return candidates;
}

function runProbe(probe) {
  if (probe.kind === "instruction_hierarchy") {
    const workspace = upwardContextFiles(
      probe.input.trusted_root,
      probe.input.trusted_root,
      probe.input.context_filenames,
    );
    const active = [
      probe.input.global_path,
      ...workspace,
    ].filter((candidate) => fs.existsSync(repoPath(candidate)));

    assertEqual(active, probe.expected.active, probe.probe_id + ".active");
    for (const candidate of probe.expected.not_active) {
      if (active.includes(candidate)) {
        throw new Error(probe.probe_id + ": descendant source was pre-activated: " + candidate);
      }
    }
    return { active, conditional: [] };
  }

  if (probe.kind === "jit_context") {
    const trustedRoot = probe.input.trusted_roots
      .filter((root) => isWithin(root, probe.input.target_path))
      .sort((a, b) => canonical(b).length - canonical(a).length)[0];

    if (!trustedRoot) {
      assertEqual([], probe.expected.conditional, probe.probe_id + ".conditional");
      return { active: [], conditional: [] };
    }

    const startDir = path.dirname(canonical(probe.input.target_path));
    const discovered = upwardContextFiles(
      startDir,
      trustedRoot,
      probe.input.context_filenames,
    );
    const alreadyLoaded = new Set(probe.input.already_loaded);
    const conditional = discovered.filter((candidate) => !alreadyLoaded.has(candidate));

    assertEqual(
      conditional,
      probe.expected.conditional,
      probe.probe_id + ".conditional",
    );
    assertEqual(
      probe.expected.active_before_access,
      [],
      probe.probe_id + ".active_before_access",
    );
    return { active: [], conditional };
  }

  if (probe.kind === "configured_filenames") {
    const settings = readJson(probe.input.settings_path);
    const raw = settings.context?.fileName;
    const filenames = Array.isArray(raw) ? raw : raw ? [raw] : ["GEMINI.md"];
    assertEqual(
      filenames,
      probe.expected.filenames,
      probe.probe_id + ".filenames",
    );
    return { filenames };
  }

  if (probe.kind === "trust_provenance") {
    const fixture = readJson(probe.input.cases_path);
    const results = fixture.cases.map((item) => {
      const actual = resolveTrustProvenance(item.input);
      assertEqual(actual, item.expected, probe.probe_id + "." + item.id);
      return { id: item.id, actual };
    });
    assertEqual(
      results.length,
      probe.expected.case_count,
      probe.probe_id + ".case_count",
    );
    return { cases: results };
  }

  if (probe.kind === "user_project_memory") {
    const actualCases = {};
    for (const item of probe.input.cases) {
      const preferred = path.join(item.directory, "MEMORY.md").replaceAll("\\", "/");
      let selected = [];
      if (fs.existsSync(repoPath(preferred))) selected = [preferred];
      else selected = item.context_filenames.map((filename) => path.join(item.directory, filename).replaceAll("\\", "/")).filter((candidate) => fs.existsSync(repoPath(candidate)));
      actualCases[item.id] = selected;
    }
    assertEqual(actualCases, probe.expected.cases, probe.probe_id + ".cases");
    return { cases: actualCases };
  }

  if (probe.kind === "extension_memory_snapshot") {
    const snapshot = readJson(probe.input.snapshot_path);
    const available = snapshot.extensions.filter((extension) => extension.is_active === true).flatMap((extension) => extension.context_files).map((candidate) => candidate.replaceAll("\\", "/")).filter((candidate, index, all) => all.indexOf(candidate) === index).sort();
    const actual = { classification: "conditional", available, execution_attempted: false };
    assertEqual(actual, probe.expected, probe.probe_id);
    return actual;
  }

  if (probe.kind === "mcp_boundary") {
    const declaration = readJson(probe.input.declaration_path);
    const actual = { declared: declaration.declared === true, classification: "unsupported", execution_attempted: false, effective_content_resolved: false };
    assertEqual(actual, probe.expected, probe.probe_id);
    return actual;
  }

  if (probe.kind === "memory_import_boundary") {
    const content = fs.readFileSync(repoPath(probe.input.memory_path), "utf8");
    const candidates = findConservativeLocalImportCandidates(content);
    const actual = { candidates, classification: candidates.length > 0 ? "unresolved" : "supported", expanded: false };
    assertEqual(actual, probe.expected, probe.probe_id);
    return actual;
  }

  if (probe.kind === "settings_array_concat") {
    const layers = [
      readJson(probe.input.system_defaults),
      readJson(probe.input.user),
      readJson(probe.input.workspace),
      readJson(probe.input.system),
    ];
    const readPath = (value) => probe.input.path.reduce((current, key) => current?.[key], value);
    const concatFor = (trusted) =>
      [layers[0], layers[1], ...(trusted ? [layers[2]] : []), layers[3]]
        .flatMap((layer) => readPath(layer) ?? []);
    const actual = { trusted: concatFor(true), untrusted: concatFor(false) };
    assertEqual(actual, probe.expected, probe.probe_id);
    return actual;
  }

  if (probe.kind === "settings_scalar_cases") {
    const fixture = readJson(probe.input.cases_path);
    const readPath = (value) => probe.input.path.reduce((current, key) => current?.[key], value);
    const results = fixture.cases.map((item) => {
      const workspace = item.trusted ? item.layers.workspace : {};
      const merged = deepMerge(
        item.layers.system_defaults,
        item.layers.user,
        workspace,
        item.layers.system,
      );
      const value = readPath(merged);
      const actual = { id: item.id, value };
      assertEqual(actual, { id: item.id, value: item.expected }, probe.probe_id + "." + item.id);
      return actual;
    });
    assertEqual(results.length, probe.expected.case_count, probe.probe_id + ".case_count");
    return { cases: results };
  }

  if (probe.kind === "real_repository_snapshots") {
    const ledger = readJson(probe.input.ledger_path);
    const cases = ledger.validations.map((validation) => {
      const scenario = validation.scenario;
      const root = validation.sanitized_root;
      const active = upwardContextFiles(root, root, scenario.context_filenames);
      const expectedActive = scenario.expected_active.map((p) => path.join(root, p).replaceAll("\\", "/"));
      assertEqual(active, expectedActive, probe.probe_id + "." + validation.id + ".active");

      let conditional = [];
      if (scenario.target_path) {
        const target = path.join(root, scenario.target_path);
        const discovered = upwardContextFiles(path.dirname(target), root, scenario.context_filenames);
        const loaded = new Set(active);
        conditional = discovered.filter((candidate) => !loaded.has(candidate));
      }
      const expectedConditional = scenario.expected_conditional.map((p) => path.join(root, p).replaceAll("\\", "/"));
      assertEqual(conditional, expectedConditional, probe.probe_id + "." + validation.id + ".conditional");

      let contextFilenames;
      let mcpDeclared;
      if (scenario.settings_path) {
        const settings = readJson(path.join(root, scenario.settings_path).replaceAll("\\", "/"));
        if (scenario.expected_context_filenames) {
          const raw = settings.context?.fileName;
          contextFilenames = Array.isArray(raw) ? raw : raw ? [raw] : ["GEMINI.md"];
          assertEqual(contextFilenames, scenario.expected_context_filenames, probe.probe_id + "." + validation.id + ".context_filenames");
        }
        if (scenario.expected_mcp_declared !== undefined) {
          mcpDeclared = Object.keys(settings.mcpServers ?? {}).length > 0;
          assertEqual(mcpDeclared, scenario.expected_mcp_declared, probe.probe_id + "." + validation.id + ".mcp_declared");
        }
      }
      return { id: validation.id, active, conditional, context_filenames: contextFilenames, mcp_declared: mcpDeclared };
    });
    assertEqual(cases.length, probe.expected.validation_count, probe.probe_id + ".validation_count");
    return { validation_count: cases.length, cases };
  }

  if (probe.kind === "settings_precedence") {
    const systemDefaults = readJson(probe.input.system_defaults);
    const user = readJson(probe.input.user);
    const workspace = probe.input.trusted ? readJson(probe.input.workspace) : {};
    const system = readJson(probe.input.system);
    const merged = deepMerge(systemDefaults, user, workspace, system);

    assertEqual(
      merged.ui?.theme,
      probe.expected.ui_theme,
      probe.probe_id + ".ui_theme",
    );
    assertEqual(
      merged.context?.fileName,
      probe.expected.context_file_name,
      probe.probe_id + ".context_file_name",
    );
    return {
      trusted: probe.input.trusted,
      ui_theme: merged.ui?.theme,
      context_file_name: merged.context?.fileName,
    };
  }

  throw new Error("unknown probe kind: " + probe.kind);
}

const results = [];
try {
  for (const probe of probeFile.probes) {
    results.push({
      probe_id: probe.probe_id,
      rules: probe.rules,
      status: "pass",
      actual: runProbe(probe),
    });
  }

  const output = {
    schema_version: "codex-scope.agent-research-probe-run.v1",
    agent: probeFile.agent,
    counts: { pass: results.length, fail: 0 },
    results,
  };

  if (jsonMode) console.log(JSON.stringify(output, null, 2));
  else console.log("research:gemini:assert: pass=" + results.length + " fail=0");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          schema_version: "codex-scope.agent-research-probe-run.v1",
          agent: probeFile.agent,
          counts: { pass: results.length, fail: 1 },
          results,
          error: message,
        },
        null,
        2,
      ),
    );
  } else {
    console.error("research:gemini:assert: failed");
    console.error(message);
  }
  process.exit(1);
}
