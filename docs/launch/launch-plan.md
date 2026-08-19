# Codex Scope first-user launch plan

Evidence date: 2026-08-19

This plan starts only after the current patch release is publicly verified on npm. It does not authorize V0.2 feature work.

## Wave 0 — release smoke

Goal: prove that the public artifact, README quickstart, and repository surfaces work together.

Gate:

- published npm version matches the intended release;
- `npx --yes --package=codex-scope-inspector@<version> codex-scope --version` succeeds outside the repo;
- `npx --yes --package=codex-scope-inspector@<version> codex-scope inspect` succeeds outside the repo;
- README status matches the public release line and points to an authoritative latest-version source;
- repository description/topics/social preview are set or explicitly tracked as manual settings work.

Do not proceed if package execution or version metadata is inconsistent.

## Wave 1 — small technical audience

Goal: find activation friction before broad promotion.

Ask a small number of Codex users to try the README quickstart without extra instructions. Collect only:

- whether they understood the problem;
- whether the first command ran;
- whether the output was understandable;
- whether `why <key>` was discoverable;
- one concrete confusion or failure, if any.

Do not optimize this wave for stars.

## Wave 2 — Codex-relevant users

Goal: obtain real environment shapes and resolution mismatches.

Prioritize feedback that can become:

- a minimal sanitized reproduction;
- a confirmed resolver bug;
- a real-world conformance candidate;
- repeated demand for one missing capability.

Use the repository's Bug report and Real-world conformance case templates. Never request secrets or private instruction contents.

## Wave 3 — broader developer launch

Only proceed after Waves 0–2 show no serious installation or comprehension blocker.

Candidate surfaces include Hacker News, relevant Reddit communities, X, and other developer communities whose current rules permit project sharing. Re-check community rules immediately before posting.

## Evidence gate after launch

Do not start a new runtime milestone merely because launch preparation is complete. Re-run product prioritization after any one of these signals:

- 10+ genuine external users with usable feedback; or
- 5+ meaningful real-world Codex Scope cases; or
- 3+ independent users asking for the same missing capability; or
- a material upstream Codex semantic change.

Until then, `WAIT FOR EVIDENCE` is a valid product state.
