export class CodexScopeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CodexScopeError";
    this.code = code;
  }
}

export class ConfigParseError extends CodexScopeError {
  readonly filePath: string;
  readonly line: number;
  readonly problem: string;

  constructor(filePath: string, line: number, problem: string) {
    super(
      "CONFIG_PARSE_ERROR",
      `Could not parse ${filePath}:${line}\n\n${problem}\n\nCodex Scope stopped configuration resolution instead of guessing.`,
    );
    this.name = "ConfigParseError";
    this.filePath = filePath;
    this.line = line;
    this.problem = problem;
  }
}

export class UsageError extends CodexScopeError {
  constructor(message: string) {
    super("USAGE_ERROR", message);
    this.name = "UsageError";
  }
}
