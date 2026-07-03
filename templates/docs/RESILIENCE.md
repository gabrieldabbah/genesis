# {{PROJECT_NAME}} — Resilience, Fallbacks & Degradation

> **A correct plainer output beats a broken clever one.** When a dependency is slow, down, rate-limited, or
> wrong, the system must still return a **true, schema-valid** result — never a crash, never an invented one.
> This is the constitution's **degrade law** (A16 — `ground → generate → verify → degrade`) and the
> total-function discipline (A2/A9) made operational: every effectful edge (A7) has a defined behavior for
> *every* failure, and that behavior is **tested**, not hoped. This doc is the project's fallback policy: the
> provider chains, the cache, the offline fake, the retry/timeout/circuit-breaker rules, the degradation
> ladder — and the **broad test scope** that proves each one. **If this project has no external dependency or
> generative component, most of this is `n/a`** — the whole core is pure (A7) and "resilience" reduces to
> totality (A9). Keep the predicate; drop the apparatus you don't need.

---

## 1. Why this is owed — degradation is a law, not a feature *(A2, A9, A16)*

A function that throws when its provider hiccups is **partial**, not total — and A2 demands total correctness
over the admissible domain. A provider being down is *inside* the admissible domain: it is an ordinary input
to the effectful shell, not an exceptional one. So every external call has a **defined, tested result** for
down / slow / rate-limited / malformed, and the worst of those results is still **correct and useful** — a
last-known-good answer, a deterministic computation, or an honest "unavailable, retry later" — never a 500,
never a fabricated number (A15 — every shown fact has a source; a guessed fallback value has none).

> **One-line rule:** the failure path is part of the spec `(P,Q)`, not an afterthought. If you can't state
> what the system returns when the primary provider is down, the feature isn't designed yet (A4).

## 2. Provider fallback chains *(A6, A16, D5)*

For any capability served by an external/generative provider, declare an **ordered chain**: a **primary**,
then **fallbacks** tried in order, terminating in a **deterministic floor** (§5) that always succeeds. The
chain is **configuration, not code** — selected via env and documented here, so swapping providers needs no
edit to logic (the seam stays typed; A6/D5).

| Capability | Primary | Fallbacks (in order) | Deterministic floor |
|---|---|---|---|
| **Text / synthesis** | `{{PRIMARY_LLM}}` (e.g. Anthropic Claude) | `{{FALLBACK_LLMS}}` (e.g. OpenAI → Gemini) | cached last-known-good → templated/extractive result |
| **Image / media** | `{{PRIMARY_MEDIA}}` | `{{FALLBACK_MEDIA}}` | cached asset → placeholder/no-op with a flag |
| **{{CAPABILITY}}** | `{{PRIMARY_PROVIDER}}` | `{{FALLBACK_PROVIDERS}}` | `{{DETERMINISTIC_FLOOR}}` |

```bash
# .env (names only — never values; see AGENTS.md §6)
PRIMARY_LLM={{PRIMARY_LLM}}              # the provider id tried first
FALLBACK_LLMS={{FALLBACK_LLMS}}          # comma-separated, in order, e.g. "openai,gemini"
LLM_OFFLINE_MODE=false                   # true ⇒ deterministic fake only, no network (§4)
PROVIDER_TIMEOUT_MS={{TIMEOUT_MS}}       # per-attempt deadline (§6)
PROVIDER_MAX_RETRIES={{MAX_RETRIES}}     # attempts per provider before advancing the chain (§6)
```

**Rules.** The chain is **ordered and total** — it ends in a floor that cannot fail (§5), so the function is
total (A9). **Equivalence at the seam:** every provider in a chain must satisfy the *same* output contract —
the schema/critic check (§3, A16) is provider-agnostic, so a fallback's output passes the **same** validation
the primary's did. **Cost/quality ordering** is intentional and logged: a cheaper or lower-quality fallback is
a deliberate trade, recorded in [`DECISIONS.md`](./DECISIONS.md). **Never silently** swap providers without a
structured log line (§7) — a fallback firing is a signal, not a secret.

## 3. Verify every provider's output the same way *(A16, A17, P3)*

A fallback is only safe if its output is held to the **same** bar as the primary's. Each chain runs the
constitution's pipeline, **per attempt**:

```
ground → generate(provider_i) → verify(schema + critic) → on reject: try provider_{i+1} → … → degrade(floor)
```

- **Schema-constrain** the request and **parse, don't validate** the response at the seam (A8) — a malformed
  provider response is a *reject*, advancing the chain, not a crash.
- The **critic / eval** check (A17) is the same for every provider — grounded, schema-valid, no invented
  facts. A provider that returns confidently-wrong output is treated as a failure and skipped.
