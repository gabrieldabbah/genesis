# {{PROJECT_NAME}} — Testing & Verification

> All development is gated on tests. A green suite that was never seen red proves nothing — a test that
> has never failed has not been shown to test anything. This
> doc is the project's testing contract: the kinds of tests and when each is owed, the two tiers, the
> hermetic infrastructure (Docker for real databases/services), the gate that must pass before any
> commit, and the observability (logging + a health/admin view) that lets verification actually watch the
> world. The keep-current routine that *runs* on top of this lives in [`MAINTENANCE.md`](./MAINTENANCE.md).
>
> Run by the `test-gate` skill: it brings up infra, runs the battery, reads the output, and blocks the
> commit on any red. Closing sequence: `test-gate` green, then commit, then `/generate-pr`.

---

## 1. Why this is cheap here — the functional core

Testability is bought by purity, not bolted on. That discipline is what makes a small test
suite sufficient:

- **Pure, total core; effects at the edge.** Business logic is referentially transparent over its domain
  — same input ⇒ same output — so it is tested by plain value-in/value-out assertions, no mocks, no clock, no
  network. Effects (I/O, time, randomness, DB, spend) live in a thin shell and are *injected*, so the shell is
  the only place that needs heavier integration tests.
- **Make illegal states unrepresentable.** Every bad state the *type* forbids is a test you never have
  to write — the compiler discharges it. Prefer a type change over a validation; then delete the now-dead
  runtime check. Push obligations into types: fewer tests, stronger guarantees.
- **Totality, exhaustiveness, idempotence.** Total functions and exhaustive matches mean no untested
  fallthrough; idempotent setup (`f ∘ f = f`) means the test harness can run bootstrap twice safely.
- **Inject the clock and the seed.** Determinism is a feature: a function that reads wall-clock time
  is not a function of its arguments and cannot be reproducibly tested. Pass time and randomness in.

> One-line rule: maximize the pure, total core (cheap, exhaustive unit + property tests); minimize the
> effectful shell (a few hermetic integration tests at the edge). The seam between them is contract-tested.

## 2. The kinds of tests — what each proves, when it's owed

Adapt the example tools to the project's stack; keep the predicate. Each test exists to discharge a
specific obligation — write the kind the obligation calls for, not the kind that is easy.

| Kind | What it proves | When it's owed |
|---|---|---|
| **Unit** | a pure function meets its `(P,Q)` on chosen inputs | every core function |
| **Property-based** | an invariant holds over generated inputs — empty, boundary, malformed, adversarial — not just hand-picked examples; shrinks a failure to a minimal case | any function with a stateable law (round-trip `decode∘encode = id`, idempotence, conservation, ordering, totality) |
| **Contract / schema (the seam)** | only validated, schema-conformant values cross the deterministic↔generative (or service) boundary, in both directions | every seam; every external or generated input — parse, don't validate at the boundary |
| **Integration** | the effectful shell works against real dependencies (DB, queue, cache) — migrations, queries, transactions | every adapter to an external system |
| **End-to-end / golden** | an advertised command/flow produces the correct artifact from a clean environment | each user-facing entrypoint (CLI exit-codes, HTTP route, screen) |
| **Regression** | a fixed bug stays fixed | every bug — write the failing test that reproduces it *first* (red), then fix |
| **Critic / eval** (only if generative) | generated output is grounded, schema-valid, and degrades to a deterministic fallback when rejected | every generative path — `ground → generate → verify → degrade`, and the fallback is exercised |

Property-based testing is the workhorse here. "Total correctness over the admissible domain" is
precisely what a property test checks that an example test cannot: it generates the empty case, the boundary,
the malformed, the adversarial, and shrinks any failure to the smallest reproducer. Use the stack's
library (`{{PROPERTY_LIB}}` — e.g. fast-check / Hypothesis / proptest / QuickCheck) and seed it so a
failure is reproducible. State the law as the test name: `reverse∘reverse = id`, `sort is idempotent and a
permutation`, `parse∘render = id`, `total over all inputs (never throws)`.

## 3. The two tiers *(canonical here; the keep-current cadence is in [`MAINTENANCE.md`](./MAINTENANCE.md))*

| Tier | What | When it runs | Gate? |
|---|---|---|---|
| **A — local / context** | fast unit + property + exploratory/context checks | constantly during dev (`{{TEST_WATCH_CMD}}`) | no |
| **B — PR-gated** | the hermetic, deterministic suite: unit + property + contract + integration (+ E2E where wired) | every commit / pre-merge (`{{TEST_CMD}}`) | yes — must pass to merge |

Tier B must be free of clock/network nondeterminism — inject the clock and the seed — and reproducible from a
clean checkout. It is the contract a reviewer and CI rely on; the `test-gate` skill runs it before every
commit.

