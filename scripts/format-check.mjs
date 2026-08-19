import fs from "node:fs";
import path from "node:path";

const roots = ["src", "tests", "scripts", "docs", ".github"];
const problems = [];
function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of roots.flatMap(walk)) {
  if (!/\.(ts|mjs|md|yml|yaml)$/.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (!text.endsWith("\n")) problems.push(`${file}: missing final newline`);
  text.split(/\r?\n/).forEach((line, index) => {
    if (/[ \t]+$/.test(line)) problems.push(`${file}:${index + 1}: trailing whitespace`);
  });
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("format:check: ok (whitespace/newline policy)");
