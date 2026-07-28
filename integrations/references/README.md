# `integrations/references/` — domain gotchas, read when they apply

One file per domain that has failures a provider's own documentation will not warn you about: money moving
twice on a redelivered webhook, a migration whose `down` was never run, a deploy path with no way back.

A service in [`../registry/`](../registry/) opts into one with a `reference:` field. During a build, the
reference is read at the moment that integration's items are built. **Nothing here is copied into a scaffolded
project** — these are read where they apply, not installed as standing instruction.

| File | Read when building |
|---|---|
| [`payments.md`](payments.md) | a payments provider — Stripe today |
| [`data-migration.md`](data-migration.md) | schema and migrations — Supabase today |
| [`deploy.md`](deploy.md) | deploy configuration — Vercel, Fly, Render today |

These began as dispatchable specialist agents. The knowledge was worth keeping; the dispatch mechanism welded
to it was not, so each became a document instead.

**Adding one:** write `<name>.md` stating the properties that domain's output must have, weighted toward the
ones that fail *quietly*, then point at it from a registry file's `reference:`. Schema and conventions:
[`../README.md`](../README.md).
