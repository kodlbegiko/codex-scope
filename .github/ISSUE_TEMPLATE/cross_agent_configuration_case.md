---
name: Cross-agent configuration case
about: Share a sanitized Codex/Gemini configuration problem for Phase D validation
---

## What went wrong?

Describe a real configuration or instruction problem you encountered while using Codex and Gemini CLI in the same repository. When did you notice it?

If you are not sure whether this is a Codex bug, a Gemini CLI bug, or a configuration mismatch, that is fine. Report the observed difference; maintainers will classify it from deterministic evidence.

## Repository and agent context

- Public repository or sanitized reproduction:
- Codex version, if known:
- Gemini CLI version, if known:
- Relevant working directory or target file, with private paths removed:

## Minimal sanitized layout and settings

Show only the files and settings needed to reproduce the difference. Remove secrets, private instructions, and personal paths.

```text
project/
  ...
```

## Expected and observed behavior

- Expected:
- Observed with Codex:
- Observed with Gemini CLI:

## Independent evidence

Link a public issue, repository state, sanitized log, or other artifact that shows the problem existed outside the Codex Scope comparison. Explain how the evidence relates to this case.

## Reproduction steps

List the smallest steps a maintainer can follow with the sanitized files. If a step depends on trust, invocation options, or a target file, include that input.

## Comparison output, if available

If you built the Phase D draft and ran `codex-scope compare codex gemini`, attach sanitized input artifacts and comparison JSON. The published v0.4.0 package does not include this command, so this section is optional; maintainers can reproduce the comparison from the information above.

## Privacy check

Confirm that this issue contains no API keys, auth tokens, secrets, private instruction content, confidential repository content, or sensitive absolute paths.

Submitting a case does not automatically count toward the Phase D gate. A maintainer must validate its independence, uniqueness, reproduction, comparison result, and sanitization.
