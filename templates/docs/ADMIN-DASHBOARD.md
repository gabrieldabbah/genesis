# {{PROJECT_NAME}} — Admin Dashboard & Structured Logging Spec

> **Every SaaS this project is, ships an admin dashboard.** Not optional, not "later." If the archetype is
> **SaaS**, this document is the **acceptance contract** for an auth-gated operator surface and the
> **structured-logging standard** that runs project-wide. It is *not* genesis's own build-control dashboard
> (that's a window onto the build) — this is a **product feature** of the app being built, the place an
> operator inspects and steers the live system. Verification means *observe the world* (A2); an admin
> dashboard + honest logs are what make the world observable, so the rest of [`TESTING.md`](./TESTING.md)
> can actually watch it.
>
> Same discipline as everything else: **auth-gated, least-privilege (A13)**, every shown fact has a
> **source** (A15) — version, uptime, queue depth are *read from the running system*, never hardcoded — it
> **degrades** to a plainer correct view when a panel's data source is down (P3/P4), and every panel is a
> **delivered artifact** held to the project's reference (A18). A confusing or lying admin panel is a defect.

---

## 0. Scope & the one rule

If `archetype = SaaS`, the app **must** expose an admin area meeting every section below before it is
"done." If the project is *not* a SaaS (CLI, library, batch tool), this whole document is `n/a` **except
§9 (Logging standards), which applies to every project regardless of archetype.** Structured logging is
universal; the dashboard is SaaS-only.

The admin area is a **separate, role-gated surface** — a distinct route tree (e.g. `/admin/*`), a distinct
auth check, ideally a distinct render path — never "the normal app with extra buttons for some users." It
reads and steers; it is **not** a second public API and it is **not** a backdoor (A13).

## 1. Auth gate & least privilege *(A13)*

- **Every** admin route is behind authentication **and** an explicit role/permission check — not "logged in"
  but "is an admin/operator with this capability." Default deny: an unknown or under-privileged caller gets
  the same `404`/`403` as a stranger, with no leak of what exists behind the gate.
- **Capability-scoped, not binary.** Distinguish at minimum *read* (view/search), *write* (edit entities,
  toggle flags), and *dangerous* (delete, impersonate, rotate config). Map roles → capabilities; check the
  capability at the action, not just at the page.
- **Re-authenticate / step-up** for dangerous actions (delete, role change, secret rotation, impersonation).
- **No secret ever rendered.** The admin UI shows that a key is *set*, its name, masked tail, last-rotated
  date — never the value (A13). It does not read `.env`.
- Every admin session and every admin action is **logged to the audit log** (§7) with the actor's id.

## 2. Entity management — view / search / edit core entities

The operator can find and fix data without a database client:

- **List + search + filter** each core entity (users, organizations/tenants, subscriptions, the project's
  domain objects). Server-side pagination and search — never "load 100k rows into the browser."
- **Detail view** of a single entity with its relations and recent activity.
- **Edit / create / soft-delete** through the *same validated domain layer* the app uses — admin writes
  **parse, don't validate** at the boundary (A8) and respect every invariant; no raw SQL path that bypasses
  domain rules. An illegal edit is rejected with a legible reason, not silently coerced.
- **Every mutation writes an audit-log entry** (§7): who, what entity, before→after (PII-redacted per §9).
- **Impersonation** (if offered) is explicit, time-boxed, banner-visible to the operator, and audited as its
  own action — never silent.

## 3. System Status panel *(A15 — every fact has a source)*

A single panel that reads **live** from the running process — not constants baked at build time except where
noted. Each field is sourced:

| Field | Source | Notes |
|---|---|---|
| **App version** | package/build metadata | semver shown to the operator |
| **Build hash / commit** | `GIT_SHA`/`BUILD_ID` injected at build | short sha, links to the commit if VCS is known |
| **Built / deployed at** | build metadata | absolute timestamp |
| **Server time** | the process clock now | so an operator spots clock skew |
| **Uptime** | now − process start | human-readable + seconds |
| **Environment** | `APP_ENV`/`NODE_ENV`/… | `dev`/`staging`/`prod` — **color-coded; prod is unmistakable** |
| **Instance / host** | hostname / pod / region | which replica answered |
| **Dependency health** | live probes (§8) | DB, cache, queue, third-party — green/amber/red |

Build-time facts (version, sha) are injected at build, **not guessed** — wire `{{BUILD_VERSION_VAR}}`,
`{{GIT_SHA_VAR}}` so `grep -rn "{{" .` stays empty. If a source is unavailable, the field shows `unknown`
with a muted style — it **degrades**, it does not fabricate (P3, A15).

## 4. Live refresh

The dashboard reflects current state without a manual reload. Pick the lightest mechanism that meets the
need and **state which in [`DECISIONS.md`](./DECISIONS.md)**:

- **Polling** — simplest; a bounded interval with backoff; fine for status/health/queue counts.
- **SSE** — one-way server→client stream for live logs / activity feeds.
- **WebSocket** — only when the operator also pushes (live console, interactive controls).

Requirements regardless of mechanism: a visible **last-updated / freshness** indicator; **graceful
degradation** to manual refresh if the live channel drops (P3) — stale is labeled stale, never shown as
fresh; **backpressure / rate limits** so a chatty feed can't melt the browser or the server; the live
channel is **auth-gated** exactly like the rest of the admin area.

## 5. Feature flags & config toggles

- **List every flag/toggle** with its current value, scope (global / per-tenant / per-user / % rollout),
  who last changed it, and when.
- **Flip a flag from the UI**, with the effect described before commit; the change takes effect without a
  redeploy and is **audited** (§7). Dangerous flags (billing, data retention, kill-switches) require step-up.
- Config edited here is the **same config the app reads at runtime** — no shadow store that drifts. Secrets
  are referenced by **name only**, never editable-as-plaintext in the UI (A13).
- A flag has a **safe default** so a missing/unreadable flag degrades to a known-good behavior (P3/P4).

## 6. User & role management

- View users; assign/revoke **roles**; see each role's **capabilities** (the §1 map, made visible).
- Invite / disable / reset (trigger a reset flow — never display or set a password); manage org/tenant
  membership for multi-tenant apps.
- **Self-lockout guard:** an admin cannot remove the last admin or strip their own critical capability
  without an explicit confirm — an illegal-state guard (A8), not a runtime hope.
- Every role/permission change is **audited** with actor, target, before→after.

## 7. Audit log of admin actions *(distinct from §9 application logs)*

A **separate, append-only** record of *who did what in the admin area* — the accountability trail, not the
app's operational logs. Every privileged action (entity edit/delete, flag flip, config change, role change,
impersonation start/stop, export, login to admin) writes one entry:

