import csv
import hashlib
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BACKEND = Path(__file__).resolve().parents[2]
DB_PATH = BACKEND / 'data' / 'influencers.sqlite'
MASTER_CSV = ROOT / 'IBM_Influencer_Master_List.csv'
POSTS_CSV = ROOT / "Aggregated External Influencer Data (Jan'23-May'26)(External Influencers Data).csv"


def text(value):
    return (value or '').strip()


def normalize_text(value):
    value = text(value)
    value = value.replace('�', "'")
    value = value.replace('??', '')
    value = re.sub(r'\s+', ' ', value)
    return value.strip(" |\n\t")


def slug(value):
    cleaned = re.sub(r'[^a-z0-9]+', '-', normalize_text(value).lower())
    return cleaned.strip('-') or 'influencer'


def parse_int(value):
    value = text(value).replace(',', '')
    if not value or value.upper() in {'N/A', 'NONE', 'NO', '-'}:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def parse_float(value):
    value = text(value).replace(',', '').replace('%', '')
    if not value or value.upper() in {'N/A', 'NONE', 'NO', '-'}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def split_multi(value):
    value = normalize_text(value)
    if not value or value in {'-', 'N/A'}:
        return []
    parts = re.split(r'\s*\|\s*|\s*,\s*|\s*;\s*', value)
    return [part for part in (normalize_text(part) for part in parts) if part and not part.startswith('http')]


def normalize_platform(value):
    raw = normalize_text(value)
    lowered = raw.lower()
    mapping = {
        'linkedin': 'LinkedIn',
        'twitter': 'X',
        'x': 'X',
        'instagram': 'Instagram',
        'youtube': 'YouTube',
        'tiktok': 'TikTok',
        'facebook': 'Facebook',
        'reddit': 'Reddit',
        'newsletter': 'Newsletter',
        'podcast': 'Podcast',
        'blog': 'Blog',
        'website': 'Website',
        'medium': 'Medium',
        'threads': 'Threads',
        'substack': 'Substack',
    }
    return mapping.get(lowered, raw)


def persona_from_verticals(verticals):
    lower = verticals.lower()
    if 'security' in lower:
        return 'Change Maker'
    if 'sustainability' in lower:
        return 'Visionary'
    if 'hybrid cloud' in lower:
        return 'Lifestyle Coder'
    return 'Edu Coder'


def approval_from_campaigns(campaigns):
    lower = campaigns.lower()
    if 'pre-vetting' in lower or 'pre vetting' in lower:
        return 'pending'
    if lower:
        return 'approved'
    return 'pending'


def extract_handle(value):
    value = text(value)
    if not value or value in {'-', 'N/A'}:
        return ''
    value = value.strip()
    if 'linkedin.com/in/' in value:
        return value.split('linkedin.com/in/', 1)[1].split('/')[0].split('?')[0]
    if 'linkedin.com/company/' in value:
        return value.split('linkedin.com/company/', 1)[1].split('/')[0].split('?')[0]
    if 'linkedin.com/posts/' in value or 'linkedin.com/pulse/' in value:
        return ''
    if 'instagram.com/' in value:
        segment = value.split('instagram.com/', 1)[1].split('/')[0].split('?')[0]
        if segment in {'p', 'reel', 'reels', 'stories'}:
            return ''
        return f'@{segment}' if segment else ''
    if 'tiktok.com/@' in value:
        segment = value.split('tiktok.com/@', 1)[1].split('/')[0].split('?')[0]
        if segment in {'video'}:
            return ''
        return f'@{segment}' if segment else ''
    if 'x.com/' in value or 'twitter.com/' in value:
        domain = 'x.com/' if 'x.com/' in value else 'twitter.com/'
        segment = value.split(domain, 1)[1].split('/')[0].split('?')[0]
        return f'@{segment}' if segment else ''
    if 'substack.com' in value:
        return value
    if value.startswith('@'):
        return value
    if re.fullmatch(r'[A-Za-z0-9._-]+', value):
        return value
    return ''


def canonical_name(name):
    normalized = normalize_text(name)
    lower = normalized.lower()
    if lower.startswith('@'):
        lower = lower[1:]
    lower = re.sub(r'[^a-z0-9]+', '', lower)
    lower = re.sub(r'(msba|data|tv|official|inc|llc)$', '', lower)
    return lower


def choose_display_name(current, candidate):
    if not current:
        return candidate
    current_score = sum(1 for char in current if char.isalpha() and char.isupper()) + current.count(' ')
    candidate_score = sum(1 for char in candidate if char.isalpha() and char.isupper()) + candidate.count(' ')
    return candidate if candidate_score > current_score else current


