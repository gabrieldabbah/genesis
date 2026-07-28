# The standard — what genesis builds toward

The single rubric behind all three modes. **Create** writes a repository that already meets it.
**Transition** moves an existing repository to it. **System check** measures the user-level layer against it.

Read the section you need. If a mode's instruction and this file disagree, this file is the target and the
mode's step is how to reach it.

---

## 1. The two declarations

Every repository's priming file opens with two lines:

```markdown
**What this is:** <one line — a live service, a static site, a records folder, a research repo, a tool other people install>
**Who is exposed:** <nobody but the operator | customers of X | anyone who installs it>
```

They answer different questions and both are needed.

**What this is** decides *which standards apply at all*. A records folder has no server to secure and no
queries to bound; §5 is not relaxed for it, it is irrelevant to it. Applying it anyway produces ceremony that
teaches an agent to ignore the whole file.

**Who is exposed** decides *how much rigour* the applicable standards demand. The same static site gets a
different answer as a personal blog than as a client deliverable.

Neither is a grade. A records folder held to a server's bar is not "lower quality" — it is being measured
against the wrong thing.

**Verify the exposure line against the world, not against the repository.** If anything is or might be
deployed, request it — one `curl` settles it. Documents agree with each other because a stale fact gets copied
forward; agreement is not evidence. And ask what is *deployed*, not only whether something answers: fingerprint
the running build, and where a release branch exists, count the gap
(`git rev-list --count origin/<release>..origin/<work>`). A large gap silently invalidates every conclusion
drawn from the working branch about the live site — say so in the declaration block if it is real.

Getting this line wrong sets the rigour bar for everything else, so it is the one line most worth checking
externally, and it costs a single request.

## 2. Layers — what goes where

| Layer | Loaded | Holds |
|---|---|---|
| User-level `~/.claude/CLAUDE.md` | every session, every repository | what is true of all of this person's work |
| Repository `CLAUDE.md` | that repository's sessions | only what is true of that repository |
| `.claude/rules/*.md` with `paths:` frontmatter | documented to load only when a matching file is touched | path-specific guidance |
| Auto-memory `~/.claude/projects/<repo>/memory/` | that repository's sessions | personal context, never written into the repository |
| Skills | on invocation | how a *task* is done here |

**Tooling is not priming.** Method documents, rubrics and prompts a repository *ships* for an agent to run
somewhere else are invoked, not loaded. They are not part of this spine and the rules about instruction volume
do not apply to them.

**`.claude/rules/` is a documented mechanism that is easy to over-trust.** It relocates knowledge rather than
discarding it, which is the point — but if the rule does not load when expected, the knowledge is silently
absent. Before relying on it, confirm in `~/.claude/instructions-loaded.jsonl` that it actually loaded when a
matching file was touched. Until that is observed on the machine in question, do not move anything that cannot
afford to be silently absent, and never move a safety rule behind it.

**In a repository other people clone, cut against the harness, not against the machine.** "The user-level file
covers it" is a valid reason to drop a rule only from a repository nobody else clones. Everyone else gets their
own user-level file, or none — so the rule is simply gone for them. Check the claim against the base system
prompt every Claude Code user receives instead. Several rules do live there (report outcomes faithfully; act
once you have enough information; check in only when different readings lead to materially different work; the
memory protocol), and those cuts stand. The rest stay in the repository's file.

## 3. Writing a rule

**Specific enough to check, and safe if obeyed literally.** Instructions are followed at face value, so a rule
written for the common case is applied to the uncommon one too.

| Fails | Passes |
|---|---|
| "Be cost-efficient" | "A query whose result set grows with the data carries an explicit limit" |
| "Handle errors properly" | "A failed authorisation check denies; it never falls through to allow" |
| "A failure degrades rather than destroys" | "A multi-step mutation completes or leaves no trace" |
| "Ship it, working beats hardened" | "Input hardening is not the priority here; correctness still is" |

A slogan is either made checkable or cut. **If a rule could justify a decision you would reject, it is not
finished.**

**Say each rule once.** Where a rule appears three times, keep the clearest and delete the rest. Restatements
compete rather than reinforce.

**Drop emphasis stacking.** ALL-CAPS, ⛔, "MANDATORY", "this is now law". A plain sentence carries the same
weight and does not compete with the sentence after it.

## 4. Constraints carry a reason — recover it before obeying it

A number, limit, rule or convention is a compressed statement of a purpose. Before optimizing against it,
recover four things: **why it exists** (the failure it prevents), **what happens if it is exceeded** (hard
failure, gradual degradation, or nothing), **when it applies**, and **how it is enforced** (mechanically, or by
convention alone). A mechanical limit is a boundary; a directional guideline is a preference you may trade
against with reason; a convention nobody enforces is a suggestion. Treating any of the three as another is a
different mistake each time.

