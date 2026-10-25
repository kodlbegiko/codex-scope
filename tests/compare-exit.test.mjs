import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { COMPARE_CLI_EXIT_CODES } = require("../dist/compare-cli.js");

test("compare CLI freezes numeric exit semantics without treating semantic drift as a crash", () => {
  assert.deepEqual(COMPARE_CLI_EXIT_CODES, {
    valid_comparison: 0,
    internal_tool_error: 1,
    input_or_usage_tool_error: 2,
  });
});
