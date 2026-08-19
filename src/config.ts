const os = require("node:os");
import { CodexScopeError } from "./errors";
import { isFile, path, readText, samePathBestEffort } from "./fs-utils";
import { flattenToml, parseOverride, parseToml } from "./toml";
import type {
  ResolveOptions,
  ResolvedValue,
  ResolutionSource,
  TrustState,
  ValueCandidate,
} from "./types";

interface Layer {
  type: ResolutionSource["type"];
  scope: string;
  path?: string;
  precedence: number;
  applicable: boolean;
  conditional?: boolean;
  reason?: string;
  entries: Array<{ key: string; value: unknown; line?: number }>;
}

export interface ConfigResolution {
  values: Record<string, ResolvedValue>;
  projectRoot: string;
  projectConfigPaths: string[];
  warnings: string[];
}

const DEFAULTS: Record<string, unknown> = {
  project_doc_fallback_filenames: [],
  project_doc_max_bytes: 32768,
  project_root_markers: [".git"],
};

const PROJECT_PROTECTED_PREFIXES = [
  "openai_base_url",
  "chatgpt_base_url",
  "apps_mcp_product_sku",
  "model_provider",
  "model_providers",
  "notify",
  "profile",
  "profiles",
  "experimental_realtime_ws_base_url",
  "otel",
];

const SUPPORTED_CONFIG_KEYS = new Set([
  "approval_policy",
  "sandbox_mode",
  "model",
  "model_provider",
  "project_doc_fallback_filenames",
  "project_doc_max_bytes",
  "project_root_markers",
]);

