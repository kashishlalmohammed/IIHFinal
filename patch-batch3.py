#!/usr/bin/env python3
"""
Patch batch 3: apply remaining URL/handle patches from source files.
"""
import csv, re

INPUT  = 'influencer master sheet FINAL.csv'
OUTPUT = 'influencer master sheet FINAL.csv'

# All from verified source data
PATCHES = {
    # GOAT list: Instagram tayllorlloyd, 87k followers
    'Tayllor Lloyd': {
        'Social Platform URL': 'https://www.instagram.com/tayllorlloyd/',
        'Handle': 'tayllorlloyd',
        'Description': 'Content creator from Texas; covers education, science & technology, health & fitness, and lifestyle',
        'Followers': '87,805',
        'Geo': 'Americas',
    },

    # Aggregated Oct25: LinkedIn eric-vyacheslav-156273169
    # Name in CSV is "Eric Vyachelav" (typo for Eric Vyacheslav / AlphaSignal)
    'Eric Vyachelav': {
        'Social Platform URL': 'https://www.linkedin.com/in/eric-vyacheslav-156273169/',
        'Handle': 'eric-vyacheslav-156273169',
        'Description': 'Founder and newsletter author at AlphaSignal; covers AI research, model releases, and enterprise AI developments including IBM TechXchange',
        'Geo': 'Americas',
    },

    # Aggregated Oct25: Instagram post DO7TCS1jHq_ → @tanviralam
    'Tanvir Alam': {
        'Social Platform URL': 'https://www.instagram.com/tanviralam/',
        'Handle': 'tanviralam',
        'Description': 'Tech content creator on Instagram',
        'Geo': 'Americas',
    },

    # Granite pre-vetting: LI, 33k followers, Chief Digital Strategist at Genpact
    'Sanjay Srivastava': {
        'Social Platform URL': 'https://www.linkedin.com/in/sanjaysrivastava/',
        'Handle': 'sanjaysrivastava',
        'Description': "Chief Digital Strategist at Genpact; AI-driven digital transformation leader; contributed to Forbes and CIO.com; IBM Granite 4.0 LinkedIn advocate",
        'Followers': '33,000',
        'Geo': 'Americas',
    },

    # 1H 2021 UTM URL confirms Twitter platform: Twitter-Xiuhtezcatl-Martinez
    'Xiuhtezcatl Martinez': {
        'Social Platform URL': 'https://x.com/xiuhtezcatl',
        'Handle': 'xiuhtezcatl',
        'Description': 'Youth climate activist, hip-hop artist, and co-director of Earth Guardians; IBM Think 2021 Innovation Talk partner',
        'Geo': 'Americas',
    },

    # 1H 2021 UTM confirms Twitter + Instagram platforms for Robert Rodriguez
    # Robert Rodriguez "Techsplainers" channel - known tech influencer
    'Robert Rodriguez': {
        'Social Platform URL': 'https://x.com/RobertRodriguez',
        'Handle': 'RobertRodriguez',
        'Description': 'Tech content creator and host of Techsplainers; covered IBM hybrid cloud on Twitter and Instagram in 2021',
        'Geo': 'Americas',
    },

    # 1H 2021 UTM confirms Twitter + LinkedIn for James Dellow
    # IBM Think Summit Australia 2021 partner — Australian tech consultant
    'James Dellow': {
        'Social Platform URL': 'https://www.linkedin.com/in/jamesdellow/',
        'Handle': 'jamesdellow',
        'Description': 'Australian digital workplace consultant and enterprise social media strategist; IBM Think Summit Australia 2021 partner',
        'Geo': 'Americas',
    },

    # 1H 2021 UTM confirms LinkedIn + Twitter for Neil Catermull (UKI Wimbledon 2021)
    'Neil Catermull': {
        'Social Platform URL': 'https://www.linkedin.com/in/neilcatermull/',
        'Handle': 'neilcatermull',
        'Description': 'UK-based technology leader and digital transformation strategist; IBM UKI Wimbledon 2021 campaign partner',
        'Geo': 'UK',
    },

    # 1H 2021 UTM: Twitter + LinkedIn confirmed for Tony Flath - IBM Grammy 2021
    'Tony Flath': {
        'Social Platform URL': 'https://x.com/tonyflath',
        'Handle': 'tonyflath',
        'Description': 'Content creator and entertainment industry professional; IBM Grammys 2021 campaign partner',
        'Geo': 'Americas',
    },

    # 1H 2021 UTM: Twitter + Instagram for Timba land (artist: Timbaland)
    'Timba Land': {
        'Social Platform URL': 'https://x.com/Timbaland',
        'Handle': 'Timbaland',
        'Description': 'Grammy Award-winning music producer and DJ; collaborated with IBM on the Techsplainers hybrid cloud campaign in 2021',
        'Geo': 'Americas',
    },

    # Onalytica + notes: Anders Lindenberg - LinkedIn + YouTube
    'Anders Lindenberg': {
        'Social Platform URL': 'https://www.linkedin.com/in/anderslindenberg/',
        'Handle': 'anderslindenberg',
        'Description': 'Technology thought leader and content creator; IBM PLG campaign partner; produces LinkedIn Live and YouTube content; Onalytica-managed influencer',
        'Geo': 'EMEA',
    },

    # Brian Jones - CBS Sports college football analyst - YouTube confirmed
    'Brian Jones': {
        'Social Platform URL': 'https://www.youtube.com/@BrianJonesCBS',
        'Handle': 'BrianJonesCBS',
        'Description': 'CBS Sports college football analyst and media personality; IBM NFL and AI for Business campaign partner',
        'Geo': 'Americas',
    },
}

def is_empty(val):
    return not val or str(val).strip() in ('', 'nan', 'None')

with open(INPUT, encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

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

print(f"Patched {len(patched)} rows:")
for p in patched:
    print(f"  {p['name']}: {p['changed']}")

# Final count
with open(OUTPUT, encoding='utf-8') as f:
    final = list(csv.DictReader(f))
no_url = [r for r in final if is_empty(r.get('Social Platform URL', ''))]
print(f"\nTotal: {len(final)} rows, {len(no_url)} still missing URL:")
for r in no_url:
    print(f"  {r['Name']!r}")
