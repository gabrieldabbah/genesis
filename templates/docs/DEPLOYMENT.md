# {{PROJECT_NAME}} — Deployment & Human Handoff

> **This is the handoff.** The AI has done everything it *can* do — built, tested, secured, and prepared
> the release — and now hands you the things that **only a human may do**: create accounts, mint and place
> real secrets, push the button on a deploy, point a domain. The overlord **defers these here and keeps
> building the rest** — it never stops the run mid-flight to ask, and it never deploys, pushes, or mutates a
> live system on its own (A24). Each item below was queued as a `🙋` task during the build and collected here.
> Every command below was prepared and dry-run-checked locally first (A14 — prove it locally before any
> remote call); your job is to supply credentials and authorize the irreversible steps.
>
> **Read first:** the secret rule in [`AGENTS.md`](../AGENTS.md) §6 — never commit, log, paste, or print a
> secret value; `.env.example` documents **names**, never values. This doc references key **names** only.

---

## What you (the human) must do — checklist

Work top to bottom; each box is a thing the AI cannot do for you. Do not skip a box because it "looks done."

- [ ] **Accounts & access** — create the accounts in §1 and confirm you can sign in to each.
- [ ] **Secrets** — generate and place every key **name** listed in §2, in `.env` *and* in the host's secret
  store. (The AI wrote the names into `.env.example`; you fill the values — never in git.)
- [ ] **Database** — provision the database, then run migrations + seed (§4) against it once.
- [ ] **First deploy** — run the per-host deploy (§3) to a **staging/preview** target first; authorize it.
- [ ] **Smoke checks** — run §5 against the deployed URL and read real output (A2) — green before promoting.
- [ ] **Domain & DNS** — point the domain and verify TLS (§6) *(can wait until staging is proven)*.
- [ ] **Promote to production** — only after staging is green; this is the second, explicit gate.
- [ ] **Know the rollback** — read §7 *before* you need it; confirm you can execute it.

> [!IMPORTANT]
> Two gates, not one: **authorize the staging deploy**, then **separately authorize production**. The AI
> stops at each. Nothing reaches production on a single keystroke.

## 1. Prerequisites & accounts to create

