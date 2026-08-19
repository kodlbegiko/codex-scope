# Security

Codex Scope inspects local developer configuration and may encounter credentials or private instruction content.

Please report security vulnerabilities privately through GitHub's security-reporting mechanism when available. Do not place real secrets or private configuration in public issues, pull requests, fixtures, screenshots, or demo recordings.

## Never include in a public report

- `auth.json` or equivalent authentication state;
- API keys, access tokens, OAuth tokens, cookies, or passwords;
- unredacted configuration containing credentials;
- private `AGENTS.md` / instruction contents that you are not authorized to publish;
- private absolute paths when they reveal sensitive usernames, customers, or internal repository names.

Use a minimal synthetic fixture whenever possible.

V0.1 redacts secret-like configuration keys by default, but the heuristic is not a proof that every possible secret name or sensitive value will be detected. Review output before sharing it publicly.

Codex Scope has no raw-secret output mode in V0.1 and normal inspection does not execute hooks, make runtime network calls, or mutate inspected configuration.
