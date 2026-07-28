---
name: todo
description: "Maintain the project's master TODO — the internal backlog in docs/TODO.md and its dated archive docs/TODO-done.md. Use when adding/updating/sorting TODO items, marking something in-progress/implemented/verified/done, asking \"what should I do next\", or mentioning \"/todo\". Uses explicit status markers ([ ] not started, [~] in progress, [?] implemented-but-unverified, [x] done), a separate [P] priority marker, verification type (🤖 auto vs 🙋 needs-human), and exposure tags. Orders by priority → ease → dependency count. Archives a whole completed section into docs/TODO-done.md under today's real date — an [x] inside a section still in progress stays. Never invents a date."
license: MIT
allowed-tools: Bash, Read, Edit, Write
---

# Maintain the master TODO

Keep the project's `docs/TODO.md` (the live backlog) and `docs/TODO-done.md`
(the dated archive) accurate, honest, and well-ordered. Template + full legend live in those files' headers.

## Status markers (status first, then optional priority)

- `[ ]` not started · `[~]` in progress / partial · `[?]` **implemented but unverified** (code looks done, not
  yet proven) · `[x]` done and verified.
- `[P]` is a *separate* priority marker, prepended: `[ ] [P] …`.
- **Verification type** on every item: `🤖` = an agent can prove it with a test/command · `🙋` = needs a human
  (manual test, judgment, real-world check). Every item carries a `→ verify:` line stating exactly how.
- **Exposure tags** (optional): `🌍` public-eligible · `🔒` internal-only · `⚖` needs ToS/Privacy review.

## What this skill does

- **Add** an item to the right section with a status marker, verification type + `→ verify:`, `deps:`, and any
  tags. New work without a clear verify is incomplete — ask or infer one.
- **Advance** status: `[ ]`→`[~]`→`[?]`→`[x]`. Set `[?]` when code is written but the verify has not passed
  yet; do not jump to `[x]` on assumption.
- **Sort** open items by **priority → ease → dependency count** (quick unblocked wins first, then foundational,
  then dependent systems). Keep `## 0. In-flight` to what's actively in progress.
- **Move on done — a whole section, not an item.** When a heading section holds no open items at all, move the
  section into `docs/TODO-done.md` under **today's real date** (read it from the system, never invent it),
  preserving the descriptions and the evidence (the command that passed, the PR, who verified). An `[x]` inside
  a section still in progress stays: it records that one part is built while the unit is not, and moving a
  finished part out of an unfinished whole strips the whole of the context needed to finish it.
- **After a move, grep the moved titles** — index lines elsewhere that pointed into that section now dangle.

## Hard rules

- Do not move an item to done without its verification having actually been observed. `[?]` is the honest
  holding state for "implemented, not proven."
- **Default every item to `🤖`.** Make items auto-verifiable: write the e2e, visual, contract or injected-error
  test that proves it. A `🤖` item is not something to ask the user to check.
- Reserve `🙋` for **genuine human-acceptance only**: a subjective look-and-feel call, or a check needing the
  human's credentials / a live deploy (account/login/live-key/deploy work). The autonomous loop does **not**
  stop to ask about `🙋` items: it builds everything around them, **defers them to `docs/DEPLOYMENT.md`**, and
  keeps going; they are handed off and run together at the end. A `🙋` item is never auto-closed.
- Keep it truthful: stalled work is `[~]` with a note, not a silent `[ ]`.
- Never invent a date; never delete history from `TODO-done.md`.
