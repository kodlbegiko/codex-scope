import type { NeutralInspectionRecord, NeutralSourceRef } from "./core";
import { CodexScopeError } from "./errors";
import type { ResolvedValue, ResolutionSource } from "./types";

const BUILTIN_PERMISSION_PROFILES = new Map([
  [":read-only", "read-only"],
  [":workspace", "workspace-write"],
  [":danger-full-access", "danger-full-access"],
] as const);

const EXTENSIBLE_BUILTINS = new Set([":read-only", ":workspace"]);

function sourceRef(source: ResolutionSource): NeutralSourceRef {
  return {
    type: source.type,
    scope: source.scope,
    path: source.path,
    line: source.line,
    precedence: source.precedence,
    reason: source.reason,
  };
}

function emptyProvenance() {
  return {
    shadowed: [],
    ignored: [],
    conditional: [],
  };
}

function permissionStatus(value: ResolvedValue): NeutralInspectionRecord["status"] {
  if (value.state === "unsupported" && value.key === "default_permissions") {
    return "resolved";
  }
  return value.state;
}

function recordFromValue(
  subject: string,
  value: ResolvedValue,
  resolvedValue: unknown,
  reason: string,
): NeutralInspectionRecord {
  return {
    agent: "codex",
    surface: "permissions",
    subject,
    status: permissionStatus(value),
    value: resolvedValue,
    provenance: {
      winner: value.winner ? sourceRef(value.winner) : undefined,
      shadowed: value.shadowed.map(sourceRef),
      ignored: value.ignored.map(sourceRef),
      conditional: value.conditional.map(sourceRef),
    },
    missingInformation: [...value.missingInformation],
    reason,
  };
}

function profilePrefix(profileId: string): string {
  return `permissions.${profileId}.`;
}

function profileExists(values: Record<string, ResolvedValue>, profileId: string): boolean {
  const prefix = profilePrefix(profileId);
  return Object.keys(values).some((key) => key.startsWith(prefix));
}

function profileExtends(values: Record<string, ResolvedValue>, profileId: string): string | undefined {
  const extendsValue = values[`${profilePrefix(profileId)}extends`];
  if (!extendsValue || extendsValue.effectiveValue === undefined) return undefined;
  if (typeof extendsValue.effectiveValue !== "string") {
    throw new CodexScopeError(
      "UNSUPPORTED_CONFIG_VALUE",
      `permissions.${profileId}.extends must be a string; Codex Scope stopped instead of coercing it.`,
    );
  }
  return extendsValue.effectiveValue;
}

function resolveInheritanceChain(values: Record<string, ResolvedValue>, selected: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = selected;

  while (true) {
    if (seen.has(current)) {
      const cycle = [...chain, current].join(" -> ");
      throw new CodexScopeError(
        "UNSUPPORTED_CONFIG_VALUE",
        `Permission profile inheritance cycle detected: ${cycle}. Codex Scope stopped instead of guessing.`,
      );
    }
    seen.add(current);
    chain.push(current);

    if (current.startsWith(":")) {
      if (!EXTENSIBLE_BUILTINS.has(current)) {
        throw new CodexScopeError(
          "UNSUPPORTED_CONFIG_VALUE",
          `Permission profile ${selected} extends unsupported built-in parent ${current}.`,
        );
      }
      return chain;
    }

    if (!profileExists(values, current)) {
      const message =
        current === selected
          ? `default_permissions refers to undefined profile ${selected}.`
          : `Permission profile ${selected} extends undefined profile ${current}.`;
      throw new CodexScopeError("UNSUPPORTED_CONFIG_VALUE", message);
    }

    const parent = profileExtends(values, current);
    if (!parent) return chain;
    current = parent;
  }
}

