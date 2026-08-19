import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

const { flattenToml, parseToml } = require("../dist/toml.js");

test("safe TOML subset covers tables, dotted keys, arrays, inline tables, comments and locations", () => {
  const parsed = parseToml(
    `# config\napproval_policy = "on-request"\n[features]\nweb_search = true\nproject_root_markers = [".git", ".jj"]\n[mcp_servers.demo]\nenv = { TOKEN = "x", MODE = "safe" }\n`,
    "fixture.toml",
  );
  const flat = flattenToml(parsed.value, parsed.lines);
  const map = Object.fromEntries(flat.map((entry) => [entry.key, entry.value]));
  assert.equal(map.approval_policy, "on-request");
  assert.equal(map["features.web_search"], true);
  assert.deepEqual(map["features.project_root_markers"], [".git", ".jj"]);
  assert.deepEqual(map["mcp_servers.demo.env"], { TOKEN: "x", MODE: "safe" });
  assert.equal(flat.find((entry) => entry.key === "approval_policy")?.line, 2);
});
