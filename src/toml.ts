import { ConfigParseError } from "./errors";

export interface ParsedToml {
  value: Record<string, unknown>;
  lines: Map<string, number>;
}

function stripComment(input: string): string {
  let single = false;
  let double = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (double && escaped) {
      escaped = false;
      continue;
    }
    if (double && char === "\\") {
      escaped = true;
      continue;
    }
    if (!double && char === "'") single = !single;
    else if (!single && char === '"') double = !double;
    else if (!single && !double && char === "#") return input.slice(0, index);
  }
  return input;
}

function balanceDelta(input: string): number {
  let balance = 0;
  let single = false;
  let double = false;
  let escaped = false;
  for (const char of input) {
    if (double && escaped) {
      escaped = false;
      continue;
    }
    if (double && char === "\\") {
      escaped = true;
      continue;
    }
    if (!double && char === "'") single = !single;
    else if (!single && char === '"') double = !double;
    else if (!single && !double && (char === "[" || char === "{")) balance += 1;
    else if (!single && !double && (char === "]" || char === "}")) balance -= 1;
  }
  return balance;
}

function splitTopLevel(input: string, separator: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let single = false;
  let double = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (double && escaped) {
      escaped = false;
      continue;
    }
    if (double && char === "\\") {
      escaped = true;
      continue;
    }
    if (!double && char === "'") single = !single;
    else if (!single && char === '"') double = !double;
    else if (!single && !double && (char === "[" || char === "{")) depth += 1;
    else if (!single && !double && (char === "]" || char === "}")) depth -= 1;
    else if (!single && !double && depth === 0 && char === separator) {
      result.push(input.slice(start, index));
      start = index + 1;
    }
  }
  result.push(input.slice(start));
  return result;
}

function findTopLevelEquals(input: string): number {
  const pieces = splitTopLevel(input, "=");
  if (pieces.length !== 2) return -1;
  return pieces[0].length;
}

function parseKeyPart(part: string, filePath: string, line: number): string {
  const trimmed = part.trim();
  if (!trimmed) throw new ConfigParseError(filePath, line, "Empty TOML key segment.");
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== "string") throw new Error("not string");
      return parsed;
    } catch {
      throw new ConfigParseError(filePath, line, `Invalid quoted key: ${trimmed}`);
    }
  }
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'") || trimmed.length < 2) {
      throw new ConfigParseError(filePath, line, `Invalid literal key: ${trimmed}`);
    }
    return trimmed.slice(1, -1);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new ConfigParseError(filePath, line, `Unsupported or invalid bare key: ${trimmed}`);
  }
  return trimmed;
}

function parseKeyPath(input: string, filePath: string, line: number): string[] {
  return splitTopLevel(input, ".").map((part) => parseKeyPart(part, filePath, line));
}

function parseValue(raw: string, filePath: string, line: number): unknown {
  const value = raw.trim();
  if (!value) throw new ConfigParseError(filePath, line, "Missing TOML value.");

  if (value.startsWith('"')) {
    if (!value.endsWith('"')) throw new ConfigParseError(filePath, line, "Unterminated basic string.");
    try {
      return JSON.parse(value);
    } catch {
      throw new ConfigParseError(filePath, line, "Invalid TOML basic string; value omitted for safety.");
    }
  }

  if (value.startsWith("'")) {
    if (!value.endsWith("'")) throw new ConfigParseError(filePath, line, "Unterminated literal string.");
    return value.slice(1, -1);
  }

  if (value === "true") return true;
  if (value === "false") return false;

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner, ",")
      .map((piece) => piece.trim())
      .filter(Boolean)
      .map((piece) => parseValue(piece, filePath, line));
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    const inner = value.slice(1, -1).trim();
    const result: Record<string, unknown> = {};
    if (!inner) return result;
    for (const entry of splitTopLevel(inner, ",").map((piece) => piece.trim()).filter(Boolean)) {
      const eq = findTopLevelEquals(entry);
      if (eq < 0) throw new ConfigParseError(filePath, line, "Invalid inline table entry; value omitted for safety.");
      const keys = parseKeyPath(entry.slice(0, eq), filePath, line);
      setNested(result, keys, parseValue(entry.slice(eq + 1), filePath, line), filePath, line);
    }
    return result;
  }

  const normalizedNumber = value.replace(/_/g, "");
  if (/^[+-]?(?:\d+|0x[0-9A-Fa-f]+|0o[0-7]+|0b[01]+)$/.test(normalizedNumber)) {
    if (/^[+-]?0x/.test(normalizedNumber)) return Number.parseInt(normalizedNumber.replace(/^\+/, ""), 16);
    if (/^[+-]?0o/.test(normalizedNumber)) {
      const sign = normalizedNumber.startsWith("-") ? -1 : 1;
      return sign * Number.parseInt(normalizedNumber.replace(/^[+-]?0o/, ""), 8);
    }
    if (/^[+-]?0b/.test(normalizedNumber)) {
      const sign = normalizedNumber.startsWith("-") ? -1 : 1;
      return sign * Number.parseInt(normalizedNumber.replace(/^[+-]?0b/, ""), 2);
    }
    return Number(normalizedNumber);
  }
  if (/^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(normalizedNumber)) {
    return Number(normalizedNumber);
  }
  if (/^[+-]?(?:inf|nan)$/i.test(value)) return Number(value);

  if (/^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-]+(?:[Zz])?)?$/.test(value)) {
    return value;
  }

  throw new ConfigParseError(filePath, line, "Unsupported or invalid TOML value; value omitted for safety.");
}

