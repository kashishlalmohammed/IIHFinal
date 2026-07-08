#!/usr/bin/env python3
"""
upgrade-and-apply-urls.py
1. Loads found-urls.json (95 entries from scan)
2. For each entry, tries to find a REAL PROFILE URL:
   - Scans the same source dump more carefully for a linkedin/x/insta/yt profile URL
   - Extracts profile URL from post URL context (e.g. linkedin post → linkedin profile)
   - Falls back to the raw found URL only if it's already a profile
3. Writes all real profile URLs back to the master CSV
4. Prints a clean report
"""
import json, re, csv, os
from pathlib import Path

WORKSPACE   = Path("/Users/kashishlalmohammed/.bob/playground/bobbits")
DUMPS_DIR   = WORKSPACE / ".bob/tmp/xlsx-dumps"
MASTER_CSV  = WORKSPACE / "influencer master sheet FINAL.csv"
FOUND_JSON  = DUMPS_DIR / "found-urls.json"

found = json.loads(FOUND_JSON.read_text(encoding='utf-8'))

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

def norm(s):
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

def clean_url(u):
    u = re.sub(r'[)\]>"\',;.]+$', '', u.strip())
    return u.split('\n')[0].strip()

def is_profile_url(u):
    u2 = u.lower()
    if 'linkedin.com/in/' in u2:
        slug = u2.split('/in/')[1].strip('/')
        return not any(bad in slug for bad in
            ['posts', 'activity', 'ugcpost', 'feed', 'update', 'pulse', 'sharing'])
    if 'instagram.com/' in u2:
        return '/p/' not in u2 and '/reel/' not in u2 and '/stories/' not in u2
    if 'x.com/' in u2 or 'twitter.com/' in u2:
        return '/status/' not in u2 and '/photo/' not in u2
    if 'youtube.com/@' in u2:
        return True
    if 'youtube.com/channel/' in u2 and '/videos' not in u2:
        return True
    if 'tiktok.com/@' in u2:
        return '/video/' not in u2
    return False

# ── Try to find profile URL from same dump as the post URL ───────────────────
def find_profile_in_dump(name, dump_source):
    """Re-scan the source dump looking specifically for a profile URL for this name."""
    if not dump_source.startswith('xlsx:'):
        return None
    dump_part = dump_source[5:]  # e.g. "IBM Smarter Business-14f7e1/sheet1.json"
    parts = dump_part.split('/')
    if len(parts) < 2:
        return None
    dump_dir = DUMPS_DIR / parts[0]
    sheet_file = dump_dir / '/'.join(parts[1:])
    if not sheet_file.exists():
        # Try scanning all sheets in this dump dir
        if not dump_dir.exists():
            return None
        sheet_files = list(dump_dir.glob('*.json'))
        sheet_files = [s for s in sheet_files if s.name != 'manifest.json']
    else:
        sheet_files = [sheet_file]

    name_key = norm(name)
    for sf in sheet_files:
        try:
            data = json.loads(sf.read_text(encoding='utf-8'))
        except Exception:
            continue
        headers = [str(h or '').lower().strip() for h in (data.get('headers') or [])]
        rows = data.get('rows') or []

        for row in rows:
            row_text = ' '.join(str(c or '') for c in row)
            if name_key not in norm(row_text):
                continue
            # Found the row — extract all URLs and pick the best profile URL
            urls = [clean_url(m.group(0)) for m in URL_RE.finditer(row_text)]
            for u in urls:
                if is_profile_url(u):
                    return u
    return None

# ── Also scan ALL dump directories for the name ──────────────────────────────
def find_profile_anywhere(name):
    """Scan ALL dump dirs for a profile URL for this name."""
    name_key = norm(name)
    if len(name_key) < 4:
        return None

    for dd in DUMPS_DIR.iterdir():
        if not dd.is_dir() or not (dd / 'manifest.json').exists():
            continue
        manifest = json.loads((dd / 'manifest.json').read_text(encoding='utf-8'))
        for sm in manifest.get('sheets', []):
            sf = dd / sm['file']
            if not sf.exists():
                continue
            try:
                data = json.loads(sf.read_text(encoding='utf-8'))
            except Exception:
                continue
            rows = data.get('rows') or []
            headers = [str(h or '').lower().strip() for h in (data.get('headers') or [])]

            # Find URL-like columns
            url_cols = [i for i, h in enumerate(headers)
                        if any(k in h for k in ('url', 'link', 'profile', 'twitter',
                                                 'linkedin', 'instagram', 'youtube',
                                                 'social', 'tiktok', 'handle', 'x.com'))]

            for row in rows:
                row_text = ' '.join(str(c or '') for c in row)
                if name_key not in norm(row_text):
                    continue
                # Found a matching row — check URL cols first
                for ci in url_cols:
                    if ci < len(row):
                        val = clean_url(str(row[ci] or ''))
                        if val.startswith('http') and is_profile_url(val):
                            return val
                # Then check all URLs in the row
                for m in URL_RE.finditer(row_text):
                    u = clean_url(m.group(0))
                    if is_profile_url(u):
                        return u
    return None

# ── Process each found entry ──────────────────────────────────────────────────
profile_urls = {}   # name → best profile URL

for name, entry in found.items():
    raw_url = entry['url']
    source  = entry['source']

    # If it's already a profile URL, use it
    if is_profile_url(raw_url):
        profile_urls[name] = raw_url
        continue

    # Try to find a real profile URL in the same source
    better = find_profile_in_dump(name, source)
    if better:
        profile_urls[name] = better
        continue

    # Full scan across all dumps
    better = find_profile_anywhere(name)
    if better:
        profile_urls[name] = better
        continue

    # Use raw URL as last resort (it's still something)
    profile_urls[name] = raw_url

# ── Also scan for names that weren't found at all ────────────────────────────
# Re-run find_profile_anywhere for names that got 0 results
with open(MASTER_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

still_missing = []
for r in rows[2:]:
    while len(r) < 8: r.append('')
    url = r[1].strip()
    name = r[0].strip()
    if not url or url.lower() in ('nan', '-') or not url.startswith('http'):
        if name not in profile_urls:
            still_missing.append(name)

print(f"\nSearching for {len(still_missing)} names not found in first scan …")
newly_found = 0
for name in still_missing:
    result = find_profile_anywhere(name)
    if result:
        profile_urls[name] = result
        newly_found += 1
        print(f"  NEW: {name:<40} → {result[:70]}")

print(f"Newly found: {newly_found}")

# ── Print final profile URL breakdown ────────────────────────────────────────
real_profiles = {k: v for k, v in profile_urls.items() if is_profile_url(v)}
post_only     = {k: v for k, v in profile_urls.items() if not is_profile_url(v)}

print(f"\nReal profile URLs: {len(real_profiles)}")
print(f"Post/activity only: {len(post_only)}")

# ── Apply to CSV ──────────────────────────────────────────────────────────────
patched = 0
for r in rows[2:]:
    while len(r) < 8: r.append('')
    name = r[0].strip()
    url  = r[1].strip()
    has_url = url and url.lower() not in ('nan', '-') and url.startswith('http')
    if not has_url and name in profile_urls:
        r[1] = profile_urls[name]
        patched += 1

with open(MASTER_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print(f"\nApplied {patched} URLs to CSV")
print("\n=== REAL PROFILE URLS WRITTEN ===")
for name, url in sorted(real_profiles.items()):
    print(f"  {name:<40} {url[:75]}")
print("\n=== POST/ACTIVITY URLS WRITTEN (no profile found) ===")
for name, url in sorted(post_only.items()):
    print(f"  {name:<40} {url[:75]}")