```
actor_id · actor_role · action · target_type · target_id · before → after (redacted) · ip · request_id · ts
```

- **Append-only / tamper-evident:** entries are never edited or deleted from the UI; ideally write-once
  storage or a hash chain so tampering is detectable.
- **Searchable & filterable** by actor, action, target, date range; **exportable** with the same options as
  §9 (CSV / JSON / NDJSON, date-range).
- **Redacted** to the §9 standard — an audit entry records *that* a field changed and a safe summary, never a
  secret/PII value in the clear.
- Correlated to application logs via the shared **`request_id`** (§9) so an audited action can be traced into
  the operational logs end to end (provenance — A15/D6).

## 8. Health checks & dependency probes

- **`/health` (liveness)** — the process is up; cheap, unauthenticated-OK, no dependency calls.
- **`/ready` (readiness)** — dependencies the app *needs to serve* (DB, cache, queue, critical third parties)
  are reachable; returns per-dependency status, used by the orchestrator and surfaced in §3.
- The Status panel renders each dependency green/amber/red with **last-checked time** and **latency**; a
  failing probe is **amber/red, never hidden** — and the panel degrades to "unknown" rather than a false
  green if the probe itself fails (P3).
- Probes are **bounded** (timeouts) so a hung dependency can't hang the health endpoint.

## 9. Background jobs & queue visibility

- **Queue depth / backlog** per queue, **in-flight**, **scheduled**, **failed / dead-letter** counts —
  read live (a §3-style sourced fact).
- **Inspect a job:** type, payload (PII-redacted per below), attempts, last error, timing.
- **Operator controls** (capability-gated, step-up for destructive): **retry** a failed job, **requeue** the
  dead-letter queue, **cancel/pause** a queue. Every control action is **audited** (§7).
- **Stuck-job / oldest-pending** surfacing so a wedged queue is obvious before it's an incident.
- If the project has no queue, this section is `n/a` — say so explicitly, don't fake a panel.

---

## 10. Logging standards — high-quality structured logging *(applies project-wide, A13, A15)*

Logs are **evidence a test or operator reads** (A2), not decoration. This standard is **universal** — it
holds in every project genesis builds, SaaS or not, and the admin dashboard's log viewer/exporter is just a
window onto it.