def make_id(name):
    digest = hashlib.md5(canonical_name(name).encode()).hexdigest()[:10]
    return f'inf_{digest}'


def load_master_rows():
    with MASTER_CSV.open(newline='', encoding='utf-8-sig', errors='replace') as handle:
        return list(csv.DictReader(handle))


def load_post_rows():
    with POSTS_CSV.open(newline='', encoding='utf-8-sig', errors='replace') as handle:
        return list(csv.DictReader(handle))


def create_schema(conn):
    conn.executescript(
        '''
        DROP TABLE IF EXISTS influencer_campaign_types;
        DROP TABLE IF EXISTS influencer_events;
        DROP TABLE IF EXISTS influencer_platforms;
        DROP TABLE IF EXISTS influencer_content;
        DROP TABLE IF EXISTS influencers;

        CREATE TABLE influencers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          type TEXT NOT NULL,
          persona_group TEXT,
          location TEXT,
          bio TEXT,
          campaign_rationale TEXT,
          status TEXT NOT NULL,
          approval_status TEXT NOT NULL,
          owner TEXT,
          last_collaborated TEXT,
          verticals TEXT,
          campaigns TEXT,
          rate TEXT,
          engagement_score REAL,
          reach_score REAL,
          quality_score REAL,
          cost_score REAL,
          advocacy_score REAL,
          composite_score REAL
        );

        CREATE TABLE influencer_platforms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          influencer_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          handle TEXT,
          url TEXT,
          follower_count INTEGER,
          UNIQUE(influencer_id, platform, handle)
        );

        CREATE TABLE influencer_content (
          id TEXT PRIMARY KEY,
          influencer_id TEXT NOT NULL,
          platform TEXT,
          title TEXT,
          content_type TEXT,
          ibm_product_tag TEXT,
          post_date TEXT,
          views INTEGER,
          engagement_rate REAL,
          permalink TEXT,
          ibm_partner_confirmed INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE influencer_events (
          influencer_id TEXT NOT NULL,
          event_name TEXT NOT NULL,
          UNIQUE(influencer_id, event_name)
        );

        CREATE TABLE influencer_campaign_types (
          influencer_id TEXT NOT NULL,
          campaign_type TEXT NOT NULL,
          UNIQUE(influencer_id, campaign_type)
        );
        '''
    )


