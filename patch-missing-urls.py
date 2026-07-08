#!/usr/bin/env python3
"""
patch-missing-urls.py
Adds profile URLs to rows that have a handle but no URL.
"""
import csv, re

INPUT_CSV  = "influencer master sheet FINAL.csv"

# Maps norm(name) → resolved URL
# Platform determined from handle style + campaign context + description
URL_PATCHES = {
    # ── Instagram (Wimbledon / UK entertainment) ──────────────────────────────
    "George Clarke":           "https://www.instagram.com/georgeclarkeey/",
    "Grace Campbell":          "https://www.instagram.com/disgracecampbell/",
    "Jamie Laing":             "https://www.instagram.com/jamielaing/",
    "Javell Lynton Carty":     "https://www.instagram.com/javelllynton/",
    "Josh Berry":              "https://www.instagram.com/joshberrycomedy/",
    "Kyron Hamilton":          "https://www.instagram.com/kyron.hamilton/",
    "Max Balegde":             "https://www.instagram.com/max_balegde/",
    "Sophie Habboo":           "https://www.instagram.com/sophiehabboo/",
    "Peter Crouch":            "https://www.instagram.com/crouchy/",
    "Olivia Grant":            "https://www.instagram.com/agenomicsphd/",
    # Kyron Hamilton also on TikTok but Instagram is primary for Wimbledon campaign

    # ── LinkedIn ──────────────────────────────────────────────────────────────
    "Andreas Welsch":          "https://www.linkedin.com/in/andreasmwelsch/",
    "Katrin Cecile Ziegler":   "https://www.linkedin.com/in/katrin-cecile-ziegler/",
    "Katrin-Cecile Ziegler":   "https://www.linkedin.com/in/katrin-cecile-ziegler/",
    "Theodora Lau":            "https://www.linkedin.com/in/theodoralau/",
    "Sadie St. Lawrence":      "https://www.linkedin.com/in/sadiestlawrence/",
    "Shobhit Varshney":        "https://www.linkedin.com/in/shobhitvarshney/",
    "Kirsten Fowles Graham":   "https://www.linkedin.com/in/kirstenfgraham/",
    "Nicolas Babin":           "https://www.linkedin.com/in/nicolasbabin/",

    # ── X / Twitter ───────────────────────────────────────────────────────────
    "Kirk Borne":              "https://x.com/KirkDBorne",
    "Amber Mac":               "https://x.com/ambermac",
    "Cyril Coste":             "https://x.com/CyrilCoste",
    "Christina Stathopoulos":  "https://x.com/christinastathopoulos",

    # ── YouTube ───────────────────────────────────────────────────────────────
    "Techworld With Nana":     "https://www.youtube.com/@TechWorldWithNana",

    # ── Kieran Gilmurray: handle field has junk ("Zach Wilson") — use LinkedIn
    "Kieran Gilmurray":        "https://www.linkedin.com/in/kierangilmurray/",

    # ── Kristen Kehrer: handle is "p" (junk) — use LinkedIn
    "Kristen Kehrer":          "https://www.linkedin.com/in/kristen-kehrer/",

    # ── SKIP (junk handles or garbled rows):
    # Domagoj Vidovic   → handle "reel"   (no usable handle)
    # Eliza Wastcoat    → handle "reel"
    # Mau Lorenzo       → handle "reel"
    # Pauline Ebel      → handle "IG - 81.8k" (not a real handle)
    # Delia ...         → fully garbled row (description bled into name column)
}

# ── Read CSV ──────────────────────────────────────────────────────────────────
with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

title_row  = rows[0]
header_row = rows[1]
data_rows  = rows[2:]

patched = 0
for r in data_rows:
    while len(r) < 8:
        r.append('')
    name = r[0].strip()
    url  = r[1].strip()
    if url and url.lower() not in ('nan', '-') and url.startswith('http'):
        continue   # already has a URL
    if name in URL_PATCHES:
        r[1] = URL_PATCHES[name]
        patched += 1
        print(f"  Patched: {name:<35} → {URL_PATCHES[name]}")

# ── Write CSV back ────────────────────────────────────────────────────────────
with open(INPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(title_row)
    writer.writerow(header_row)
    writer.writerows(data_rows)

print(f"\nDone — {patched} URLs added.")
