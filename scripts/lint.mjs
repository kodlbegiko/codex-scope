import fs from "node:fs";
import path from "node:path";

const roots = ["src", "tests", "scripts"];
const problems = [];

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of roots.flatMap(walk).filter((file) => /\.(ts|mjs)$/.test(file))) {
  const text = fs.readFileSync(file, "utf8");
  if (file.startsWith(`src${path.sep}`) && /\beval\s*\(/.test(text)) {
    problems.push(`${file}: eval() is forbidden`);
  }
  if (file.startsWith(`src${path.sep}`) && /child_process|execSync|spawnSync|\bspawn\s*\(/.test(text)) {
    problems.push(`${file}: process execution is forbidden in the V0.1 inspection path`);
  }
  if (/\bfetch\s*\(|https?:\/\//.test(text) && file.startsWith(`src${path.sep}`)) {
    problems.push(`${file}: runtime network code is forbidden`);
  }
  if (/console\.log\([^)]*(token|secret|password|api.?key)/i.test(text)) {
    problems.push(`${file}: possible direct secret logging`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("lint: ok (runtime safety/static checks)");
