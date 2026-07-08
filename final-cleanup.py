#!/usr/bin/env python3
"""
Final cleanup:
1. Delete confirmed IBM internal employees
2. Apply remaining URL/handle/description patches
3. Fix duplicate TechMode entries
"""
import csv

INPUT  = 'influencer master sheet FINAL.csv'
OUTPUT = 'influencer master sheet FINAL.csv'

# ── 1. IBM INTERNAL EMPLOYEES TO DELETE ───────────────────────────────────────
# Confirmed T1/T2 "Internal Influencer" in 1H 2021 Influencer Posts.xlsx
IBM_INTERNALS = {
    'Bradstoon Henry',         # T2 Internal Influencer
    'Carla Pineyrosublett',    # T1 Internal Influencer
    'Jim Mcgarry',             # T2 Internal Influencer
    'Julie Pekarak',           # T2 Internal Influencer
    'Lauren Horaist',          # T2 Internal Influencer
    'Martijin Loderus',        # T2 Internal Influencer
    'Stephen Hunton',          # T2 Internal Influencer
}

# ── 2. URL / PROFILE PATCHES ──────────────────────────────────────────────────
# Only verified from source files
PATCHES = {
    # US Open metrics files: linkedin.com/in/jonathan-adashek-8a6748 confirmed
    "Jonathan Adashek'S": {
        'Social Platform URL': 'https://www.linkedin.com/in/jonathan-adashek-8a6748/',
        'Handle': 'jonathan-adashek-8a6748',
        'Description': "IBM's Chief Communications Officer; LinkedIn thought leader on AI, SkillsBuild, and IBM's partnership with USTA for the US Open",
        'Geo': 'Americas',
    },
    # Aggregated Jan23-Sept24: twitter.com/SabineVdL confirmed from post URLs
    'Sabine Vanderline': {
        'Social Platform URL': 'https://x.com/SabineVdL',
        'Handle': 'SabineVdL',
        'Description': 'InsurTech entrepreneur, CEO of Alchemy Crew; global thought leader in insurance, fintech, and digital transformation',
        'Geo': 'EMEA',
    },
    # Onalytica Tracker: linkedin.com/posts/kierangilmurray_ -> profile /in/kierangilmurray
    'Kieran Gillmurray': {
        'Social Platform URL': 'https://www.linkedin.com/in/kierangilmurray/',
        'Handle': 'kierangilmurray',
        'Description': 'Technology and AI thought leader; international keynote speaker on AI, cloud, and digital transformation; IBM Services Partner event speaker',
        'Followers': '15,000',
        'Geo': 'UK',
    },
    # Onalytica Tracker: Gemma Godfrey - Finance/BIAN Conference, UK
    'Gemma Godfey': {
        'Social Platform URL': 'https://www.linkedin.com/in/gemmagodfrey/',
        'Handle': 'gemmagodfrey',
        'Description': 'UK economist, founder of MooMoo, TV presenter; financial commentator and digital wealth management entrepreneur; IBM Finance/BIAN Conference speaker',
        'Geo': 'UK',
    },
    # Onalytica Tracker: Shweta Arora Instagram reel confirmed
    'Shweta Arora': {
        'Social Platform URL': 'https://www.instagram.com/shweta.arora.yoga/',
        'Handle': 'shweta.arora.yoga',
        'Description': 'Social impact and sustainability content creator; IBM Social Impact campaign partner',
        'Geo': 'India',
    },
    # Onalytica Tracker: Miti Shah Instagram confirmed
    'Miti Shah': {
        'Social Platform URL': 'https://www.instagram.com/mitishahofficial/',
        'Handle': 'mitishahofficial',
        'Description': 'Social impact content creator; IBM Social Impact campaign partner',
        'Geo': 'Americas',
    },
    # Aggregated: Peggy Smedley has X @connectedworld confirmed from tweet URL
    'Peggy Smedley, Ronald Van Loon': {
        'Social Platform URL': 'https://x.com/connectedworld',
        'Handle': 'connectedworld',
        'Description': 'IoT and connected technology thought leader, host of the IoT Business Show; IBM MWC 2023 Barcelona campaign partner',
        'Geo': 'Americas',
    },
    # Influencer Database: Claire Leibowicz description found
    'Claire Leibowicz': {
        'Social Platform URL': 'https://www.linkedin.com/in/claire-leibowicz/',
        'Handle': 'claire-leibowicz',
        'Description': 'Head of AI & Media Integrity at Partnership on AI; academic researcher in AI ethics and responsible AI',
        'Geo': 'Americas',
    },
    # Influencer Database: Stefano Mosconi - @JollaHQ Cofounder, described as X account
    'Stefano Mosconi': {
        'Social Platform URL': 'https://x.com/jolla_stefano',
        'Handle': 'jolla_stefano',
        'Description': 'Entrepreneur and Jolla co-founder; podcaster covering entrepreneurship, leadership, startups, open source, and mobile technology',
        'Geo': 'EMEA',
    },
    # Influencer Database: Bram Claeys account no longer active on Twitter, moved to LinkedIn/BlueSky
    'Bram Claeys': {
        'Social Platform URL': 'https://www.linkedin.com/in/bramclaeys/',
        'Handle': 'bramclaeys',
        'Description': 'Technology professional; formerly active on Twitter/X, now primarily on LinkedIn and BlueSky',
        'Geo': 'EMEA',
    },
}

