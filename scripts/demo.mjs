import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const cli = path.join(root, "dist", "cli.js");
const project = path.join(root, "fixtures", "demo", "conflict", "project");
const codexHome = path.join(root, "fixtures", "demo", "conflict", "home");

function run(label, args) {
  console.log(`\n$ ${label}\n`);
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const common = [
  "--cwd",
  project,
  "--codex-home",
  codexHome,
  "--profile",
  "dev",
  "--trust",
  "trusted",
  "--invocation-complete",
];

run("codex-scope inspect (deterministic fixture)", ["inspect", ...common]);
run("codex-scope why approval_policy", ["why", "approval_policy", ...common]);