function assertOverrideBoundary(values: Record<string, ResolvedValue>): void {
  const selected = values.default_permissions;
  const sandbox = values.sandbox_mode;
  if (
    selected?.effectiveValue !== undefined &&
    sandbox?.effectiveValue !== undefined &&
    selected.winner?.type === "cli" &&
    sandbox.winner?.type === "cli"
  ) {
    throw new CodexScopeError(
      "UNSUPPORTED_CONFIG_VALUE",
      "Codex does not allow sandbox_mode and default_permissions invocation overrides together.",
    );
  }
}

/**
 * Resolve only the deterministic, static portion of Codex Permission Profiles.
 *
 * This intentionally does not model filesystem/network enforcement, live
 * /permissions switching, resumed-thread permission snapshots, Windows sandbox
 * provisioning, or managed requirements. Those remain runtime/managed state.
 */
export function permissionProfileRecords(
  values: Record<string, ResolvedValue>,
): NeutralInspectionRecord[] {
  assertOverrideBoundary(values);

  const selected = values.default_permissions;
  if (!selected || selected.effectiveValue === undefined) {
    return [
      {
        agent: "codex",
        surface: "permissions",
        subject: "default_profile_selection",
        status: "unresolved",
        provenance: emptyProvenance(),
        missingInformation: [
          "default_permissions is not explicitly selected; Codex may choose an implicit built-in profile from active-project and runtime sandbox state.",
        ],
        reason:
          "Codex Scope does not infer the implicit runtime permission profile when default_permissions is absent.",
      },
    ];
  }

  if (typeof selected.effectiveValue !== "string") {
    throw new CodexScopeError(
      "UNSUPPORTED_CONFIG_VALUE",
      "default_permissions must be a string profile identifier; Codex Scope stopped instead of coercing it.",
    );
  }

  const profileId = selected.effectiveValue;
  const status = permissionStatus(selected);
  if (profileId.startsWith(":")) {
    const staticSandboxIdentity = BUILTIN_PERMISSION_PROFILES.get(
      profileId as ":read-only" | ":workspace" | ":danger-full-access",
    );
    if (!staticSandboxIdentity) {
      throw new CodexScopeError(
        "UNSUPPORTED_CONFIG_VALUE",
        `default_permissions refers to unknown built-in profile ${profileId}.`,
      );
    }
    return [
      recordFromValue(
        "default_profile_selection",
        selected,
        {
          id: profileId,
          kind: "builtin",
          staticSandboxIdentity,
        },
        status === "resolved"
          ? "Explicit built-in permission profile identity is deterministic; runtime enforcement remains outside Codex Scope."
          : "A known built-in profile candidate exists, but unresolved configuration inputs can still change the final selection.",
      ),
    ];
  }

  if (profileId.length === 0) {
    throw new CodexScopeError(
      "UNSUPPORTED_CONFIG_VALUE",
      "default_permissions contains an invalid empty profile identifier.",
    );
  }

  const inheritance = resolveInheritanceChain(values, profileId);
  return [
    recordFromValue(
      "default_profile_selection",
      selected,
      {
        id: profileId,
        kind: "named",
        extends: inheritance.length > 1 ? inheritance[1] : undefined,
        inheritance,
      },
      status === "resolved"
        ? "Explicit named permission profile identity and inheritance are deterministic from the loaded static configuration. Runtime enforcement remains outside Codex Scope."
        : "A known named profile candidate exists, but unresolved configuration inputs can still change the final selection.",
    ),
  ];
}

export function projectlessPermissionDefaultsBoundary(): NeutralInspectionRecord {
  return {
    agent: "codex",
    surface: "permissions",
    subject: "projectless_permission_defaults",
    status: "unsupported",
    provenance: emptyProvenance(),
    missingInformation: [
      "Projectless TUI defaults depend on runtime project discovery, saved trust, explicit overrides, managed policy, execution locality, and platform sandbox state.",
    ],
    reason:
      "Codex Scope records this upstream semantic surface but does not simulate projectless TUI/session permission defaults.",
  };
}