## 4. Hermetic infrastructure — Docker for real dependencies

Integration tests run against real services in ephemeral, seeded, isolated containers — never a
shared/staging database, never the developer's machine state. Each run brings infra up, migrates +
seeds, tests, and tears down, so the suite is reproducible and order-independent.

```yaml
# docker-compose.test.yml — example; adapt services to the stack ({{DB}}, cache, queue…)
services:
  db:
    image: {{DB_IMAGE}}            # e.g. postgres:16-alpine — a pinned, mature tag, not :latest (MAINTENANCE policy)
    environment: { POSTGRES_PASSWORD: test, POSTGRES_DB: app_test }
    tmpfs: [ /var/lib/postgresql/data ]   # in-memory volume ⇒ fast, disposable, no leakage between runs
    ports: [ "127.0.0.1:5433:5432" ]      # loopback-only + off the default port: never network-exposed, never collides
```

```bash
# the integration step the test-gate skill runs:
docker compose -f docker-compose.test.yml up -d --wait     # start, wait for healthchecks
{{MIGRATE_CMD}} && {{SEED_CMD}}                            # deterministic schema + fixtures
{{TEST_CMD}}                                               # run Tier-B against the ephemeral services
docker compose -f docker-compose.test.yml down -v          # tear down + drop volumes (always, even on failure)
```

Rules: pin image tags (reproducible; MAINTENANCE — mature, not `:latest`); add a healthcheck /
`--wait` so tests don't race startup; bind to `127.0.0.1:` (loopback) on non-default ports so test infra is
never network-exposed and won't clobber a real dev DB; prefer in-process / in-memory HTTP tests over a
publicly-listening server (no `listen` on a public interface); keep state in `tmpfs` so nothing leaks between
runs; always tear down (even on failure — a `trap`/finally). If
the project has no external dependency, this section is `n/a` — the whole core is pure and Tier B is
unit + property only.

## 5. The gate — nothing ships unverified

Development is dependent on testing: a commit is permitted only behind a green Tier-B run. The order,
fail-fast (a red stage stops the rest):

```
lint  →  typecheck  →  unit  →  property  →  contract/schema  →  integration (Docker)  →  e2e (if wired)
```

- The `test-gate` skill runs this battery, reads the real output, and refuses to proceed on any red —
  it never commits a red tree.
- Where the stack supports it, also wire a pre-commit / pre-push hook (e.g. husky `pre-commit`, or a
  `Makefile`/`justfile` `check` target) running Tier A, and CI running Tier B on every PR — so the gate
  is enforced by tooling, not memory. The hook is a convenience; `test-gate` before a commit is the rule.
  The host's half of this — the workflow, its triggers, and the two lanes that only exist there — is §9.
- Coverage is a smell-detector, not a target: chase *uncovered boundaries and the seam*, not a
  percentage. A bug means a missing test — add the regression test (red first) before the fix.

## 6. Determinism, fixtures & evidence

- Inject the clock and seed; cache pure results by input hash (cache the core, never the shell).
- Prefer factories (build a valid object, override the field under test) over brittle static fixtures.
- Golden files for large deterministic outputs; regenerate intentionally, review the diff.
- A test asserts on read output, never on "it ran" — evidence precedes the claim. Keep the failing
  output; a green you never saw red is `⊤` and proves nothing.

## 7. Observability — so verification can watch the world

Verification is "observe the world," so the system must be observable. This is part of the test contract,
not an afterthought.

- **Structured logging.** Log as structured records (level + event + context), not `print`. **Never log a
  secret or PII** — log the *fact* a value is set, never the value. Levels are honest: `error` is a
  real failure, not noise. Logs are evidence a test or operator reads, not decoration.
- **Correlation / request ids** thread a single operation across components so a failure is traceable to its
  origin end to end.
- **Health / admin view.** A minimal status endpoint or admin dashboard (`/health`, `/status`, or a tiny
  internal page) that surfaces real state — version, dependency/DB health, queue depth, last-run results —
  so the *actual* behavior can be inspected, not assumed. Scope it to least privilege: it reads, it does
  not become a backdoor; it shows no secret. Keep it crafted and legible — an admin view is still a
  delivered artifact, and a confusing one is a defect.

## 8. Definition of Done for a unit of test work

A feature is testable-done only when:

- [ ] its `(P,Q)` is written and the check was run and read;
- [ ] it is correct on empty, boundary, malformed, adversarial inputs — a property test, not just
  examples;
- [ ] every assertion was seen red before green;
- [ ] the seam is contract/schema-tested in both directions;
- [ ] no clock/random/IO in the pure core; integration runs against hermetic Docker infra and is
  reproducible;