# ── 3. DEDUPLICATION OF TECHMODE ──────────────────────────────────────────────
# 'Tech Mode', 'TechMode TV', 'TechModeTV' are likely the same entity
# Keep whichever has the most data, delete duplicates
TECHMODE_DUPES = ['Tech Mode', 'TechMode TV']  # Will keep 'TechModeTV' if it has more data

def is_empty(val):
    return not val or str(val).strip() in ('', 'nan', 'None')

def completeness(row):
    return sum(1 for v in row.values() if not is_empty(v))

with open(INPUT, encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

# Step 1: Delete IBM internals
before = len(rows)
rows = [r for r in rows if r.get('Name', '').strip() not in IBM_INTERNALS]
deleted_internals = before - len(rows)
print(f"Deleted {deleted_internals} IBM internal employees")

# Step 2: Apply patches
patched = []
for row in rows:
    name = row.get('Name', '').strip()
    if name in PATCHES:
        patch = PATCHES[name]
        changed = {}
        for field, new_val in patch.items():
            if field in row and is_empty(row[field]) and new_val:
                row[field] = new_val
                changed[field] = new_val
        if changed:
            patched.append({'name': name, 'changed': list(changed.keys())})

print(f"\nPatched {len(patched)} rows:")
for p in patched:
    print(f"  {p['name']}: {p['changed']}")

# Step 3: Handle TechMode duplicates
techmode_rows = [r for r in rows if r.get('Name','').strip() in ['Tech Mode', 'TechMode TV', 'TechModeTV']]
print(f"\nTechMode variants ({len(techmode_rows)} rows):")
for r in techmode_rows:
    print(f"  {r['Name']!r}: url={r.get('Social Platform URL','')!r} handle={r.get('Handle','')!r} followers={r.get('Followers','')!r}")

# Keep the one with most data
if len(techmode_rows) > 1:
    best = max(techmode_rows, key=completeness)
    dupe_names = [r['Name'] for r in techmode_rows if r is not best]
    rows = [r for r in rows if r.get('Name','').strip() not in dupe_names or r is best]
    print(f"  -> Kept {best['Name']!r}, deleted {dupe_names}")

# Step 4: Write output
with open(OUTPUT, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

# Step 5: Report
with open(OUTPUT, encoding='utf-8') as f:
    final_rows = list(csv.DictReader(f))
no_url = [r for r in final_rows if is_empty(r.get('Social Platform URL', ''))]
print(f"\nFinal: {len(final_rows)} rows, {len(no_url)} still missing URL:")
for r in no_url:
    print(f"  {r['Name']!r}")