def build_database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    create_schema(conn)

    master_rows = load_master_rows()
    post_rows = load_post_rows()

    influencers = {}
    event_aliases = {
        'think': 'IBM Think',
        'techxchange': 'IBM TechXchange',
        'red hat': 'Red Hat Summit',
        'redhat': 'Red Hat Summit',
        'masters': 'Masters',
        'wimbledon': 'Wimbledon',
        'ferrari': 'Ferrari / F1',
        'f1': 'Ferrari / F1',
        'sxsw': 'SXSW',
        'dreamforce': 'Dreamforce',
        'kubecon': 'KubeCon',
        're:invent': 'AWS re:Invent',
        'aws re:invent': 'AWS re:Invent',
        'vivatech': 'VivaTech',
        'nrf': 'NRF',
        'sibos': 'SIBOS',
        'us open': 'US Open',
        'grammy': 'GRAMMYs',
        'mobile world congress': 'Mobile World Congress',
        'mwc': 'Mobile World Congress',
        'gartner data & analytics': 'Gartner Data & Analytics',
        'ai summit korea': 'AI Summit Korea',
        'ibm accelerate': 'IBM Accelerate',
        'ny tech week': 'NY Tech Week',
    }
    campaign_type_aliases = {
        'ai for business': 'AI for Business',
        'hybrid cloud': 'Hybrid Cloud',
        'security': 'Security',
        'granite': 'Granite / Developer',
        'developer': 'Granite / Developer',
        'automation': 'Automation / webMethods',
        'webmethods': 'Automation / webMethods',
        'cross-geo': 'Cross-Geo',
        'cross geo': 'Cross-Geo',
        'uk narrative': 'UK Narrative',
        'sports survey 2025': 'Sports Survey 2025',
    }

    for row in master_rows:
        name = normalize_text(row['Name'])
        if not name or name == '?':
            continue

        influencer_id = make_id(name)
        verticals = normalize_text(row['Verticals'])
        campaigns = normalize_text(row['Campaigns'])
        bio = normalize_text(row['Description'])
        if not bio:
            bio = f"External influencer in {verticals or 'IBM programs'} campaigns."

        max_followers = parse_int(row['Max Followers'])
        total_impressions = parse_int(row['Total Impressions'])
        total_engagement = parse_int(row['Total Engagement'])
        engagement_score = min(10, round((total_engagement / max(total_impressions, 1)) * 200, 1)) if total_engagement and total_impressions else None
        reach_score = min(10, round((max_followers or 0) / 50000, 1)) if max_followers else None
        quality_score = 8.0 if campaigns else 6.0
        cost_score = 7.5
        composite_parts = [score for score in [engagement_score, reach_score, quality_score, cost_score] if score is not None]
        composite_score = round(sum(composite_parts) / len(composite_parts), 1) if composite_parts else None

        if influencer_id not in influencers:
            influencers[influencer_id] = {
                'id': influencer_id,
                'name': name,
            'slug': slug(name),
            'type': 'external',
            'persona_group': persona_from_verticals(verticals),
            'location': '',
            'bio': bio,
            'campaign_rationale': campaigns,
            'status': 'active',
            'approval_status': approval_from_campaigns(campaigns),
            'owner': '',
            'last_collaborated': None,
            'verticals': verticals,
            'campaigns': campaigns,
            'rate': None,
            'engagement_score': engagement_score,
            'reach_score': reach_score,
            'quality_score': quality_score,
            'cost_score': cost_score,
            'advocacy_score': None,
                'composite_score': composite_score,
                'platforms': {},
                'content': [],
                'events': set(),
                'campaign_types': set()
            }
        influencer = influencers[influencer_id]
        influencer['name'] = choose_display_name(influencer['name'], name)
        influencer['slug'] = slug(influencer['name'])
        if verticals:
            influencer['verticals'] = verticals
        if campaigns:
            influencer['campaigns'] = campaigns
            influencer['campaign_rationale'] = campaigns
            influencer['approval_status'] = approval_from_campaigns(campaigns)
        if bio and bio != f"External influencer in {verticals or 'IBM programs'} campaigns.":
            influencer['bio'] = bio
        influencer['engagement_score'] = influencer['engagement_score'] or engagement_score
        influencer['reach_score'] = influencer['reach_score'] or reach_score
        influencer['quality_score'] = max(influencer['quality_score'] or 0, quality_score)
        influencer['cost_score'] = max(influencer['cost_score'] or 0, cost_score)
        influencer['composite_score'] = influencer['composite_score'] or composite_score

        linkedin_url = text(row['LinkedIn URL'])
        instagram_handle = text(row['Instagram Handle'])
        if linkedin_url and linkedin_url != '-':
            handle = extract_handle(linkedin_url)
            influencers[influencer_id]['platforms'][('LinkedIn', handle)] = {
                'platform': 'LinkedIn',
                'handle': handle,
                'url': linkedin_url,
                'follower_count': max_followers,
            }
        if instagram_handle and instagram_handle != '-':
            handle = extract_handle(instagram_handle)
            influencers[influencer_id]['platforms'][('Instagram', handle)] = {
                'platform': 'Instagram',
                'handle': handle,
                'url': '' if instagram_handle.startswith('@') else instagram_handle,
                'follower_count': max_followers,
            }

        for platform_name in split_multi(row['Platforms']):
            platform = normalize_platform(platform_name)
            influencers[influencer_id]['platforms'].setdefault((platform, ''), {
                'platform': platform,
                'handle': '',
                'url': '',
                'follower_count': max_followers,
            })

    for row in post_rows:
        name = normalize_text(row['Influencer Name'])
        if not name:
            continue
        influencer_id = make_id(name)
        if influencer_id not in influencers:
            influencers[influencer_id] = {
                'id': influencer_id,
                'name': name,
                'slug': slug(name),
                'type': 'external',
                'persona_group': 'Edu Coder',
                'location': '',
                'bio': f"External influencer active in IBM campaign content.",
                'campaign_rationale': normalize_text(row['Campaign']),
                'status': 'active',
                'approval_status': 'approved',
                'owner': '',
                'last_collaborated': normalize_text(row['Date']) or None,
                'verticals': '',
                'campaigns': normalize_text(row['Campaign']),
                'rate': None,
                'engagement_score': None,
                'reach_score': None,
                'quality_score': 7.0,
                'cost_score': 7.5,
                'advocacy_score': None,
                'composite_score': None,
                'platforms': {},
                'content': [],
                'events': set(),
                'campaign_types': set()
            }

        influencer = influencers[influencer_id]
        influencer['name'] = choose_display_name(influencer['name'], name)
        influencer['slug'] = slug(influencer['name'])
        platform = normalize_platform(row['Social Platform'])
        followers = parse_int(row['Number of Followers Influencer Has (at Post Time?)'])
        post_url = text(row['Post URL'])
        handle = extract_handle(post_url)
        influencer['platforms'].setdefault((platform, handle), {
            'platform': platform,
            'handle': handle,
            'url': post_url if handle else '',
            'follower_count': followers,
        })
        if followers and not influencer.get('reach_score'):
            influencer['reach_score'] = min(10, round(followers / 50000, 1))

        impressions = parse_int(row['Impressions'])
        engagements = parse_int(row['Total Engagement'])
        engagement_rate = parse_float(row['Engagement Rate '])
        if engagement_rate is None and impressions and engagements:
            engagement_rate = round((engagements / impressions) * 100, 2)
        if engagement_rate is not None and influencer.get('engagement_score') is None:
            influencer['engagement_score'] = min(10, round(engagement_rate * 2, 1))

        campaign_name = normalize_text(row['Campaign'])
        initiative = normalize_text(row['IBM Campaign & Initiatives'])
        for source_text in [campaign_name, initiative]:
            lower_source = source_text.lower()
            for key, value in event_aliases.items():
                if key in lower_source:
                    influencer['events'].add(value)
            for key, value in campaign_type_aliases.items():
                if key in lower_source:
                    influencer['campaign_types'].add(value)

        title = normalize_text(row['Post Topic']) or normalize_text(row['Post Copy'])[:140]
        product = normalize_text(row['IBM Tier 1 Products'])
        content_id = text(row['Post ID']) or hashlib.md5(f"{name}|{post_url}|{row['Date']}".encode()).hexdigest()[:16]
        influencer['content'].append({
            'id': f'post_{content_id}',
            'platform': platform,
            'title': title,
            'content_type': normalize_text(row['Post Type']) or 'Post',
            'ibm_product_tag': '' if product in {'', 'N/A'} else product,
            'post_date': normalize_text(row['Date']),
            'views': impressions,
            'engagement_rate': engagement_rate,
            'permalink': post_url,
            'ibm_partner_confirmed': 1 if '#ibmpartner' in text(row['Post Copy']).lower() else 0,
        })
        if normalize_text(row['Date']):
            influencer['last_collaborated'] = normalize_text(row['Date'])

    for influencer in influencers.values():
        parts = [score for score in [
            influencer['engagement_score'],
            influencer['reach_score'],
            influencer['quality_score'],
            influencer['cost_score'],
        ] if score is not None]
        if parts:
            influencer['composite_score'] = round(sum(parts) / len(parts), 1)

        conn.execute(
            '''
            INSERT INTO influencers (
              id, name, slug, type, persona_group, location, bio, campaign_rationale,
              status, approval_status, owner, last_collaborated, verticals, campaigns, rate,
              engagement_score, reach_score, quality_score, cost_score, advocacy_score, composite_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                influencer['id'], influencer['name'], influencer['slug'], influencer['type'], influencer['persona_group'],
                influencer['location'], influencer['bio'], influencer['campaign_rationale'], influencer['status'],
                influencer['approval_status'], influencer['owner'], influencer['last_collaborated'], influencer['verticals'],
                influencer['campaigns'], influencer['rate'], influencer['engagement_score'], influencer['reach_score'],
                influencer['quality_score'], influencer['cost_score'], influencer['advocacy_score'], influencer['composite_score']
            )
        )

        for platform in influencer['platforms'].values():
            conn.execute(
                'INSERT OR IGNORE INTO influencer_platforms (influencer_id, platform, handle, url, follower_count) VALUES (?, ?, ?, ?, ?)',
                (influencer['id'], platform['platform'], platform['handle'], platform['url'], platform['follower_count'])
            )

        for content in influencer['content']:
            conn.execute(
                '''
                INSERT OR REPLACE INTO influencer_content
                (id, influencer_id, platform, title, content_type, ibm_product_tag, post_date, views, engagement_rate, permalink, ibm_partner_confirmed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    content['id'], influencer['id'], content['platform'], content['title'], content['content_type'],
                    content['ibm_product_tag'], content['post_date'], content['views'], content['engagement_rate'],
                    content['permalink'], content['ibm_partner_confirmed']
                )
            )

        for event_name in sorted(influencer['events']):
            conn.execute(
                'INSERT OR IGNORE INTO influencer_events (influencer_id, event_name) VALUES (?, ?)',
                (influencer['id'], event_name)
            )

        for campaign_type in sorted(influencer['campaign_types']):
            conn.execute(
                'INSERT OR IGNORE INTO influencer_campaign_types (influencer_id, campaign_type) VALUES (?, ?)',
                (influencer['id'], campaign_type)
            )

    conn.commit()
    count = conn.execute('SELECT COUNT(*) FROM influencers').fetchone()[0]
    posts = conn.execute('SELECT COUNT(*) FROM influencer_content').fetchone()[0]
    print(json.dumps({'database': str(DB_PATH), 'influencers': count, 'content_rows': posts}, indent=2))
    conn.close()


if __name__ == '__main__':
    build_database()
