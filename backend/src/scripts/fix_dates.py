"""Normalise all post_date values in influencer_content to YYYY-MM-DD."""
import sqlite3
import re
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/influencers.sqlite")

MONTH_ABBR = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
}

def normalise(raw):
    if not raw:
        return raw
    raw = raw.strip()

    # Already ISO
    if re.match(r'^\d{4}-\d{2}-\d{2}$', raw):
        return raw

    # DD-Mon-YY  e.g. "21-Nov-25"
    m = re.match(r'^(\d{1,2})-([A-Za-z]{3})-(\d{2})$', raw)
    if m:
        d, mon, yy = m.groups()
        year = '20' + yy
        return f"{year}-{MONTH_ABBR[mon.lower()]}-{int(d):02d}"

    # Slash-separated: either M/D/YYYY or D/M/YYYY
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', raw)
    if m:
        a, b, year = int(m.group(1)), int(m.group(2)), m.group(3)
        # If first part > 12 it must be day (D/M/YYYY)
        if a > 12:
            d, mo = a, b
        # If second part > 12 it must be day (M/D/YYYY)
        elif b > 12:
            mo, d = a, b
        # Both <= 12 — assume US format M/D/YYYY (all ambiguous cases here are US)
        else:
            mo, d = a, b
        return f"{year}-{mo:02d}-{d:02d}"

    return raw  # give up, leave unchanged

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("SELECT id, post_date FROM influencer_content WHERE post_date IS NOT NULL AND post_date NOT LIKE '20__-__-__'")
rows = cur.fetchall()

fixed = 0
for post_id, raw in rows:
    normalised = normalise(raw)
    if normalised != raw:
        cur.execute("UPDATE influencer_content SET post_date = ? WHERE id = ?", (normalised, post_id))
        print(f"  {raw!r:25} → {normalised}")
        fixed += 1

conn.commit()
conn.close()
print(f"\nFixed {fixed} of {len(rows)} non-ISO dates.")

# Verify none remain
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM influencer_content WHERE post_date IS NOT NULL AND post_date NOT LIKE '20__-__-__'")
remaining = cur.fetchone()[0]
conn.close()
print(f"Remaining non-ISO dates: {remaining}")
