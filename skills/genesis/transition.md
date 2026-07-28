# Transition — an existing repository to the standard

The runbook behind [`SKILL.md`](SKILL.md) §transition. The target is [`standard.md`](standard.md).

## What this mode is for

Two situations, one procedure:

- **A repository primed for an older model.** Instructions written to compensate for weaknesses Claude Opus 5
  does not have now work against it. Anthropic's own guidance says to remove them — §Why below.
- **A repository that was never brought to standard.** No declarations, rules that cannot be checked, the same
  thing said four times, knowledge that lives only in one person's head.

They converge because the fix is the same: strip what instructs conduct, keep and complete what states
properties, and say each thing once. Diagnose which you are in — it changes emphasis, not steps — and say so.

## The goal has two halves, and the second governs

1. Remove scaffolding built for a weaker model, and rules that cannot be checked.
2. **Lose none of the knowledge that scaffolding was protecting.**

Verification ceremony is re-derivable from a document. The fact that a particular query silently truncates past
a thousand rows, or that reordering two middleware lines breaks webhook signature checks, exists in exactly one
place. Delete it and it is gone.

**When the two conflict, keep the knowledge.** A file that is too long but correct is a smaller problem than a
lean file missing the one warning that would have prevented an outage. When genuinely unsure whether a line is
scaffolding or knowledge, keep it and say so.

**Do not edit or delete a line you cannot explain** — not "it looks derivable" but *what it says, why someone
wrote it, and what breaks without it*. A line you cannot explain stays, and is listed as unresolved. Changing a
file you have not understood is how the irreplaceable half is destroyed while the replaceable half is tidied.

## Why — the three strips, from Anthropic's own guidance

Claude Opus 5's documentation reverses three things earlier prompts did deliberately. All three are stated in
Anthropic's platform documentation for Opus 5 and its migration guide.

1. **Remove verification and self-check instructions.** The model verifies its own work without being told to;
   explicit verification instructions cause over-verification. This applies to legacy harness scaffolding that
   adds separate verification steps.
2. **Constrain scope explicitly.** The model can expand a task's scope, adding steps that were not requested.
   A stated scope boundary is now worth more than it used to be.
3. **Cap and guide delegation.** Do not delegate work you can finish in a handful of tool calls, and do not use
   subagents to verify or double-check your own work.

Two further changes shape the rest of the procedure. The model follows instructions **more literally**, so
every absolute is obeyed at face value, including where judgment would have served — which makes
[`standard.md`](standard.md) §3 load-bearing rather than stylistic. And it writes **longer** output by default,
so a file grows unless its length is deliberate.

---

## Before the steps — establish three things

**What this repository is, and who is exposed.** [`standard.md`](standard.md) §1. If the file does not declare
them, derive them and check the exposure claim externally rather than reading it out of the documents.

**Who else works here.** Several of the steps below rest on "only this person, only Claude Code" — collapsing
an `AGENTS.md`, removing another tool's config tree, cutting a rule because the user-level file covers it.
That is a claim about the *operator*, not the repository, and it stops holding the moment someone else has a
clone. Check for collaborators, a `CONTRIBUTING.md`, and config trees for other agent tools (`.codex`,
`.gemini`, `.cursor`, `.windsurf`, `.clinerules`, `.continue`, `.aider.conf.yml`, `.agents`). Where the answer
is not obvious, ask rather than resolve it silently.

**How the priming file is reached.** Claude Code reads `CLAUDE.md` and ignores `AGENTS.md`. Run
`ls -la CLAUDE.md AGENTS.md` before judging anything by weight, because four patterns exist and one inverts the
diagnosis: a real `CLAUDE.md`; a symlink; a `CLAUDE.md` that imports `AGENTS.md`; and **`AGENTS.md` with no
`CLAUDE.md` and no link at all** — in which case none of it is loaded, and a repository whose priming is
*absent* needs the opposite treatment from one whose priming is too heavy.

**The end state is one real `CLAUDE.md` and no `AGENTS.md`.** Collapse whichever pattern you find: move the
content into `CLAUDE.md` as a regular file, verify it byte-for-byte, and delete the rest. A symlink or an import
is a second name for one file that later becomes two files, and only one of them is loaded. Removing a tracked
symlink can read as deleting a tracked file and get blocked — if that happens, say so rather than working
around it. **Then repair what still points at the old name** (§2, dead pointers): the content moves and nothing
moves the references to it.

**Precedence, for the duration of this pass only.** Normally a repository's `CLAUDE.md` outranks the user-level
file. Here it does not: the repository's file is the artifact under repair and cannot also be the authority on
how to repair it. Where the two disagree about *how to work*, the standard wins. The same file's **facts about
the codebase** are superseded by nothing — that content is what this mode exists to protect. The inversion ends
when the pass does.