function isProjectProtectedKey(key: string): boolean {
  return PROJECT_PROTECTED_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}.`));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateAndClassify(values: Record<string, ResolvedValue>): void {
  for (const value of Object.values(values)) {
    const actual = value.effectiveValue;
    if (value.key === "project_doc_max_bytes" && actual !== undefined) {
      if (typeof actual !== "number" || !Number.isInteger(actual) || actual < 0) {
        throw new CodexScopeError(
          "UNSUPPORTED_CONFIG_VALUE",
          "project_doc_max_bytes must be a non-negative integer; Codex Scope stopped instead of coercing it.",
        );
      }
    } else if (
      (value.key === "project_doc_fallback_filenames" || value.key === "project_root_markers") &&
      actual !== undefined
    ) {
      if (!isStringArray(actual)) {
        throw new CodexScopeError(
          "UNSUPPORTED_CONFIG_VALUE",
          `${value.key} must be an array of strings; Codex Scope stopped instead of substituting a default.`,
        );
      }
    } else if (value.key === "sandbox_mode" && actual !== undefined) {
      if (typeof actual !== "string" || !["read-only", "workspace-write", "danger-full-access"].includes(actual)) {
        throw new CodexScopeError(
          "UNSUPPORTED_CONFIG_VALUE",
          "sandbox_mode is outside the documented V0.1 values; Codex Scope stopped instead of accepting an unknown mode.",
        );
      }
    } else if ((value.key === "model" || value.key === "model_provider") && actual !== undefined) {
      if (typeof actual !== "string") {
        throw new CodexScopeError(
          "UNSUPPORTED_CONFIG_VALUE",
          `${value.key} must be a string; Codex Scope stopped instead of coercing it.`,
        );
      }
    } else if (value.key === "approval_policy" && actual !== undefined) {
      if (typeof actual === "string") {
        if (!["untrusted", "on-request", "never", "on-failure"].includes(actual)) {
          throw new CodexScopeError(
            "UNSUPPORTED_CONFIG_VALUE",
            "approval_policy is outside the documented V0.1 string values; Codex Scope stopped instead of accepting an unknown policy.",
          );
        }
      } else {
        value.state = "unsupported";
        value.reason =
          "Codex supports structured granular approval_policy values, but V0.1 does not model their semantic validation.";
      }
    }

    if (!SUPPORTED_CONFIG_KEYS.has(value.key) && value.state !== "unresolved") {
      value.state = "unsupported";
      value.reason =
        "V0.1 can show this parsed source and precedence, but does not claim Codex schema semantics for this key.";
    }
  }
}

function defaultSystemConfigPath(): string | undefined {
  if (process.platform === "win32") return undefined;
  return "/etc/codex/config.toml";
}

function defaultManagedConfigPaths(): string[] {
  if (process.platform === "win32") {
    const programData = process.env.PROGRAMDATA;
    return programData
      ? [
          path.join(programData, "OpenAI", "Codex", "requirements.toml"),
          path.join(programData, "OpenAI", "Codex", "managed_config.toml"),
        ]
      : [];
  }
  return ["/etc/codex/requirements.toml", "/etc/codex/managed_config.toml"];
}

function fileLayer(
  type: ResolutionSource["type"],
  scope: string,
  filePath: string,
  precedence: number,
  applicable = true,
  conditional = false,
  reason?: string,
): Layer | undefined {
  if (!isFile(filePath)) return undefined;
  const parsed = parseToml(readText(filePath), filePath);
  return {
    type,
    scope,
    path: filePath,
    precedence,
    applicable,
    conditional,
    reason,
    entries: flattenToml(parsed.value, parsed.lines),
  };
}

function cliLayer(overrides: string[]): Layer | undefined {
  if (overrides.length === 0) return undefined;
  return {
    type: "cli",
    scope: "known invocation override",
    precedence: 10000,
    applicable: true,
    entries: overrides.map((override) => {
      const parsed = parseOverride(override);
      return { key: parsed.key, value: parsed.value };
    }),
  };
}

function sourceFor(layer: Layer, line?: number): ResolutionSource {
  return {
    type: layer.type,
    scope: layer.scope,
    path: layer.path,
    line,
    precedence: layer.precedence,
    reason: layer.reason,
  };
}

function candidatesFromLayers(layers: Layer[]): ValueCandidate[] {
  const candidates: ValueCandidate[] = [];
  for (const layer of layers) {
    layer.entries.forEach((entry, entryIndex) => {
      const protectedProjectKey = layer.type === "project" && isProjectProtectedKey(entry.key);
      const source = sourceFor(layer, entry.line);
      if (layer.type === "cli") source.precedence += entryIndex;
      if (protectedProjectKey) {
        source.reason = "Codex ignores this machine-local/protected key in project-scoped config.";
      }
      candidates.push({
        key: entry.key,
        value: entry.value,
        source,
        applicable: protectedProjectKey ? false : layer.applicable,
        conditional: protectedProjectKey ? false : layer.conditional,
        reason: protectedProjectKey ? source.reason : layer.reason,
      });
    });
  }
  return candidates;
}

function resolveCandidates(
  candidates: ValueCandidate[],
  invocationComplete: boolean,
): Record<string, ResolvedValue> {
  const grouped = new Map<string, ValueCandidate[]>();
  for (const candidate of candidates) {
    const current = grouped.get(candidate.key) ?? [];
    current.push(candidate);
    grouped.set(candidate.key, current);
  }

  const result: Record<string, ResolvedValue> = {};
  for (const [key, values] of grouped) {
    values.sort((a, b) => b.source.precedence - a.source.precedence);
    const active = values.filter((candidate) => candidate.applicable && !candidate.conditional);
    const conditional = values.filter((candidate) => candidate.conditional);
    const ignored = values.filter((candidate) => !candidate.applicable && !candidate.conditional);
    const winner = active[0];
    const missingInformation: string[] = [];

    if (!invocationComplete) {
      missingInformation.push("Codex invocation overrides/profile state were not declared complete");
    }
    if (conditional.length > 0) {
      missingInformation.push("Project trust state is unknown for one or more candidate project values");
    }

    let state: ResolvedValue["state"] = winner ? "resolved" : "unresolved";
    if (missingInformation.length > 0) state = "unresolved";

    result[key] = {
      key,
      state,
      effectiveValue: winner?.value,
      winner: winner?.source,
      shadowed: active.slice(1).map((candidate) => candidate.source),
      ignored: ignored.map((candidate) => candidate.source),
      conditional: conditional.map((candidate) => candidate.source),
      missingInformation,
      reason: winner
        ? state === "resolved"
          ? "Highest-precedence applicable known source wins."
          : "A known-so-far winner exists, but missing invocation/trust state can still change the final result."
        : "No applicable known source produced a final value.",
    };
  }
  return result;
}

function baseLayers(options: ResolveOptions): Layer[] {
  const layers: Layer[] = [
    {
      type: "default",
      scope: "documented built-in default",
      precedence: 100,
      applicable: true,
      entries: Object.entries(DEFAULTS).map(([key, value]) => ({ key, value })),
    },
  ];

  const systemPath = options.systemConfigPath ?? defaultSystemConfigPath();
  if (systemPath) {
    const system = fileLayer("system", "system configuration", systemPath, 200);
    if (system) layers.push(system);
  }

  const userPath = path.join(options.codexHome, "config.toml");
  const user = fileLayer("user", "user configuration", userPath, 300);
  if (user) layers.push(user);

  if (options.profile) {
    const profilePath = path.join(options.codexHome, `${options.profile}.config.toml`);
    if (!isFile(profilePath)) {
      throw new CodexScopeError(
        "PROFILE_NOT_FOUND",
        `Selected Codex profile file was not found: ${profilePath}. Codex Scope stopped instead of pretending the profile was absent.`,
      );
    }
    const profile = fileLayer("profile", `profile:${options.profile}`, profilePath, 400);
    if (profile) layers.push(profile);
  }

  const cli = cliLayer(options.cliOverrides);
  if (cli) layers.push(cli);
  return layers;
}

function extractStringArray(value: ResolvedValue | undefined, fallback: string[]): string[] {
  if (!value || value.effectiveValue === undefined) return fallback;
  if (!isStringArray(value.effectiveValue)) {
    throw new CodexScopeError(
      "UNSUPPORTED_CONFIG_VALUE",
      `${value.key} must be an array of strings; Codex Scope stopped instead of substituting a default.`,
    );
  }
  return value.effectiveValue;
}

export function detectProjectRoot(cwd: string, markers: string[]): string {
  const usableMarkers = markers.filter((marker) => marker.length > 0);
  if (usableMarkers.length === 0) return cwd;
  let current = cwd;
  while (true) {
    for (const marker of usableMarkers) {
      const candidate = path.join(current, marker);
      try {
        require("node:fs").statSync(candidate);
        return current;
      } catch (error: any) {
        if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return cwd;
    current = parent;
  }
}

function projectLayers(
  projectRoot: string,
  cwd: string,
  codexHome: string,
  trust: TrustState,
): { layers: Layer[]; paths: string[] } {
  const directories: string[] = [];
  const rel = path.relative(projectRoot, cwd);
  let current = projectRoot;
  directories.push(current);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
    for (const part of rel.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      directories.push(current);
    }
  }

  const layers: Layer[] = [];
  const paths: string[] = [];
  directories.forEach((directory, index) => {
    const dotCodexPath = path.join(directory, ".codex");
    if (samePathBestEffort(dotCodexPath, codexHome)) return;
    const configPath = path.join(dotCodexPath, "config.toml");
    if (!isFile(configPath)) return;
    paths.push(configPath);
    const applicable = trust === "trusted";
    const conditional = trust === "unknown";
    const reason =
      trust === "untrusted"
        ? "Project configuration is ignored for an untrusted project."
        : trust === "unknown"
          ? "Project configuration applicability depends on unknown trust state."
          : undefined;
    const layer = fileLayer(
      "project",
      `project:${path.relative(projectRoot, directory) || "."}`,
      configPath,
      500 + index,
      applicable,
      conditional,
      reason,
    );
    if (layer) layers.push(layer);
  });
  return { layers, paths };
}

export function resolveConfig(options: ResolveOptions): ConfigResolution {
  const warnings: string[] = [];
  const base = baseLayers(options);
  const baseValues = resolveCandidates(candidatesFromLayers(base), options.invocationComplete);
  const markers = extractStringArray(baseValues.project_root_markers, [".git"]);
  const projectRoot = detectProjectRoot(options.cwd, markers);
  const project = projectLayers(projectRoot, options.cwd, options.codexHome, options.trust);

  const fullLayers: Layer[] = [];
  for (const layer of base) {
    if (layer.type === "cli") continue;
    fullLayers.push(layer);
  }
  fullLayers.push(...project.layers);
  const cli = base.find((layer) => layer.type === "cli");
  if (cli) fullLayers.push(cli);

  const values = resolveCandidates(candidatesFromLayers(fullLayers), options.invocationComplete);
  validateAndClassify(values);

  const managedPaths = options.managedConfigPaths ?? defaultManagedConfigPaths();
  const detectedManaged = managedPaths.filter((candidate) => isFile(candidate));
  if (detectedManaged.length > 0) {
    const missing = `Unsupported managed Codex configuration detected: ${detectedManaged.join(", ")}`;
    for (const value of Object.values(values)) {
      value.state = "unresolved";
      if (!value.missingInformation.includes(missing)) value.missingInformation.push(missing);
      value.reason = "Local supported layers were resolved, but detected managed configuration can change or constrain the final Codex result.";
    }
    warnings.push(`${missing}. V0.1 will not guess its effect.`);
  }
  warnings.push(
    "Enterprise/cloud/MDM managed constraints are outside the V0.1 modeled subset; if your Codex deployment applies them, supported local-layer results are not the whole environment.",
  );

  if (!options.invocationComplete) {
    warnings.push("Invocation state is incomplete; final config values remain unresolved where an unseen CLI/profile input could change them.");
  }
  if (options.trust === "unknown" && project.paths.length > 0) {
    warnings.push("Project trust is unknown; project .codex/config.toml values are conditional rather than assumed active.");
  }
  if (process.platform === "win32" && !options.systemConfigPath) {
    warnings.push("V0.1 does not model a Windows system-config location; system configuration is unsupported on this platform.");
  }

  return { values, projectRoot, projectConfigPaths: project.paths, warnings };
}

export function valueAsNumber(value: ResolvedValue | undefined, fallback: number): number {
  if (!value || value.effectiveValue === undefined) return fallback;
  if (typeof value.effectiveValue !== "number" || !Number.isInteger(value.effectiveValue) || value.effectiveValue < 0) {
    throw new CodexScopeError(
      "UNSUPPORTED_CONFIG_VALUE",
      `${value.key} must be a non-negative integer; Codex Scope stopped instead of coercing it.`,
    );
  }
  return value.effectiveValue;
}

export function valueAsStringArray(value: ResolvedValue | undefined, fallback: string[]): string[] {
  return extractStringArray(value, fallback);
}

export function defaultCodexHome(): string {
  if (process.env.CODEX_HOME) return path.resolve(process.env.CODEX_HOME);
  return path.join(os.homedir(), ".codex");
}
