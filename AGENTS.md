# AGENTS.md — Genesis

> Canonical agent manual for this repo. `CLAUDE.md` imports this file (`@AGENTS.md`). Codex, Cursor, Gemini,
> Copilot, Zed read `AGENTS.md` natively. Read the `axiomatic-induction` skill first — it is the constitution;
> if anything here conflicts with it, the constitution wins.

## What this is

Genesis is a Claude Code **plugin** (skills + agents + hooks) that scaffolds and autonomously builds
greenfield projects. This repo is the *plugin source*, not a scaffolded project. Most "work" here is
authoring English instructions (skills/agents), not application code.

## Layout

- `skills/` — one folder per skill, each a `SKILL.md` (+ optional `reference.md`, `scripts/`, `templates/`).
- `agents/` — subagent definitions; `agents/_library/` holds optional workers genesis adds per project.
- `hooks/hooks.json` — lifecycle hooks (the acceptance Stop gate).
- `integrations/registry/*.yaml` — the service registry; add a service by adding one file.
- `templates/` — files genesis copies/fills into a new project.
- `seeds/` — reusable, AI-authored configs (`oss-default.md` is the public example).

## Conventions

- **English-first.** Prefer prose instructions over config the user must hand-write. The AI generates files;
  the user converses. Reserve machine formats (JSON/YAML) for where a machine must parse them.
- **No personalization.** No personal names, no machine-specific paths, no secrets in any committed file.
  Machine/IP specifics belong in an untracked private seed (`seeds/private/`), never in the repo.
- **Skill frontmatter:** `name`, `description` (the trigger — make it precise), `license: MIT`,
  `allowed-tools`. Keep `SKILL.md` lean; push detail into `reference.md`.
- **Agent frontmatter:** `name`, `description`, `model`, `tools` (least-privilege; the overlord has **no**
  Edit/Write). **Model policy:** the overlord and every worker that writes or judges code/UI/UX use the best
  model available (`opus`); run-and-report roles (`tester`, `docs-writer`) use `inherit`.
- **Markdown links** for file references, relative paths.
- **Never read or print secrets** (`.env`, `~/.ssh`, `~/.aws`, tokens). This is enforced by sandbox + Read-deny
  rules in scaffolded projects and must be respected here too.

## Commands

This repo has no build. To validate changes:
- `find skills agents -name '*.md'` — list authored units.
- Lint JSON: `python3 -m json.tool .claude-plugin/plugin.json` (and `marketplace.json`).
- Manual test: install the plugin locally and run `/genesis` in an empty folder (see `README.md`).

## Two version-sensitive spots (verify on the target build)

1. **Sandbox key names** in generated `.claude/settings.json` — confirm via `/sandbox`.
2. **Plugin hooks/Stop JSON** shape and the **`ccusage`** field names — confirm on first run.
Genesis generates conservative defaults and tells the user to confirm; keep that honesty in any edits.

## Golden rules (from the constitution)

1. Derive each step from an axiom; order work by dependency; prove the postcondition by a real run (not hoped).
2. Surgical changes; make illegal states unrepresentable; simplicity first.
3. Every shown fact has a source (`sources` skill); no unvetted dependency.
4. Done = observed green (the `test-gate` skill), security checked, reviewed — then moved to `docs/TODO-done.md`.
