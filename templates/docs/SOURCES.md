# {{PROJECT_NAME}} — Sources & Trusted Registry

> The curated list of **where truth comes from** for this project: the trustworthy documentation, advisory
> databases, package registries, reference implementations, and the **approved dependencies & tools** — plus
> the ones to **avoid**. When the operator asks to *search* for something or *add a dependency/tool*, the AI
> consults **this file first** and prefers these sources; anything pulled from outside it is a **conjecture**
> (D8/A3) until corroborated here, and **nothing shown to a user gets cited without a verified origin** (A15).
>
> This operationalizes three axioms at *selection* time: **provenance or it doesn't exist** (A15), **trust
> over polish** (A20), and **follow the reference, then surpass it** (A19) — and it extends the
> [`MAINTENANCE.md`](./MAINTENANCE.md) "check both ends" policy from *update*-time to *choosing*-time.
> Maintained by the **`sources`** skill; the dependency-vetting checklist below is the gate for adding anything.

---

## 1. The rule — trusted-first, grounded, conjecture-flagged

1. **Search the trusted registry (§3) before the open web.** Primary/official sources outrank everything.
2. **Ground every shown fact in a verified origin (A15/D6).** A number, API signature, version, or claim that
   cannot be traced to a source in §3 (or freshly verified and *added* to it) is **dropped, not shown** —
   `origin(fact) = None ⇒ fact ∉ output`. Better no citation than a wrong one.
3. **Mark un-corroborated material a conjecture (A3/D8).** Anything from a Tier-3 / unlisted source is a
   hypothesis with an attached check, never asserted as fact.
4. **Never invent a source, version, stat, or citation.** A fabricated provenance is the one unrecoverable
   error (A20). If you can't find it in a trusted source, say so.

## 2. Search protocol — when the operator says "search for X"

1. Identify the domain (language/framework/security/standard) and go to its **Tier-1** source in §3 first.
2. Pin to the **project's versions** (read the lockfile / `AGENTS.md` §1 stack) — docs for the wrong major
   version are a silent trap.
3. Corroborate any Tier-2/3 finding against a Tier-1 source before relying on it; cite the origin inline.
4. If the answer matters and isn't in §3, do a wider search, **then record the new trusted source back into
   §3** (with why it's trustworthy) so the registry compounds. Anything unverifiable ships as a conjecture
   with its falsifier, or not at all.

## 3. Trusted sources registry (tiered)

> Fill the `{{...}}` to the project's actual stack at bootstrap. Tier-1 is primary/authoritative; Tier-2 is
> vetted secondary; Tier-3 is use-with-caution (corroborate first); anti-sources are **never** cited.

### Tier 1 — primary / authoritative (prefer these)
| Domain | Source | Notes |
|---|---|---|
| Language | `{{LANG_DOCS}}` | the official language docs/reference, pinned to the project's version |
| Framework | `{{FRAMEWORK_DOCS}}` | the official framework docs, matching the installed major |
| Package registry | `{{PKG_REGISTRY}}` | the canonical registry (npm / PyPI / crates.io / pkg.go.dev) — read the package's own repo + docs |
| Standards | `{{STANDARDS}}` | the relevant spec (MDN/WHATWG/IETF RFC/W3C/ECMA/POSIX), the normative text |
| This project | the repo itself + `docs/` | `AGENTS.md`, `ARCHITECTURE.md`, the source — the ground truth for *our* contracts |

### Tier 2 — vetted secondary (reliable, still corroborate versions)
| Domain | Source |
|---|---|
| Security advisories | GitHub Advisory Database · OSV.dev · the NVD/CVE list · the ecosystem's audit (`{{AUDIT_CMD}}`) |
| Reference / style | `{{STYLE_GUIDE}}` · the framework's official examples · a named reference implementation (A19) |
| API / models | the **`claude-api`** skill for Claude/Anthropic model ids, params, pricing — never guess these |
| Maintainer channels | official release notes, changelogs, the project's own blog/GitHub releases |

### Tier 3 — use with caution (corroborate against Tier 1 before trusting)
- Community Q&A (Stack Overflow), technical blogs, conference talks — **dated**, version-sensitive, often
  stale. Useful for *direction*, never as the cited origin of a fact. Confirm against Tier-1 before relying.

### 🚫 Anti-sources — never cite, treat with suspicion
- SEO content farms / listicles / AI-generated content mills; unattributed "tutorials"; screenshots as fact.
- **Typosquatted / look-alike packages** (a name one character off a popular package), packages with no
  repo / no recent releases / a single anonymous maintainer, "helpful" forks of popular libs. A package is
  not trusted because a search surfaced it — it earns trust via §4.
- Anything that can't be traced to a real origin. Unverifiable ⇒ not shown (A15).

## 4. Dependencies & tools — the vetting checklist + the approved list

**Adding any dependency or tool runs this checklist first (the selection-time gate — A20/A11):**

- [ ] **Real & canonical** — it is the genuine package (exact name, official repo), not a typosquat/look-alike.
- [ ] **Maintained** — recent releases + commits, responsive issues, more than a lone anonymous maintainer.
- [ ] **Mature, not bleeding-edge** — a baked version (weeks/months old, not a brand-new `.0`) per MAINTENANCE.
- [ ] **Advisory-clean (both ends)** — the version you'd add carries no known advisory (GitHub Advisory / OSV
  / `{{AUDIT_CMD}}`) and isn't yanked/deprecated. Re-check at update time too.
- [ ] **License-compatible** — its license is compatible with this project's (`{{LICENSE}}`); copyleft noted.
- [ ] **Earns its weight (A11)** — it does something we genuinely shouldn't build; supply-chain/bundle cost is
  justified. Prefer the standard library or an already-present dep when it suffices.
- [ ] **Recorded** — the choice + rationale goes in [`DECISIONS.md`](./DECISIONS.md) and the row below.

### Approved dependencies (vetted — provenance recorded)
| Dependency | Version | Why / role | Source verified | Date |
|---|---|---|---|---|
| `{{DEP}}` | `{{VERSION}}` | `{{ROLE}}` | `{{REGISTRY_URL}}` | `{{DATE}}` |

### Approved tools (CLI / services / infra)
| Tool | Use | Source |
|---|---|---|
| `{{TOOL}}` | `{{TOOL_USE}}` | `{{TOOL_SOURCE}}` |

### Rejected / avoid (so the decision isn't re-litigated — A5)
| Candidate | Why rejected |
|---|---|
| `{{REJECTED}}` | `{{REJECT_REASON}}` |

## 5. Security & advisory sources (check on every add and on alert)

- **GitHub Advisory Database** — cross-ecosystem advisories.
- **OSV.dev** — open-source vulnerability DB (queryable by package+version).
- **NVD / CVE** — the authoritative CVE record.
- **Ecosystem audit:** `{{AUDIT_CMD}}` (e.g. `npm audit` / `pip-audit` / `cargo audit` / `govulncheck`).
- **Outdated check:** `{{OUTDATED_CMD}}`. Apply the MAINTENANCE careful-update policy — check both the
  **current** and the **target** version before moving.

## 6. Keeping this registry current

When a search surfaces a genuinely trustworthy source not listed here, **add it** (with one line on why it's
trusted and which tier). When a once-trusted source goes stale, unmaintained, or wrong, **demote or remove
it** — a wrong entry here is a silent trap (A25). Review on the MAINTENANCE cadence.

> Resolve every `{{...}}` at bootstrap to the real stack; then `grep -rn "{{" .` must be empty.