- **Structured, machine-readable.** Every log line is a single **JSON** object (one event per line — NDJSON
  on the wire), never `print`/free-text. Use the stack's structured logger (`{{LOGGER}}` — e.g. pino /
  structlog / zerolog / `tracing`); pick it in [`DECISIONS.md`](./DECISIONS.md).
- **Standard fields on every line:** `ts` (ISO-8601, UTC), `level`, `event` (a stable string key, not a
  sentence), `request_id` / `correlation_id`, `actor_id` (if any), `service`, `env`, plus typed context.
  Messages are events with context — `{"event":"user.login.failed","reason":"bad_password","user_id":…}` —
  **not** interpolated prose.
- **Honest levels.** `error` = a real failure needing attention; `warn` = degraded-but-handled; `info` =
  notable business/lifecycle event; `debug` = developer detail (off in prod by default). No crying-wolf
  `error`s; no business events buried at `debug`.
- **Correlation / request IDs.** A request id is generated (or accepted from a trusted upstream header) at the
  edge and **threaded through every component, job, and downstream call** so one operation is traceable end
  to end — and ties application logs to the §7 audit log (provenance — A15/D6).
- **PII / secret redaction is mandatory and central (A13).** A **deny-by-default redaction layer** scrubs
  secrets and PII (passwords, tokens, keys, full card/SSN, email/phone per policy, auth headers) **before**
  anything is written — never rely on each call site to remember. Log the **fact** a value is set, never the
  value. Log **field names**, not secret contents. The redactor is **unit + property tested** ("no known
  secret pattern survives serialization" — A2) and a redaction regression gets a failing test first (P9).
- **Determinism & cost.** No secret in a URL/query that gets logged; sample or rate-limit high-volume events;
  keep logs cheap enough to leave on in prod. Inject the clock for `ts` so log assertions are testable (A10).
- **Retention & policy.** State retention windows; logs containing personal data fall under the project's
  ToS/Privacy posture (tag related TODO items `⚖`).

### Export options *(from the admin log viewer)*

The admin log viewer (and the §7 audit log) **export** the current filtered view:

- **Formats: CSV · JSON · NDJSON.** NDJSON is the canonical streaming format (one JSON object per line,
  matching the wire format); CSV is for spreadsheets; JSON is a single array for tooling.
- **Date-range filter is required** on every export — plus filter by level, `event`, `request_id`, actor.
- Exports are **redacted to the same standard** as live logs — an export is not a redaction bypass.
- Large exports **stream** (don't buffer the world into memory) and are **auth-gated + audited** (exporting
  logs is itself a privileged admin action, §7).

---

## 11. Definition of Done (SaaS admin dashboard)

Ties to the constitution's §VII invariants. The admin dashboard is done only when, **observed** (A2):

- [ ] **every** admin route is auth- **and** role-gated; default-deny verified by a real unauthorized request
  returning `403`/`404` (A13);
- [ ] core entities are **searchable, viewable, editable** through the validated domain layer, every mutation
  audited (A8 / §7);
- [ ] the **System Status** panel reads version, build hash, server time, uptime, env, dependency health
  **live from the running system** — no fabricated facts (A15 / §3);
- [ ] **live refresh** works and **degrades** to manual on channel loss, with stale labeled stale (P3 / §4);
- [ ] **feature flags / config toggles** flip from the UI, take effect without redeploy, are audited, and have
  safe defaults (§5);
- [ ] **user/role management** works with a last-admin / self-lockout guard (A8 / §6);
- [ ] an **append-only audit log** records every privileged action, searchable + exportable (§7);
- [ ] **`/health` + `/ready`** exist and surface per-dependency status (§8);
- [ ] **background job/queue** depth, failures, and gated controls are visible (§9);
- [ ] **structured JSON logging** with standard fields, honest levels, correlation IDs, and a **tested
  central redaction layer** is in place project-wide; **CSV/JSON/NDJSON export with date-range** works and is
  itself redacted + audited (A13, A15 / §10);
- [ ] the admin area has its **README** and the panels meet the project's reference (A18);
- [ ] the full **Tier-B gate is green** via `test-gate` (A2, A24).

> Fill the placeholders at bootstrap: `{{LOGGER}}`, `{{BUILD_VERSION_VAR}}`, `{{GIT_SHA_VAR}}`. Adapt panels
> and controls to the stack and the domain; **keep the predicates.** Then `grep -rn "{{" .` must be empty.
