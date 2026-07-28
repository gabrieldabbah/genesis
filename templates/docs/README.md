# `templates/docs/` — the scaffolded project's `docs/`

Copied into a new project during phase 1 and filled as the build proceeds. Genesis deletes the ones that do not
apply — `ADMIN-DASHBOARD.md` for anything that is not a SaaS, `DESIGN.md` for anything with no interface —
rather than leaving them as boilerplate.

| Template | Holds | Filled at |
|---|---|---|
| [`PROJECT.md`](PROJECT.md) | scope, framing, success criteria | phases 2–3 |
| [`SOURCES.md`](SOURCES.md) | trusted sources and approved dependencies | phase 2 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | the design and the reasoning behind it | phase 3 |
| [`DESIGN.md`](DESIGN.md) | *(UI)* the design system and screen specs, every state | phase 3 |
| [`DECISIONS.md`](DECISIONS.md) | decisions taken, dated, with the reason each was taken | throughout |
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | system prerequisites, and what is present or missing | phases 1 and 4 |
| [`RESILIENCE.md`](RESILIENCE.md) | fallback chains, offline mode, degradation policy | phase 4 |
| [`ADMIN-DASHBOARD.md`](ADMIN-DASHBOARD.md) | *(SaaS)* the admin surface and the project-wide logging standard | phase 4 |
| [`TESTING.md`](TESTING.md) | what is tested, how, and what the gate runs | phase 4 |
| [`PLAN.md`](PLAN.md) | dependency ordering and the scope gates behind the backlog | phase 5 |
| [`TODO.md`](TODO.md) | the actionable backlog | phase 5 |
| [`TODO-done.md`](TODO-done.md) | dated archive of completed sections | phase 5 onward |
| [`REPO-LAYOUT.md`](REPO-LAYOUT.md) | target repository organization, per-folder purposes | phase 4 |
| [`MAINTENANCE.md`](MAINTENANCE.md) | the keep-current routine: dependency and advisory policy | phase 4 |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | the human handoff — accounts, secrets, deploy, checks | throughout |

`DEPLOYMENT.md` is the one that fills continuously rather than at a phase: every `🙋` item a build defers —
anything needing the operator's identity, credentials, money, or a live mutation — is appended there as it is
deferred, and the whole set is handed over at the end.

`TODO.md` and `TODO-done.md` are a pair. A section moves from the first to the second when it holds no open
items at all; the archive file must exist or the task-archive hook silently does nothing.

Section numbers inside these files are cited by other files in the same set. Renumbering one breaks the
citations and nothing visibly fails.