A rule stated without its reason is not thereby exempt: find the reason, or treat the rule as unverified and
say so.

**The worked example, because it recurs.** Claude Code's documentation suggests targeting under 200 lines per
`CLAUDE.md`, because longer files reduce adherence. But these files load in full regardless of length, and the
only hard threshold is a warning at 40,000 characters. What actually degrades adherence is **repetition and
contradiction**, so optimize for those directly — each rule stated once, no two rules in tension — and length
falls out. A trim that deletes a real gotcha to hit a line count has failed at the thing the count stood for.

## 5. Where a server accepts requests from anyone but the operator

Each is a property you can point at in a diff. These are rules about *granting authority and keeping data
valid*, and they end at that boundary.

- **Fail-safe defaults.** The default is denial. Authority comes from an explicit positive check, never the
  absence of a negative one — a query error, a missing row, an unhandled branch all deny.
- **Complete mediation.** Authorise every access to a protected resource at the point of access, per resource,
  per request. Never infer authority from an earlier step in the same flow.
- **Least privilege.** A component holds only the capabilities its result requires. Where a key bypasses
  row-level security, every query the application issues is a security boundary.
- **Allowlist, not denylist.** Enumerate what is permitted and reject the rest. A denylist claims to have
  imagined every attack.
- **Parse, don't validate.** Convert untrusted input into a typed value once, at the boundary, so downstream
  code receives data that cannot be invalid.
- **Make illegal states unrepresentable.** Encode constraints in types and schema: a type admitting an invalid
  state guarantees someone constructs it.
- **Idempotency.** Anything that grants, charges or mutates is safe to apply repeatedly, enforced by a unique
  constraint, conditional update or idempotency key. A disabled button is not a control.
- **Atomicity.** A multi-step mutation completes or leaves no trace. A partial write that grants an entitlement
  without its ledger row is a defect class, not an edge case.
- **Bounded reads.** Any query whose result set grows with the data carries an explicit limit and a
  deterministic order. A sweep must page: a limit alone leaves later rows permanently unreachable.
- **Effects at the boundary.** Clock, randomness, network and spend are injected, not ambient.
- **Observability.** A failure that cannot be diagnosed from its output will recur. Structured events at
  boundary crossings, traceable end to end.
- **Reversibility.** Every change has a defined way back: expand/contract migrations, rollable deploys,
  destructive operations behind an explicit confirmation.

**Outside that boundary the cost inverts.** For presentation, reporting and tooling — anything whose job is to
*show* something — refusing a request costs a retry, but refusing to render costs the feature. A screen that
blanks itself because a field was missing has not failed safe; it has failed, and it looks broken to the person
who needed it. When a missing value, an unrecognised shape or old data reaches display code, the question is
*what does this person need to see*, not *what am I permitted to show*. Degrade toward the most useful honest
output, not toward nothing.

## 6. Anything with code, server or not

- **Economy of mechanism.** The simplest construct that satisfies the requirement. Complexity is where defects
  hide, and a mechanism nobody understands is one nobody can maintain.
- **Surgical change.** Every changed line traces to the request. Do not reformat adjacent code or refactor what
  is not broken. Name unrelated problems; do not fix them uninvited.
- **Correctness.** Low exposure means input hardening and abuse resistance are not the priority. It never means
  being casual about being right.
- **Reproducibility.** Same input, same output. Dependencies pinned; no ambient clock or randomness in core
  logic.
- **Prefer the state over a flag representing it.** When the goal is that something is gone, delete it — do not
  set a flag meaning "ignore this". When the goal is that a value cannot be invalid, make the type refuse it. A
  flag standing in for a state is a second source of truth that drifts from the first. Name the end state
  before choosing the mechanism.
- **A typed seam where generated output meets exact computation.** Where a project has a generative component,
  the boundary between what is computed and what is generated is a validated type. Generated output never flows
  where exactness is required, every shown fact has a verified origin, and there is a deterministic fallback
  that has actually been exercised — not merely written.

## 7. Everywhere, including documents and records

- **Claims carry their evidence.** "It works", "the tests pass", "this is fixed" are claims about the world.
  Say what you ran and what it printed, or say you have not checked. The same applies to claims about intent
  and context: "the convention here is X" is an assertion — establish it by reading, or mark it as an
  assumption and proceed visibly. This is honesty about claims, not a licence to add checking ceremony around
  work already done.
- **Designs are hypotheses.** A rule, schema, classification, filter or threshold is a claim about data that
  already exists. Run it against that data before shipping it — the check is almost always one command and the
  data is almost always already in front of you. Coherent reasoning is not evidence; when a derivation feels
  clean, that is the strongest signal the check was skipped. And "data that already exists" means the rows
  already written: when you change the shape of anything stored as a snapshot, say what the records that
  predate the change render as, before shipping.
