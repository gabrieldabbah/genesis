# {{PROJECT_NAME}} — Testing & Verification

> **All development is gated on tests.** Nothing is *done* until its postcondition `Q` was **observed** — the
> real check run, the real output read (A2). A green suite that was never seen red proves nothing (P9). This
> doc is the project's testing contract: the **kinds** of tests and when each is owed, the **two tiers**, the
> **hermetic infrastructure** (Docker for real databases/services), the **gate** that must pass before any
> commit, and the **observability** (logging + a health/admin view) that lets verification actually watch the
> world. The keep-current routine that *runs* on top of this lives in [`MAINTENANCE.md`](./MAINTENANCE.md).
>
> Run by the **`test-gate`** skill: it brings up infra, runs the battery, reads the output, and **blocks the
> commit on any red.** Closing ritual: **`test-gate` (green) → `/git-commit` → `/generate-pr`**.

---

## 1. Why this is cheap here — the functional core *(A7, A8, A9, P6, P7)*

Testability is **bought by purity**, not bolted on. The constitution's discipline is what makes a small test
suite sufficient:

- **Pure, total core; effects at the edge (A7).** Business logic is referentially transparent over its domain
  — same input ⇒ same output — so it is tested by plain value-in/value-out assertions, no mocks, no clock, no
  network. Effects (I/O, time, randomness, DB, spend) live in a thin shell and are *injected*, so the shell is
  the only place that needs heavier integration tests.
- **Make illegal states unrepresentable (A8/P7).** Every bad state the *type* forbids is a test you never have
  to write — the compiler discharges it. Prefer a type change over a validation; then delete the now-dead
  runtime check (C2). Push obligations into types: fewer tests, stronger guarantees.
- **Totality, exhaustiveness, idempotence (A9).** Total functions and exhaustive matches mean no untested
  fallthrough; idempotent setup (`f ∘ f = f`) means the test harness can run bootstrap twice safely.
- **Inject the clock and the seed (A10/P6).** Determinism is a feature: a function that reads wall-clock time
  is not a function of its arguments and cannot be reproducibly tested. Pass time and randomness in.

> **One-line rule:** maximize the pure, total core (cheap, exhaustive unit + property tests); minimize the
> effectful shell (a few hermetic integration tests at the edge). The seam between them (A6/D5) is contract-tested.

## 2. The kinds of tests — what each proves, when it's owed

Adapt the example tools to the project's stack; **keep the predicate.** Each test exists to discharge a
specific obligation — write the kind the obligation calls for, not the kind that is easy.

| Kind | What it proves | When it's **owed** | Constitution |
|---|---|---|---|
| **Unit** | a pure function meets its `(P,Q)` on chosen inputs | every core function | A2, A4 |
| **Property-based** | an **invariant holds over generated inputs** — empty, boundary, malformed, adversarial — not just hand-picked examples; shrinks a failure to a minimal case | any function with a stateable law (round-trip `decode∘encode = id`, idempotence, conservation, ordering, totality) | **A2 (total, not partial)**, A9, A10 |
| **Contract / schema (the seam)** | only validated, schema-conformant values cross the deterministic↔generative (or service) boundary, in both directions | every `D5` seam; every external/generated input — **parse, don't validate** at the boundary (A8) | A6, A8, P3 |
| **Integration** | the effectful shell works against **real** dependencies (DB, queue, cache) — migrations, queries, transactions | every adapter to an external system | A7, A14 |
| **End-to-end / golden** | an advertised command/flow produces the correct artifact from a clean environment | each user-facing entrypoint (CLI exit-codes, HTTP route, screen) | A2, A18 |
| **Regression** | a fixed bug stays fixed | **every** bug — write the failing test that reproduces it *first* (red), then fix (P9) | A2, P9 |
| **Critic / eval** (only if generative) | generated output is grounded, schema-valid, and degrades to a deterministic fallback when rejected | every generative path — `ground → generate → verify → degrade`, and the fallback is **exercised** | A15, A16, A17, P3/P4 |

**Property-based testing is the workhorse of A2.** "Total correctness over the admissible domain" is
precisely what a property test checks that an example test cannot: it generates the empty case, the boundary,
the malformed, the adversarial, and **shrinks** any failure to the smallest reproducer. Use the stack's
library (`{{PROPERTY_LIB}}` — e.g. fast-check / Hypothesis / proptest / QuickCheck) and **seed it** (A10) so a
failure is reproducible. State the law as the test name: `reverse∘reverse = id`, `sort is idempotent and a
permutation`, `parse∘render = id`, `total over all inputs (never throws)`.

## 3. The two tiers *(canonical here; the keep-current cadence is in [`MAINTENANCE.md`](./MAINTENANCE.md))*

| Tier | What | When it runs | Gate? |
|---|---|---|---|
| **A — local / context** | fast unit + property + exploratory/context checks | constantly during dev (`{{TEST_WATCH_CMD}}`) | no |
| **B — PR-gated** | the hermetic, deterministic suite: unit + property + contract + integration (+ E2E where wired) | every commit / pre-merge (`{{TEST_CMD}}`) | **yes — must pass to merge** |

Tier B must be **free of clock/network nondeterminism** (inject clock/seed — A10) and **reproducible from a
clean checkout**. It is the contract a reviewer and CI rely on; the `test-gate` skill runs it before every
commit.

## 4. Hermetic infrastructure — Docker for real dependencies *(A10, A7, A14)*

