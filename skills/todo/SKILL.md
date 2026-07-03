---
name: todo
description: "Maintain the project's master TODO — the internal backlog in docs/TODO.md and its dated archive docs/TODO-done.md. Use when adding/updating/sorting TODO items, marking something in-progress/implemented/verified/done, asking \"what should I do next\", or mentioning \"/todo\". Uses explicit status markers ([ ] not started, [~] in progress, [?] implemented-but-unverified), a separate [P] priority marker, verification type (🤖 auto vs 🙋 needs-human), and exposure tags. Orders by priority → ease → dependency count. On done-AND-verified, moves the item into docs/TODO-done.md under today's real date. Never ticks an item done without its verify having actually passed, and never invents a date."
license: MIT
allowed-tools: Bash, Read, Edit, Write
---

# Maintain the master TODO

Keep the project's `docs/TODO.md` (the live backlog) and `docs/TODO-done.md`
(the dated archive) accurate, honest, and well-ordered. Template + full legend live in those files' headers.

## Status markers (status first, then optional priority)

- `[ ]` not started · `[~]` in progress / partial · `[?]` **implemented but unverified** (code looks done; not
  yet proven). There is **no `[x]`** in TODO.md — done+verified items leave the file (see Move rule).
- `[P]` is a *separate* priority marker, prepended: `[ ] [P] …`.
- **Verification type** on every item: `🤖` = an agent can prove it with a test/command · `🙋` = needs a human
  (manual test, judgment, real-world check). Every item carries a `→ verify:` line stating exactly how.
- **Exposure tags** (optional): `🌍` public-eligible · `🔒` internal-only · `⚖` needs ToS/Privacy review.

## What this skill does

- **Add** an item to the right section with a status marker, verification type + `→ verify:`, `deps:`, and any
  tags. New work without a clear verify is incomplete — ask or infer one.
- **Advance** status: `[ ]`→`[~]`→`[?]`→ (verified) → moved out. Set `[?]` when code is written but the verify
  hasn't passed yet. **Never** jump to done on assumption.
- **Sort** open items by **priority → ease → dependency count** (quick unblocked wins first, then foundational,
  then dependent systems). Keep `## 0. In-flight` to what's actively in progress.
- **Move on done:** when an item is completed **and** its verify has actually passed (🤖) or its owner signed
  off (🙋), move the whole item into `docs/TODO-done.md` under **today's real date** (get it from the system —
  never invent it), preserving the description + the evidence (the command that passed / PR / who verified).

## Hard rules

- Do not tick or move an item to done without the verification having **actually been observed** (constitution
  A2). `[?]` is the honest holding state for "implemented, not proven."
- **Default every item to `🤖`** (AI-verifiable — the overlord/tester runs the check and reads the output). Make
  items auto-verifiable: write the e2e / visual / contract / injected-error test that proves it. **Never ask the
  user to verify a `🤖` item** — that's the agent's job (A2).
- Reserve `🙋` for **genuine human-acceptance only**: a subjective look-and-feel call, or a check needing the
  human's credentials / a live deploy (account/login/live-key/deploy work). The autonomous loop does **not**
  stop to ask about `🙋` items: it builds everything around them, **defers them to `docs/DEPLOYMENT.md`**, and
  keeps going; they're handed off and run together at the end. The overlord must not mark `🙋` items done on its own.
- Keep it truthful: stalled work is `[~]` with a note, not a silent `[ ]`.
- Never invent a date; never delete history from `TODO-done.md`.
