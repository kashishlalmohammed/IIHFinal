"""
import_csv_knowledge.py
-----------------------
Builds the `influencers_csv` table in the existing SQLite DB from the three
root-level CSV files. This table is READ-ONLY from the dashboard's perspective
— it is never joined into any dashboard query.  The AI chatbot uses it as an
extended knowledge layer so it can answer "have we worked with X?" even for
people who are not yet fully profiled in the hub.

Run from bobbits/backend/:
    python3 src/scripts/import_csv_knowledge.py

Safe to re-run — drops and recreates the table each time.
"""

import csv, os, re, sqlite3, unicodedata

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.join(SCRIPT_DIR, '..', '..')
PLAYGROUND   = os.path.join(BACKEND_DIR, '..', '..')  # ~/.bob/playground

DB_PATH      = os.path.join(BACKEND_DIR, 'data', 'influencers.sqlite')

CSV_MASTER   = os.path.join(PLAYGROUND, 'Final_Influencer_Master_Sheet_FIXED.csv')
CSV_IBM_LIST = os.path.join(PLAYGROUND, 'IBM_Influencer_Master_List.csv')
CSV_AGG      = os.path.join(PLAYGROUND,
               'Aggregated External Influencer Data (Jan\'23-May\'26)(External Influencers Data).csv')

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text):
    text = unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def clean(val):
    """Strip, collapse whitespace, return None for empty/nan."""
    if val is None:
        return None
    v = str(val).strip()
    if v.lower() in ('', 'nan', 'none', 'n/a', '-'):
        return None
    return v

def open_csv(path):
    """Try utf-8 then latin-1 fallback."""
    for enc in ('utf-8-sig', 'utf-8', 'latin-1', 'cp1252'):
        try:
            f = open(path, encoding=enc, newline='')
            rows = list(csv.DictReader(f))
            f.close()
            return rows
        except (UnicodeDecodeError, LookupError):
            continue
    raise ValueError(f"Cannot decode {path}")

def parse_followers(val):
    """'1.5 M' → 1500000, '918,000,000' → 918000000, '15948' → 15948."""
    if not val:
        return None
    v = str(val).strip().replace(',', '').replace(' ', '').lower()
    try:
        if v.endswith('m'):
            return int(float(v[:-1]) * 1_000_000)
        if v.endswith('k'):
            return int(float(v[:-1]) * 1_000)
        return int(float(v))
    except (ValueError, OverflowError):
        return None

# ── Build merged record dict keyed by lower-cased name ───────────────────────

records = {}   # name_lower → dict

def upsert(name_raw, **fields):
    if not name_raw or not name_raw.strip():
        return
    key = name_raw.strip().lower()
    if key not in records:
        records[key] = {'name': name_raw.strip()}
    rec = records[key]
    for k, v in fields.items():
        cv = clean(v)
        if cv and not rec.get(k):   # first non-null wins
            rec[k] = cv

# ── 1. Final_Influencer_Master_Sheet_FIXED.csv ────────────────────────────────
print("Loading Final_Influencer_Master_Sheet_FIXED.csv …")
for row in open_csv(CSV_MASTER):
    upsert(
        row.get('Name', ''),
        handle       = row.get('Handle'),
        social_url   = row.get('Social Platform URL'),
        persona      = row.get('Persona'),
        bio          = row.get('Description'),
        campaigns    = row.get('Campaigns'),
        followers    = str(parse_followers(row.get('Followers'))) if parse_followers(row.get('Followers')) else None,
        geo          = row.get('Geo'),
    )

# ── 2. IBM_Influencer_Master_List.csv ─────────────────────────────────────────
print("Loading IBM_Influencer_Master_List.csv …")
for row in open_csv(CSV_IBM_LIST):
    name = row.get('Name', '').strip()
    # Skip junk rows (single chars, all-symbol names)
    if not name or len(name) < 2 or re.match(r'^[^a-zA-Z]+$', name):
        continue
    raw_followers = parse_followers(row.get('Max Followers'))
    upsert(
        name,
        handle       = row.get('Instagram Handle') or row.get('LinkedIn URL'),
        social_url   = row.get('LinkedIn URL'),
        persona      = row.get('Role'),
        bio          = row.get('Description'),
        campaigns    = row.get('Campaigns'),
        verticals    = row.get('Verticals'),
        platforms    = row.get('Platforms'),
        followers    = str(raw_followers) if raw_followers else None,
        total_impressions = clean(row.get('Total Impressions')),
        total_engagement  = clean(row.get('Total Engagement')),
    )