<!-- FILL: genesis fills this from the chosen hosting + service integrations (registry/*.yaml). Generic shape: -->

| You need | Why | Notes |
|---|---|---|
| A **`{{HOST}}`** account (the chosen host) | runs the app | the AI never creates billing accounts or accepts ToS for you |
| Host **CLI** installed + authenticated | deploys + reads status | `{{HOST_CLI}}` (e.g. `vercel` / `render` / `flyctl`) — the AI lists the install command; you run the login |
| A **database** (managed or self-hosted) | persistence | provider chosen in [`DECISIONS.md`](./DECISIONS.md); connection name `{{DB_URL_KEY}}` |
| A **git remote** you can push to | source of truth + CI | `{{REMOTE_URL}}` — pushing is a human gate |
| Each integration's account | features (payments, auth, mail, …) | one per selected `integrations/registry/*.yaml`; see §2 |

- **Authenticate the CLI yourself** (`{{HOST_LOGIN_CMD}}`). The sandbox treats the host CLI as
  network-touching and outward-mutating; the AI does not log in as you or hold your session.
- If the host CLI is **sandbox-unfriendly** (most are — see the integration's `sandbox_unfriendly_cli`
  flag), you run it in your normal shell; the AI prepares the exact arguments.

## 2. Secrets & environment — names only, you supply values

> [!WARNING]
> **Never paste a secret into chat, a commit, a log, or this file.** The AI cannot read `.env` and will not.
> You place values in **two** places: locally in `.env` (git-ignored), and in the **host's secret store** for
> the deployed app. They are not the same store — set both.

**Where each key lives** (the AI has already written the *names* into [`.env.example`](../.env.example)):

| Layer | Holds | How |
|---|---|---|
| Local `.env` | dev + the migration/seed step you run locally | copy `.env.example` → `.env`, fill values; never commit |
| Host secret store | the running app's runtime secrets | `{{HOST_SECRET_CMD}}` — e.g. `vercel env add`, `render` env group, `fly secrets set` |
| CI secrets | only what CI needs to deploy (a scoped deploy token) | your CI provider's encrypted secrets; **least-privilege scope** |

**Generate strong secrets locally** (do not invent weak ones; do not reuse across environments):

```bash
# a high-entropy app secret / session key (names: {{APP_SECRET_KEYS}})
openssl rand -base64 48
# a hex token where a provider wants hex
openssl rand -hex 32
# a UUID where one is called for
uuidgen
```

- **Place, don't print.** Pipe or paste into the secret store; do not `echo` the value into your shell
  history. To confirm a value is *set* (never its content): `[ -n "$SOME_KEY" ] && echo set` (A13).
- **Scope every token to least privilege** — a deploy token deploys, it does not own the account
  (`token-scope-least-privilege` is in each hosting integration's `security` list).
- **Rotate** anything that ever touched a log, a screen-share, or a paste buffer. Rotation is cheap; a leaked
  long-lived key is not.

<!-- FILL: genesis lists the exact env-key NAMES per selected integration here, grouped by service,
sourced from each registry entry's `env_keys`. Values are never shown. -->

## 3. Per-host deploy steps

Generic flow first; **genesis fills the host-specific commands from the chosen hosting integration's registry
entry** (`integrations/registry/{{HOST}}.yaml` — its `cli`, `verify`, and `notes` fields). Every host below is
a **human gate**: the AI prepares; you authorize and run the production step.

**Generic flow (any host):**

```bash
# 0. on `dev`, gate green (the AI did this): test-gate → /git-commit
# 1. build the release artifact locally and confirm it (A14)
{{BUILD_CMD}}
# 2. deploy to a STAGING / PREVIEW target first — never straight to prod
{{DEPLOY_STAGING_CMD}}
# 3. run the smoke checks (§5) against the staging URL — green before promoting
# 4. PROMOTE to production — a separate, explicit authorization
{{DEPLOY_PROD_CMD}}
```

<!-- FILL: genesis emits ONLY the block for the chosen host, from its registry entry. Examples of shape: -->

- **Vercel** — `vercel` (preview) → `vercel --prod`. Preview deploys are safe; **production deploys + domain
  changes are a human gate** (registry `notes`). Verify: *a preview deploy returns a healthy URL.*
- **Render** — prefer a **blueprint** (`render.yaml`) for reproducibility; production deploys are a human
  gate. Verify: *a service deploy reaches live status with a healthy health-check.*
- **Fly.io** — `fly deploy` to a **staging app** first; set runtime secrets with **`fly secrets set`**, not
  env files. Verify: *a deploy to a staging app returns a healthy URL.*

> [!NOTE]
> If the host CLI is sandbox-unfriendly, run the deploy in your own shell. The AI gives you the exact command
> and arguments; it does not execute the outward-facing deploy itself.

## 4. Database — migration & seed

Run **once per environment** (staging, then production), in order. Migrations are forward-only by default;
treat a destructive migration as its own gated task in [`PLAN.md`](./PLAN.md).

```bash
# point at the TARGET database (staging first), via its connection-string NAME, not an inline secret
export {{DB_URL_KEY}}=...        # from the host secret store / your password manager — not committed
{{MIGRATE_CMD}}                  # apply schema migrations (idempotent — safe to re-run; A9)
{{SEED_CMD}}                     # seed reference/lookup data ONLY — never seed prod with test fixtures
```

- **Back up before a production migration.** Take (or confirm the provider takes) a snapshot first; a
  migration you can't roll back is a gate, not a routine step.
- **Migrate staging, smoke-test, *then* production.** Same artifact, same migration, twice.
- **Seed is for reference data, not test data.** The hermetic test fixtures (see [`TESTING.md`](./TESTING.md)
  §4) never touch a real database.

## 5. Post-deploy smoke checks

The deploy is **not done until observed green** (A2). Run these against the **deployed URL**, read the real
output, and only then promote or call it live.

```bash
BASE={{DEPLOYED_URL}}            # the staging URL first, then the prod URL

# 1. health endpoint is up and reports healthy deps (the /health view from TESTING.md §7)
curl -fsS "$BASE/health"         # expect 200 + healthy db/queue status

# 2. the advertised happy-path entrypoint returns the right artifact (E2E/golden — TESTING.md §2)
{{SMOKE_CMD}}

# 3. version is the one you just shipped (no stale cache / wrong build)
curl -fsS "$BASE/health" | grep -q "$EXPECTED_VERSION" && echo "version ok"
```

- [ ] Health endpoint **200** and dependencies report healthy.
- [ ] One real user-facing flow works end-to-end against the live URL.
- [ ] The deployed **version** matches the commit you shipped.
- [ ] **No secret leaks** in build logs or error pages (`no-secrets-in-build-logs` — the host integration's
  `security` list); error responses don't echo internals.
- [ ] Logs are flowing to where you can read them (observability — `TESTING.md` §7); error rate is flat.

> If any box is red, **do not promote** — roll back (§7) and fix behind a green gate.

## 6. DNS & domain

Do this after staging is proven; it's the most visible, hardest-to-undo public change.

1. **Add the domain** to the host (`{{HOST}}`) and copy the records it tells you to create.
2. **Create the DNS records** at your registrar/DNS provider (CNAME/A/AAAA per the host's instructions).
3. **Wait for propagation**, then verify resolution and TLS:
   ```bash
   dig +short {{DOMAIN}}
   curl -fsSI https://{{DOMAIN}}/health     # expect 200 over HTTPS, valid cert
   ```
4. **Confirm the certificate** is issued and auto-renewing (most hosts manage this; verify, don't assume).
5. Update any provider that pins the domain (OAuth redirect URLs, webhook endpoints, CORS allow-list, the
   network allow-list if the project runs in `allow-list` posture).

## 7. Rollback

Know this **before** you deploy. The fastest safe recovery is almost always **re-promote the last known-good
release**, not a hotfix forward.

| Situation | Action |
|---|---|
| Bad app deploy | re-promote the previous release: `{{ROLLBACK_CMD}}` (e.g. `vercel rollback`, redeploy a prior Render deploy, `fly releases` → redeploy a prior version) |
| Bad migration | restore the pre-migration **snapshot/backup**, then re-deploy the matching app version — schema and code roll back **together** |
| Leaked secret | **rotate the key immediately** (§2), redeploy with the new value, invalidate the old in the provider |
| Can't diagnose live | roll back to known-good first, **then** debug on staging — never debug forward in production |

- **Rollback is also a human gate** — it mutates a live system. The AI can prepare the exact command; you run
  it.
- After any rollback, write the cause + fix into [`DECISIONS.md`](./DECISIONS.md) and add a **regression
  test** (red first) before re-deploying (P9, `TESTING.md` §2).

---

> Fill the placeholders at handoff — `{{HOST}}`, `{{HOST_CLI}}`, `{{HOST_LOGIN_CMD}}`, `{{HOST_SECRET_CMD}}`,
> `{{BUILD_CMD}}`, `{{DEPLOY_STAGING_CMD}}`, `{{DEPLOY_PROD_CMD}}`, `{{MIGRATE_CMD}}`, `{{SEED_CMD}}`,
> `{{DB_URL_KEY}}`, `{{DEPLOYED_URL}}`, `{{SMOKE_CMD}}`, `{{ROLLBACK_CMD}}`, `{{DOMAIN}}`, `{{APP_SECRET_KEYS}}`,
> `{{REMOTE_URL}}` — drawn from the chosen hosting integration's registry entry and `DECISIONS.md`. Then
> `grep -rn "{{" docs/DEPLOYMENT.md` must be empty. Keep it secret-value-free: names only.
