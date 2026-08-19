const packageJson = require("../package.json") as { version?: unknown };

if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
  throw new Error("Codex Scope package version is missing or invalid.");
}

export const VERSION = packageJson.version;