Integration tests run against **real** services in **ephemeral, seeded, isolated** containers — never a
shared/staging database, never the developer's machine state. Each run brings infra **up**, migrates +
seeds, tests, and tears **down**, so the suite is reproducible and order-independent.

```yaml
# docker-compose.test.yml — example; adapt services to the stack ({{DB}}, cache, queue…)
services:
  db:
    image: {{DB_IMAGE}}            # e.g. postgres:16-alpine — a pinned, mature tag, not :latest (MAINTENANCE policy)
    environment: { POSTGRES_PASSWORD: test, POSTGRES_DB: app_test }
    tmpfs: [ /var/lib/postgresql/data ]   # in-memory volume ⇒ fast, disposable, no leakage between runs
    ports: [ "127.0.0.1:5433:5432" ]      # LOOPBACK-only + off the default port: never network-exposed, never collides
```

```bash
# the integration step the test-gate skill runs:
docker compose -f docker-compose.test.yml up -d --wait     # start, wait for healthchecks
{{MIGRATE_CMD}} && {{SEED_CMD}}                            # deterministic schema + fixtures
{{TEST_CMD}}                                               # run Tier-B against the ephemeral services
docker compose -f docker-compose.test.yml down -v          # tear down + drop volumes (always, even on failure)
```

Rules: **pin** image tags (A10 — reproducible; MAINTENANCE — mature, not `:latest`); add a **healthcheck** /
`--wait` so tests don't race startup; **bind to `127.0.0.1:` (loopback) on non-default ports** so test infra is
never network-exposed and won't clobber a real dev DB; prefer **in-process / in-memory** HTTP tests over a
publicly-listening server (no `listen` on a public interface); keep state in `tmpfs` so nothing leaks between
runs; **always** tear down (even on failure — a `trap`/finally). If
the project has no external dependency, this section is `n/a` — the whole core is pure (A7) and Tier B is
unit + property only.

## 5. The gate — nothing ships unverified *(A2, P9, A24)*

**Development is dependent on testing**: a commit is permitted only behind a green Tier-B run. The order,
fail-fast (a red stage stops the rest):

```
lint  →  typecheck  →  unit  →  property  →  contract/schema  →  integration (Docker)  →  e2e (if wired)
```

- The **`test-gate`** skill runs this battery, reads the real output, and **refuses to proceed on any red** —
  it never commits a red tree, and it never reports "passing" without having watched it pass (A2).
- Where the stack supports it, also wire a **pre-commit / pre-push hook** (e.g. husky `pre-commit`, or a
  `Makefile`/`justfile` `check` target) running Tier A, and **CI** running Tier B on every PR — so the gate
  is enforced by tooling, not memory. The hook is a convenience; `test-gate` before `/git-commit` is the rule.
- **Coverage is a smell-detector, not a target** (A11/A20): chase *uncovered boundaries and the seam*, not a
  percentage. A bug means a missing test — add the regression test (red first) before the fix (P9).

## 6. Determinism, fixtures & evidence *(A10, P6)*

- **Inject** the clock and seed; cache pure results by input hash (C3 — cache the core, never the shell).
- Prefer **factories** (build a valid object, override the field under test) over brittle static fixtures.
- **Golden files** for large deterministic outputs; regenerate intentionally, review the diff.
- A test asserts on **read output**, never on "it ran" — evidence precedes the claim (A2). Keep the failing
  output; a green you never saw red is `⊤` and proves nothing (P9).

## 7. Observability — so verification can watch the world *(A2, A13, A18)*

Verification is "observe the world," so the system must be **observable**. This is part of the test contract,
not an afterthought.

- **Structured logging.** Log as structured records (level + event + context), not `print`. **Never log a
  secret or PII** (A13) — log the *fact* a value is set, never the value. Levels are honest: `error` is a
  real failure, not noise. Logs are **evidence** a test or operator reads, not decoration.
- **Correlation / request ids** thread a single operation across components so a failure is traceable to its
  origin (provenance — A15/D6) end to end.
- **Health / admin view.** A minimal **status endpoint or admin dashboard** (`/health`, `/status`, or a tiny
  internal page) that surfaces real state — version, dependency/DB health, queue depth, last-run results —
  so the *actual* behavior can be inspected, not assumed. Scope it to least privilege (A13): it reads, it does
  not become a backdoor; it shows no secret. Keep it crafted and legible (A18) — an admin view is still a
  delivered artifact, and a confusing one is a defect.

## 8. Definition of Done for a unit of test work

Tie back to the constitution's §VII invariants — a feature is testable-done only when:

- [ ] its `(P,Q)` is written and the check was **run and read** (I1 / A2);
- [ ] it is correct on **empty, boundary, malformed, adversarial** inputs — a **property test**, not just
  examples (I2 / A2);
- [ ] every assertion was **seen red** before green (I4 / P9);
- [ ] the **seam** is contract/schema-tested in both directions (I5 / A6);
- [ ] no clock/random/IO in the pure core; integration runs against **hermetic** Docker infra and is
  **reproducible** (I6, I7 / A7, A10);
- [ ] (generative only) the pipeline is whole and the **fallback was exercised** (I11 / A16/P3);
- [ ] the full **Tier-B gate is green** via `test-gate` before the commit (I1, I21 / A2, A24).

> Adapt commands to the stack; keep the predicates. Fill the placeholders at bootstrap: `{{TEST_CMD}}`,
> `{{TEST_WATCH_CMD}}`, `{{PROPERTY_LIB}}`, `{{DB_IMAGE}}`, `{{MIGRATE_CMD}}`, `{{SEED_CMD}}`. Then
> `grep -rn "{{" .` must be empty.
