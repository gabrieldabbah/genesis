# `scripts/` — the gate, runnable

[`gate.sh`](gate.sh) is what [`../CLAUDE.md`](../CLAUDE.md) means by "done", as one command:

```bash
bash scripts/gate.sh
```

Exits 0 green, non-zero red, and prints which check failed. [CI](../.github/workflows/gate.yml) runs this
same file on every pull request and every push to `dev` and `main` — there is one definition of the gate, not
a local one and a CI one that drift.

It checks seven categories: the authored units are discoverable, every machine-readable file parses, every
`.mjs`/`.sh` is syntactically valid, both hooks are inert outside a build, every relative markdown link
resolves, every folder to depth 2 has a README, and the properties in §7.

**§7 is the interesting part.** Each entry there was a real defect once, so it is checked rather than
remembered:

- no `agents/` directory — genesis ships no agent definitions
- none of the emphasis vocabulary [`standard.md`](../skills/genesis/standard.md) §3 prohibits
- every registry `reference:` names a file that exists

Adding a check is the right response to finding a defect that a command could have caught.

**What it does not cover:** the interactive `/genesis` smoke test. That needs a real Claude Code session in an
empty folder and cannot run headless, so it stays a human step and the script says so on the way out rather
than implying it covered everything.
