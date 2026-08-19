import { resolveInstructions } from "./agents";
import { resolveConfig, valueAsNumber, valueAsStringArray } from "./config";
import type { EffectiveCodexEnvironment, ResolveOptions } from "./types";
import { VERSION } from "./version";

const COMPATIBILITY = {
  codexScopeVersion: VERSION,
  target: "Current stable OpenAI Codex documentation plus openai/codex implementation evidence observed on 2026-08-19",
  evidenceDate: "2026-08-19",
  localCodexDetected: false,
} as const;

export function buildEnvironment(options: ResolveOptions): EffectiveCodexEnvironment {
  const configResult = resolveConfig(options);
  const maxBytes = valueAsNumber(configResult.values.project_doc_max_bytes, 32768);
  const fallbacks = valueAsStringArray(configResult.values.project_doc_fallback_filenames, []);
  const instructionConfigKeys = [
    configResult.values.project_doc_max_bytes,
    configResult.values.project_doc_fallback_filenames,
    configResult.values.project_root_markers,
  ].filter(Boolean);
  const configUncertainty = instructionConfigKeys.some((value) => value.state === "unresolved");

  const instructions = resolveInstructions({
    cwd: options.cwd,
    codexHome: options.codexHome,
    projectRoot: configResult.projectRoot,
    fallbackFilenames: fallbacks,
    projectByteLimit: maxBytes,
    invocationComplete: options.invocationComplete,
    configUncertainty,
  });

  const warnings = [...configResult.warnings, ...instructions.warnings];
  if (configResult.projectConfigPaths.length > 1) {
    warnings.push(`${configResult.projectConfigPaths.length} project config layers were discovered from project root to cwd.`);
  }

  return {
    schemaVersion: "codex-scope.v0.1",
    cwd: options.cwd,
    projectRoot: configResult.projectRoot,
    codexHome: options.codexHome,
    trust: options.trust,
    invocationComplete: options.invocationComplete,
    selectedProfile: options.profile,
    instructions,
    config: configResult.values,
    warnings,
    compatibility: { ...COMPATIBILITY },
  };
}
