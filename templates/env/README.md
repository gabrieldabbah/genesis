# The `.env` family

The environment-variable contract for a genesis project. Genesis generates this family at Phase 1 (the
skeleton) and fills it in at Phase 4, tailored to the chosen stack and the `env_keys` of every integration you
select (each from [`integrations/registry/*.yaml`](../../integrations/registry/)). It is the **single place**
variable *names* are documented; real values never live in the repo.

> [!IMPORTANT]
> **🔒 Never read, `cat`, print, or echo `.env` (or any `.env.*` with real values).** Per
> [`AGENTS.template.md`](../AGENTS.template.md) §6, to check a value only test presence
> (`[ -n "$VAR" ] && echo set`), never the value. Only application code loads `.env`, at runtime, and must
> never log a secret. The sandbox enforces this at both the Bash and Read-tool layers.

## The files

| File | Committed? | Role |
|---|:---:|---|
| [`.env.example`](.env.example) | ✅ **yes** | The canonical list of every variable **name** with a one-line comment and an **empty** value. The contract — copy it to start. Contains no secrets. |
| `.env.development` | ❌ git-ignored | Local development values (test-mode credentials). Loaded when `NODE_ENV=development`. |
| `.env.production` | ❌ git-ignored | Production-shape reference. In real deploys the values live in the host's secret manager, not on disk. Loaded when `NODE_ENV=production`. |
| `.env` | ❌ git-ignored | Your active local secrets. Whatever the app reads by default. |

**Only `.env.example` is ever committed.** Everything else (`.env`, `.env.development`, `.env.production`,
`.env.local`, …) is git-ignored — see [the gitignore rule](#gitignore) below.

## Getting started

```bash
cp templates/env/.env.example .env     # start from the committed contract
# then fill the empty values in .env on your machine — never commit it
```

Keep the three files in lockstep: **every key in `.env.example` exists in the others.** When genesis adds an
integration it appends that service's `env_keys` to all of them at once, so the contract never drifts.

## Filling secret / random keys

Some keys must be **random**, not chosen. Each such key carries its generation command in a comment directly
**above** it, e.g.:

```bash
# generate: openssl rand -hex 32      (alt: openssl rand -base64 32)
SESSION_SECRET=
```

Run the command and paste the output into your **local** file (never the committed `.env.example`):

| Key | Generate with | Note |
|---|---|---|
| `SESSION_SECRET` | `openssl rand -hex 32` | alt: `openssl rand -base64 32` |
| `JWT_SECRET` | `openssl rand -hex 32` | alt: `head -c 32 /dev/urandom \| base64` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` | must decode to 32 bytes for AES-256 |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Next.js / next-auth only — delete if unused |

Rules: **development and production secrets must be different** (never copy a dev secret to prod); generate a
production secret **once**, store it in the platform's secret manager, and **rotate** it on any suspected
exposure. Use **test-mode** integration keys in development and **live** keys only in production — and going
live is a human gate.

## .gitignore

The project's `.gitignore` must ignore **all** `.env*` files **except** the committed example:

```gitignore
# secrets — never commit anything but the example
.env*
!.env.example
```

This is the inverse-match idiom: ignore the family, then re-include the one safe file. Verify nothing secret is
tracked with `git check-ignore .env .env.development .env.production` (each should print, meaning ignored) and
`git ls-files | grep -E '^\.env'` (should show only `.env.example`).
