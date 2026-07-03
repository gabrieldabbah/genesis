---
name: design
description: "UI/UX craft standards and a design process to apply BEFORE and DURING any interface work — so genesis output looks and feels high quality, not low-effort. Use whenever the project has a UI: before building screens/components, when styling, choosing a design system, or reviewing UI quality, and on any mention of design, UX, layout, component, screen, styling, theme, responsive, or accessibility. Defines design tokens, the full set of component/screen states (incl. empty/loading/error), responsive + accessibility (WCAG AA) requirements, and a UI definition-of-done. Pairs with the design and a11y specialist workers."
license: MIT
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, WebSearch, WebFetch
---

# Design — make the UI genuinely good (not an afterthought)

Low-effort UI is the default failure mode. Prevent it: do design **before** building, encode a system, and hold
every screen/component to a real bar. Apply this for any project with an interface. Record decisions in
`docs/DESIGN.md` (template: `templates/docs/DESIGN.md`).

## Simplicity is the bar — "a parakeet could use it"

The default AI failure mode is **too much text and too many controls**: models are text-native, so words feel
free and safe. They are not — every word and every control is friction. **Good design is what you remove.** The
target is the floor set by TikTok / Reels / a light switch: the user understands and acts in **seconds, by
recognition, without reading**. This lens governs every craft rule below; when in doubt, cut.

- **One primary action per screen, unmistakable.** If you can't name the single thing the user came here to do,
  the screen does too much — split it or cut. Secondary actions recede or hide behind progressive disclosure.
- **Minimize words.** Labels, not sentences; verbs, not explanations. No instructional paragraphs, no walls of
  help text. Before shipping any string, try deleting it — if the screen still makes sense, it should be gone.
  Replace words with **icons, imagery, direct manipulation, and motion** wherever meaning survives. (Reduce
  *visible* text, never **accessible** names — an icon still needs a label for screen readers; see a11y.)
- **No slop, no hype.** The words that remain must say something true and concrete. Ban empty superlatives
  ("seamless", "world-class", "effortless"), metaphors that mean nothing ("build the road to perfection"), and
  "not just X, but Y" hype. Never *tell* the user the product is great — let the working UI show it. If a
  string doesn't name a real benefit, feature, or next action, it's decoration: cut it.
- **Teach by doing, not by reading.** Onboarding approaches zero text: let the user touch the real thing and
  reveal the next affordance in place. A tooltip or help text that exists to explain a confusing control is a
  bug in the control — fix the UI instead.
- **Default, don't ask.** Pick a smart default over a form or setting; surface the rest later. A blank form is a
  question you failed to answer for the user.
- **Motion is communication, not decoration.** Use animation to show causality, state change, and where things
  come from and go — it replaces sentences and adds delight. 150–250ms, ease-out, and **honor
  `prefers-reduced-motion`** with an instant non-animated path.
- **Content-first, minimal chrome** (the Reels model): the content *is* the interface; controls are few, large,
  edge-anchored, and quiet until needed.
- **The parakeet test (an acceptance check):** could someone who can't read the language — or a small child —
  complete the primary task by recognition and tapping alone? If operating it *requires reading*, simplify.

Simplicity disciplines the craft rules below; it does not cancel them. "Every state" still holds — but an
empty/error state is an icon + one line + one action, **not** a paragraph. "Real microcopy" means **fewer,
sharper** words — never lorem, never a wall.

## Process (design precedes the build — A4)

1. **Study the best that exists first** (use the `sources` skill + WebSearch): the 2–3 **best-in-class** products
   in the space — the bar is "match or beat the best in existence," not "look at some prior art." Capture *why*
   they feel good (hierarchy, spacing, motion, restraint) and make them the **named references** the UI must meet
   or beat (A18/A19). Ground every choice; don't guess. For frontend stacks, **use** a craft skill (e.g.
   `frontend-design`, vercel React best-practices, impeccable) alongside this one — improvising what it does
   better is a defect.
2. **Define the design system** in `docs/DESIGN.md` *before* screens (tokens below).
3. **Design the key screens & flows** as specs — every screen lists ALL its states (below) — before coding them.
4. **Build** with the `design` specialist worker; **review** with `design` + `a11y` before any UI item is done.

## The design system (define once, reuse everywhere)

- **Type scale** — one or two families; a modular scale (e.g. 12/14/16/20/24/32/48); line-height + measure
  (~45–75 chars). No ad-hoc font sizes.
- **Spacing scale** — a 4- or 8-pt rhythm; use scale steps, never arbitrary px. Whitespace is a feature.
- **Color** — semantic tokens (`bg`, `surface`, `text`, `muted`, `primary`, `success`, `warning`, `danger`,
  `border`), not raw hexes scattered in components. Define hover/active/disabled variants. Dark mode if relevant.
- **Radius, shadow, border, z-index, breakpoints** — tokenized and consistent.
- **Components** — a small library (button, input, select, card, modal, toast, table, nav, empty-state) built
  from the tokens, reused — never one-off restyles.

## Every component implements EVERY state

default · hover · focus-visible (a visible focus ring) · active · disabled · **loading** · **empty** · **error** ·
success/selected. A control with only a default state is unfinished.

## Every screen implements EVERY state

loading (skeletons, not just spinners) · empty (with guidance + a primary action, not a blank page) · error
(recoverable, with a retry) · partial · success · and edge cases: very long text, many items, zero items, slow
network. "Happy path only" is a defect.

## Layout, hierarchy, polish

- Clear visual hierarchy (size/weight/spacing/color guide the eye); one primary action per view.
- Consistent alignment and spacing rhythm; optical alignment where needed; a max content width for readability.
- **Responsive, mobile-first**: design at the smallest breakpoint, then up. Test at each breakpoint.
- Purposeful motion only: 150–250ms, ease-out; **respect `prefers-reduced-motion`**.
- Microcopy: specific labels, helpful empty/error text, no lorem ipsum shipped.

## Accessibility (WCAG 2.1 AA — non-negotiable; see the `a11y` worker)

Semantic HTML; full keyboard operability with visible focus; contrast ≥ 4.5:1 text / 3:1 large & UI; labels for
every input; ARIA only when semantics don't suffice; images have alt text; motion respects reduced-motion;
target sizes ≥ 24px.

## UI definition of done (a UI TODO item isn't done until ALL hold)

**passes the simplicity bar** (one clear primary action · minimal text — every visible string earns its place ·
teaches by doing · motion purposeful) · matches the design system (tokens, components) · all component **and**
screen states implemented · responsive at every breakpoint · WCAG AA (contrast + keyboard + focus) ·
reduced-motion respected · microcopy real **and minimal** · no console errors/warnings · reviewed by `design` +
`a11y`. Seed these as acceptance criteria on UI TODO items.
