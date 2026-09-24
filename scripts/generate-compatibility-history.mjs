import fs from "node:fs";
import { assertSchema, readJson, writeJson } from "./conformance-lib.mjs";
import { buildCompatibilityHistory } from "./observatory-lib.mjs";

const generated = buildCompatibilityHistory();
const schema = readJson("conformance/schema/compatibility-history.schema.json");
assertSchema(generated, schema, "compatibility history");
const target = "conformance/compatibility-history.json";
const rendered = JSON.stringify(generated, null, 2) + "\n";

if (process.argv.includes("--write")) {
  writeJson(target, generated);
  console.log("compatibility history: wrote " + target);
} else if (process.argv.includes("--check")) {
  if (!fs.existsSync(target)) {
    console.error("compatibility history: missing " + target);
    process.exit(1);
  }
  if (fs.readFileSync(target, "utf8") !== rendered) {
    console.error("compatibility history: stale; run npm run conformance:history");
    process.exit(1);
  }
  console.log("compatibility history: current");
} else {
  process.stdout.write(rendered);
}
