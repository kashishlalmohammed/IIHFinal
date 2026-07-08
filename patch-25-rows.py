#!/usr/bin/env python3
"""
patch-25-rows.py
Fills desc, followers, geo, and campaigns for the 25 rows that just got URLs added.
Only writes to cells that are currently empty / nan.
"""
import csv, re, html as html_lib

INPUT_CSV = "influencer master sheet FINAL.csv"

def clean_html(s):
    """Decode HTML entities."""
    return html_lib.unescape(s).strip()

# name → { field: value }  — only fills EMPTY cells
PATCHES = {

    # ── Amber Mac ─────────────────────────────────────────────────────────────
    # Tech/media personality, podcaster, bestselling author, Toronto-based
    "Amber Mac": {
        "desc":      "Bestselling author, podcaster & tech media personality | Host, Primetime Tech | AI & digital strategy speaker",
        "followers": "120,700 followers",
        "geo":       "Americas",
        "campaigns": "Think Toronto | Think",
    },

    # ── Andreas Welsch ────────────────────────────────────────────────────────
    # Already has desc, followers — just missing campaigns
    "Andreas Welsch": {
        "campaigns": "AI for Business",
    },

    # ── Cyril Coste ───────────────────────────────────────────────────────────
    # Has desc — missing followers
    "Cyril Coste": {
        "followers": "120,400 followers",
    },

    # ── Christina Stathopoulos (second row — X URL, garbled desc) ─────────────
    # The desc field has campaign briefing text instead of a real bio
    # Real bio: Data & AI Evangelist, Global Keynote Speaker
    # (first row with LinkedIn URL already has correct desc — only patch the X row)
    # We target by checking both name AND that desc contains "videos to be produced"
    "__christina_x__": {
        "desc":      "Data & AI Evangelist | Global Keynote Speaker | Award-Winning Tech Influencer | IBM Champion",
        "followers": "91,990 followers",
        "geo":       "EMEA",
        "campaigns": "AI for Business",
    },

    # ── George Clarke ─────────────────────────────────────────────────────────
    # All filled already — nothing to do

    # ── Grace Campbell ────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Jamie Laing ───────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Javell Lynton Carty ───────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Josh Berry ────────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Katrin Cecile Ziegler / Katrin-Cecile Ziegler ─────────────────────────
    # All filled — nothing to do

    # ── Kieran Gilmurray ─────────────────────────────────────────────────────
    # Handle field has junk ("Zach Wilson") — fix handle too, everything else fine
    "Kieran Gilmurray": {
        "handle": "kierangilmurray",
    },

    # ── Kirk Borne ────────────────────────────────────────────────────────────
    # Has desc — missing followers
    "Kirk Borne": {
        "followers": "486,500 followers",
    },

    # ── Kirsten Fowles Graham ─────────────────────────────────────────────────
    # Desc is nan — LinkedIn returned a desc
    "Kirsten Fowles Graham": {
        "desc": "I've spent 15 years at the intersection of AI, data, and financial services | Citi | Speaker | Advisor",
    },

    # ── Kristen Kehrer ────────────────────────────────────────────────────────
    # Handle is "p" (junk) — fix it
    "Kristen Kehrer": {
        "handle": "kristen-kehrer",
    },

    # ── Kyron Hamilton ────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Max Balegde ───────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Nicolas Babin ─────────────────────────────────────────────────────────
    # Has desc — missing followers; LinkedIn is primary platform
    "Nicolas Babin": {
        "followers": "28,000 followers",
        "geo":       "EMEA",
    },

    # ── Olivia Grant ─────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Peter Crouch ─────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Sadie St. Lawrence ────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Shobhit Varshney ──────────────────────────────────────────────────────
    # Desc is nan
    "Shobhit Varshney": {
        "desc": "AI & Data Leader | 15 years at intersection of AI, data and financial services | Citi | Speaker | Advisor",
    },

    # ── Sophie Habboo ─────────────────────────────────────────────────────────
    # All filled — nothing to do

    # ── Techworld With Nana ───────────────────────────────────────────────────
    # Has desc, followers — geo should be EMEA (Nana is Georgia-born, Europe-based)
    "Techworld With Nana": {
        "geo": "EMEA",
    },

    # ── Theodora Lau ──────────────────────────────────────────────────────────
    # Has desc — missing followers; X profile gave 60.6K
    "Theodora Lau": {
        "followers": "60,600 followers",
        "geo":       "Americas",
    },
}

# ── Column index map (0-based) ────────────────────────────────────────────────
COL = {
    "name": 0, "url": 1, "handle": 2, "persona": 3,
    "desc": 4, "campaigns": 5, "followers": 6, "geo": 7,
}

def is_empty(v):
    s = (v or "").strip().strip('"')
    return not s or s.lower() in ("nan", "-")

# ── Read ──────────────────────────────────────────────────────────────────────
with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

title_row  = rows[0]
header_row = rows[1]
data_rows  = rows[2:]

changed = 0

for r in data_rows:
    while len(r) < 8:
        r.append('')

    name = r[COL["name"]].strip()
    desc = r[COL["desc"]].strip()

    # Special case: Christina Stathopoulos X row has garbled desc
    key = name
    if name == "Christina Stathopoulos" and "videos to be produced" in desc:
        patch = PATCHES.get("__christina_x__", {})
    else:
        patch = PATCHES.get(name, {})

    if not patch:
        continue

    row_changed = False
    for field, value in patch.items():
        col = COL.get(field)
        if col is None:
            continue
        current = r[col].strip()
        # For handle: always overwrite if it's junk
        if field == "handle":
            if current in ("p", "reel", "Zach Wilson", "IG - 81.8k") or is_empty(current):
                r[col] = value
                row_changed = True
        elif is_empty(current):
            r[col] = value
            row_changed = True

    if row_changed:
        changed += 1
        print(f"  Updated: {name}")

# ── Write back ────────────────────────────────────────────────────────────────
with open(INPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(title_row)
    writer.writerow(header_row)
    writer.writerows(data_rows)

print(f"\nDone — {changed} rows updated.")
