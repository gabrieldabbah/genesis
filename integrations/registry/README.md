# `integrations/registry/` — one file per service

Each `<id>.yaml` is the whole of what genesis knows about a service: the domains it calls, the names of the
environment variables it needs, its CLI, the documentation to trust, its security checklist, the test that
proves it works, and optionally a `reference:` pointing into
[`../references/`](../references/). Picking a service during setup applies all of it at once.

The field-by-field schema, and what each field is wired into, is in [`../README.md`](../README.md).

| id | Category |
|---|---|
| `stripe` | payments |
| `supabase` | backend + database |
| `clerk` | auth |
| `resend` | email |
| `cloudflare-r2` | storage |
| `sentry` | observability |
| `openai` · `google-gemini` | AI / media generation |
| `vercel` · `fly` · `render` | hosting |

**Values never appear here — only names.** `env_keys` lists variable names so genesis can write
`.env.example` and the secret-deny rules; the values live in the project's git-ignored `.env` or its host
environment.

**Nothing in this repository dials these services.** Every domain listed is data for a future scaffolded
project to act on, not a connection genesis makes.

Adding one is a pull request, not a fork: drop a new file matching the schema. Never invent a domain, key name
or version — verify each against the provider's official documentation.
