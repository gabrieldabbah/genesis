# {{PROJECT_NAME}} — Repo Layout

> The target repository organization. Every folder down to the **second level** has its own `README.md`
> (one-paragraph: what lives here, why). Keep this in sync with the real tree.

## Tree

```
{{REPO_TREE}}
```

## Conventions

- **Canonical agent file:** `AGENTS.md` (root). `CLAUDE.md` is a symlink to it; `.gemini/settings.json`
  points Gemini at it.
- **Skills:** canonical in `.agents/skills/` (tracked), symlinked to `.claude/skills/`. External skills
  pinned in `skills-lock.json`.
- **Docs:** all project docs in `docs/`; the map is in [`AGENTS.md`](../AGENTS.md) §11.
- **Generated artifacts** are git-ignored and regenerable; source material is tracked.
- **Scratch:** `.scratch/` is a git-ignored local space (only its `README.md` is tracked) for ephemeral
  scripts, scratch data, and the operator's own to-do scraps. Durable tasks live in `docs/PLAN.md`.
- **Secrets** live only in `.env` (gitignored); `.env.example` documents names, never values.

## Per-folder READMEs

<!-- FILL: list each first/second-level folder and the one-line purpose its README states. -->

| Folder | Purpose |
|---|---|
| `{{FOLDER}}` | `{{PURPOSE}}` |
