# {{PROJECT_NAME}} — Design

> The design system + screen specs. **Filled BEFORE building UI** (design precedes the build — A4). The `design`
> skill defines the bar; this file is its project-specific instance. Every UI TODO item traces to a screen spec
> here and inherits the UI definition-of-done.

## 1. Principles & references

- **Simplicity is the bar — "a parakeet could use it."** One primary action per screen; minimal text (the AI
  default is *too much* — cut); teach by doing; motion > words; smart defaults over forms. Passes the parakeet
  test: usable by recognition and tapping, without reading. `{{SIMPLICITY_NOTES}}`
- Quality bar / inspiration (2–3 best-in-class references, grounded — see `docs/SOURCES.md`): `{{REFERENCES}}`
- What "good" feels like here (1–2 lines): `{{FEEL}}`

## 2. Design tokens (define once; never hand-pick values in components)

- **Type:** families `{{FONTS}}`; scale `{{TYPE_SCALE}}` (e.g. 12/14/16/20/24/32/48); base line-height `{{LH}}`.
- **Spacing:** `{{SPACING_SCALE}}` (4- or 8-pt rhythm).
- **Color (semantic tokens):** bg, surface, text, muted, border, primary, success, warning, danger — with
  hover/active/disabled variants. Dark mode: `{{DARK_MODE}}`. All must meet contrast (see §5).
- **Radius / shadow / z-index / breakpoints:** `{{RADII}}` / `{{SHADOWS}}` / `{{Z}}` / `{{BREAKPOINTS}}` (mobile-first).

## 3. Component library (built from tokens, reused — no one-off restyles)

For each component list the states it must implement. Required components: `{{COMPONENTS}}`
(button, input, select, card, modal, toast, table, nav, empty-state, …).

> Every component implements: default · hover · focus-visible · active · disabled · loading · empty · error ·
> success/selected.

## 4. Screens & flows

For each screen, specify layout + **all states**. Duplicate the block per screen.

### {{SCREEN_NAME}}
- **The ONE primary action** (name it; everything else recedes): `{{...}}`
- States (keep each minimal — icon + one line + one action, never a paragraph): **loading** (skeletons) ·
  **empty** (guidance + primary action) · **error** (retry) · partial · **success** · edge cases (long text,
  many items, zero items, slow network).
- Responsive notes (mobile → up): `{{...}}`
- Copy / microcopy (real, minimal, not lorem — try to delete each string): `{{...}}`

## 5. Accessibility (WCAG 2.1 AA — required)

Semantic HTML + landmarks · full keyboard operability with visible focus · contrast ≥ 4.5:1 text / 3:1 large &
UI · labelled inputs + announced errors · ARIA only when needed · alt text · respect `prefers-reduced-motion` ·
targets ≥ 24px. Verified by the `a11y` worker.

## 6. UI definition of done (acceptance criteria for every UI TODO item)

**passes the simplicity bar** (one clear primary action · minimal text · teaches by doing · purposeful motion ·
parakeet test) · matches the design system · all component **and** screen states implemented · responsive at
every breakpoint · WCAG AA (contrast + keyboard + focus) · reduced-motion respected · real **and minimal**
microcopy · no console errors · reviewed by `design` + `a11y`.
