# First-user feedback checklist

Use this for Wave 1 / Wave 2 validation. Do not convert guesses into metrics.

## Activation

Record one of `PASS`, `FRICTION`, or `FAIL` for each step:

- understood the problem from the first README viewport;
- copied the zero-install command without modification;
- command installed and started;
- first `inspect` output was understandable;
- unresolved state was understandable;
- user found `why <key>` without maintainer coaching;
- user could apply the tool to a real Codex question.

## If there is friction

Capture the smallest concrete reason:

```text
step:
command:
expected:
actual:
what was confusing:
```

Do not summarize a vague impression as a product conclusion.

## If Codex Scope appears wrong

Ask for a sanitized Bug report or Real-world conformance case containing:

- Codex Scope version;
- Codex version if known;
- OS;
- exact command;
- expected vs actual behavior;
- smallest redacted output;
- minimal synthetic reproduction if possible;
- official/upstream evidence when available.

Never request auth state, API keys, tokens, cookies, passwords, unredacted secrets, private instruction contents, or sensitive absolute paths.

## Evidence that can trigger product re-prioritization

Track independently verifiable signals such as:

- repeated first-run failure at the same step;
- multiple confirmed resolver mismatches in the same semantic area;
- 3+ independent users requesting the same missing capability;
- material upstream Codex semantic changes.

Stars alone are not evidence that a runtime feature should be built.
