# First-user activation test

Use this protocol after a public V0.1.x release and before deciding what belongs in V0.2.

The purpose is to observe whether a real Codex user can understand and use Codex Scope without maintainer coaching.

## Target

Recruit 5–10 people who already use Codex on real projects.

Do not pre-teach the command model, explain `unresolved`, or tell them what result they should expect before they try it.

## Starting point

Give the participant only the public repository URL.

Ask them to behave as if they discovered the project independently.

## Activation path to observe

```text
GitHub repository
↓
understands the problem in ~10 seconds
↓
finds the zero-install command
↓
runs `codex-scope inspect`
↓
understands the first result
↓
identifies winner / provenance / unresolved state
↓
discovers `why <key>` or another core command
↓
tries Codex Scope on a real Codex project
```

Do not count a step as successful if the maintainer had to tell the participant what to click, copy, or interpret.

## What to record

For each participant, record only sanitized observations:

- time to explain what Codex Scope does in their own words;
- first command they chose;
- whether the first command ran successfully;
- first point of confusion;
- whether `unresolved` was interpreted correctly;
- whether they found `why <key>` without coaching;
- whether the output answered a real question;
- whether they tried a second project or command;
- whether they would use the tool again;
- the single most important missing capability, if any.

## Friction classification

Classify observed problems before changing the product:

### P0 — activation blocker

The user cannot install/run the documented command, or the documented path produces a materially incorrect result.

### P1 — comprehension blocker

The command works, but a reasonable Codex user cannot determine what the output means or what to do next without maintainer help.

### P2 — usability friction

The user succeeds but hesitates, repeats commands unnecessarily, or misses a useful existing capability.

### P3 — feature request

The current flow is understood and useful, but the user wants a capability that does not exist.

Do not treat P3 requests as V0.2 requirements until independent evidence repeats.

## Evidence gate for V0.2

Do not start V0.2 merely because one user asks for a feature.

Use at least one of these evidence thresholds:

- 10+ genuine external users with usable feedback;
- 5+ meaningful real-world Codex cases;
- 3+ independent users asking for the same missing capability;
- a material upstream Codex semantic change that invalidates or expands the modeled surface.

## Feedback channel

Ask participants to file a sanitized **First-run feedback** issue when practical. Use **Real-world conformance case** when the important evidence is a reproducible difference between Codex and Codex Scope.

Never request tokens, private `AGENTS.md` contents, auth state, customer names, private repository content, or other secrets as part of the study.
