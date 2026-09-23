import fs from "node:fs";
import path from "node:path";

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateJsonSchema(instance, schema) {
  const errors = [];

  function visit(value, node, at) {
    if (!node || typeof node !== "object") return;

    if (Object.prototype.hasOwnProperty.call(node, "const") && !jsonEqual(value, node.const)) {
      errors.push(at + ": expected const " + JSON.stringify(node.const));
      return;
    }
    if (Array.isArray(node.enum) && !node.enum.some((item) => jsonEqual(value, item))) {
      errors.push(at + ": expected one of " + JSON.stringify(node.enum));
      return;
    }

    if (node.type) {
      const typeOk =
        node.type === "array"
          ? Array.isArray(value)
          : node.type === "object"
            ? value !== null && typeof value === "object" && !Array.isArray(value)
            : node.type === "integer"
              ? Number.isInteger(value)
              : typeof value === node.type;
      if (!typeOk) {
        errors.push(at + ": expected type " + node.type);
        return;
      }
    }

    if (typeof value === "string") {
      if (node.minLength !== undefined && value.length < node.minLength) {
        errors.push(at + ": string shorter than minLength " + node.minLength);
      }
      if (node.pattern && !new RegExp(node.pattern).test(value)) {
        errors.push(at + ": string does not match " + node.pattern);
      }
      if (node.format === "uri") {
        try {
          new URL(value);
        } catch {
          errors.push(at + ": invalid URI");
        }
      }
    }

    if (Array.isArray(value)) {
      if (node.minItems !== undefined && value.length < node.minItems) {
        errors.push(at + ": array shorter than minItems " + node.minItems);
      }
      if (node.items) value.forEach((item, index) => visit(item, node.items, at + "[" + index + "]"));
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const required = node.required ?? [];
      for (const key of required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(at + ": missing required property " + key);
      }
      const properties = node.properties ?? {};
      for (const [key, child] of Object.entries(value)) {
        if (properties[key]) visit(child, properties[key], at + "." + key);
        else if (node.additionalProperties === false) errors.push(at + ": unexpected property " + key);
      }
    }
  }

  visit(instance, schema, "$");
  return errors;
}

export function assertSchema(instance, schema, label) {
  const errors = validateJsonSchema(instance, schema);
  if (errors.length > 0) {
    throw new Error(label + " schema validation failed:\n" + errors.map((error) => "  - " + error).join("\n"));
  }
}

export function deepGet(value, segments) {
  let current = value;
  for (const segment of segments ?? []) {
    if (current === null || current === undefined) return undefined;
    current = current[segment];
  }
  return current;
}

function matchesObject(value, matcher) {
  if (value === null || typeof value !== "object") return false;
  return Object.entries(matcher).every(([rawKey, expected]) => {
    if (rawKey.endsWith("_suffix")) {
      const key = rawKey.slice(0, -"_suffix".length);
      const actual = value[key];
      if (typeof actual !== "string") return false;
      return actual.replaceAll("\\", "/").endsWith(String(expected).replaceAll("\\", "/"));
    }
    return jsonEqual(value[rawKey], expected);
  });
}

export function evaluateAssertion(root, assertion) {
  const collection = deepGet(root, assertion.path ?? []);
  let subject = collection;

  if (assertion.where) {
    if (!Array.isArray(collection)) return "where requires an array";
    subject = collection.find((item) => matchesObject(item, assertion.where));
    if (subject === undefined) return "no item matched where=" + JSON.stringify(assertion.where);
  } else if (assertion.where_all) {
    if (!Array.isArray(collection)) return "where_all requires an array";
    subject = collection.filter((item) => matchesObject(item, assertion.where_all));
  }

  if (assertion.operator === "same_as_match") {
    if (!Array.isArray(collection)) return "same_as_match requires an array";
    const other = collection.find((item) => matchesObject(item, assertion.match ?? {}));
    if (other === undefined) return "no item matched match=" + JSON.stringify(assertion.match);
    const left = assertion.property ? subject?.[assertion.property] : subject;
    const right = assertion.match_property ? other?.[assertion.match_property] : other;
    return jsonEqual(left, right) ? null : "values differ: " + JSON.stringify(left) + " !== " + JSON.stringify(right);
  }

  if (assertion.property) subject = subject?.[assertion.property];

  switch (assertion.operator) {
    case "equals":
    case "array_equals":
      return jsonEqual(subject, assertion.value)
        ? null
        : "expected " + JSON.stringify(assertion.value) + ", got " + JSON.stringify(subject);
    case "ends_with": {
      if (typeof subject !== "string") return "ends_with requires a string";
      const actual = subject.replaceAll("\\", "/");
      const expected = String(assertion.value).replaceAll("\\", "/");
      return actual.endsWith(expected) ? null : "expected suffix " + JSON.stringify(expected) + ", got " + JSON.stringify(actual);
    }
    case "length_equals":
    case "array_length_equals":
      return subject?.length === assertion.value
        ? null
        : "expected length " + assertion.value + ", got " + JSON.stringify(subject?.length);
    case "contains":
      return Array.isArray(subject) && subject.some((item) => jsonEqual(item, assertion.value))
        ? null
        : "expected array to contain " + JSON.stringify(assertion.value);
    default:
      return "unknown assertion operator " + JSON.stringify(assertion.operator);
  }
}

export function repoPath(relativePath) {
  return path.resolve(relativePath);
}
