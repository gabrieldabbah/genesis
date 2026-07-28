<!-- Filled by the `generate-pr` skill from the branch diff. Keep every section grounded in the actual change. -->

## Summary

<!-- One or two sentences: what this PR changes and why. -->

## Changes

<!-- The concrete edits, grouped by area: skills / hooks / integrations / templates / docs / scripts. -->

## Verification

<!-- This repository has no build. `scripts/gate.sh` is its definition of done and CI runs the same file —
     paste its real output. Say plainly which checks you did not run rather than leaving it to be assumed. -->

- [ ] `bash scripts/gate.sh` — green. Covers all seven categories: units discoverable, machine-readable files
      parse, `.mjs`/`.sh` syntactically valid, both hooks inert outside a build, relative markdown links
      resolve, folder READMEs present, and the §7 properties
- [ ] Every changed skill still has complete frontmatter (`name`, `description`, `license`, `allowed-tools`)
- [ ] Any new skill directory is tracked by git — `git ls-files skills/<name>/` is non-empty. An untracked
      `SKILL.md` is invisible to everyone who installs the plugin
- [ ] If the change affects scaffolding: installed the plugin locally and ran `/genesis` in an empty folder
      (gate item 3 — the interactive smoke test no script covers)

## Instruction quality

<!-- Genesis ships instructions that run on other people's machines. See CLAUDE.md § Writing an instruction here. -->

- [ ] Every added line is specific enough to check and safe if obeyed literally
- [ ] States a property the artifact must have, rather than instructing the model's conduct
- [ ] Said once — no rule restated in a second file, no new emphasis stacking
- [ ] No personal names, machine-specific paths, other repositories' names, or secrets
- [ ] Any new hook checks a fact rather than overriding a decision

## Risks

<!-- What could break for someone who installs this, what was deliberately not touched, and any follow-ups. -->
