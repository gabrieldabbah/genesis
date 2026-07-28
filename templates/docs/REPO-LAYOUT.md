# {{PROJECT_NAME}} — Repo Layout

> The target repository organization. Every folder down to the **second level** has its own `README.md`
> (one-paragraph: what lives here, why). Keep this in sync with the real tree.

## Tree

```
{{REPO_TREE}}
```

## Conventions

- **Priming file:** `CLAUDE.md` at the root, a real file — no symlink, no import.
- **Skills:** `.claude/skills/`, one directory. Copies under other tools' trees are not loaded by Claude Code
  and should not exist.
- **Docs:** all project docs in `docs/`; the map is at the end of [`CLAUDE.md`](../CLAUDE.md).
- **Generated artifacts** are git-ignored and regenerable; source material is tracked.
- **Scratch:** `.scratch/` is a git-ignored local space (only its `README.md` is tracked) for ephemeral
  scripts, scratch data, and the operator's own to-do scraps. Durable tasks live in `docs/TODO.md`.
- **Secrets** live only in `.env` (gitignored); `.env.example` documents names, never values.

## Per-folder READMEs

<!-- FILL: list each first/second-level folder and the one-line purpose its README states. -->

| Folder | Purpose |
|---|---|
| `{{FOLDER}}` | `{{PURPOSE}}` |