# ── 3. Aggregated post-level data ─────────────────────────────────────────────
print("Loading Aggregated External Influencer Data …")
agg_rows = open_csv(CSV_AGG)

# Build per-influencer aggregated stats from post rows
from collections import defaultdict
agg_stats = defaultdict(lambda: {
    'campaigns': set(), 'platforms': set(),
    'total_impressions': 0, 'total_engagement': 0, 'post_count': 0
})

for row in agg_rows:
    name = (row.get('Influencer Name') or '').strip()
    if not name:
        continue
    key = name.lower()
    s = agg_stats[key]
    camp = clean(row.get('Campaign'))
    if camp:
        s['campaigns'].add(camp)
    plat = clean(row.get('Social Platform'))
    if plat:
        s['platforms'].add(plat.title())
    try:
        s['total_impressions'] += int(str(row.get('Impressions', '') or '0').replace(',', '') or 0)
    except ValueError:
        pass
    try:
        s['total_engagement'] += int(str(row.get('Total Engagement', '') or '0').replace(',', '') or 0)
    except ValueError:
        pass
    s['post_count'] += 1
    # Upsert basic record for names not yet seen
    upsert(name)

# Merge aggregated stats back into records
for key, s in agg_stats.items():
    if key not in records:
        continue
    rec = records[key]
    if not rec.get('campaigns') and s['campaigns']:
        rec['campaigns'] = ' | '.join(sorted(s['campaigns']))
    if not rec.get('platforms') and s['platforms']:
        rec['platforms'] = ', '.join(sorted(s['platforms']))
    if not rec.get('total_impressions') and s['total_impressions']:
        rec['total_impressions'] = str(s['total_impressions'])
    if not rec.get('total_engagement') and s['total_engagement']:
        rec['total_engagement'] = str(s['total_engagement'])
    rec['post_count'] = str(s['post_count'])

# ── Write to SQLite ───────────────────────────────────────────────────────────
print(f"Writing {len(records)} records to {DB_PATH} …")

con = sqlite3.connect(DB_PATH)
cur = con.cursor()

cur.execute("DROP TABLE IF EXISTS influencers_csv")
cur.execute("""
CREATE TABLE influencers_csv (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    name_lower        TEXT NOT NULL,
    slug              TEXT,
    handle            TEXT,
    social_url        TEXT,
    persona           TEXT,
    bio               TEXT,
    campaigns         TEXT,
    verticals         TEXT,
    platforms         TEXT,
    followers         INTEGER,
    geo               TEXT,
    total_impressions INTEGER,
    total_engagement  INTEGER,
    post_count        INTEGER
)
""")
cur.execute("CREATE INDEX IF NOT EXISTS idx_csv_name_lower ON influencers_csv(name_lower)")

inserted = 0
for key, rec in records.items():
    try:
        cur.execute("""
            INSERT INTO influencers_csv
                (name, name_lower, slug, handle, social_url, persona, bio,
                 campaigns, verticals, platforms, followers, geo,
                 total_impressions, total_engagement, post_count)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            rec.get('name'),
            key,
            slugify(rec.get('name', '')),
            rec.get('handle'),
            rec.get('social_url'),
            rec.get('persona'),
            rec.get('bio'),
            rec.get('campaigns'),
            rec.get('verticals'),
            rec.get('platforms'),
            int(rec['followers']) if rec.get('followers') and rec['followers'].isdigit() else None,
            rec.get('geo'),
            int(rec['total_impressions']) if rec.get('total_impressions') and str(rec['total_impressions']).replace(',','').isdigit() else None,
            int(rec['total_engagement'])  if rec.get('total_engagement')  and str(rec['total_engagement']).replace(',','').isdigit()  else None,
            int(rec['post_count'])        if rec.get('post_count')        and str(rec['post_count']).isdigit()        else None,
        ))
        inserted += 1
    except Exception as e:
        print(f"  Skipped '{rec.get('name')}': {e}")

con.commit()
con.close()
print(f"Done — {inserted} records written to influencers_csv table.")
