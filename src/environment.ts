import { codexAdapter } from "./adapters/codex";
import { inspectWithAdapter } from "./core";
import type { EffectiveCodexEnvironment, ResolveOptions } from "./types";

export function buildEnvironment(options: ResolveOptions): EffectiveCodexEnvironment {
  return inspectWithAdapter(codexAdapter, options).result;
}
