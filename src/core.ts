import type { ResolutionSource, ResolutionState } from "./types";

export type CompatibilityOutcome =
  | "compatible"
  | "behavior_drift"
  | "unsupported"
  | "unresolved"
  | "tool_error";

export type SemanticStatus = ResolutionState | "conditional" | "available";

export interface NeutralSourceRef {
  type?: ResolutionSource["type"] | string;
  scope: string;
  path?: string;
  line?: number;
  precedence?: number;
  reason?: string;
}

export interface NeutralProvenance {
  winner?: NeutralSourceRef;
  shadowed: NeutralSourceRef[];
  ignored: NeutralSourceRef[];
  conditional: NeutralSourceRef[];
}

export interface NeutralInspectionRecord {
  agent: string;
  surface: string;
  subject: string;
  status: SemanticStatus;
  value?: unknown;
  provenance: NeutralProvenance;
  missingInformation: string[];
  reason: string;
}

export interface AdapterEvidence {
  evidenceDate: string;
  upstreamRepository: string;
  upstreamCommit: string;
  testedUpstreamVersion: string;
  references: readonly string[];
}

export interface AdapterCapabilities {
  instructions: boolean;
  config: boolean;
  trust: boolean;
  versionDetection: "none" | "optional";
  runtimeNetworkRequired: false;
  subprocessRequired: false;
}

export interface AgentInspection<TResult> {
  agent: string;
  adapterVersion: string;
  capabilities: AdapterCapabilities;
  evidence: AdapterEvidence;
  records: NeutralInspectionRecord[];
  result: TResult;
}

export interface AgentAdapter<TOptions, TResult> {
  id: string;
  adapterVersion: string;
  capabilities: AdapterCapabilities;
  evidence: AdapterEvidence;
  inspect(options: TOptions): AgentInspection<TResult>;
}

export function inspectWithAdapter<TOptions, TResult>(
  adapter: AgentAdapter<TOptions, TResult>,
  options: TOptions,
): AgentInspection<TResult> {
  return adapter.inspect(options);
}
