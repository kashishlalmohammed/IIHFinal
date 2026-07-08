#!/usr/bin/env python3
"""
Patch batch 4: final URL patches from verified sources + delete confirmed IBM internal.
"""
import csv

INPUT  = 'influencer master sheet FINAL.csv'
OUTPUT = 'influencer master sheet FINAL.csv'

# Confirmed IBM internal from Influencer Program Leads - August 2021.xlsx
# lmateju@cz.ibm.com - Lukáš Matějů
IBM_INTERNALS = {'Luk\ufffd Mat?j?\ufffd'}  # unicode-mangled version in CSV

PATCHES = {
    # Concept Tracker Mexico: TikTok @ellygmr, Instagram post DQQOl09ERDE
    'Ellie Ellie': {
        'Social Platform URL': 'https://www.tiktok.com/@ellygmr',
        'Handle': 'ellygmr',
        'Description': 'Spanish-language content creator based in Mexico; IBM SkillsBuild Mexico campaign partner',
        'Geo': 'Americas',
    },

    # Concept Tracker Mexico: TikTok @eve.devs confirmed
    'Evelyn Arias': {
        'Social Platform URL': 'https://www.tiktok.com/@eve.devs',
        'Handle': 'eve.devs',
        'Description': 'Tech content creator based in Mexico; IBM SkillsBuild Mexico campaign partner',
        'Geo': 'Americas',
    },

    # Concept Tracker Mexico: TikTok @brujeriatech confirmed
    'Jes\ufffdS Guzm\ufffdN': {
        'Social Platform URL': 'https://www.tiktok.com/@brujeriatech',
        'Handle': 'brujeriatech',
        'Description': 'Tech content creator based in Mexico (BrujeriaTech); IBM SkillsBuild Mexico campaign partner',
        'Geo': 'Americas',
    },

    # Aggregated Oct25: Instagram @ranvi.med confirmed (US Concept Tracker Ranvi row)
    'Tanvir Alam': {
        'Social Platform URL': 'https://www.instagram.com/ranvi.med/',
        'Handle': 'ranvi.med',
        'Description': 'Medical and health tech content creator on Instagram; IBM SkillsBuild US campaign partner',
        'Geo': 'Americas',
    },

    # Influencer Database: Károly Zsolnai-Fehér - YouTube "Two Minute Papers"
    'K\ufffdRoly Zsolnai-Feh\ufffdR': {
        'Social Platform URL': 'https://www.youtube.com/@TwoMinutePapers',
        'Handle': 'TwoMinutePapers',
        'Description': 'Creator of Two Minute Papers YouTube channel; AI and machine learning research explainer; PhD researcher',
        'Geo': 'EMEA',
    },

    # Influencer Database: Sanjeev Kumar - "Climate. Energy..." bio, Twitter
    'Sanjeev Kumar': {
        'Social Platform URL': 'https://x.com/sanjeevkumar',
        'Handle': 'sanjeevkumar',
        'Description': 'Climate, energy, and progressive politics commentator; sustainability thought leader',
        'Geo': 'EMEA',
    },

    # Stacy Sherman - known CX thought leader, LinkedIn confirmed
    'Stacy Sherman': {
        'Social Platform URL': 'https://www.linkedin.com/in/stacysherman/',
        'Handle': 'stacysherman',
        'Description': 'Customer experience and CX thought leader, founder of DoingCXRight; LinkedIn author on customer experience strategy',
        'Geo': 'Americas',
    },
}

def is_empty(val):
    return not val or str(val).strip() in ('', 'nan', 'None')

with open(INPUT, encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

# Delete IBM internals
before = len(rows)
rows = [r for r in rows if r.get('Name', '').strip() not in IBM_INTERNALS]
deleted = before - len(rows)
print(f"Deleted {deleted} IBM internal employees: {IBM_INTERNALS}")

# Apply patches
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

with open(OUTPUT, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"\nPatched {len(patched)} rows:")
for p in patched:
    print(f"  {p['name']}: {p['changed']}")

# Final count
with open(OUTPUT, encoding='utf-8') as f:
    final = list(csv.DictReader(f))
no_url = [r for r in final if is_empty(r.get('Social Platform URL', ''))]
print(f"\nTotal: {len(final)} rows, {len(no_url)} still missing URL:")
for r in no_url:
    print(f"  {r['Name']!r} | geo={r.get('Geo','')!r}")
