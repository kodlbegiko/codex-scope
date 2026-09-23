#!/usr/bin/env node
const path = require("node:path");
import { buildCompatibilitySummary } from "./compatibility";
import { runCompareCli } from "./compare-cli";
import { defaultCodexHome } from "./config";
import { ConfigParseError, UsageError } from "./errors";
import { buildEnvironment } from "./environment";
import { normalizeExistingDirectory } from "./fs-utils";
import { renderCompatibility, renderCompatibilityJson, renderConfig, renderInspect, renderInstructions, renderJson, renderWhy } from "./render";
import type { TrustState } from "./types";
import { VERSION } from "./version";

type Command = "inspect" | "instructions" | "config" | "why" | "compatibility";

interface ParsedArgs {
  command: Command;
  json: boolean;
  cwd: string;
  codexHome: string;
  trust: TrustState;
  invocationComplete: boolean;
  profile?: string;
  cliOverrides: string[];
  whyKey?: string;
  codexVersion?: string;
}

function usage(): string {
  return `Codex Scope ${VERSION}\n\nUsage:\n  codex-scope inspect [options]\n  codex-scope instructions [path] [options]\n  codex-scope config [options]\n  codex-scope why <key> [options]\n  codex-scope compatibility [options]\n\nOptions:\n  --json                       Machine-readable, versioned output\n  --cwd <path>                 Target working directory\n  --codex-home <path>          Override CODEX_HOME for inspection\n  --trust trusted|untrusted|unknown\n  --profile <name>             Known Codex profile file (<name>.config.toml)\n  -c, --config <key=value>     Known Codex invocation override; repeatable\n  --invocation-complete        Assert supplied profile/-c state is complete\n  --codex-version <version>      Explicit offline Codex version for compatibility reporting\n  --version\n  --help\n\nCodex Scope is read-only. It makes no LLM calls and executes no discovered hooks.`;
}

function takeValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new UsageError(`${option} requires a value.`);
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }
  if (argv.includes("--version")) {
    console.log(VERSION);
    process.exit(0);
  }

  const commandToken = argv.find((arg) => ["inspect", "instructions", "config", "why", "compatibility"].includes(arg));
  if (!commandToken) {
    throw new UsageError(usage());
  }
  const command = commandToken as Command;
  let cwd = process.cwd();
  let codexHome = defaultCodexHome();
  let trust: TrustState = "unknown";
  let invocationComplete = false;
  let profile: string | undefined;
  let json = false;
  const cliOverrides: string[] = [];
  let whyKey: string | undefined;
  let instructionsPath: string | undefined;
  let codexVersion: string | undefined;
  let seenCommand = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === command && !seenCommand) {
      seenCommand = true;
      continue;
    }
    if (arg === "--json") json = true;
    else if (arg === "--invocation-complete") invocationComplete = true;
    else if (arg === "--cwd") {
      cwd = takeValue(argv, index, arg);
      index += 1;
    } else if (arg === "--codex-home") {
      codexHome = takeValue(argv, index, arg);
      index += 1;
    } else if (arg === "--trust") {
      const value = takeValue(argv, index, arg);
      if (!["trusted", "untrusted", "unknown"].includes(value)) {
        throw new UsageError("--trust must be trusted, untrusted, or unknown.");
      }
      trust = value as TrustState;
      index += 1;
    } else if (arg === "--profile") {
      profile = takeValue(argv, index, arg);
      index += 1;
    } else if (arg === "-c" || arg === "--config") {
      cliOverrides.push(takeValue(argv, index, arg));
      index += 1;
    } else if (arg === "--codex-version") {
      codexVersion = takeValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new UsageError(`Unknown option: ${arg}`);
    } else if (seenCommand && command === "why" && !whyKey) {
      whyKey = arg;
    } else if (seenCommand && command === "instructions" && !instructionsPath) {
      instructionsPath = arg;
    } else {
      throw new UsageError(`Unexpected argument: ${arg}`);
    }
  }

  if (command === "why" && !whyKey) throw new UsageError("codex-scope why requires a config key.");
  if (codexVersion && command !== "compatibility") {
    throw new UsageError("--codex-version is only valid with codex-scope compatibility.");
  }
  if (instructionsPath) cwd = instructionsPath;

  return {
    command,
    json,
    cwd: normalizeExistingDirectory(path.resolve(cwd)),
    codexHome: path.resolve(codexHome),
    trust,
    invocationComplete,
    profile,
    cliOverrides,
    whyKey,
    codexVersion,
  };
}

export function main(argv = process.argv.slice(2)): number {
  if (argv[0] === "compare") {
    return runCompareCli(argv.slice(1));
  }

  try {
    const args = parseArgs(argv);
    if (args.command === "compatibility") {
      const summary = buildCompatibilitySummary({ codexVersion: args.codexVersion });
      console.log(args.json ? renderCompatibilityJson(summary) : renderCompatibility(summary));
      return 0;
    }
    const environment = buildEnvironment({
      cwd: args.cwd,
      codexHome: args.codexHome,
      trust: args.trust,
      invocationComplete: args.invocationComplete,
      profile: args.profile,
      cliOverrides: args.cliOverrides,
    });
    const output = args.json
      ? renderJson(environment, args.command, args.whyKey)
      : args.command === "inspect"
        ? renderInspect(environment)
        : args.command === "instructions"
          ? renderInstructions(environment)
          : args.command === "config"
            ? renderConfig(environment)
            : renderWhy(environment, args.whyKey!);
    console.log(output);
    return 0;
  } catch (error: any) {
    if (error instanceof ConfigParseError || error instanceof UsageError) {
      console.error(error.message);
      return 2;
    }
    console.error(`Codex Scope failed safely: ${error?.message ?? String(error)}`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}
