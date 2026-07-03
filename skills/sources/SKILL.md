---
name: sources
description: 'Consult the project''s trusted-sources registry before searching the web or adding a dependency/tool, and ground every shown fact in a verified origin. Use when the user asks to search/research/look something up, find docs or an API signature, choose or add a dependency/library/tool, or mentions "/sources". Reads docs/SOURCES.md, prefers its Tier-1 trusted sources, version-pins to the project stack, vets any new dependency with the both-ends advisory check, records the decision, and flags anything un-corroborated as a conjecture. Never invents a citation, version, or stat; never adds an unvetted/typosquatted package.'
license: MIT
allowed-tools: WebSearch, WebFetch, Read, Edit, Bash
---

# Sources — trusted-first search & dependency vetting

## Overview

Enforce the constitution's provenance law (**A15** — a shown fact without a verified origin does not exist),
**A3** (un-corroborated claims are conjectures), and **A20** (trust over polish) at the moment of *searching*
and *choosing dependencies*. The registry is the project's `docs/SOURCES.md`; **read it fresh**
each run — it is the source of truth for what to trust:

```bash
cat docs/SOURCES.md
sed -n '/## 1. The project in 5 lines/,/## 2\./p' AGENTS.md   # the stack + versions to pin to
```

**Invocation is the authorization** for the search/vetting itself. The only thing surfaced to the operator is
a genuine fork (a license conflict, a risky-but-wanted dependency, a missing trusted source for a critical
fact) — and **the operator approves the actual install/commit** (A24), as for any change.

## A — When asked to search / research / look something up

1. **Trusted-first.** Identify the domain and go to its **Tier-1** source in `SOURCES.md` §3 before the open
   web (official language/framework docs, the standard, the package's own repo, this repo's own docs).
2. **Version-pin.** Match the project's installed major/version (lockfile + `AGENTS.md` §1) — docs for the
   wrong version are a silent trap.
3. **Corroborate & cite.** Any Tier-2/3 finding is confirmed against a Tier-1 source before you rely on it;
   cite the origin inline. **Ground every fact** — `origin(fact) = None ⇒ drop it`, never paraphrase a guess
   into a claim.
4. **Conjecture-flag the rest.** Anything from an unlisted/Tier-3 source is presented as a conjecture (D8)
   with its falsifier, or withheld — never asserted as fact.
5. **Compound the registry.** If you found a genuinely trustworthy source not in §3, **add it** (tier + one
   line on why) so the registry grows. For Claude/Anthropic model facts, defer to the **`claude-api`** skill.

## B — When asked to add a dependency or tool

Run the `SOURCES.md` §4 **vetting checklist** — do not skip a box:

```bash
# real & canonical (not a typosquat): inspect the package's OWN registry page + linked repo
#   e.g.  npm view <pkg> repository.url   /   pip show <pkg>   /   cargo info <pkg>   — then open the real repo
# advisory-clean, BOTH ENDS (the current version if replacing, and the target you'd add) — cmd from SOURCES.md §5:
#   npm audit  /  pip-audit  /  cargo audit  /  govulncheck   + query OSV / GitHub Advisory for exact name+version
```

- [ ] **Real & canonical** — exact name, official repo; **not** a look-alike/typosquat.
- [ ] **Maintained** — recent releases/commits, more than a lone anonymous maintainer.
- [ ] **Mature, not bleeding-edge** — a baked version (MAINTENANCE policy), never a week-old `.0`.
- [ ] **Advisory-clean (both ends)** — no known advisory, not yanked/deprecated.
- [ ] **License-compatible** with the project's license.
- [ ] **Earns its weight (A11)** — prefer the stdlib or an already-present dep when it suffices.

Then: **record** it — add the row to `SOURCES.md` §4 (Approved) with the verified registry URL + today's
date (`date +%F`, never guessed — A25), log the choice + rationale in `docs/DECISIONS.md`, and (if rejected)
add it to the §4 Rejected list so it isn't re-litigated. Propose the install command; the operator approves
the commit. A new dependency lands behind **green `test-gate`** (A2/A24).

## Hard rules (stop if you catch yourself doing these)

- Citing a fact/version/stat/API signature you did not verify against a real source. → ground it or drop it (A15).
- Inventing a URL, citation, or release date. → the one unrecoverable error (A20). Say "not found" instead.
- Adding a package because a search surfaced it, without the §4 checklist. → vet first; typosquats are real.
- Trusting a Tier-3 blog/Q&A as the origin of a fact. → corroborate against Tier-1, or mark it a conjecture (A3).
- Pulling docs for the wrong major version. → pin to the project's lockfile.
- Running the actual install/commit without the operator's go, or before `test-gate` is green. → propose; A24/A2.
