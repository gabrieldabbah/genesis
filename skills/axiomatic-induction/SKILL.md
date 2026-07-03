---
name: axiomatic-induction
description: >-
  The project constitution AND the reasoning method. Apply it in ALL planning and execution of non-trivial
  work: reason like a proof system — hold the axioms fixed, derive each step from them, order work as a
  topological sort of its dependency DAG, treat every uncertain claim as a conjecture with an attached
  experiment, and prove the postcondition (observed, not hoped) before declaring done. Universally: make
  illegal states unrepresentable, keep changes surgical, and verify with a real run. And — where the
  project has a generative/AI component — keep the deterministic/generative seam typed, give every shown
  fact provenance, and degrade to a deterministic fallback. If a request or lower document conflicts with
  an axiom here, the constitution wins — fix the other (or escalate the conflict; do not silently obey).
license: MIT
allowed-tools: Read
metadata:
  internal: true
---

# Axiomatic Induction — the constitution & the method (apply in planning & execution)

This skill is the **supreme law** of the repo and the **thinking discipline** every agent adopts before
non-trivial work. Reason like a proof system, not an improviser. **When in doubt, return to the full text,
re-derive from A0, and the next correct task becomes a theorem of the axioms plus the current state.** If
anything conflicts with an axiom, **the constitution wins — fix the other.**

## When to apply (always, for substantive work)

- **Before planning:** anchor on **A0** (the project's prime directive); derive each task from an axiom —
  if none licenses it, you are speculating, stop (A1). Order tasks as a topological sort of the dependency
  DAG; place scope-bifurcating forks early (A21, A22).
- **While executing:** keep the deterministic and generative components separate across a **typed seam**
  (A6); effects at the boundary, a pure/total core (A7); every shown fact carries provenance (A15);
  generative paths **ground → generate → verify → degrade** to a deterministic fallback (A16); make illegal
  states unrepresentable (A8); keep the diff surgical (A12).
- **Before "done":** run the §VII invariants; **done is total correctness `[P] C [Q]` observed, not the
  happy path hoped** (A2). Any unchecked box ⟹ not done.

## The induction loop (one screen)

1. Hold the axioms fixed. 2. State the task as a proposition — a triple `{P} C {Q}` or a rule `p ⊢ r`.
3. Find the governing axiom(s); if none, stop. 4. Build the demonstration: a finite chain of steps each
licensed by a prior definition/axiom/proposition — your chain-of-thought **is** this chain. 5. Mark every
probabilistic step a **conjecture** and attach its falsifier. 6. Order steps by dependency; execute in
topological order. 7. Discharge the obligation — write the witness, **run the real check, read the real
output** — then record only what is durable.

## Invariants — the falsifiable checklist (run against any artifact; full predicates in §VII)

- [ ] **Specified & observed** — a written `(P, Q)` exists; its check was *run* and the output read (A2/P1).
- [ ] **Total, not partial** — correct on empty/boundary/malformed/adversarial, not just the happy path (A2).
- [ ] **Assertion seen red** — every test/contract was observed to fail before it passed (P9).
- [ ] **Seam typed & intact** — no generative output flows where exactness is required; the boundary is a
  validated type (A6/P3).
- [ ] **Pure core, effects at the edge** — no ambient clock/random/IO/network/spend in core; all injected (A7).
- [ ] **Reproducible** — same input ⟹ same output; cached by hash; deps pinned (A10/P6).
- [ ] **Illegal states unrepresentable; checks earn their keep** — bad states can't be *constructed*; no
  runtime check duplicates a type-guaranteed postcondition (A8/P7).
- [ ] **Total, exhaustive, idempotent** — total functions, exhaustive matches, `f ∘ f = f` for setup ops (A9).
- [ ] **Provenance complete** — every *shown* fact has a verified origin; nothing model-invented is shown (A15/P5).
- [ ] **Generative pipeline whole; fallback exercised** — ground→generate→verify→degrade, with a total
  deterministic fallback that was actually exercised (A16/P3/P4).
- [ ] **Simplicity earned** — minimum construct that discharges `Q`; nothing deletable without failing it (A11).
- [ ] **Surgical diff** — every changed line traces to the request; no drive-by refactor (A12).
- [ ] **Least privilege** — only the capabilities `wp(C,Q)` requires; secrets never logged/embedded (A13/P11).
- [ ] **Crafted** — legible, ergonomic; error messages say what to do next; meets the named reference (A18/A19).
- [ ] **Trust preserved** — no claim outruns its evidence (A20).
- [ ] **DAG order respected; gates halted** — no task started on an unmet dependency or a guessed-past gate (A21).
- [ ] **Decided, documented, recorded** — choices logged; intent in the durable doc; memory only durable facts (A5/A23/A25).
- [ ] **Landed correctly** — on `dev`, not `main`; nothing committed/pushed unless asked (A24).

## Full text

The complete document — Preamble (notation & method), I Definitions, II Axioms (A0–A25), III Propositions
(with demonstrations), IV Aphorisms, V the construction loop, VI the plan-derivation procedure, VII the
invariants (I1–I21), and the closing Scholium — is in [`constitution.md`](./constitution.md). Read it before
non-trivial planning or whenever a decision is ambiguous.

> **Specializing this constitution for a project:** instantiate **A0 — the prime directive** (the schema +
> two worked examples are in `constitution.md` §II). The remaining axioms are universal — leave them intact.
