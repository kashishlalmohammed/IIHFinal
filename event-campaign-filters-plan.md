# Event & Campaign Type Filter Plan

## Overview

Add two new filter dimensions to the Influencer Hub left panel: **Events** (multi-select) and **Campaign Type** (single-select). Both map to new array fields on the influencer data model. Mock data will be seeded with realistic assignments so filters work end-to-end in the demo. The filter UI stays in the existing 3-column grid, expanding from 2 rows to 3 (one empty slot in the last row).

---

## Sub-Tasks

---

### Sub-Task 1 — Extend the Influencer Data Model

**Intent**  
Add `events` (array of event tag strings) and `campaign_types` (array of campaign type strings) fields to every influencer in the mock data. This grounds the new filters in real-looking demo data before the live database is connected.

**Expected Outcomes**  
- All 9 influencer objects in `backend/src/data/influencers.js` have `events: [...]` and `campaign_types: [...]` fields  
- Assignments are realistic and varied — each influencer has 1–4 events and 1–3 campaign types  
- Some influencers share events (so filtering by an event actually returns multiple results)

**Todo List**  
1. Open `backend/src/data/influencers.js` and review all 9 influencer objects  
2. Add `events` array to each influencer using tags from the approved list below  
3. Add `campaign_types` array to each influencer using campaign type tags below  
4. Ensure at least 3 influencers share a common event (e.g. IBM Think) and at least 3 share a campaign type (e.g. AI for Business)

**Approved Event Tags**  
Major IBM: `IBM Think`, `IBM TechXchange`, `IBM Accelerate`  
Tech Industry: `AWS re:Invent`, `Dreamforce`, `NRF`, `Mobile World Congress`, `SXSW`, `KubeCon`, `VivaTech`, `AI Summit Korea`, `SIBOS`, `NY Tech Week`, `Gartner Data & Analytics`  
Sports & Culture: `Wimbledon`, `Ferrari / F1`, `US Open`, `NFL`, `GRAMMYs`, `Masters`

**Approved Campaign Type Tags**  
`AI for Business`, `Security`, `Hybrid Cloud`, `Automation / webMethods`, `Granite / Developer`, `Sports Survey 2025`, `UK Narrative`, `Cross-Geo`

**Relevant Context**  
- File: `backend/src/data/influencers.js`  
- All 9 influencer objects start around line 4

**Status** — `[ ] pending`

---

### Sub-Task 2 — Extend the Backend Filter Endpoint

**Intent**  
Make the `GET /influencers` endpoint respect the new `event` and `campaign_type` query parameters, filtering the returned list so only influencers whose arrays contain the requested value are returned.

**Expected Outcomes**  
- `GET /influencers?event=IBM+Think` returns only influencers whose `events` array includes `"IBM Think"`  
- `GET /influencers?campaign_type=Security` returns only influencers whose `campaign_types` array includes `"Security"`  
- Both params can be combined with existing filters (type, status, platform, etc.)  
- Passing no value for either param returns all influencers (unchanged behaviour)

**Todo List**  
1. Open the backend route that handles `GET /influencers` (likely `backend/src/routes/influencers.js` or `backend/src/index.js`)  
2. Locate where existing filter params (type, status, etc.) are read and applied  
3. Add `event` param handling: if present, filter list to influencers where `influencer.events.includes(event)`  
4. Add `campaign_type` param handling: same pattern with `influencer.campaign_types`

**Relevant Context**  
- Backend entry: `backend/src/index.js` or `backend/src/routes/`  
- Pattern to follow: existing query param filters already do array/string matching on flat fields  

**Status** — `[ ] pending`

---

### Sub-Task 3 — Add Filter UI: Campaign Type (Single-Select)

**Intent**  
Add a "Campaign Type" single-select dropdown to the left panel filter grid, consistent with the existing 6 `FilterSelect` dropdowns. This extends the grid from 6 to 7 filters.

**Expected Outcomes**  
- A "Campaign Type" dropdown appears in the filter panel with all 8 campaign type options plus "All Types" default  
- Selecting a campaign type updates the `filters` state and triggers a re-fetch  
- The dropdown resets to "All Types" when the reset/clear action is used  
- Layout: the grid becomes 3 rows × 3 columns (7 filters + 1 empty cell)

**Todo List**  
1. Open `frontend/src/App.js`, find the `filters` useState (line ~745) and add `campaign_type: ''`  
2. Find the `LeftPanel` filter UI section (lines ~239–267) and add a `FilterSelect` for Campaign Type  
3. Add the 8 campaign type options as the options array  
4. Wire `onChange` to `onFilter('campaign_type', v)`  
5. Verify the 3-column CSS grid accommodates 7 items cleanly (no CSS changes needed if grid uses `auto` rows)