- The **floor** (§5) is reached only when every provider is rejected or unreachable; it is deterministic and
  always passes its own contract.

## 4. Deterministic fake / offline mode — fixtures *(A7, A10)*

A first-class **offline mode** replaces every external provider with a **deterministic fake** that returns
recorded fixtures. This is not test-only scaffolding — it is the **outage floor** and the **default test
backend**, gated by one env flag (`{{OFFLINE_FLAG}}` / `LLM_OFFLINE_MODE`).

- **Same interface, recorded answers.** The fake implements the exact provider seam (A6) and replays fixtures
  keyed by a hash of the (grounded, normalized) request — same input ⇒ same output (A10), zero network.
- **Fixtures are evidence, captured intentionally.** Record real provider responses once, scrub any
  secret/PII (A13), commit them as golden fixtures, and review the diff when regenerated. A fixture is a
  golden file (TESTING §6), not a hand-wave.
- **Tier B runs offline by default** (TESTING §3): the PR-gated suite hits **no live provider** — it exercises
  the fake plus injected failures (§8). Live-provider checks are a **separate, opt-in** Tier-A lane behind a
  flag, never on the gate (so the gate stays deterministic and free — A10, no network nondeterminism).
- **Outage parity.** Because offline mode *is* the deepest fallback, an outage degrades to exactly what the
  tests already cover — no untested path is reached in production.

## 5. The degradation ladder — graceful, correct floors *(A16, A18, A20)*

Degrade **down a ladder of correctness**, never off a cliff. Each rung is a **complete, true** result; lower
rungs trade richness for certainty, and the bottom rung **cannot fail**.

| Rung | Result | When |
|---|---|---|
| **0 — full** | primary provider, verified, fresh | normal |
| **1 — fallback provider** | a chain fallback, **same contract** verified (§2/§3) | primary down / rejected / rate-limited |
| **2 — cached / last-known-good** | the last **verified** response for this input, served from cache, **labeled stale** | all providers unreachable; cache warm |
| **3 — deterministic plainer output** | a templated / extractive / computed result with **no generation** — true by construction, every fact sourced (A15) | cache cold; offline mode |
| **4 — honest unavailable** | a typed "unavailable, retry later" with a correlation id — **never** a crash, never a fabricated value | even the floor's inputs are missing |

Degradation is **visible, not silent** (A18/A20): the response carries which rung served it (a `degraded`
flag / `source: cache|fallback|deterministic`), the UI labels stale or plainer output honestly, and the event
is logged (§7). **Trust over polish** — a correct plain answer that says so beats a rich answer that might be
wrong (A20).

### Cache / last-known-good *(C3, A10)*

- Cache **verified** results keyed by input hash (C3 — cache the pure result, never the effectful call's side
  effects). Store the timestamp and the source rung so rung 2 can label staleness.
- A cache entry is only ever a value that already **passed verification** (§3) — never an unvalidated provider
  response. TTL and max-staleness are config (`{{CACHE_TTL}}`); past max-staleness, prefer rung 3 over a lie.

## 6. Retries, timeouts & the circuit breaker *(A7, A14)*

Every external call is wrapped — these live in the **shell** (A7), never the pure core, and are injected so
tests can drive them (A10).

- **Timeout (always).** Every attempt has a deadline (`PROVIDER_TIMEOUT_MS`). A hung provider is a failure —
  advance the chain; never block the request indefinitely.
- **Retry with backoff + jitter.** Retry only **idempotent/transient** failures (network, 429, 5xx) up to
  `PROVIDER_MAX_RETRIES`, with **exponential backoff + jitter** to avoid thundering herds. **Do not** retry
  non-retryable errors (4xx auth/validation) — advance or fail fast. Respect a `Retry-After` header when given.
- **Rate-limit aware.** On 429/quota, back off per the provider's signal, then advance to the next provider
  rather than hammering — a rate-limited primary should fail *over*, not *retry forever*.
- **Circuit breaker.** Per provider: after `{{BREAKER_THRESHOLD}}` consecutive failures, **open** the circuit
  for `{{BREAKER_COOLDOWN}}` — skip that provider entirely (straight to the next rung) until a **half-open**
  probe succeeds. This stops a dead provider from adding latency to every request and gives it room to recover.
- **Budget the whole chain.** The end-to-end deadline bounds *all* attempts across *all* providers, so a slow
  chain can't blow the request's overall latency budget — when the budget is spent, drop to the cache/floor.

## 7. Observability — a fallback firing is a signal *(A2, A13, A15)*

Resilience is invisible until something breaks, so it must be **observable** (TESTING §7).