function setNested(
  target: Record<string, unknown>,
  keys: string[],
  value: unknown,
  filePath: string,
  line: number,
): void {
  let current: Record<string, unknown> = target;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const existing = current[key];
    if (existing === undefined) {
      current[key] = {};
    } else if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
      throw new ConfigParseError(filePath, line, `Key conflicts with an existing scalar: ${keys.slice(0, index + 1).join(".")}`);
    }
    current = current[key] as Record<string, unknown>;
  }
  const leaf = keys[keys.length - 1];
  if (Object.prototype.hasOwnProperty.call(current, leaf)) {
    throw new ConfigParseError(filePath, line, `Duplicate TOML key: ${keys.join(".")}`);
  }
  current[leaf] = value;
}

export function parseToml(input: string, filePath: string): ParsedToml {
  const root: Record<string, unknown> = {};
  const locations = new Map<string, number>();
  let tablePath: string[] = [];
  const physical = input.split(/\r?\n/);

  for (let index = 0; index < physical.length; index += 1) {
    const startLine = index + 1;
    let logical = stripComment(physical[index]).trim();
    if (!logical) continue;

    if (logical.startsWith("[[")) {
      throw new ConfigParseError(filePath, startLine, "Array-of-tables syntax is not supported in V0.1; resolution stopped safely.");
    }

    if (logical.startsWith("[") && logical.endsWith("]") && !logical.includes("=")) {
      const inside = logical.slice(1, -1).trim();
      tablePath = parseKeyPath(inside, filePath, startLine);
      continue;
    }

    let balance = balanceDelta(logical);
    while (balance > 0 && index + 1 < physical.length) {
      index += 1;
      const continuation = stripComment(physical[index]).trim();
      logical += ` ${continuation}`;
      balance += balanceDelta(continuation);
    }
    if (balance !== 0) {
      throw new ConfigParseError(filePath, startLine, "Unbalanced TOML array or inline table.");
    }

    const eq = findTopLevelEquals(logical);
    if (eq < 0) throw new ConfigParseError(filePath, startLine, "Expected TOML key = value; line content omitted for safety.");
    const keyPath = [...tablePath, ...parseKeyPath(logical.slice(0, eq), filePath, startLine)];
    const parsed = parseValue(logical.slice(eq + 1), filePath, startLine);
    setNested(root, keyPath, parsed, filePath, startLine);
    locations.set(keyPath.join("."), startLine);
  }

  return { value: root, lines: locations };
}

export function flattenToml(
  value: Record<string, unknown>,
  lines: Map<string, number>,
): Array<{ key: string; value: unknown; line?: number }> {
  const result: Array<{ key: string; value: unknown; line?: number }> = [];
  const walk = (node: Record<string, unknown>, prefix: string[]): void => {
    for (const [key, child] of Object.entries(node)) {
      const full = [...prefix, key];
      const fullKey = full.join(".");
      if (child !== null && typeof child === "object" && !Array.isArray(child) && !lines.has(fullKey)) {
        walk(child as Record<string, unknown>, full);
      } else {
        result.push({ key: fullKey, value: child, line: lines.get(fullKey) });
      }
    }
  };
  walk(value, []);
  return result;
}

export function parseOverride(input: string): { key: string; value: unknown } {
  const eq = findTopLevelEquals(input);
  if (eq < 0) throw new ConfigParseError("<cli override>", 1, "Expected key=value; override content omitted for safety.");
  const keys = parseKeyPath(input.slice(0, eq), "<cli override>", 1);
  return { key: keys.join("."), value: parseValue(input.slice(eq + 1), "<cli override>", 1) };
}