**Relevant Context**  
- `frontend/src/App.js` lines ~239–267: filter UI  
- `frontend/src/App.js` line ~745: `filters` state  
- `FilterSelect` is a local wrapper component already used by all 6 existing filters  

**Status** — `[ ] pending`

---

### Sub-Task 4 — Add Filter UI: Events (Multi-Select)

**Intent**  
Add an "Events" multi-select filter to the left panel. Because there are ~18 event options across 3 categories, a multi-select with grouped options is more usable than a flat single-select. The selected events are sent to the backend as a repeated query param or comma-separated value.

**Expected Outcomes**  
- An "Events" filter appears as the 8th item in the filter grid  
- Users can select one or multiple events; the filter label shows how many are selected (e.g. "2 events")  
- Selecting events triggers a re-fetch; the backend receives them as `event=IBM+Think&event=KubeCon` (or comma-separated, whichever is easier to handle)  
- Clearing all selections returns all influencers  
- The UI is compact enough to fit the left panel without breaking layout

**Todo List**  
1. Add `events: []` (array) to the `filters` state  
2. Build a compact multi-select component (a `MultiFilterSelect`) using a Carbon `MultiSelect` or a custom checkbox dropdown — check if Carbon's `MultiSelect` is already imported/available in the project  
3. Add the 18 event options as a flat alphabetical list — no category headers
4. Wire selection changes to update `filters.events` array  
5. In the `useEffect` that builds the API query string, serialize `filters.events` as repeated `event=` params (or comma-separated if backend is simpler)  
6. Update Sub-Task 2's backend handler if comma-separated format is used instead of repeated params

**Relevant Context**  
- `frontend/src/App.js` line ~753: `useEffect` that builds query params and fetches  
- Carbon `MultiSelect` docs: check if `@carbon/react` MultiSelect is available in the project's imports  
- If Carbon MultiSelect is too heavy, a lightweight custom checkbox popover is fine — follow existing component style

**Status** — `[ ] pending`

---

### Sub-Task 5 — Show Event & Campaign Tags on Influencer Cards

**Intent**  
Surface the most relevant event/campaign context on each influencer card in the left panel list, so users can visually scan assignments without opening each profile.

**Expected Outcomes**  
- Each influencer card shows up to 2 event tags (truncated with "+N more" if the influencer has more)  
- Tags use a neutral/gray Carbon Tag style to distinguish them from platform and status tags  
- No layout shift — the tags slot in below the existing platform tags row  
- On the influencer detail panel (Overview tab), show the full `events` and `campaign_types` arrays as tag groups with labels

**Todo List**  
1. In `frontend/src/App.js`, find the `InfluencerCard` component (line ~170)  
2. Add event tags: render up to 2 `influencer.events` as `<Tag type="gray" size="sm">` with "+N" overflow label  
3. In `OverviewTab` (line ~220 area), add a "Events" row and "Campaign Types" row displaying all tags with section labels, following the existing `hub-section-label` / `hub-body-text` pattern  
4. Add minimal CSS if needed to keep the card height reasonable

**Relevant Context**  
- `InfluencerCard` component: `frontend/src/App.js` line ~170  
- `OverviewTab` component: `frontend/src/App.js` line ~220 area  
- Existing tag pattern: `<Tag type="blue" size="sm">IBM Content</Tag>`  
- CSS file: `frontend/src/index.css`

**Status** — `[ ] pending`

---

## Data Seeding Reference

Suggested event/campaign assignments for the 9 mock influencers (to be applied in Sub-Task 1):

| Influencer | Events | Campaign Types |
|---|---|---|
| Priya Sharma | IBM Think, IBM TechXchange, NY Tech Week | AI for Business, Granite / Developer |
| Jordan Riley | SXSW, Dreamforce, IBM Accelerate | AI for Business, Hybrid Cloud |
| Marcus Chen | KubeCon, IBM TechXchange, AWS re:Invent | Hybrid Cloud, Automation / webMethods |
| Aisha Okonkwo | Wimbledon, US Open, GRAMMYs | Sports Survey 2025, UK Narrative |
| Sam Patel | IBM Think, NRF, Mobile World Congress | AI for Business, Security |
| Riya Nair | VivaTech, AI Summit Korea, SIBOS | Cross-Geo, AI for Business |
| Tom Fischer | Ferrari / F1, Wimbledon, Masters | Sports Survey 2025 |
| Elena Vasquez | IBM TechXchange, Gartner Data & Analytics | Security, Hybrid Cloud |
| Carlos Mendez | IBM Accelerate, KubeCon, SXSW | Automation / webMethods, Granite / Developer |
