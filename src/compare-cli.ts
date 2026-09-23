import { codexAdapter } from "./adapters/codex";
import {
  geminiAdapter,
  type GeminiInspectOptions,
  type GeminiSettingsPaths,
  type GeminiTrustInputs,
} from "./adapters/gemini";
import {
  summarizeComparisonForCi,
  toolErrorComparisonCiSummary,
  type ComparisonCiSummary,
} from "./comparison-ci";
import {
  compareInspections,
} from "./comparison-normalization";
import {
  sanitizeComparisonDocumentPaths,
} from "./comparison-output";
import {
  CODEX_GEMINI_COMPARISON_DIMENSIONS,
} from "./comparison-profiles/codex-gemini";
import type { SemanticComparisonDocument } from "./comparison";
import { inspectWithAdapter } from "./core";
import { path, readText } from "./fs-utils";
import type { ResolveOptions, TrustState } from "./types";

export const COMPARISON_CLI_SCHEMA_VERSION =
  "codex-scope.semantic-comparison-cli.v1" as const;
export const CODEX_COMPARE_INPUT_SCHEMA_VERSION =
  "codex-scope.compare-input.codex.v1" as const;
export const GEMINI_COMPARE_INPUT_SCHEMA_VERSION =
  "codex-scope.compare-input.gemini.v1" as const;

export const COMPARE_CLI_EXIT_CODES = {
  valid_comparison: 0,
  internal_tool_error: 1,
  input_or_usage_tool_error: 2,
} as const;

interface CompareCliEnvelope {
  schema_version: typeof COMPARISON_CLI_SCHEMA_VERSION;
  comparison: SemanticComparisonDocument | null;
  ci_summary: ComparisonCiSummary;
}

type JsonObject = Record<string, unknown>;

class CompareInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompareInputError";
  }
}

function fail(message: string): never {
  throw new CompareInputError(message);
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValue(value: unknown, label: string): JsonObject {
  if (!isObject(value)) fail(label + " must be an object.");
  return value;
}

function exactKeys(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(label + " is missing " + key + ".");
    }
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(label + " has unknown property " + key + ".");
  }
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(label + " must be a non-empty string.");
  }
  return value;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(label + " must be a boolean.");
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    fail(label + " must be an array of strings.");
  }
  return [...value] as string[];
}

function parseJsonFile(filePath: string, label: string): JsonObject {
  let text: string;
  try {
    text = readText(path.resolve(filePath));
  } catch {
    fail(label + " file could not be read.");
  }
  try {
    return objectValue(JSON.parse(text!), label);
  } catch (error) {
    if (error instanceof CompareInputError) throw error;
    fail(label + " file is not valid JSON.");
  }
}

function resolveOptionalPath(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return path.resolve(stringValue(value, label));
}

function parseCodexInput(filePath: string): ResolveOptions {
  const input = parseJsonFile(filePath, "Codex compare input");
  exactKeys(input, ["schema_version", "agent", "options"], [], "Codex compare input");
  if (input.schema_version !== CODEX_COMPARE_INPUT_SCHEMA_VERSION) {
    fail("Codex compare input has an unsupported schema_version.");
  }
  if (input.agent !== "codex") fail("Codex compare input agent must be codex.");

  const options = objectValue(input.options, "Codex compare input options");
  exactKeys(
    options,
    ["cwd", "codexHome", "trust", "invocationComplete", "cliOverrides"],
    ["profile", "systemConfigPath", "managedConfigPaths"],
    "Codex compare input options",
  );

  const trust = stringValue(options.trust, "Codex compare input options.trust");
  if (!["trusted", "untrusted", "unknown"].includes(trust)) {
    fail("Codex compare input options.trust has an unsupported value.");
  }

  const result: ResolveOptions = {
    cwd: path.resolve(stringValue(options.cwd, "Codex compare input options.cwd")),
    codexHome: path.resolve(
      stringValue(options.codexHome, "Codex compare input options.codexHome"),
    ),
    trust: trust as TrustState,
    invocationComplete: booleanValue(
      options.invocationComplete,
      "Codex compare input options.invocationComplete",
    ),
    cliOverrides: stringArray(
      options.cliOverrides,
      "Codex compare input options.cliOverrides",
    ),
  };

  if (options.profile !== undefined) {
    result.profile = stringValue(options.profile, "Codex compare input options.profile");
  }
  const systemConfigPath = resolveOptionalPath(
    options.systemConfigPath,
    "Codex compare input options.systemConfigPath",
  );
  if (systemConfigPath) result.systemConfigPath = systemConfigPath;
  if (options.managedConfigPaths !== undefined) {
    result.managedConfigPaths = stringArray(
      options.managedConfigPaths,
      "Codex compare input options.managedConfigPaths",
    ).map((item) => path.resolve(item));
  }
  return result;
}

function parseTrustInputs(value: unknown): GeminiTrustInputs {
  const trust = objectValue(value, "Gemini compare input options.trustInputs");
  exactKeys(
    trust,
    [],
    [
      "restrictedMode",
      "envWorkspace",
      "folderTrustEnabled",
      "ideTrust",
      "fileTrust",
      "fileError",
    ],
    "Gemini compare input options.trustInputs",
  );
  const result: GeminiTrustInputs = {};
  for (const key of [
    "restrictedMode",
    "folderTrustEnabled",
    "ideTrust",
    "fileTrust",
    "fileError",
  ] as const) {
    if (trust[key] !== undefined) {
      result[key] = booleanValue(
        trust[key],
        "Gemini compare input options.trustInputs." + key,
      );
    }
  }
  if (trust.envWorkspace !== undefined) {
    const value = stringValue(
      trust.envWorkspace,
      "Gemini compare input options.trustInputs.envWorkspace",
    );
    if (value !== "true" && value !== "false") {
      fail(
        "Gemini compare input options.trustInputs.envWorkspace has an unsupported value.",
      );
    }
    result.envWorkspace = value;
  }
  return result;
}

