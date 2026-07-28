# {{PROJECT_NAME}} — Master TODO (INTERNAL)

> The global, internal backlog and source of truth for what must be done. Engineering/tech-debt detail lives in
> [`PLAN.md`](./PLAN.md); shipped, user-visible changes live in `CHANGELOG.md` / patch notes. **An item is not
> release-complete until it is moved to [`TODO-done.md`](./TODO-done.md).**
>
> ### Legend
> **Status** (first marker): `[ ]` not started · `[~]` in progress / partial · `[?]` implemented but **unverified**
> (code may be done; still needs a passing check or owner sign-off) · `[x]` done and verified.
>
> **Priority:** prepend `[P]` to items that jump the queue.
>
> **Verification** (how an item gets proven done): `🤖` auto-verifiable (a test / command an agent can run) ·
> `🙋` needs a human (manual test, judgment, or real-world check). Every item carries a `→ verify:` line saying
> exactly how it will be proven.
>
> **Exposure tags** (optional, for products with a public surface): `🌍` public-eligible · `🔒` internal-only
> (security, infra, logging, payments, data) — internal items must never leak to any user-facing list ·
> `⚖` needs ToS/Privacy review before release if it changes policy, data collection, billing, or user rights.
>
> ### Ordering
> Open work is ordered by **priority → ease → dependency count**: quick, unblocked wins first; then foundational
> work; then larger systems that depend on earlier pieces.
>
> ### The move rule
> **A completed *section* moves, not an item.** When a heading section holds no open items at all — every item
> `[x]`, none `[ ]`/`[~]`/`[?]` — move the whole section into [`TODO-done.md`](./TODO-done.md) under the date it
> was moved.
>
> An `[x]` inside a section still in progress is correct and stays. It records that one part is built while the
> unit is not, and that mix is the record of where the work stands. Moving a finished part out of an unfinished
> whole strips the whole of the context needed to finish it — which is why detection is at section level and not
> at item level.
>
> Two things break this silently, and neither is visible to a hook: **an open item written as prose with no
> marker** reads as finished, and **a heading that contradicts its own body**. Read the prose, not only the
> markers.
>
> `[?]` is a holding state — "looks done, not proven." It cannot graduate until its `→ verify:` passes (🤖) or
> its owner signs off (🙋). A wrong `[?]` costs one re-check; a wrong `[x]` buries an unverified claim in an
> archive nobody re-reads.
>
> Keep this file honest: if work stalls, mark it `[~]` and note why.

---

## 0. In-flight (current work)

<!-- What is actively being worked right now. Keep this short; move items down or to TODO-done as they settle. -->

- [~] {{CURRENT_ITEM}} — 🤖 — *what's happening now, and what's left.* → verify: `{{VERIFY_CMD}}`

## 1. Now (high priority, unblocked)

- [ ] [P] {{ITEM}} — 🤖 🔒 — short description. deps: none. → verify: `{{TEST_CMD}}`
- [ ] {{ITEM}} — 🙋 🌍 — needs a human to eyeball the result. deps: none. → verify: manual — {{HOW}}

## 2. Next (foundational, some dependencies)

- [ ] {{ITEM}} — 🤖 — depends on §1 item. deps: {{DEP}}. → verify: `{{TEST_CMD}}`
- [ ] {{ITEM}} — ⚖ 🌍 — touches policy/data; ToS/Privacy review before release. → verify: review + {{TEST_CMD}}

## 3. Later (larger systems, more dependencies)

- [ ] {{ITEM}} — 🤖 — needs §1 and §2 in place. deps: {{DEPS}}. → verify: `{{TEST_CMD}}`

## 4. Ideas / unscheduled

- [ ] {{IDEA}} — not yet scoped; promote into a numbered section when it's ready.
