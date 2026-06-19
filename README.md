# IBM Influencer Intelligence Hub

> BOB-athon 2026 · IBM Marketing Interns  
> Stack: React · `@carbon/react` · Node.js / Express · IBM Design System

> Created by: Pranav Chittharanjan, Kelly Poon, Kashish Lalmohammed, Munsoor Shaikh, Miguel Velazquez
---

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Node.js** | **≥ 22** | Backend uses the `node:sqlite` built-in module (added in Node 22) |
| **npm** | ≥ 10 | Bundled with Node 22 |
| **Python 3** | ≥ 3.9 | Only needed if you want to rebuild the SQLite DB from CSV source files |

Check your Node version before starting:

```bash
node --version   # must print v22.x.x or higher
```

If you're on an older version, install Node 22 via [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

---

## Quick start

### Option A — run both together (recommended)

From the **repo root**:

```bash
npm install          # installs concurrently (one-time)
npm run dev          # starts backend on :3001 and frontend on :3002
```

Open [http://localhost:3002](http://localhost:3002).

### Option B — run separately

**Terminal 1 — Backend API (port 3001)**

```bash
cd backend
npm install
npm start
```

**Terminal 2 — Frontend (port 3000)**

```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** The SQLite database (`backend/data/influencers.sqlite`) is committed to the repo — no extra setup needed to get data running.

---

## What it does

A centralized influencer management platform solving three jobs for IBM Marketing:

1. **Find** — Who have we worked with, and who fits this campaign?
2. **Evaluate** — How did they actually perform? (Re-engagement scorecard, 1–10)
3. **Decide** — Re-engage or find someone new?

Core differentiator: **#IBMPartner Content Sync** — every FTC-mandated `#IBMPartner` post by a creator becomes their automatic IBM content history, queried live from platform APIs.

---

## Features

### Left Panel
- **NL Search** — watsonx-powered keyword search (debounced, 400ms)
- **Filters** — Type · Status · Platform · Approval · Persona · IBM Content toggle
- **Influencer Cards** — Score ring, status badge, platform tags, follower count, IBM content flag
- Selected card highlighted with IBM Blue left border

### Right Panel — Profile
- **Dark header** — Score ring (SVG, color-coded by threshold), all decision signals at a glance
- **Platform stats strip** — follower counts per platform
- **4 tabs:**
  - **Overview** — Bio, campaign rationale callout, platform links, relationship owner
  - **Scorecard** — 120px score ring + weighted metric progress bars + collapsible methodology
  - **Past IBM Content** — Sync Content button, platform sync status indicators, content entries
  - **Feedback** — Campaign Team + IBM Developer Relations notes, separated

### Stats Bar (always visible)
Total Influencers · Active · Approved · Avg Score · Creators with IBM Content

### Global #IBMPartner Feed
Cross-influencer view of every synced IBM-sponsored post. Filterable by platform and IBM product.

---

## Scorecard formula

| Metric | External | Internal |
|--------|----------|----------|
| Engagement Rate | 35% | 40% |
| Reach / Impressions | 25% | 30% |
| Content Quality & Brand Fit | 20% | 20% |
| Cost Efficiency (CPE) | 20% | — |
| Advocacy Consistency | — | 10% |

Thresholds: **8.5–10** Strong · **7.0–8.4** Good · **5.0–6.9** Moderate · **< 5.0** Low

---

## API

```
GET  /api/stats
GET  /api/influencers              ?type= &status= &platform= &approval_status= &persona_group= &has_content= &q=
GET  /api/influencers/:id
GET  /api/influencers/:id/rate     (gated — add role check before production)
GET  /api/influencers/:id/score
GET  /api/influencers/:id/content
POST /api/influencers/:id/sync     triggers #IBMPartner content sync
GET  /api/influencers/:id/feedback
POST /api/influencers/:id/feedback { author, team, body }
GET  /api/content/feed             ?platform= &ibm_product=
POST /api/search                   { query: "natural language string" }
```

---

## Demo prep checklist

1. Start backend (`cd backend && npm start`)
2. Start frontend (`cd frontend && npm start`)
3. Pre-click **Sync Content** on Priya Sharma's profile and confirm posts appear — results are cached, never fire live API cold during pitch
4. Demo script Acts 2–8 use: search "watsonx" → Priya Sharma → Scorecard tab → Content tab → Sync → Global Feed

---

## Seed data

8 influencers seeded in the SQLite database (`backend/data/influencers.sqlite`):

| Name | Type | Score | Platforms |
|------|------|-------|-----------|
| Priya Sharma | External | 9.1 | YouTube, LinkedIn, X |
| Zoe Mensah | External | 8.7 | YouTube, Instagram, LinkedIn, TikTok |
| Dr. Amara Okonkwo | External | 8.3 | LinkedIn, YouTube, X |
| Aaliya Fernandez | Internal (IBM Dev Advocate) | 8.2 | YouTube, LinkedIn, X |
| Marcus Webb | Internal (IBM Distinguished Engineer) | 8.8 | LinkedIn, X |
| Jordan Riley | External | 7.7 | TikTok, Instagram, YouTube |
| Kenji Watanabe | External (dormant) | 7.0 | YouTube, X |
| Tyler Reeves | External (declined) | 5.6 | YouTube, X |

### Rebuilding the database from source CSVs

The committed SQLite file is ready to use. If you have the original CSV source files and need to rebuild from scratch:

```bash
cd backend
npm run build-db        # runs python3 src/scripts/build_db.py
python3 src/scripts/fix_dates.py        # normalise post_date values
python3 src/scripts/remap_personas.py   # apply persona mappings
python3 src/scripts/manual_fixes.py     # apply manual data corrections
```

The CSVs are not committed to the repo (they contain raw engagement data). Contact a project maintainer if you need them.

---

## Architecture

```
frontend/          React + @carbon/react
  src/App.js       All components (single-file for hackathon speed)
  src/index.css    All custom styles (Carbon tokens used throughout)

backend/
  src/index.js     Express REST API
  src/db.js        SQLite query layer (node:sqlite built-in)
  src/scripts/     DB build + maintenance scripts (Python 3)
  data/            influencers.sqlite — committed, ready to use
```

### Production path (post-hackathon)
- Swap SQLite for PostgreSQL via Supabase
- Wire YouTube Data API v3 live (YOUTUBE_API_KEY env var)
- Wire watsonx.ai for real NLP search + product auto-tagging
- Add IBM w3id SSO to gate rate/contact fields
- Deploy frontend to Vercel, backend to IBM Cloud
