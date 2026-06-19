# Responsive Design Plan — IBM Influencer Intelligence Hub

## Overview

The app is currently desktop-only with no media queries and several hardcoded fixed widths. The goal is to make the UI responsive across desktop (≥1024px), tablet (640–1023px), and mobile (<640px) screen sizes. All changes are confined to `frontend/src/index.css` and minor prop adjustments in `frontend/src/App.js`. No layout restructuring or component rewrites are needed.

**Breakpoints used:**
- `≥1024px` — Desktop (current default, no changes needed in base styles)
- `640px–1023px` — Tablet: stack the two panels vertically, reduce padding
- `<640px` — Mobile: single-column everything, compact stats, smaller type

---

## Sub-Tasks

---

### Sub-Task 1 — Fix the two-panel layout to stack on smaller screens

**Intent**
The `.hub-left-panel` has a hardcoded `width: 520px; min-width: 400px` which causes it to overflow or truncate the right panel on any viewport narrower than ~900px. On tablet/mobile the panels must stack vertically so both are fully accessible.

**Expected Outcomes**
- On desktop (≥1024px): left panel stays at 520px, right panel fills remaining space (unchanged from today)
- On tablet (640–1023px): left panel becomes full-width and stacks above the right panel; both scroll independently
- On mobile (<640px): same stacked layout, left panel height is capped (so the list doesn't consume the whole viewport) and the right panel follows below

**Todo List**
1. In `.hub-main`, change `overflow: hidden` to `overflow-y: auto` under the tablet breakpoint so the stacked layout scrolls as one page
2. Add a `@media (max-width: 1023px)` block:
   - `.hub-main`: `flex-direction: column; overflow-y: auto`
   - `.hub-left-panel`: `width: 100%; min-width: 0; max-height: 60vh; border-right: none; border-bottom: 1px solid var(--cds-border-subtle-00)`
   - `.hub-right-panel`: `min-height: 50vh`
3. Add a `@media (max-width: 639px)` block:
   - `.hub-left-panel`: `max-height: 55vh`

**Relevant Context**
- [`index.css` lines 47–65](frontend/src/index.css:47) — `.hub-main` and `.hub-left-panel` definitions
- [`App.js`](frontend/src/App.js) — layout rendered as `<div className="hub-main">` containing left and right panel divs

**Status:** `[ ] pending`

---

### Sub-Task 2 — Make the stats bar responsive

**Intent**
The stats bar has 5 tiles in a single `display: flex` row. On tablet/mobile they become too narrow to read. They should wrap to a 2–3 column grid on smaller screens.

**Expected Outcomes**
- Desktop: 5 tiles in one row (unchanged)
- Tablet: tiles wrap into 2–3 columns
- Mobile: tiles are 2-per-row with reduced font sizes

**Todo List**
1. Add `flex-wrap: wrap` to `.hub-stats-bar` at the tablet breakpoint
2. At `max-width: 1023px`, set `.hub-stat-tile.cds--tile` to `min-width: calc(33.33% - 1px)` (3 columns)
3. At `max-width: 639px`, set `min-width: calc(50% - 1px)` (2 columns) and reduce `.hub-stat-value` font-size from `2.25rem` to `1.5rem`

**Relevant Context**
- [`index.css` lines 17–45](frontend/src/index.css:17) — `.hub-stats-bar` and `.hub-stat-tile` definitions

**Status:** `[ ] pending`

---

### Sub-Task 3 — Reduce padding and fix filter grid on narrow screens

**Intent**
The filter grid is hardcoded to 3 columns (`.hub-filter-grid`). On mobile it collapses the dropdowns into unreadable widths. Padding throughout the left panel is also desktop-sized.

**Expected Outcomes**
- Tablet: filter grid reduces to 2 columns
- Mobile: filter grid becomes a single column (full-width dropdowns)
- Padding in `.hub-filters`, `.hub-tab-content`, and `.hub-profile-header` scales down on mobile

**Todo List**
1. At `max-width: 1023px`, change `.hub-filter-grid` to `grid-template-columns: repeat(2, minmax(0, 1fr))`
2. At `max-width: 639px`, change `.hub-filter-grid` to `grid-template-columns: 1fr`
3. At `max-width: 639px`, reduce `.hub-tab-content` padding from `1.5rem 2rem` to `1rem`
4. At `max-width: 639px`, reduce `.hub-profile-header` padding from `1.5rem 2rem 0` to `1rem 1rem 0`

**Relevant Context**
- [`index.css` lines 83–87](frontend/src/index.css:83) — `.hub-filter-grid`
- [`index.css` line ~337](frontend/src/index.css) — `.hub-tab-content`
- [`index.css` line ~256](frontend/src/index.css) — `.hub-profile-header`

**Status:** `[ ] pending`

---

### Sub-Task 4 — Make the platform strip wrap instead of scroll horizontally

**Intent**
`.hub-platform-strip` uses `overflow-x: auto` which creates a poor horizontal-scroll UX on touch devices. It should wrap to the next line on small screens.

**Expected Outcomes**
- Desktop: existing behavior unchanged
- Mobile/tablet: platform items wrap to a new line instead of forcing horizontal scroll

**Todo List**
1. At `max-width: 639px`, override `.hub-platform-strip` with `overflow-x: visible; flex-wrap: wrap`

**Relevant Context**
- [`index.css`](frontend/src/index.css) — search for `.hub-platform-strip`

**Status:** `[ ] pending`

---

### Sub-Task 5 — Make the StructuredList table horizontally scrollable on mobile

**Intent**
The StructuredList (scorecard table) has many columns and will overflow the viewport on narrow screens. Wrapping it in a horizontally-scrollable container is the standard accessible solution.

**Expected Outcomes**
- On desktop: table appears as-is
- On mobile/tablet: table can be scrolled horizontally within its container; no content is clipped

**Todo List**
1. In `App.js`, locate the `<StructuredListWrapper>` render and wrap it in a `<div className="hub-table-scroll">` 
2. Add `.hub-table-scroll` to `index.css`: `overflow-x: auto; -webkit-overflow-scrolling: touch`

**Relevant Context**
- [`App.js`](frontend/src/App.js) — search for `StructuredListWrapper`
- [`index.css`](frontend/src/index.css) — add new utility class near the bottom

**Status:** `[ ] pending`

---

### Sub-Task 6 — Add a mobile viewport meta tag

**Intent**
Without a proper viewport meta tag, mobile browsers render the page at desktop width and scale it down, making all the above CSS changes irrelevant on real devices.

**Expected Outcomes**
- `public/index.html` has `<meta name="viewport" content="width=device-width, initial-scale=1">` (it likely already exists from Create React App, but must be confirmed)

**Todo List**
1. Read `public/index.html` and confirm the viewport meta tag is present
2. If missing, add `<meta name="viewport" content="width=device-width, initial-scale=1">` inside `<head>`

**Relevant Context**
- [`public/index.html`](frontend/public/index.html)

**Status:** `[ ] pending`

---

## Implementation Order

Sub-tasks should be completed in order: 6 → 1 → 2 → 3 → 4 → 5

Sub-task 6 (viewport meta) is a quick check-and-fix that is a prerequisite for all other changes to take effect on real devices. Sub-tasks 1–5 are all independent CSS/minor JSX changes that can be reviewed one at a time.
