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
