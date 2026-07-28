# `templates/` — what a scaffolded project gets on day one

Genesis fills every `{{PLACEHOLDER}}` and deletes every section that does not apply to the project being
built. A section left as boilerplate is worse than an absent one: it teaches an agent that the file describes
something other than the repository it is in.

| Path | Becomes |
|---|---|
| [`CLAUDE.template.md`](CLAUDE.template.md) | the project's root `CLAUDE.md` — the only file loaded in every session |
| [`docs/`](docs/) | the project's `docs/` skeleton |
| [`README.project.md`](README.project.md) | the project's root `README.md` |
| [`gitignore.template`](gitignore.template) | `.gitignore` — universal, secrets and `.scratch/` sections, plus the stack's once known |
| [`env/`](env/) | `.env.example` (committed), `.env.development`, `.env.production`. Every value is empty |
| [`settings.template.jsonc`](settings.template.jsonc) | `.claude/settings.json` — secret denials and the push/merge/deploy gate |
| [`todo-archive-reminder.mjs`](todo-archive-reminder.mjs) | `.claude/hooks/todo-archive-reminder.mjs`, the one hook genesis installs |
| [`scratch-README.md`](scratch-README.md) | `.scratch/README.md` |
| [`.github/`](.github/) | the project's PR template |

**One folder here holds no project files.** [`user-layer/`](user-layer/) is the `~/.claude` layer — the
priming file, the hook set that runs alongside it, and the settings block that wires them. The system-check
mode reads a machine's own layer, compares it against that copy, and proposes the difference a section at a
time; it never installs any of it wholesale, and it changes nothing outside the project without being asked.

Relative links inside these templates resolve after the copy, from the project root — not from here.