---

## Step 1 — Strip

Highest confidence, most reversible, so it goes first. Search `CLAUDE.md`, `AGENTS.md`, `.claude/skills/`,
`.claude/agents/`, hook scripts, **and documentation *about* any of those**, for:

- Instructions to verify, double-check, re-verify, or confirm before claiming completion.
- Instructions to use a subagent to verify or review the model's own work.
- "Prove the postcondition before declaring done" and equivalents.
- Verification added as a separate workflow phase.
- Instructions overriding truncation, enforcing complete output, or banning placeholders.
- Compulsion framing — "you MUST use this", "you cannot rationalise your way out of this", "this is not
  negotiable", "IF X APPLIES YOU DO NOT HAVE A CHOICE".
- Hooks that override a decision rather than check a fact: one that refuses to let a turn end, one that denies
  the question tool. **The test for any hook: does it check a fact, or override a decision?** A hook that
  checks whether an archive file is stale checks a fact. A hook that forbids stopping does not.
- **A tracked sub-agent roster.** Two shapes, and the second is the one that gets missed:
  - *A loop where one agent checks another's output.* A `planner → implementer → reviewer → debugger` chain is
    the retired pattern under new names.
  - *A roster of domain specialists* — payments, migrations, deploy, accessibility, docs. No agent here checks
    another, so the first test clears it, and it still fails T1 §3: a roster exists to be dispatched, and a
    standing instruction to dispatch per item delegates work that would finish in a handful of tool calls. The
    knowledge in those files is worth keeping; the dispatch mechanism welded to it is not. Move each one to a
    document read when its domain comes up, and delete the agent.

  Check skill references either way: a sub-agent delegating to skills that no longer exist is broken, not
  merely stale. **A roster a scaffolding tool installed is still a roster** — that it arrived from a plugin
  rather than being hand-written says nothing about whether it should be here now.

**Do not delete project gates.** "The test suite passes before commit", "code that takes public input gets a
security audit", "the build must be green" are facts about the artifact and they stay
([`standard.md`](standard.md) §10). The distinction: does the line instruct **the model's conduct**, or state
**a property the artifact must have**?

**A third case looks like conduct and is not:** *"say what you ran and what it printed."* That is honesty about
claims, not a verification step, and it stays. What goes is ceremony built around work already done.

**Invoked tooling is out of scope.** Method documents, rubrics and prompts a repository *ships* for an agent to
run in some *other* repository are not this repository's priming. Read literally, this step would gut them; it
should not. Their rules are properties the target's artifact must have. Draw the distinction before cutting,
and where it is unclear, ask.

Getting this backwards in either direction is the main risk in the pass. When unsure, keep the line and record
it.

## Step 2 — Restructure

**Length is not the target** — see [`standard.md`](standard.md) §4 for why, and what to optimize instead.

### Resolve every dead pointer, and everything the target *defined*

The priming file points at things — a skill, a directory, a vendored document — and some no longer exist. For
each dead path, grep it across the repository. If other files still reference what it held, that content is
already lost and any archived copy is the last one; recover it into a file the repository keeps, then repair
the pointers.

**Then grep for what the target *defined*, not only for its path.** The expensive case is a *vocabulary*: a
deleted document was the only definition of labels that appear elsewhere as bare tokens, which match no search
for the dead path and break nothing visibly. Axiom numbers, invariant ids, guardrail labels, phase names —
these get cited from source comments, test names, PR templates and decision logs, and every citation resolves
to nothing once the definition is gone. Open the archived file, list the identifiers it defines, and grep for
those.

Where the recovered vocabulary is part conduct and part artifact property, **recover only the property half** —
re-importing the rest reinstalls what step 1 removed. Keep the original labels so existing citations resolve,
and footnote what was deliberately not recovered so the next reader does not go looking.

**When recovered content disagrees with content that survived, the disagreement is the finding.** Two documents
numbering the same guardrails differently, with both numberings live in the codebase, cannot be resolved by
picking one — that silently changes the meaning of every citation. Document the ambiguity in place.

**Section names are a vocabulary too, and they constrain the restructure.** Before rewriting, grep for what
cites the file's *headings* — `git grep '§'`, or the heading text. Renaming, merging or splitting a cited
heading breaks every citation and nothing visible fails. Keep every cited heading verbatim; that constraint
shapes the structure and outranks any tidier arrangement.

**After a rename or a collapse, repair the pointers.** Moving content does not move what references it. If the
file's name changed, `git grep` the old name: live docs, folder READMEs, the PR template, test helpers, and
source comments citing the rule that governs the code they sit in. Retarget the live ones; leave dated records
— a completed-TODO log, an `archive/`, applied migrations — since those describe what was true then.

