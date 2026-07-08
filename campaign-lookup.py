#!/usr/bin/env python3
"""
campaign-lookup.py
For each of the 48 people with campaigns but no URL, search the source xlsx dumps
for that person's name to find URL, handle, and location.
"""
import json, re, csv
from pathlib import Path

WORKSPACE  = Path("/Users/kashishlalmohammed/.bob/playground/bobbits")
DUMPS_DIR  = WORKSPACE / ".bob/tmp/xlsx-dumps"
MASTER_CSV = WORKSPACE / "influencer master sheet FINAL.csv"

def norm(s):
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

URL_RE = re.compile(
    r'https?://(?:www\.)?(?:'
    r'linkedin\.com/in/[^\s\"\',<>\)\]]+|'
    r'x\.com/[^\s\"\',<>\)\]]+|'
    r'twitter\.com/[^\s\"\',<>\)\]]+|'
    r'instagram\.com/[^\s\"\',<>\)\]]+|'
    r'youtube\.com/(?:@|channel/|c/)[^\s\"\',<>\)\]]+|'
    r'tiktok\.com/@[^\s\"\',<>\)\]]+)',
    re.I
)

def clean_url(u):
    return re.sub(r'[)\]>"\',;.]+$', '', u.strip()).split('\n')[0].strip()

def is_profile_url(u):
    u2 = u.lower()
    if 'linkedin.com/in/' in u2:
        slug = u2.split('/in/')[1].strip('/')
        return not any(b in slug for b in ['posts','activity','ugcpost','feed','update','pulse','sharing'])
    if 'instagram.com/' in u2:
        return '/p/' not in u2 and '/reel/' not in u2 and '/stories/' not in u2
    if 'x.com/' in u2 or 'twitter.com/' in u2:
        return '/status/' not in u2 and '/photo/' not in u2
    if 'youtube.com/@' in u2 or 'youtube.com/channel/' in u2:
        return True
    if 'tiktok.com/@' in u2:
        return '/video/' not in u2
    return False

# targets: list of (name, campaign_hint)
with open(MASTER_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

targets = []
for r in rows[2:]:
    while len(r) < 8: r.append('')
    url   = r[1].strip()
    name  = r[0].strip()
    camps = r[5].strip()
    no_url = not url or url.lower() in ('nan','-') or not url.startswith('http')
    has_camps = camps and camps.lower() not in ('nan','-') and len(camps) > 2
    if no_url and has_camps:
        targets.append(name)

print(f"Searching for {len(targets)} names across all dumps …")

# Load all dump manifests once
dump_dirs = [p for p in DUMPS_DIR.iterdir()
             if p.is_dir() and (p / 'manifest.json').exists()]

# Build an index: norm_sheet_content -> list of (dump_dir, sheet_file)
# Search each target across every sheet
results = {}  # name → {url, handle, location}

for name in targets:
    name_key = norm(name)
    if len(name_key) < 3:
        continue

    found_url = found_handle = found_location = None

    for dd in dump_dirs:
        if found_url and found_handle and found_location:
            break
        try:
            manifest = json.loads((dd / 'manifest.json').read_text(encoding='utf-8'))
        except Exception:
            continue

        for sm in manifest.get('sheets', []):
            sf = dd / sm['file']
            if not sf.exists():
                continue
            try:
                data = json.loads(sf.read_text(encoding='utf-8'))
            except Exception:
                continue

            headers = [str(h or '').lower().strip() for h in (data.get('headers') or [])]
            dump_rows = data.get('rows') or []

            # Column indices
            url_cols = [i for i,h in enumerate(headers)
                        if any(k in h for k in ('url','link','profile','twitter','linkedin',
                                                 'instagram','youtube','social','tiktok','x.com','handle'))]
            loc_cols = [i for i,h in enumerate(headers)
                        if any(k in h for k in ('location','country','geo','region','market',
                                                 'state','city','geography'))]
            handle_cols = [i for i,h in enumerate(headers)
                           if any(k in h for k in ('handle','username','twitter handle',
                                                    'linkedin handle','instagram handle',
                                                    'x handle','social handle'))]
            name_cols = [i for i,h in enumerate(headers)
                         if h in ('name','creator','influencer','full name','first name')]

            for row in dump_rows:
                row_text = ' '.join(str(c or '') for c in row)
                if name_key not in norm(row_text):
                    continue

                # Extract URL
                if not found_url:
                    for ci in url_cols:
                        if ci < len(row):
                            val = clean_url(str(row[ci] or ''))
                            if val.startswith('http') and is_profile_url(val):
                                found_url = val
                                break
                    if not found_url:
                        for m in URL_RE.finditer(row_text):
                            u = clean_url(m.group(0))
                            if is_profile_url(u):
                                found_url = u
                                break

                # Extract handle
                if not found_handle:
                    for ci in handle_cols:
                        if ci < len(row):
                            val = str(row[ci] or '').strip()
                            if val and val.lower() not in ('nan','-','') and len(val) > 1:
                                # Clean @ prefix
                                found_handle = val.lstrip('@')
                                break

                # Extract location
                if not found_location:
                    for ci in loc_cols:
                        if ci < len(row):
                            val = str(row[ci] or '').strip()
                            if val and val.lower() not in ('nan','-','') and len(val) > 1:
                                # Skip audience demographic strings
                                if '%' not in val and len(val) < 60:
                                    found_location = val
                                    break

                if found_url or found_handle or found_location:
                    break  # found something in this row

    if found_url or found_handle or found_location:
        results[name] = {
            'url': found_url,
            'handle': found_handle,
            'location': found_location
        }
        print(f"  FOUND: {name:<40} url={str(found_url)[:50]} handle={found_handle} loc={found_location}")

print(f"\nFound data for {len(results)}/{len(targets)} targets")

# Save results
out_path = DUMPS_DIR / 'campaign-lookup-results.json'
out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"Saved to {out_path}")
