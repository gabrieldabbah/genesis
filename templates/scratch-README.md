# `.scratch/` — local scratch space (NOT git-tracked)

> Everything in this folder is **git-ignored except this README**. Use it freely for anything ephemeral —
> nothing here travels with the repo, lands in a commit, or shows up in a PR.

**Use it for**

- throwaway scripts, one-off experiments, scratch data, sample/temporary output;
- temporary notes, half-formed ideas, debugging logs you don't want committed;
- **a human to-do scratchpad** — the manual things *you* (the operator) need to do that aren't durable
  project tasks (e.g. "rotate the staging key", "ask design for the final copy").

**Do NOT use it for**

- durable, dependency-ordered work → that lives in [`../docs/PLAN.md`](../docs/PLAN.md); work needing your
  credentials/accounts is deferred to [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) (`🙋`), never halted here;
- decisions + rationale → [`../docs/DECISIONS.md`](../docs/DECISIONS.md);
- anything secret (`.env`, keys, tokens) → never, here or anywhere.

The contents are safe to delete at any time. The folder + this README are kept (the README is the only
tracked file) so the space always exists on a fresh clone.
