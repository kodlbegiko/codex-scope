import { spawnSync } from "node:child_process";

const required = [
  "conformance/schema/semantic-comparison.schema.json",
  "conformance/schema/semantic-comparison-ci.schema.json",
  "conformance/schema/semantic-comparison-cli.schema.json",
  "conformance/schema/phase-d-status.schema.json",
  "conformance/schema/structural-differences.schema.json",
  "conformance/comparison/phase-d-status.json",
  "conformance/comparison/structural-differences.json",
  "conformance/comparison/cli-codex-gemini.json",
  "dist/comparison.js",
  "dist/comparison-ci.js",
  "dist/compare-cli.js"
];

const result = spawnSync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || "npm pack --dry-run failed\n");
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("npm pack --dry-run did not emit valid JSON.");
  process.exit(1);
}

const files = new Set(
  (Array.isArray(report) ? report : [])
    .flatMap((entry) => Array.isArray(entry.files) ? entry.files : [])
    .map((entry) => entry.path)
    .filter((entry) => typeof entry === "string"),
);

const missing = required.filter((file) => !files.has(file));
if (missing.length > 0) {
  console.error("npm package is missing required Phase D public content:");
  for (const file of missing) console.error("- " + file);
  process.exit(1);
}

console.log(
  "package:contents:check: ok (" +
    required.length +
    " required Phase D files present in npm pack dry-run)",
);
