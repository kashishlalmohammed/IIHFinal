"""
backfill_ibmpartner.py
─────────────────────
1. Marks every existing post ibm_partner_confirmed = 1
   (all posts in this DB are IBM-partnered content).
2. For influencers with zero posts, creates one placeholder content
   row per campaign listed in their campaigns column so their
   Past IBM Content tab isn't empty.
"""

import hashlib
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / 'data' / 'influencers.sqlite'


def make_content_id(influencer_id, campaign, idx):
    raw = f"{influencer_id}|{campaign}|{idx}"
    return 'bp_' + hashlib.md5(raw.encode()).hexdigest()[:12]


def split_campaigns(raw):
    if not raw:
        return []
    parts = re.split(r'\s*\|\s*|\s*;\s*', raw.strip())
    return [p.strip() for p in parts if p.strip() and p.strip() not in {'-', 'N/A', 'nan'}]


def main():
    conn = sqlite3.connect(DB_PATH)

    # ── 1. Confirm all existing posts ────────────────────────────────────────
    cur = conn.execute(
        "UPDATE influencer_content SET ibm_partner_confirmed = 1 WHERE ibm_partner_confirmed = 0"
    )
    print(f"Marked {cur.rowcount} existing posts as #IBMPartner confirmed.")

    # ── 2. Create placeholder posts for influencers with no content ──────────
    no_content = conn.execute(
        """
        SELECT id, name, campaigns, last_collaborated
        FROM influencers
        WHERE id NOT IN (SELECT DISTINCT influencer_id FROM influencer_content)
          AND campaigns IS NOT NULL AND campaigns != ''
        """
    ).fetchall()

    inserted = 0
    for influencer_id, name, campaigns_raw, last_collab in no_content:
        campaigns = split_campaigns(campaigns_raw)
        if not campaigns:
            continue
        for idx, campaign in enumerate(campaigns):
            content_id = make_content_id(influencer_id, campaign, idx)
            post_date = last_collab if last_collab and last_collab not in {'nan', 'None'} else None
            conn.execute(
                """
                INSERT OR IGNORE INTO influencer_content
                  (id, influencer_id, platform, title, content_type,
                   ibm_product_tag, post_date, views, engagement_rate,
                   permalink, ibm_partner_confirmed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                (
                    content_id,
                    influencer_id,
                    None,
                    campaign,
                    'IBM Partnership',
                    None,
                    post_date,
                    None,
                    None,
                    None,
                )
            )
            inserted += 1

    print(f"Created {inserted} placeholder #IBMPartner entries for {len(no_content)} influencers with no posts.")
    conn.commit()
    conn.close()
    print("Done.")


if __name__ == '__main__':
    main()
