---
name: Cross-agent configuration case
description: Submit a sanitized external Codex/Gemini configuration problem for Phase D validation
---

## Observed configuration problem

Describe the real configuration problem you encountered before adapting it into Codex Scope input.

## Repository or context

Provide the public repository, sanitized reproduction repository, or enough non-sensitive context to identify the environment.

## Codex environment / sanitized input

- Codex version / surface:
- Sanitized Codex input artifact or excerpt:

## Gemini environment / sanitized input

- Gemini version / surface:
- Sanitized Gemini input artifact or excerpt:

## Minimal sanitized layout

```text
project/
  ...
```

## Expected behavior

What configuration behavior did you expect?

## Observed behavior

What happened in the real environment?

## Codex Scope comparison

Command used:

```sh
codex-scope compare codex gemini \
  --codex-input <file> \
  --gemini-input <file> \
  --json
```

Attach or paste the sanitized comparison JSON, or the smallest relevant excerpt that preserves the classification and evidence references.

## Independent evidence that the problem existed

Provide evidence independent of Codex Scope showing that this configuration problem existed before or outside the comparison result, such as an external issue, reproduction log, public repository state, or other verifiable artifact.

## Reproduction steps

List deterministic steps a maintainer can use with the sanitized evidence.

## Privacy / sanitization acknowledgement

Confirm that the submission does **not** include API keys, auth tokens, secrets, private instruction content, confidential repository content, or sensitive absolute paths.

Submitting this issue does not make it verified Phase D evidence. A maintainer must validate the case, sanitization, uniqueness, reproduction, and independent evidence before it can be added to the machine-readable external-user ledger.
