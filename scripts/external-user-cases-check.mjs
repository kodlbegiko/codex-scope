import { validateExternalUserCasesRepository } from "./external-user-cases-lib.mjs";

try {
  const result = validateExternalUserCasesRepository();
  console.log(
    "phase:d:external:check: ok external=" +
      result.verified_count +
      "/" +
      result.required +
      " status=" +
      result.status,
  );
} catch (error) {
  console.error("phase:d:external:check: failed");
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exit(1);
}