### Check the claims, not only the pointers

- **A live pointer can still be a false claim.** A priming file can assert what its *surviving* tooling does —
  "the commit skill snapshots the database first" — and be describing a version that no longer exists. Verify
  a claim about a tool against the tool.
- **Check claims about *state*.** "Not yet done", "in progress", "planned", "the remaining blocker is X". A
  stale one of these is worse than a stale pointer, because an agent acts on it every session — a
  long-completed setup step described as critical and outstanding manufactures the same nagging conversation
  every time the file loads. One grep settles each.
- **A conditional whose condition became true hides a present defect.** "After attaching the final domain, set
  the build command to the real URL" stops being a future instruction the moment the domain is attached, and
  nothing flags it, because the sentence is still grammatically about the future.

### Then rewrite

- **Both declarations in the first two lines** ([`standard.md`](standard.md) §1).
- **Keep every gotcha.** Anything a session could not rederive by reading the code: what looks safe and is not,
  design rationale, conventions differing from tool defaults, non-guessable commands, failures that already
  happened once. This is the reason the file exists.
- **Find the gotchas that are not in it yet.** A pass that only subtracts leaves the file lighter and still
  missing the thing it exists for. The most consequential facts are usually in a `docs/` file, a decision log,
  a code comment, or auto-memory — not in the priming file. Promote them, subject to step 5's rule about
  running a memory's claim first.
- **Cut what the repository already answers** — directory layouts, dependency lists, standard build commands,
  architecture tours, API signatures copied from source, rules a linter already enforces. **Verify before you
  cut, per line:** "the repository already answers this" is a claim about the repository, so check it. `ls` the
  directory before deleting a route list; read `package.json` before deleting a build command. A line that
  turns out not to be derivable is a gotcha you were about to destroy, and it is unrecoverable once committed.
  The reverse holds too: if you cannot state what a kept line teaches that the code does not, it is a candidate
  for cutting. Both directions are one command.
- **Say each rule once**, drop emphasis stacking, and scrub attributions ([`standard.md`](standard.md) §3, §8).
- **In a shared repository, cut against the harness, not the machine** ([`standard.md`](standard.md) §2).
- **Every line kept or written is specific enough to check and safe if obeyed literally**
  ([`standard.md`](standard.md) §3).

## Step 3 — Skills

- **Search the whole tree, not the root.** A skill inside a nested project or a template directory is invisible
  to a root-level audit and survives sweeps. Note that some command proxies rewrite `find` and reject compound
  predicates, printing a diagnostic to stderr and no results — which looks exactly like a clean "no skills"
  answer. Use a bare `-name` with no compound predicate, read stderr, and treat a zero reading as unproven.
- **Exactly one loaded skill directory.** Claude Code loads `.claude/skills` only. Copies under `.agents/`,
  `.gemini/`, `.github/` are not loaded and should not exist; three divergent copies of one skill make it
  ambiguous which is live.
- **A skill a repository *ships* is not one it loads, and the one-directory rule does not apply to it.** A
  skill installed into *other* projects is a product artifact; deleting it as a stray copy removes a feature.
  Review it under §Rewriting anyway — whatever it carries propagates to everyone who installs it — but leave
  it where it is.
- **Confirm no automatic reinstall path survives.** A `skills-lock.json`, a `package.json` `postinstall`, or a
  documented maintenance routine will undo the whole pass. Check the *maintenance documentation* specifically,
  not only `package.json` and prose: a "keep current" table listing a skill-restore command on a monthly
  cadence presents rebuilding the removed set as routine hygiene, in the one document someone opens in order to
  do maintenance. Where the local copy has been deliberately diverged from upstream, delete the lockfile rather
  than pruning it — its hash now asserts something false.
- **Read an archived skill for project content before treating it as disposed of.** A behaviour skill with a
  fill-in-the-blank section is exactly where someone will have recorded a project fact — a decided
  out-of-scope list, an audience, a domain constraint — and deleting the skill takes the fact with it. Record
  the negative result when there is nothing: "the deletion cost this repository nothing" is what makes the rest
  of the pass safe to trust, and without the check it is only an assumption.
- **Where a normalisation pass rewrote a skill, diff the survivor against its pre-normalisation copy.**
  Flattening several divergent copies to one version overwrites the ones that were *correctly* customised. For
  a normalised skill the archive is not a record for reinstatement — it is the last copy of the destination's
  own content.
- **A generic skill copied outward is wrong at the destination, not merely stale.** A branch policy naming
  branches this repository does not have, a precondition that exits on the only branch that exists — check that
  each surviving skill can actually run here.

