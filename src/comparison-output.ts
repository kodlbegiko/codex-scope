import type {
  ComparisonSourceRef,
  SemanticComparisonDocument,
  SemanticComparisonRecord,
} from "./comparison";

const path = require("node:path");

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function sanitizeSourcePath(
  source: ComparisonSourceRef,
  repositoryRoot: string,
): ComparisonSourceRef {
  if (!source.path) return { ...source };
  const absolute = path.resolve(source.path);
  if (!isWithin(repositoryRoot, absolute)) return { ...source };

  const relative = path
    .relative(path.resolve(repositoryRoot), absolute)
    .split(path.sep)
    .join("/");
  return {
    ...source,
    path: relative === "" ? "." : relative,
  };
}

function sanitizeRecord(
  record: SemanticComparisonRecord,
  repositoryRoot: string,
): SemanticComparisonRecord {
  return {
    ...record,
    left: { ...record.left },
    right: { ...record.right },
    provenance: {
      left: record.provenance.left.map((source) =>
        sanitizeSourcePath(source, repositoryRoot),
      ),
      right: record.provenance.right.map((source) =>
        sanitizeSourcePath(source, repositoryRoot),
      ),
    },
    evidence: {
      left: {
        ...record.evidence.left,
        references: [...record.evidence.left.references],
        rule_ids: [...record.evidence.left.rule_ids],
      },
      right: {
        ...record.evidence.right,
        references: [...record.evidence.right.references],
        rule_ids: [...record.evidence.right.rule_ids],
      },
    },
    unsupported_metadata: record.unsupported_metadata
      ? { ...record.unsupported_metadata }
      : null,
    unresolved_metadata: record.unresolved_metadata
      ? {
          sides: [...record.unresolved_metadata.sides],
          reasons: [...record.unresolved_metadata.reasons],
          dependencies: [...record.unresolved_metadata.dependencies],
        }
      : null,
  };
}

export function sanitizeComparisonDocumentPaths(
  document: SemanticComparisonDocument,
  repositoryRoot: string,
): SemanticComparisonDocument {
  return {
    schema_version: document.schema_version,
    normalization_version: document.normalization_version,
    counts: { ...document.counts },
    comparisons: document.comparisons.map((record) =>
      sanitizeRecord(record, repositoryRoot),
    ),
  };
}

export function serializeComparisonDocument(
  document: SemanticComparisonDocument,
): string {
  return JSON.stringify(document, null, 2) + "\n";
}
