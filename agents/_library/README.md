# Optional worker library

These are specialist workers the **overlord** adds to a project's roster *when the work needs them* (driven by
the chosen archetype + integrations). They are not always active. Each works within a narrow remit and follows
`AGENTS.md` + the constitution like the core workers. **Model policy:** anything that writes or judges code or
UI/UX runs on the **best model available** (Opus) — `design`, `a11y`, `payments`, `data-migration`, `deploy`;
the run-and-report role (`docs-writer`) uses `model: inherit`, so it follows the run.

Add a new specialist by dropping a `<name>.md` here with the standard agent frontmatter
(`name`, `description`, `model`, `tools`) and a tight, high-quality instruction body. Reference it from the
matching integration's `worker:` field so genesis wires it automatically.
