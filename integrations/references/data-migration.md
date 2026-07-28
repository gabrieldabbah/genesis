# Schema and migrations — what they must get right

Read this when designing schema or writing a migration. Work from the database's registry entry and its
official documentation via the `sources` skill.

## Properties the schema and its migrations must have

- **Constraints in the database, not only in the application.** Foreign keys, `NOT NULL`, checks, unique
  indexes. A rule enforced only in application code is a rule that holds until the next writer — a script, a
  console session, a second service.
- **Every migration reverses.** Up and down, and the down actually tested. A migration that cannot be undone is
  a one-way door in a system that will need to go back through it.
- **The reads the application issues are bounded.** A query whose result set grows with the data carries an
  explicit limit and a deterministic order, and anything that sweeps the table pages — a limit alone leaves
  later rows permanently unreachable.
- **Row-level security is verified by a test that tries to break it, not by reading the policy.** Where the
  backend has RLS and the application holds a key that bypasses it, every query the application issues is a
  security boundary. Write the test that asserts one tenant cannot read another's row.
- **No connection string or secret in code** — variable names only.
- **Expand, then contract.** A column rename or type change lands as two migrations with the application
  working against both shapes in between, so a rollback does not need a restore.

## The tests it needs

Applied clean on a fresh database, rolled back clean, seed data loaded, RLS tests passed. Record what each
printed, and which of them was not run.

## The destructive ones are deferred

A production migration, a drop, a backfill over live data: write the plan *and its rollback* into
`docs/DEPLOYMENT.md`, mark the item `🙋`, and keep building. Non-destructive migrations run freely against
hermetic infrastructure — pinned images, non-default ports, torn down after, per `docs/TESTING.md`.

## Scope

The schema the item names. Not a normalisation pass on tables nobody touched, not an index that looks like it
would help. A migration that changes more than the item asked for is the hardest kind to review and the hardest
to roll back.
