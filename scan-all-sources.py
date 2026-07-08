#!/usr/bin/env python3
"""
scan-all-sources.py
Scans every xlsx dump, CSV, and DOCX in the workspace for URLs
matching the 142 names that are still missing a Social Platform URL.

Outputs: .bob/tmp/xlsx-dumps/found-urls.json
"""
import json, re, csv, os, sys
from pathlib import Path

WORKSPACE   = Path("/Users/kashishlalmohammed/.bob/playground/bobbits")
DUMPS_DIR   = WORKSPACE / ".bob/tmp/xlsx-dumps"
DOCS_DIR    = WORKSPACE / "docs"
MASTER_CSV  = WORKSPACE / "influencer master sheet FINAL.csv"
OUTPUT_JSON = DUMPS_DIR / "found-urls.json"

# ── Build the target name set ─────────────────────────────────────────────────
with open(MASTER_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

targets = {}   # norm_name → display_name
for r in rows[2:]:
    while len(r) < 8: r.append('')
    url = r[1].strip()
    name = r[0].strip()
    if not url or url.lower() in ('nan','-') or not url.startswith('http'):
        key = re.sub(r'[^a-z0-9]', '', name.lower())
        if key:
            targets[key] = name

print(f"Target names: {len(targets)}")

# ── Helpers ───────────────────────────────────────────────────────────────────
URL_RE = re.compile(
    r'https?://(?:www\.)?(?:'
    r'linkedin\.com/in/[^\s\"\',<>\)]+|'
    r'x\.com/[^\s\"\',<>\)]+|'
    r'twitter\.com/[^\s\"\',<>\)]+|'
    r'instagram\.com/[^\s\"\',<>\)]+|'
    r'youtube\.com/(?:@|channel/|c/)[^\s\"\',<>\)]+|'
    r'tiktok\.com/@[^\s\"\',<>\)]+|'
    r'facebook\.com/[^\s\"\',<>\)]+)',
    re.I
)

def norm(s):
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

def clean_url(u):
    """Strip trailing punctuation / query noise."""
    u = re.sub(r'[)\]>"\',;]+$', '', u.strip())
    u = u.split('\n')[0].strip()
    return u

def is_profile_url(u):
    """True if URL looks like a real profile (not a post/activity/video)."""
    u = u.lower()
    if 'linkedin.com/in/' in u and '/in/' in u:
        slug = u.split('/in/')[1].rstrip('/')
        # reject posts / activity
        if any(bad in slug for bad in ['posts/', 'activity:', 'ugcpost', 'feed/', 'update/']):
            return False
        return len(slug) > 2
    if 'instagram.com/' in u:
        # reject /p/ posts and /reel/
        return '/p/' not in u and '/reel/' not in u and '/stories/' not in u
    if 'x.com/' in u or 'twitter.com/' in u:
        return '/status/' not in u
    if 'youtube.com/@' in u:
        return True
    if 'tiktok.com/@' in u:
        return True
    return True

# ── Scan xlsx dumps ───────────────────────────────────────────────────────────
found = {}   # display_name → { url, source }

print("\nScanning xlsx dumps …")
dump_dirs = [p for p in DUMPS_DIR.iterdir() if p.is_dir() and (p / 'manifest.json').exists()]
print(f"  {len(dump_dirs)} dump directories")

for dd in dump_dirs:
    manifest = json.loads((dd / 'manifest.json').read_text(encoding='utf-8'))
    for sm in manifest.get('sheets', []):
        sheet_file = dd / sm['file']
        if not sheet_file.exists():
            continue
        try:
            data = json.loads(sheet_file.read_text(encoding='utf-8'))
        except Exception:
            continue
        headers = [str(h or '').lower().strip() for h in (data.get('headers') or [])]
        rows_data = data.get('rows') or []
        if not rows_data:
            continue

        # Find name col and URL cols
        name_col = next((i for i, h in enumerate(headers)
                         if h in ('name','creator','influencer','first name','full name')), -1)
        url_cols = [i for i, h in enumerate(headers)
                    if any(k in h for k in ('url','link','profile','twitter','linkedin',
                                            'instagram','youtube','social','tiktok','handle','x.com'))]

        for row in rows_data:
            if name_col == -1:
                # Try all cells for name + URL
                row_text = ' '.join(str(c or '') for c in row)
            else:
                name_val = str(row[name_col] if name_col < len(row) else '')
                row_text = name_val

            # Check if any target name appears
            row_norm = norm(row_text)
            matched_key = None
            for key in targets:
                if len(key) > 3 and key in row_norm:
                    matched_key = key
                    break

            if not matched_key:
                continue

            display = targets[matched_key]
            if display in found:
                continue  # already found

            # Extract URLs from url_cols first, then full row
            candidate_urls = []
            for ci in url_cols:
                if ci < len(row):
                    val = str(row[ci] or '').strip()
                    urls = URL_RE.findall(val)
                    candidate_urls.extend(urls)
                    # Also check raw value if it starts with http
                    if val.startswith('http'):
                        candidate_urls.append(val)

            # Also scan full row text
            full_text = ' '.join(str(c or '') for c in row)
            candidate_urls.extend(URL_RE.findall(full_text))

            for u in candidate_urls:
                u = clean_url(u)
                if is_profile_url(u) and len(u) > 20:
                    found[display] = {'url': u, 'source': f"xlsx:{dd.name}/{sm['file']}"}
                    break

print(f"  Found {len(found)} URLs from xlsx dumps")

# ── Scan CSV files in docs/ ───────────────────────────────────────────────────
print("\nScanning CSV files in docs/ …")
csv_files = list(DOCS_DIR.glob('**/*.csv')) if DOCS_DIR.exists() else []
print(f"  {len(csv_files)} CSV files")

for csv_path in csv_files:
    try:
        with open(csv_path, newline='', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception:
        continue

    # Find URLs in the file
    all_urls = [(m.start(), clean_url(m.group(0))) for m in URL_RE.finditer(content)]

    # For each URL, look at surrounding text for a name match
    for pos, u in all_urls:
        if not is_profile_url(u):
            continue
        context = content[max(0, pos-200):pos+200].lower()
        for key, display in targets.items():
            if display in found:
                continue
            if len(key) > 3 and key in norm(context):
                found[display] = {'url': u, 'source': f"csv:{csv_path.name}"}
                break

print(f"  Found {len(found)} URLs total after CSV scan")

# ── Scan DOCX files in docs/ ─────────────────────────────────────────────────
print("\nScanning DOCX files in docs/ …")
try:
    import zipfile
    docx_files = list(DOCS_DIR.glob('**/*.docx')) if DOCS_DIR.exists() else []
    print(f"  {len(docx_files)} DOCX files")

    for docx_path in docx_files:
        try:
            with zipfile.ZipFile(docx_path) as z:
                if 'word/document.xml' not in z.namelist():
                    continue
                xml = z.read('word/document.xml').decode('utf-8', errors='replace')
        except Exception:
            continue

        # Strip XML tags to get plain text
        text = re.sub(r'<[^>]+>', ' ', xml)
        text = re.sub(r'&#x[0-9A-Fa-f]+;', '', text)

        all_urls = [(m.start(), clean_url(m.group(0))) for m in URL_RE.finditer(text)]

        for pos, u in all_urls:
            if not is_profile_url(u):
                continue
            context = text[max(0, pos-300):pos+300]
            ctx_norm = norm(context)
            for key, display in targets.items():
                if display in found:
                    continue
                if len(key) > 3 and key in ctx_norm:
                    found[display] = {'url': u, 'source': f"docx:{docx_path.name}"}
                    break

    print(f"  Found {len(found)} URLs total after DOCX scan")

except Exception as e:
    print(f"  DOCX scan error: {e}")

# ── Also scan xlsx files at workspace root ────────────────────────────────────
print("\nScanning workspace-root xlsx files via dumps …")
# Already covered via dump_dirs above

# ── Save results ─────────────────────────────────────────────────────────────
OUTPUT_JSON.write_text(json.dumps(found, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"\nSaved {len(found)} results to {OUTPUT_JSON}")
print("\nFound URLs:")
for name, v in sorted(found.items()):
    print(f"  {name:<40} {v['url'][:70]}  [{v['source'][:40]}]")