### Rewriting a skill

1. **Strip compulsion.** A skill earns invocation through a clear description, not a mandate.
2. **Strip self-verification** — any instruction to verify, re-check, or prove its own work.
3. **Strip delegation defaults** — anything spawning subagents by default, and anything using them to review
   the model's own output.
4. **Strip output-enforcement** — anti-truncation and anti-placeholder rules are obsolete.
5. **De-escalate emphasis.** One statement at normal volume beats three at rising volume.
6. **Cut examples that narrow the space.** Describe the interface and its parameters instead; keep examples
   only where the *format* is the point.
7. **Split long skills.** A short `SKILL.md` pointing at detail files beats one long document.
8. **Sharpen the description.** It is the only always-resident part, and it decides whether the skill is found
   at the right moment.

**The test for anything kept or reinstalled:** would removing it make the model worse at a *task*, or merely
less constrained about *itself*? The first is worth having.

## Step 4 — TODO

- Confirm the archive hook exists and is wired under `hooks.Stop`, and that an archive file exists — the hook
  silently does nothing without one. A named archive file that does not exist is a dangling reference that is
  in fact a disabled control.
- **Then run it, and work whatever it flags.** Replicate the hook's own detection rather than eyeballing
  sections — same heading walk, same regexes, same outermost-wins rule — and print every title before writing.
- **The defects are in the fallback clause, not the tidying.** The hook detects markers; the failures live in
  the prose around them. A ticked item whose own body says "browser QA pending". A heading claiming work
  remains over a body recording it finished and verified. These only surface if the move is actually attempted.
  Re-mark genuinely pending work `[?]` rather than archiving it: a wrong `[?]` costs one re-check, a wrong `[x]`
  buries an unverified claim where nobody re-reads it.
- Afterwards, grep the moved titles — pointers like "see the completed section below" now dangle.
- Remove prose in `CLAUDE.md` that restates a TODO rule already stated elsewhere.
- **Where the repository does not track work in files**, there is nothing to enforce and deploying the hook
  creates the system the repository exists to keep out. Confirm, record it as not applicable, move on.

## Step 5 — Memory

Audit `~/.claude/projects/<sanitised-repo-path>/memory/`, per repository.

For each: is it still true, and does it still help? Memories written for an older model encode working
agreements shaped around limitations that no longer exist. Delete what became wrong, repair what points at
something removed, keep what is still real, and say what you deleted.

**"Still true" is measured, not judged — always before promoting a memory into the repository.** A memory is
invisible context no diff review ever sees, so a wrong one survives indefinitely, and promoting it into a
tracked file turns it into cited authority. A memory can state its own method and date and still be false,
because the method could not distinguish the conclusion from its opposite. **Run a memory's factual claim
before writing it into an artifact.**

## Step 6 — Settings, then `/doctor`

Apply the mechanical findings: dangling references, unused permission rules, broken paths, hooks wired to
scripts that no longer exist. Deleting a hook script and unwiring it are two edits; between them the hook fails
loudly rather than silently, so check both.

Then **ask the user to run `/doctor`** over the repository and paste the output back. Genesis does not run it.
Its `CLAUDE.md` proposals are inputs to step 2, not a separate edit; where they differ from
[`standard.md`](standard.md), the standard decides and you say which way you resolved it and why. Its
mechanical findings apply directly.

## Step 7 — Run the gate, then record

Run the gate the new `CLAUDE.md` names, even for a documentation-only pass, and record what it printed. It
costs one command and it is the difference between "the gate is X" as an assertion and as an observation. A
suite that has been red since some earlier commit is exactly what this finds — and a standard nobody can pass
teaches an agent to skip it.

**Then make that command runnable, not only stated.** `CLAUDE.md` naming a gate is a sentence; a repository is
armed when the same commands sit in `.claude/gate.cmd` with the runner beside them and something wired to read
the result. [`../../templates/user-layer/arm-the-gate.md`](../../templates/user-layer/arm-the-gate.md) is that
install, and it reports which of its four parts were already in place. A repository with no meaningful gate —
a records folder, a research repo — declares none and says so; that is an outcome, not a gap.

Then write, in the repository's own decision log or a `docs/` record:

- What was stripped, and the project gates deliberately kept.
- Every gotcha kept, and where each one came from if it was not already in the priming file.
- Every line cut as derivable, with the command that proved it derivable.
- Every line kept because it could not be explained.
- Anything the procedure called for that could not be done, with enough detail for someone else to finish it.
- What might have broken, to watch for over the next weeks of ordinary use.

Then stop, and let the user review the diff.