- **When a scheme requires an awkward answer for a real case, the scheme is wrong — not the case.** Adding an
  exception patches around the failure rather than fixing it.
- **Check the result against the goal, not against the rule.** Every rule here compresses a goal, and a rule
  can be satisfied while its goal is missed. Before calling anything done, name what the rule stood in for and
  check the result against that.

## 8. Never in a repository artifact

**Personal names as the justification for a rule, or who asked for something.** Write the reason a rule exists
— the failure it prevents — not the person who requested it. Two failures otherwise: it leaks when the
repository is shared or published, and it ages badly, since "the owner insisted on <date>" says nothing about
whether the rule is still right.

> Not: *"⛔ The owner had to repeat this 3×; it is now law."*
>
> Instead: *"Completed items move out of the TODO file. A list that accumulates finished work forces everything
> to be re-verified by hand."*

Two carve-outs, because obeyed literally the rule deletes things it was never aimed at:

- **A dated decision log is the opposite of attribution.** `DECISIONS.md`, an ADR directory, a dated TODO
  archive preserve the reasoning so a decision can be re-evaluated. Date those entries.
- **A name that is the *subject* of a record is a fact.** An LLC's sole member, a signatory, a domain
  registrant, an author being cited. Those stay. What goes is a name standing in for a reason.

**The prohibition is scoped to repositories that get shared, published or shipped.** A private records folder
is the opposite case: the owner's name and account facts *are* the records, and there is no leak to prevent.
Check what the repository *is* before applying a prohibition written for what it is not.

**Secrets never appear in an artifact, a log, or model output.** Machine-specific paths and personal
configuration belong in an untracked local file, never in a committed one.

## 9. TODO discipline

**Where a repository states its own rule, that rule wins.** What follows is the default for a repository that
says nothing, and it is what genesis scaffolds.

A completed **section** is moved — removed from the live TODO file, appended to the dated archive under a dated
heading. A section moves when it holds no open items at all. `[x]` on an item inside a section still in
progress is correct and stays: it records that one part is built while the unit is not.

Detection is at section level for a reason that was measured, not reasoned: individual `[x]` items accumulate
legitimately during active work, so flagging them is noise. Only a whole unit that is complete and unmoved is a
real miss.

Two things break this silently and are worth checking by hand: **an open item written as prose with no marker**
reads as finished to any detector, and **a heading that contradicts its own body**. The markers are what a hook
can see; the failures live in the prose around them.

**Where a repository's own rule forbids task files** — routing action items to a task manager instead — there
is nothing to enforce and deploying the hook creates the system the repository exists to keep out. Record the
step as not applicable and move on.

## 10. Where the repository defines gates

Tests, audits, checks that must pass — these are **properties of the artifact**, not instructions about
conduct, and they stay. "The test suite passes before commit", "code that takes public input gets a security
audit", "the build must be green" are facts about what ships.

The distinction that matters throughout: does a line instruct **the model's conduct**, or state **a property
the artifact must have**? Conduct is scaffolding. Properties are the standard.

**Run the gate before calling work done, and record what it printed.** That turns "the gate is X" from an
assertion into an observation — and a gate nobody can pass teaches an agent to skip it, so a red gate found
this way is the finding, not an inconvenience.

## 11. Reporting to the operator

Applies to every message genesis writes, in every mode. The person reading it did not read what genesis read,
and the report is the only part of the work most of them will ever see — so a report they cannot decode is
work that did not land.

**Lead with the thing that changes what they do.** Not the status line, not the method, not the order the work
happened in. Where one finding outweighs the rest, it is the first sentence.

**Name the real thing, not its address.** A section number, a line range, a symbol or a file path is an
address only the writer can resolve; the reader cannot open your context. `§7`, `lines 33–42` and
`standard.md §6` are addresses. "The gate shelled out to Python on a machine that has no Python" is the
finding. Put the address in parentheses after the words, for looking up — never in place of them.

**No term the operator has not used first.** Where one seems unavoidable, write the behaviour instead. A word
the repository's own author would have to look up has already failed.

**What was already fine collapses to a clause.** Findings earn sentences; clean checks earn their names in a
single line. A message that enumerates everything inspected is a log, and a log is not a report.

**Every item says what it is, why it matters, and what happens next** — including whose move it is. An item
nobody can act on without asking a follow-up question is not finished.

**Length is set by what the reader has to decide, not by what the work cost.** A long pass with one decision
in it is a short report. Detail nobody asked for waits until it is asked for.

**A durable record is not the report.** Where a mode writes its reasoning into a decision log or a `docs/`
record, that file takes the full detail and the operator gets the summary. Reading the record aloud is how a
report becomes a wall.

The test: read it back as someone who has not opened this repository. Every line they would answer with "what
is that?" is unfinished.
