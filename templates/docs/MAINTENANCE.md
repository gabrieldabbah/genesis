# {{PROJECT_NAME}} — Maintenance

> The routine that keeps the project current **without breaking it**. The one rule above all: **every
> update lands behind green Tier-B tests, or it is reverted.** Updating always includes running the tests
> (A2). Set this up *before* the first feature.

## Test tiers

> The **full** testing strategy — the kinds (unit, **property-based**, contract, integration, e2e), the
> hermetic Docker infra, the `test-gate`, and observability — lives in [`TESTING.md`](./TESTING.md). The
> tiers below are the keep-current contract; every maintenance update lands behind a green Tier B.

| Tier | What | When it runs | Gate? |
|---|---|---|---|
| **A — local/context** | fast unit + property + exploratory/context checks | constantly, during dev (`{{TEST_WATCH_CMD}}`) | no |
| **B — PR-gated** | hermetic, deterministic suite (unit + property + contract + integration) | every commit / pre-merge (`{{TEST_CMD}}`, via `test-gate`) | **yes — must pass to merge** |

Tier B must be free of clock/network nondeterminism (inject clock/seed — A10/A7). It is the contract a
reviewer and CI rely on.

## What to keep current

| Target | Command | Cadence | Rule |
|---|---|---|---|
| **Dependencies** (patch/minor) | `{{OUTDATED_CMD}}` then bump | weekly / on alert | behavior-preserving; **mature, vetted versions only** (see policy below); small commits; tests green |
| **Dependencies** (major) | — | as needed | a **gated task** in `docs/PLAN.md`, never bundled |
| **Security advisories** | `{{AUDIT_CMD}}` | on alert | patch promptly behind tests — a real advisory is the one reason to move fast |
| **Skills** (external, `npx`) | `npx skills list` / `npx skills experimental_install` | monthly | **operator-run** — the AI does **not** run `npx skills …`; it lists them. Review the upstream diff before adopting |
| **The kit** (`axiomatic-induction`, `generate-pr`) | 🤖 re-vendor (`cp -R`) from the kit | when improved | re-copy + re-fill A0 if changed |

## Dependency update policy — careful, not current-for-its-own-sake

> **Selection vs update.** This policy governs *updating* a dependency you already have. *Choosing* a new
> dependency (the trusted registry, the typosquat/maintenance/license checklist) lives in
> [`SOURCES.md`](./SOURCES.md) §4 — same "check both ends" spirit, applied at add-time. The advisory/audit
> sources both policies use are in `SOURCES.md` §5.

**Newer is not better by default.** The goal is a **stable, secure, well-supported** dependency set — not
the highest version numbers. Apply these rules to every bump:

1. **Don't chase `latest`.** A version should have **baked** — been out long enough for regressions to
   surface (rough rule: a few weeks to a couple of months; never a brand-new `.0` major the week it ships).
   Prefer a version that sits *somewhat behind* the bleeding edge but is still actively maintained.
2. **Check the *current* version for problems first.** Before updating, look for a known vulnerability or
   advisory against what you already have (`{{AUDIT_CMD}}`, the ecosystem advisory DB / CVE list). A real
   security or correctness problem in the current version is what *justifies* moving — even ahead of rule 1.
3. **Vet the *target* version too.** The version you move *to* must itself be clean: no known advisory, not
   yanked/deprecated, not an unmaintained or hijacked release. Updating *into* a vulnerable or abandoned
   version is worse than staying put. **Always check both ends — is `current` risky? is `target` risky?**
4. **Behavior-preserving only in the routine.** Anything that changes behavior, and every major, is a
   gated task in `docs/PLAN.md` — never a routine bump.
5. **Green or revert.** Every bump lands behind green Tier-B tests, in a small commit, or it's reverted.

> In one line: **don't update just because a newer version exists.** Update when (a) the current version
> has a security/correctness problem, or (b) a mature, vetted, non-vulnerable newer version brings a
> concrete benefit — and **never to a version that itself carries a known risk.**

## Procedure for any update

1. Branch off `dev`.
2. **Check both ends for security & maturity** (the policy above): is the *current* version flagged
   (`{{AUDIT_CMD}}` / advisory DB)? Is the *target* version mature and itself free of known advisories? If
   the target is bleeding-edge or flagged, pick an older vetted version — or wait until it has baked.
3. Apply the smallest coherent update.
4. Run **Tier B** (`{{TEST_CMD}}`). Red ⇒ revert or fix before continuing — never merge red.
5. Commit (Conventional) with the dependency/skill delta **and the security/version rationale** in the body.
6. `/generate-pr` to `dev`.

## Notes

<!-- FILL: project-specific gotchas — pinned versions that must not move, generated files to regenerate
after an update, migration steps, etc. -->
