export type ResolutionState =
  | "resolved"
  | "unresolved"
  | "unsupported"
  | "ignored"
  | "shadowed";

export type TrustState = "trusted" | "untrusted" | "unknown";

export interface ResolutionSource {
  type: "default" | "system" | "user" | "profile" | "project" | "cli";
  scope: string;
  path?: string;
  line?: number;
  precedence: number;
  reason?: string;
}

export interface ValueCandidate {
  key: string;
  value: unknown;
  source: ResolutionSource;
  applicable: boolean;
  conditional?: boolean;
  reason?: string;
}

export interface ResolvedValue {
  key: string;
  state: ResolutionState;
  effectiveValue?: unknown;
  winner?: ResolutionSource;
  shadowed: ResolutionSource[];
  ignored: ResolutionSource[];
  conditional: ResolutionSource[];
  missingInformation: string[];
  reason: string;
}

export interface InstructionSource {
  path: string;
  scope: "global" | "project";
  directory: string;
  filename: string;
  state: ResolutionState;
  bytes: number;
  includedBytes: number;
  precedence: number;
  reason: string;
  truncated?: boolean;
}

export interface InstructionReport {
  state: "resolved" | "unresolved";
  sources: InstructionSource[];
  active: InstructionSource[];
  totalProjectBytes: number;
  projectByteLimit: number;
  fallbackFilenames: string[];
  missingInformation: string[];
  warnings: string[];
}

export interface CompatibilityInfo {
  codexScopeVersion: string;
  target: string;
  evidenceDate: string;
  localCodexDetected: boolean;
}

export interface EffectiveCodexEnvironment {
  schemaVersion: "codex-scope.v0.1";
  cwd: string;
  projectRoot: string;
  codexHome: string;
  trust: TrustState;
  invocationComplete: boolean;
  selectedProfile?: string;
  instructions: InstructionReport;
  config: Record<string, ResolvedValue>;
  warnings: string[];
  compatibility: CompatibilityInfo;
}

export interface ResolveOptions {
  cwd: string;
  codexHome: string;
  trust: TrustState;
  invocationComplete: boolean;
  profile?: string;
  cliOverrides: string[];
  systemConfigPath?: string;
  managedConfigPaths?: string[];
}
