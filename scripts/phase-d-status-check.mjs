import { validatePhaseDStatusRepository } from "./phase-d-status-lib.mjs";

try {
  const result = validatePhaseDStatusRepository();
  console.log(
    "phase:d:status:check: ok" +
      " structural=" +
      result.structural_count +
      " real_repositories=" +
      result.real_repository_count +
      " dimensions=" +
      result.comparison_dimension_count +
      " external=" +
      result.external_verified +
      "/" +
      result.external_required +
      " phase_status=" +
      result.phase_status,
  );
} catch (error) {
  console.error("phase:d:status:check: failed");
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exit(1);
}
