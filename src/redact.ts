import type { EffectiveCodexEnvironment, ResolvedValue } from "./types";

const SECRET_PATTERN = /(?:^|[._-])(token|secret|password|credential|api[_-]?key|private[_-]?key|authorization)(?:$|[._-])/i;

export function isSecretLikeKey(key: string): boolean {
  const normalized = key.replace(/\s+/g, "_");
  return SECRET_PATTERN.test(normalized) || /api.?key|private.?key|auth.?token/i.test(normalized);
}

function redactNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactNested);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSecretLikeKey(key) ? "[REDACTED]" : redactNested(child);
    }
    return result;
  }
  return value;
}

function redactValueRecord(value: ResolvedValue): ResolvedValue {
  if (isSecretLikeKey(value.key)) {
    return {
      ...value,
      effectiveValue: value.effectiveValue === undefined ? undefined : "[REDACTED]",
    };
  }
  return { ...value, effectiveValue: redactNested(value.effectiveValue) };
}

export function redactEnvironment(environment: EffectiveCodexEnvironment): EffectiveCodexEnvironment {
  const config: Record<string, ResolvedValue> = {};
  for (const [key, value] of Object.entries(environment.config)) {
    config[key] = redactValueRecord(value);
  }
  return { ...environment, config };
}