function parseSettings(value: unknown): GeminiSettingsPaths | undefined {
  if (value === undefined) return undefined;
  const settings = objectValue(value, "Gemini compare input options.settings");
  exactKeys(
    settings,
    [],
    ["systemDefaults", "user", "workspace", "system"],
    "Gemini compare input options.settings",
  );
  const result: GeminiSettingsPaths = {};
  for (const key of ["systemDefaults", "user", "workspace", "system"] as const) {
    if (settings[key] !== undefined) {
      result[key] = path.resolve(
        stringValue(settings[key], "Gemini compare input options.settings." + key),
      );
    }
  }
  return result;
}

function parseGeminiInput(filePath: string): GeminiInspectOptions {
  const input = parseJsonFile(filePath, "Gemini compare input");
  exactKeys(input, ["schema_version", "agent", "options"], [], "Gemini compare input");
  if (input.schema_version !== GEMINI_COMPARE_INPUT_SCHEMA_VERSION) {
    fail("Gemini compare input has an unsupported schema_version.");
  }
  if (input.agent !== "gemini") fail("Gemini compare input agent must be gemini.");

  const options = objectValue(input.options, "Gemini compare input options");
  exactKeys(
    options,
    ["cwd", "trustedRoot", "geminiHome", "trustInputs"],
    [
      "settings",
      "targetPath",
      "userProjectMemoryDirectory",
      "extensionSnapshotPath",
      "mcpDeclarationPath",
      "memoryImportPaths",
    ],
    "Gemini compare input options",
  );

  const result: GeminiInspectOptions = {
    cwd: path.resolve(stringValue(options.cwd, "Gemini compare input options.cwd")),
    trustedRoot: path.resolve(
      stringValue(options.trustedRoot, "Gemini compare input options.trustedRoot"),
    ),
    geminiHome: path.resolve(
      stringValue(options.geminiHome, "Gemini compare input options.geminiHome"),
    ),
    trustInputs: parseTrustInputs(options.trustInputs),
  };
  const settings = parseSettings(options.settings);
  if (settings) result.settings = settings;

  for (const key of [
    "targetPath",
    "userProjectMemoryDirectory",
    "extensionSnapshotPath",
    "mcpDeclarationPath",
  ] as const) {
    const resolved = resolveOptionalPath(
      options[key],
      "Gemini compare input options." + key,
    );
    if (resolved) result[key] = resolved;
  }
  if (options.memoryImportPaths !== undefined) {
    result.memoryImportPaths = stringArray(
      options.memoryImportPaths,
      "Gemini compare input options.memoryImportPaths",
    ).map((item) => path.resolve(item));
  }
  return result;
}

interface ParsedCompareArgs {
  codexInput: string;
  geminiInput: string;
}

function parseArgs(argv: string[]): ParsedCompareArgs {
  const agents: string[] = [];
  let codexInput: string | undefined;
  let geminiInput: string | undefined;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--codex-input" || arg === "--gemini-input") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(arg + " requires a value.");
      if (arg === "--codex-input") codexInput = value;
      else geminiInput = value;
      index += 1;
    } else if (arg.startsWith("-")) {
      fail("Unknown compare option: " + arg + ".");
    } else {
      agents.push(arg);
    }
  }

  if (!json) fail("codex-scope compare currently requires --json.");
  if (agents.length !== 2 || agents[0] !== "codex" || agents[1] !== "gemini") {
    fail("Only the conformance-backed agent pair 'codex gemini' is supported.");
  }
  if (!codexInput) fail("--codex-input is required.");
  if (!geminiInput) fail("--gemini-input is required.");
  return { codexInput, geminiInput };
}

function envelope(
  comparison: SemanticComparisonDocument | null,
  ciSummary: ComparisonCiSummary,
): CompareCliEnvelope {
  return {
    schema_version: COMPARISON_CLI_SCHEMA_VERSION,
    comparison,
    ci_summary: ciSummary,
  };
}

function serialize(value: CompareCliEnvelope): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function emitToolError(reason: string): void {
  process.stdout.write(
    serialize(envelope(null, toolErrorComparisonCiSummary(reason))),
  );
}

export function runCompareCli(argv: string[]): number {
  try {
    const args = parseArgs(argv);
    const codexOptions = parseCodexInput(args.codexInput);
    const geminiOptions = parseGeminiInput(args.geminiInput);

    let raw: SemanticComparisonDocument;
    try {
      raw = compareInspections(
        inspectWithAdapter(codexAdapter, codexOptions),
        inspectWithAdapter(geminiAdapter, geminiOptions),
        CODEX_GEMINI_COMPARISON_DIMENSIONS,
      );
    } catch {
      throw new CompareInputError(
        "Explicit compare inputs could not be inspected deterministically.",
      );
    }

    const comparison = sanitizeComparisonDocumentPaths(raw, process.cwd());
    const ciSummary = summarizeComparisonForCi(comparison);
    process.stdout.write(serialize(envelope(comparison, ciSummary)));
    return COMPARE_CLI_EXIT_CODES.valid_comparison;
  } catch (error) {
    if (error instanceof CompareInputError) {
      emitToolError(error.message);
      return COMPARE_CLI_EXIT_CODES.input_or_usage_tool_error;
    }
    emitToolError("Codex Scope compare failed safely before a valid comparison document was formed.");
    return COMPARE_CLI_EXIT_CODES.internal_tool_error;
  }
}