- **Log every degradation as a structured event** — which provider was tried, why it failed (timeout / 429 /
  reject / breaker-open), which rung ultimately served, and the correlation id (TESTING §7). **Never log a
  secret or the provider key** (A13) — log the *fact* and the key **name**, never the value.
- **Surface live state** on the health/admin view (TESTING §7): per-provider breaker state (closed/open/
  half-open), recent fallback rate, cache hit/stale rate, last-known-good ages. A spike in fallback rate is an
  alert, not noise.
- **Provenance survives degradation** (A15): a rung-3 deterministic result still carries the source of every
  fact it shows; degrading **never** strips sourcing.

## 8. Test scope is BROAD — every path, not just the happy one *(A2, P9, A16)*

> This is the heart of the doc. A resilience feature whose **fallback was never exercised** is `⊤` — it proves
> nothing (P9). The `test-gate` (TESTING §5) must cover **all** of the following; a green suite that only
> walked the happy path is **not** done.

| Must be tested | What it proves | Constitution |
|---|---|---|
| **Happy path** | rung 0 — primary returns, verifies, serves | A2 |
| **Each fallback path** | rung 1 — with the primary forced to fail, **each** provider in the chain takes over and its output passes the **same** contract (§3) | A16, A6 |
| **Degraded / offline mode** | rung 3 — offline flag on, deterministic floor returns a correct plainer result with no network (§4/§5) | A16, A10 |
| **Cache / last-known-good** | rung 2 — providers down + warm cache ⇒ stale-labeled correct result; past max-staleness ⇒ drops to rung 3, never a lie (§5) | C3, A20 |
| **Injected timeout** | a hung provider hits the deadline and advances the chain (§6) | A7 |
| **Injected rate-limit (429)** | back-off + fail-over fires; no infinite retry; `Retry-After` honored (§6) | A7 |
| **Injected malformed / wrong output** | a schema-invalid or critic-rejected response is treated as failure and the chain advances (§3) | A8, A17 |
| **Circuit breaker** | N consecutive failures **open** the circuit; the provider is skipped; a half-open probe **closes** it on recovery (§6) | A7 |
| **Floor is total** | with **every** provider unreachable and cache cold, the function still returns a valid result (rung 3/4) — **never throws** | A2, A9 |
| **Degradation is visible** | the served rung is reflected in the response flag/label and logged (§5/§7) | A18, A20 |

**How:** inject the failures — the seam (A6) lets a test substitute a fake provider that times out, 429s,
returns garbage, or stays down. **Property-test the chain** (TESTING §2): over a generated permutation of
{up, slow, 429, malformed, down} per provider, the invariant is **"always returns a contract-valid result,
never throws"** (A2/A9), and a counterexample shrinks to the minimal failing combination. **Seed it** (A10) so
a failure reproduces. Each assertion is **seen red before green** (P9). These tests run in **Tier B, offline**
(§4) — deterministic, no live provider, on the gate.

## 9. Definition of Done for resilience work *(ties to TESTING §8, AGENTS §10)*

A unit of fallback/degradation work is done only when:

- [ ] every external capability has a **declared chain** ending in a **deterministic floor** (§2), selected via
      documented env (`PRIMARY_LLM` / `FALLBACK_LLMS` / offline flag);
- [ ] every provider in a chain passes the **same** schema/critic contract (§3 / A16);
- [ ] **offline mode** returns deterministic fixtures with **no network** and is the **default test backend** (§4);
- [ ] the **degradation ladder** is implemented, each rung is a correct result, the bottom rung **cannot fail**,
      and the served rung is **visible** (flag/label/log) (§5/§7);
- [ ] timeouts, backoff+jitter retries, rate-limit fail-over, and the **circuit breaker** wrap every call (§6);
- [ ] the **broad test scope** (§8) is green via `test-gate` — happy path **+ each fallback + degraded/offline +
      injected timeout/429/malformed + breaker + total floor** — every assertion **seen red first** (P9);
- [ ] no secret/key value is ever logged; every shown fact keeps its source through degradation (A13, A15).

> Adapt providers and commands to the stack; **keep the predicates.** Fill the placeholders at bootstrap:
> `{{PRIMARY_LLM}}`, `{{FALLBACK_LLMS}}`, `{{PRIMARY_MEDIA}}`, `{{FALLBACK_MEDIA}}`, `{{OFFLINE_FLAG}}`,
> `{{TIMEOUT_MS}}`, `{{MAX_RETRIES}}`, `{{CACHE_TTL}}`, `{{BREAKER_THRESHOLD}}`, `{{BREAKER_COOLDOWN}}`,
> and the `{{CAPABILITY}}`/`{{*_PROVIDER}}` rows. Then `grep -rn "{{" .` must be empty.