- [ ] (generative only) the pipeline is whole and the fallback was exercised;
- [ ] the full Tier-B gate is green via `test-gate` before the commit.

> Adapt commands to the stack; keep the predicates. Fill the placeholders at bootstrap: `{{TEST_CMD}}`,
> `{{TEST_WATCH_CMD}}`, `{{PROPERTY_LIB}}`, `{{DB_IMAGE}}`, `{{MIGRATE_CMD}}`, `{{SEED_CMD}}`. Then
> `grep -rn "{{" .` must be empty.

## 9. The CI half — the same gate, run by the host

The workflow in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **this project's gate**, not a
second, weaker one. If a lane is worth failing a pull request over it belongs in `{{TEST_CMD}}` too, so a
green local run and a green pull request mean the same thing. The setup steps — enabling the workflow,
protecting the default branch, making the check required — are the `repo-hardening` skill's four steps; this
section is the part that belongs to testing.

**Triggers: a pull request, and a push to the default branch.** Where work happens on one branch and reaches
the default branch through a pull request, that branch is already covered by the `pull_request` event —
adding a push trigger for it runs the whole suite twice for every commit, and the second run tells you
nothing the first did not. A repository that commits straight to its default branch keeps only the push
line. Two more properties belong on every workflow: `permissions: contents: read`, so a job that only reads
cannot write, and a `concurrency` group with `cancel-in-progress`, so a new commit supersedes the run in
progress rather than paying for both.

**The job's name is an interface.** A required status check names the job, so renaming it detaches the
requirement — and the branch rule then passes on a workflow that no longer runs. A rename is a change to the
protection rule as well.

**Give the checkout full history wherever a check reads it.** `actions/checkout` clones one commit by
default. Anything that asks git *when* something changed — a docs freshness check, a changed-files filter, a
version derived from tags — reads a repository whose entire history is a single commit dated today, and
answers confidently and wrongly. `fetch-depth: 0` is the fix, and the freshness check shipped here refuses to
answer rather than emitting a wall of false drift when it finds a shallow clone.

### Two lanes that exist only in CI, and how to run them locally

Both have the same failure mode: they pass locally and fail on the pull request, having read something
different from what you read.

- **The secret scan reads the tracked tree, not the working directory.** CI checks out tracked files only,
  before any install. A scanner pointed at the local directory reads `node_modules/`, build output, backups
  and the real `.env` — none of which CI has — so it reports findings that mean nothing and trains you to
  ignore the one that would matter. Reproduce CI's tree exactly, then scan that:

  ```bash
  TREE=$(mktemp -d) && git archive HEAD | tar -x -C "$TREE" &&
    gitleaks dir "$TREE" --no-banner --redact --exit-code 1; echo "exit=$?"; rm -rf "$TREE"
  ```

  A finding is read before it is repeated: the file and line go in the report, never the value. A flagged
  tracked file is a stop — the credential is rotated and removed before anything is pushed, because a commit
  reaches every fork and cache the moment it lands.

- **A check that reads committed state cannot be answered before the commit.** Documentation freshness is the
  standing example: a doc carries `**Verified <date>** against \`path\` · \`path\``, and the check fails when
  a file on that line was committed *after* the date. Uncommitted work has no commit date, so the local run
  reports nothing and the identical command goes red minutes later with nothing having changed in between.
  `node scripts/check-docs.mjs --pending` asks the question with the date the pending work will carry, and
  names each doc the commit is about to expire. Run it before committing; run the plain form after.

  Fixing a flagged doc means re-reading it against the files on its line and then bumping the date. Bumping
  the date alone disarms the check for those files permanently, which is worse than the one red lane it hides.

### Integration and database tests in CI

Tier-B integration tests (§4) run in CI the same way they run locally: a throwaway service started **inside
the runner**, migrated and seeded per run, torn down after. Never a shared or staging instance — a suite that
truncates a table is indistinguishable from an incident when it points at something real, and a runner that
can reach production is a credential nobody meant to grant.

Keep them in a **separate workflow** when they are slow enough to notice: the fast Docker-free lanes stay a
minute, the database suite runs on the same triggers without holding up the rest, and either can be re-run
alone. Both still gate the merge.

### What CI does not replace

- **The local gate before a commit.** CI reports after the fact; `test-gate` is what stops the commit.
- **A push is not a CI run.** What runs depends on the trigger lines above — read them before calling
  anything validated. If nothing ran, the local gate is the only gate.
- **A green pull request is not a deployment.** What the host deploys is the default branch after the merge
  (`DEPLOYMENT.md`), and the post-deploy checks there are a separate obligation.
