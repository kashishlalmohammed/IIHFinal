const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// DATA_DIR can be overridden by env var so a mounted volume works on IBM Cloud.
// Locally defaults to backend/data/ (same as before).
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'influencers.sqlite'));

// ── Schema bootstrap — creates tables if they don't exist ────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS influencers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'external',
    persona_group TEXT,
    location TEXT,
    bio TEXT,
    status TEXT DEFAULT 'active',
    approval_status TEXT DEFAULT 'pending',
    owner TEXT,
    engagement_score REAL, reach_score REAL, quality_score REAL,
    cost_score REAL, advocacy_score REAL, composite_score REAL,
    rate TEXT
  );

  CREATE TABLE IF NOT EXISTS influencer_platforms (
    id TEXT PRIMARY KEY,
    influencer_id TEXT NOT NULL,
    platform TEXT,
    handle TEXT,
    url TEXT,
    follower_count INTEGER DEFAULT 0,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS influencer_content (
    id TEXT PRIMARY KEY,
    influencer_id TEXT,
    platform TEXT,
    title TEXT,
    content_type TEXT,
    ibm_product_tag TEXT,
    post_date TEXT,
    views INTEGER DEFAULT 0,
    engagement_rate REAL,
    permalink TEXT,
    ibm_partner_confirmed INTEGER DEFAULT 0,
    campaign TEXT,
    creator_name TEXT,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS influencer_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    influencer_id TEXT NOT NULL,
    event_name TEXT,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS influencer_campaign_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    influencer_id TEXT NOT NULL,
    campaign_type TEXT,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS influencer_feedback (
    id TEXT PRIMARY KEY,
    influencer_id TEXT NOT NULL,
    author TEXT,
    team TEXT,
    body TEXT,
    created_at TEXT,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS social_league (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    linkedin TEXT,
    email TEXT,
    member_identity TEXT,
    collaborate TEXT,
    followers INTEGER DEFAULT 0,
    location TEXT,
    business_unit TEXT,
    w3 TEXT,
    talks_about_ai INTEGER DEFAULT 0
  );
`);

// Migrations — safe to re-run, errors ignored if column already exists
try { db.exec('ALTER TABLE influencer_content ADD COLUMN campaign TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE influencer_content ADD COLUMN creator_name TEXT'); } catch (_) {}

// Drop the NOT NULL constraint on influencer_id so unlinked entries can be saved.
// SQLite doesn't support ALTER COLUMN — use the rename+recreate pattern.
{
  const cols = db.prepare("PRAGMA table_info(influencer_content)").all();
  const influencerIdCol = cols.find(c => c.name === 'influencer_id');
  if (influencerIdCol && influencerIdCol.notnull === 1) {
    db.exec(`
      BEGIN;
      ALTER TABLE influencer_content RENAME TO _influencer_content_old;
      CREATE TABLE influencer_content (
        id TEXT PRIMARY KEY,
        influencer_id TEXT,
        platform TEXT,
        title TEXT,
        content_type TEXT,
        ibm_product_tag TEXT,
        post_date TEXT,
        views INTEGER DEFAULT 0,
        engagement_rate REAL,
        permalink TEXT,
        ibm_partner_confirmed INTEGER DEFAULT 0,
        campaign TEXT,
        creator_name TEXT,
        FOREIGN KEY (influencer_id) REFERENCES influencers(id)
      );
      INSERT INTO influencer_content SELECT id, influencer_id, platform, title, content_type, ibm_product_tag, post_date, views, engagement_rate, permalink, ibm_partner_confirmed, campaign, creator_name FROM _influencer_content_old;
      DROP TABLE _influencer_content_old;
      COMMIT;
    `);
  }
}

function toScore(row) {
  return {
    engagement_score: row.engagement_score,
    reach_score: row.reach_score,
    quality_score: row.quality_score,
    cost_score: row.cost_score,
    advocacy_score: row.advocacy_score,
    composite: row.composite_score,
  };
}

function listPlatforms(influencerId) {
  return db.prepare(
    `SELECT platform, handle, url, follower_count
     FROM influencer_platforms
     WHERE influencer_id = ?
     ORDER BY follower_count DESC, platform ASC`
  ).all(influencerId);
}

function listContent(influencerId) {
  return db.prepare(
    `SELECT id, platform, title, content_type, ibm_product_tag, post_date, views, engagement_rate, permalink, ibm_partner_confirmed, campaign
     FROM influencer_content
     WHERE influencer_id = ?
     ORDER BY post_date DESC, id DESC`
  ).all(influencerId);
}

function listEvents(influencerId) {
  return db.prepare(
    `SELECT event_name
     FROM influencer_events
     WHERE influencer_id = ?
     ORDER BY event_name ASC`
  ).all(influencerId).map(row => row.event_name);
}

function listCampaignTypes(influencerId) {
  return db.prepare(
    `SELECT campaign_type
     FROM influencer_campaign_types
     WHERE influencer_id = ?
     ORDER BY campaign_type ASC`
  ).all(influencerId).map(row => row.campaign_type);
}

function listFeedback(influencerId) {
  return db.prepare(
    `SELECT id, author, team, body, created_at
     FROM influencer_feedback
     WHERE influencer_id = ?
     ORDER BY created_at DESC, id DESC`
  ).all(influencerId);
}

function saveFeedback(influencerId, { author, body }) {
  const id = `f${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const created_at = new Date().toISOString().split('T')[0];
  db.prepare(
    `INSERT INTO influencer_feedback (id, influencer_id, author, team, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, influencerId, author || 'Anonymous', 'general', body, created_at);
  return { id, author: author || 'Anonymous', team: 'general', body, created_at };
}

function deleteFeedback(influencerId, feedbackId) {
  const result = db.prepare(
    'DELETE FROM influencer_feedback WHERE id = ? AND influencer_id = ?'
  ).run(feedbackId, influencerId);
  return result.changes > 0;
}

function mapInfluencer(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    persona_group: row.persona_group,
    location: row.location,
    bio: row.bio,
    campaign_rationale: row.campaign_rationale,
    status: row.status,
    approval_status: row.approval_status,
    owner: row.owner,
    last_collaborated: row.last_collaborated,
    rate: row.rate,
    platforms: listPlatforms(row.id),
    score: toScore(row),
    content: listContent(row.id),
    events: listEvents(row.id),
    campaign_types: listCampaignTypes(row.id),
    feedback: listFeedback(row.id),
  };
}

function buildListWhere(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.type) {
    clauses.push('i.type = ?');
    params.push(filters.type);
  }
  if (filters.persona_group) {
    clauses.push('i.persona_group = ?');
    params.push(filters.persona_group);
  }
  if (filters.approval_status) {
    clauses.push('i.approval_status = ?');
    params.push(filters.approval_status);
  }
  if (filters.status) {
    clauses.push('i.status = ?');
    params.push(filters.status);
  }
  if (filters.has_content === 'true') {
    clauses.push('EXISTS (SELECT 1 FROM influencer_content c WHERE c.influencer_id = i.id)');
  }
  if (filters.platform) {
    clauses.push('EXISTS (SELECT 1 FROM influencer_platforms p WHERE p.influencer_id = i.id AND LOWER(p.platform) = LOWER(?))');
    params.push(filters.platform);
  }
  if (filters.campaign_type) {
    clauses.push('EXISTS (SELECT 1 FROM influencer_campaign_types ct WHERE ct.influencer_id = i.id AND ct.campaign_type = ?)');
    params.push(filters.campaign_type);
  }
  if (filters.location) {
    // Expand location aliases so Americas matches US/USA/UKI etc.
    const locLower = filters.location.toLowerCase();
    const GEO_ALIASES_FILTER = {
      americas: ['americas', 'us', 'usa', 'united states', 'canada', 'brazil', 'mexico', 'latin america', 'north america'],
      uk:       ['uk', 'uki', 'united kingdom', 'britain', 'england', 'scotland', 'wales', 'ireland'],
      emea:     ['emea', 'europe', 'germany', 'france', 'spain', 'italy', 'netherlands', 'middle east', 'africa'],
      india:    ['india', 'bangalore', 'mumbai', 'delhi'],
    };
    // Find which canonical group this maps to
    let patterns = null;
    for (const [group, aliases] of Object.entries(GEO_ALIASES_FILTER)) {
      if (aliases.includes(locLower) || locLower === group) {
        patterns = aliases;
        break;
      }
    }
    if (patterns) {
      const orClauses = patterns.map(() => 'LOWER(COALESCE(i.location, \'\')) LIKE ?').join(' OR ');
      clauses.push(`(${orClauses})`);
      params.push(...patterns.map(p => `%${p}%`));
    } else {
      clauses.push('LOWER(COALESCE(i.location, \'\')) LIKE ?');
      params.push(`%${locLower}%`);
    }
  }
  if (filters.event) {
    const events = Array.isArray(filters.event) ? filters.event : String(filters.event).split(',').filter(Boolean);
    if (events.length > 0) {
      clauses.push(`EXISTS (
        SELECT 1
        FROM influencer_events e
        WHERE e.influencer_id = i.id AND e.event_name IN (${events.map(() => '?').join(', ')})
      )`);
      params.push(...events);
    }
  }
  if (filters.q) {
    clauses.push(`(
      LOWER(i.name) LIKE ? OR
      LOWER(COALESCE(i.bio, '')) LIKE ? OR
      LOWER(COALESCE(i.persona_group, '')) LIKE ? OR
      LOWER(COALESCE(i.location, '')) LIKE ? OR
      EXISTS (SELECT 1 FROM influencer_platforms p WHERE p.influencer_id = i.id AND LOWER(COALESCE(p.handle, '')) LIKE ?) OR
      EXISTS (SELECT 1 FROM influencer_content c WHERE c.influencer_id = i.id AND (
        LOWER(COALESCE(c.ibm_product_tag, '')) LIKE ? OR LOWER(COALESCE(c.title, '')) LIKE ?
      ))
    )`);
    const like = `%${filters.q.toLowerCase()}%`;
    params.push(like, like, like, like, like, like, like);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function listInfluencers(filters = {}) {
  const where = buildListWhere(filters);
  const rows = db.prepare(
    `SELECT i.*
     FROM influencers i
     ${where.sql}
     ORDER BY COALESCE(i.composite_score, 0) DESC, i.name ASC`
  ).all(...where.params);
  return rows.map(mapInfluencer);
}

function getInfluencerById(id) {
  const row = db.prepare('SELECT * FROM influencers WHERE id = ?').get(id);
  return row ? mapInfluencer(row) : null;
}

function hasInfluencer(id) {
  const row = db.prepare('SELECT 1 FROM influencers WHERE id = ?').get(id);
  return Boolean(row);
}

function getStats() {
  const counts = db.prepare(
    `SELECT
      COUNT(*) AS total,
      (SELECT COUNT(*) FROM social_league) AS socialLeague
     FROM influencers`
  ).get();

  return {
    total: counts.total || 0,
    socialLeague: counts.socialLeague || 0,
  };
}

function getCampaignTypes() {
  const rows = db.prepare(
    `SELECT DISTINCT campaign_type FROM influencer_campaign_types ORDER BY campaign_type`
  ).all();
  return rows.map(r => r.campaign_type).filter(Boolean);
}

function searchInfluencers(query) {
  if (!query) {
    return listInfluencers();
  }

  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/).filter(keyword => keyword.length > 1);
  const wantsHighEngagement = /best engagement|highest engagement|top engagement/i.test(lower);
  const wantsLowFollowers = /under (\d+)k|fewer than|small audience|micro/i.test(lower);
  const wantsExternal = /external|paid|sponsored/i.test(lower);
  const wantsActive = /active|available/i.test(lower);
  const wantsApproved = /approved/i.test(lower);

  let followerCeiling = Infinity;
  const followerMatch = lower.match(/under\s+(\d+)\s*k/i);
  if (followerMatch) {
    followerCeiling = parseInt(followerMatch[1], 10) * 1000;
  }

  return listInfluencers()
    .map(influencer => {
      const searchText = [
        influencer.name,
        influencer.type,
        influencer.persona_group,
        influencer.location,
        influencer.bio,
        influencer.campaign_rationale,
        ...influencer.platforms.map(platform => `${platform.platform} ${platform.handle}`),
        ...influencer.content.map(content => `${content.ibm_product_tag} ${content.title}`),
        ...influencer.events,
        ...influencer.campaign_types,
      ].join(' ').toLowerCase();

      let score = keywords.filter(keyword => searchText.includes(keyword)).length * 2;
      if (wantsHighEngagement && (influencer.score?.engagement_score || 0) >= 8.5) score += 5;
      if (wantsExternal && influencer.type === 'external') score += 4;
      if (wantsActive && influencer.status === 'active') score += 2;
      if (wantsApproved && influencer.approval_status === 'approved') score += 2;

      const totalFollowers = influencer.platforms.reduce((sum, platform) => sum + (platform.follower_count || 0), 0);
      if (wantsLowFollowers && totalFollowers > followerCeiling) score -= 10;

      return { influencer, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.influencer.score?.composite || 0) - (a.influencer.score?.composite || 0))
    .map(item => item.influencer);
}

function getInfluencerRate(id) {
  if (!hasInfluencer(id)) {
    return undefined;
  }

  const row = db.prepare('SELECT rate FROM influencers WHERE id = ?').get(id);
  return row ? row.rate : null;
}

function getInfluencerScore(id) {
  const row = db.prepare(
    `SELECT engagement_score, reach_score, quality_score, cost_score, advocacy_score, composite_score
     FROM influencers WHERE id = ?`
  ).get(id);
  return row ? toScore(row) : null;
}

// ── Post-date extraction from URL (no API calls needed) ──────────────────────
// Each major platform encodes a timestamp directly into its post/video/activity ID.
// We decode these purely from the URL — zero network requests, zero API keys.

function extractPostDateFromUrl(permalink) {
  if (!permalink) return null;
  const url = permalink.trim();

  const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const IG_EPOCH = 1293840000000n;
  let m;

  // ── X / Twitter ──────────────────────────────────────────────────────────────
  // status IDs and article IDs are both Snowflakes
  const TWITTER_EPOCH = 1288834974657n;
  m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/(?:status(?:es)?|article)\/(\d{15,})/i);
  if (m) {
    const ts = (BigInt(m[1]) >> 22n) + TWITTER_EPOCH;
    const d = new Date(Number(ts));
    if (d.getFullYear() >= 2006 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────────
  // activity, ugcPost, share IDs in URN form:  urn:li:activity:ID  or urn:li:ugcPost:ID
  // ugcPost/share in slug form:                -ugcPost-ID-  or -sharePost-ID-
  // events:                                    /events/slug-ID/
  // All are Snowflakes: shift 22, Unix epoch
  m = url.match(/(?:activity|ugcPost|sharePost|share)[:/](\d{15,})/);
  if (!m) m = url.match(/-(?:activity|ugcPost|sharePost)-(\d{15,})-?/);
  if (!m) m = url.match(/\/events\/[^/]+-(\d{15,})\//);
  if (m) {
    const ts = BigInt(m[1]) >> 22n;
    const d = new Date(Number(ts));
    if (d.getFullYear() >= 2015 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── Instagram ────────────────────────────────────────────────────────────────
  // Shortcode posts/reels (base64url → Snowflake, bits 63-23 + IG epoch)
  // Handles both /p/CODE/ and /username/reel/CODE/ URL shapes
  m = url.match(/instagram\.com(?:\/[^/]+)?\/(?:p|reel|tv)\/([A-Za-z0-9_-]{6,})/);
  if (m) {
    let n = 0n;
    for (const c of m[1]) { const idx = BASE64URL.indexOf(c); if (idx < 0) break; n = n * 64n + BigInt(idx); }
    const ts = (n >> 23n) + IG_EPOCH;
    const d = new Date(Number(ts));
    if (d.getFullYear() >= 2010 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // Instagram Stories — numeric media ID is also a Snowflake (bits 63-23 + IG epoch)
  m = url.match(/instagram\.com\/stories\/[^/]+\/(\d{15,})/);
  if (m) {
    const ts = (BigInt(m[1]) >> 23n) + IG_EPOCH;
    const d = new Date(Number(ts));
    if (d.getFullYear() >= 2016 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── TikTok ───────────────────────────────────────────────────────────────────
  // https://www.tiktok.com/@user/video/7563512939550969119
  // Snowflake: bits 63-32 = Unix seconds
  m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d{15,})/);
  if (m) {
    const secs = BigInt(m[1]) >> 32n;
    const d = new Date(Number(secs) * 1000);
    if (d.getFullYear() >= 2017 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── Threads ──────────────────────────────────────────────────────────────────
  // https://www.threads.com/@user/post/DOoJTxEicfA  (same base64url + IG epoch)
  m = url.match(/threads\.(?:com|net)\/@[^/]+\/post\/([A-Za-z0-9_-]{6,})/);
  if (m) {
    let n = 0n;
    for (const c of m[1]) { const idx = BASE64URL.indexOf(c); if (idx < 0) break; n = n * 64n + BigInt(idx); }
    const ts = (n >> 23n) + IG_EPOCH;
    const d = new Date(Number(ts));
    if (d.getFullYear() >= 2023 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── Pinterest ─────────────────────────────────────────────────────────────────
  // Pin IDs are Snowflakes: bits 63-22 + Pinterest epoch (2011-06-20 = 1308528000000)
  const PIN_EPOCH = 1308528000000n;
  m = url.match(/pinterest\.[a-z.]+\/pin\/(\d{12,})/);
  if (m) {
    const ts = (BigInt(m[1]) >> 22n) + PIN_EPOCH;
    const d = new Date(Number(ts));
    if (d.getFullYear() >= 2011 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── Reddit ────────────────────────────────────────────────────────────────────
  // base36 post ID + Reddit epoch (~2005-12-08)
  m = url.match(/reddit\.com\/(?:r\/[^/]+\/comments|user\/[^/]+\/comments)\/([a-z0-9]{5,8})\//i);
  if (m) {
    const n = parseInt(m[1], 36);
    const ts = n + 1134028800;
    const d = new Date(ts * 1000);
    if (d.getFullYear() >= 2020 && d.getFullYear() <= 2030) return d.toISOString().split('T')[0];
  }

  // ── Date in URL path ─────────────────────────────────────────────────────────
  // Covers SiliconAngle, Forbes, eWeek, many blog/news sites
  m = url.match(/\/(20\d{2})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\//);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  return null;
}

// ── Async fetch helpers (Substack/Ghost public API) ──────────────────────────

// Extract a date from a Substack-compatible post API.
// Works for *.substack.com and any Ghost-powered newsletter on a custom domain
// that exposes the same API (newsletter.genai.works, read.youreverydayai.com, etc.)
async function fetchSubstackDate(permalink) {
  try {
    const u = new URL(permalink);
    // Must be a /p/<slug> path
    const slugMatch = u.pathname.match(/^\/p\/([^/?#]+)/);
    if (!slugMatch) return null;
    const slug = slugMatch[1];
    const apiUrl = `${u.protocol}//${u.host}/api/v1/posts?slug=${encodeURIComponent(slug)}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const posts = Array.isArray(data) ? data : [data];
    const post = posts.find(p => p.slug === slug) || posts[0];
    if (post?.post_date) return post.post_date.split('T')[0];
  } catch (_) {}
  return null;
}

// Backfill post_date for all rows where it is NULL but permalink exists
async function backfillPostDates() {
  const rows = db.prepare(
    `SELECT id, permalink FROM influencer_content WHERE post_date IS NULL AND permalink IS NOT NULL`
  ).all();

  const update = db.prepare(`UPDATE influencer_content SET post_date = ? WHERE id = ?`);
  let syncFilled = 0;
  let asyncFilled = 0;

  // Phase 1: sync URL-only decoding (instant, no network)
  const needsAsync = [];
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      const date = extractPostDateFromUrl(row.permalink);
      if (date) { update.run(date, row.id); syncFilled++; }
      else { needsAsync.push(row); }
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }

  // Phase 2: async Substack/Ghost API fetch for /p/<slug> URLs
  const substackRows = needsAsync.filter(r => {
    try { const p = new URL(r.permalink).pathname; return /^\/p\/[^/?#]+/.test(p); }
    catch (_) { return false; }
  });

  // Batch with concurrency limit to be polite
  const CONCURRENCY = 5;
  for (let i = 0; i < substackRows.length; i += CONCURRENCY) {
    const batch = substackRows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async row => {
      const date = await fetchSubstackDate(row.permalink);
      return { row, date };
    }));
    db.exec('BEGIN');
    try {
      for (const { row, date } of results) {
        if (date) { update.run(date, row.id); asyncFilled++; }
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  return { total: rows.length, syncFilled, asyncFilled, filled: syncFilled + asyncFilled };
}

function getInfluencerContent(id) {
  return listContent(id);
}

function createContentEntry({ creator_name, platform, permalink, campaign, title, content_type, post_date, views, engagement_rate, ibm_product_tag, ibm_partner_confirmed }) {
  // Link to existing influencer if name matches, otherwise save unlinked
  const influencerRow = creator_name
    ? db.prepare('SELECT id FROM influencers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(creator_name)
    : null;

  const influencer_id = influencerRow?.id ?? null;

  const id = 'cnt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const platform_from_url = (url) => {
    if (!url) return platform || 'Other';
    const u = url.toLowerCase();
    if (u.includes('linkedin.com'))  return 'LinkedIn';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
    if (u.includes('twitter.com') || u.includes('x.com'))   return 'X';
    if (u.includes('instagram.com')) return 'Instagram';
    if (u.includes('tiktok.com'))    return 'TikTok';
    if (u.includes('reddit.com'))    return 'Reddit';
    return platform || 'Other';
  };
  const resolvedPlatform = platform || platform_from_url(permalink);

  db.prepare(
    `INSERT INTO influencer_content (id, influencer_id, creator_name, platform, title, content_type, ibm_product_tag, post_date, views, engagement_rate, permalink, ibm_partner_confirmed, campaign)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, influencer_id, creator_name || null, resolvedPlatform,
    title || null, content_type || null, ibm_product_tag || null,
    post_date || extractPostDateFromUrl(permalink) || null, views ? parseInt(views, 10) || 0 : 0,
    engagement_rate ? parseFloat(engagement_rate) || null : null,
    permalink || null, ibm_partner_confirmed ? 1 : 0,
    campaign || null
  );

  return db.prepare(
    `SELECT c.*, COALESCE(i.name, c.creator_name) AS influencer_name, i.type AS influencer_type
     FROM influencer_content c LEFT JOIN influencers i ON i.id = c.influencer_id
     WHERE c.id = ?`
  ).get(id);
}

function upsertContentEntry(data) {
  // Match by permalink if provided — update if exists, create if not
  if (data.permalink) {
    const existing = db.prepare('SELECT id FROM influencer_content WHERE permalink = ?').get(data.permalink);
    if (existing) {
      db.prepare(
        `UPDATE influencer_content SET campaign = COALESCE(NULLIF(?, ''), campaign), title = COALESCE(NULLIF(?, ''), title) WHERE id = ?`
      ).run(data.campaign || '', data.title || '', existing.id);
      return db.prepare(
        `SELECT c.*, COALESCE(i.name, c.creator_name) AS influencer_name, i.type AS influencer_type
         FROM influencer_content c LEFT JOIN influencers i ON i.id = c.influencer_id WHERE c.id = ?`
      ).get(existing.id);
    }
  }
  return createContentEntry(data);
}

function updateContentEntry(id, { creator_name, platform, permalink, campaign, post_date }) {
  db.prepare(
    `UPDATE influencer_content SET
       creator_name = ?,
       platform     = ?,
       permalink    = ?,
       campaign     = ?,
       post_date    = ?
     WHERE id = ?`
  ).run(creator_name || null, platform || null, permalink || null, campaign || null, post_date || null, id);
  return db.prepare(
    `SELECT c.*, COALESCE(i.name, c.creator_name) AS influencer_name, i.type AS influencer_type
     FROM influencer_content c LEFT JOIN influencers i ON i.id = c.influencer_id WHERE c.id = ?`
  ).get(id);
}

function deleteContentEntry(id) {
  db.prepare('DELETE FROM influencer_content WHERE id = ?').run(id);
}

function getContentFeed(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.platform) {
    clauses.push('LOWER(c.platform) = LOWER(?)');
    params.push(filters.platform);
  }
  if (filters.ibm_product) {
    clauses.push('LOWER(COALESCE(c.ibm_product_tag, "")) LIKE ?');
    params.push(`%${filters.ibm_product.toLowerCase()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.prepare(
    `SELECT c.*, i.name AS influencer_name, i.type AS influencer_type
     FROM influencer_content c
     LEFT JOIN influencers i ON i.id = c.influencer_id
     ${where}
     ORDER BY c.post_date DESC, c.id DESC`
  ).all(...params);
}

function findInfluencerByName(name) {
  const row = db.prepare('SELECT * FROM influencers WHERE LOWER(name) = LOWER(?)').get(name);
  return row ? mapInfluencer(row) : null;
}

function updateInfluencer(id, { name, type, persona_group, location, bio, status, approval_status, owner, platforms, campaign_types }) {
  // Direct update — caller sends the full intended values (edit modal)
  db.prepare(
    `UPDATE influencers SET
       name             = ?,
       type             = ?,
       persona_group    = ?,
       location         = ?,
       bio              = ?,
       status           = ?,
       approval_status  = ?,
       owner            = ?
     WHERE id = ?`
  ).run(name || null, type || null, persona_group || null, location || null, bio || null, status || null, approval_status || null, owner || null, id);

  // Always replace platforms and campaign_types when the edit modal sends them
  if (Array.isArray(platforms)) {
    db.prepare('DELETE FROM influencer_platforms WHERE influencer_id = ?').run(id);
    for (const p of platforms) {
      db.prepare(
        `INSERT INTO influencer_platforms (influencer_id, platform, handle, url, follower_count) VALUES (?, ?, ?, ?, ?)`
      ).run(id, p.platform, p.handle || '', p.url || '', p.follower_count || 0);
    }
  }

  if (Array.isArray(campaign_types)) {
    db.prepare('DELETE FROM influencer_campaign_types WHERE influencer_id = ?').run(id);
    for (const ct of campaign_types) {
      db.prepare(
        `INSERT INTO influencer_campaign_types (influencer_id, campaign_type) VALUES (?, ?)`
      ).run(id, ct);
    }
  }

  return getInfluencerById(id);
}

function createInfluencer({ name, type, persona_group, location, bio, status, approval_status, owner, platforms = [], campaign_types = [] }) {
  const id = `inf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(-5);
  db.prepare(
    `INSERT INTO influencers (id, name, slug, type, persona_group, location, bio, status, approval_status, owner)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, slug, type || 'external', persona_group || 'Developer / Engineer', location || '', bio || '', status || 'active', approval_status || 'pending', owner || '');

  for (const p of platforms) {
    db.prepare(
      `INSERT INTO influencer_platforms (influencer_id, platform, handle, url, follower_count) VALUES (?, ?, ?, ?, ?)`
    ).run(id, p.platform, p.handle || '', p.url || '', p.follower_count || 0);
  }

  for (const ct of campaign_types) {
    db.prepare(
      `INSERT INTO influencer_campaign_types (influencer_id, campaign_type) VALUES (?, ?)`
    ).run(id, ct);
  }

  return getInfluencerById(id);
}

function deleteInfluencer(id) {
  db.prepare('DELETE FROM influencer_platforms WHERE influencer_id = ?').run(id);
  db.prepare('DELETE FROM influencer_campaign_types WHERE influencer_id = ?').run(id);
  db.prepare('DELETE FROM influencer_events WHERE influencer_id = ?').run(id);
  db.prepare('DELETE FROM influencer_content WHERE influencer_id = ?').run(id);
  const result = db.prepare('DELETE FROM influencers WHERE id = ?').run(id);
  return result.changes > 0;
}

// Map geo region name → LIKE patterns applied with OR
const GEO_PATTERNS = {
  americas: [', us', ', ca', ', br', ', mx', ', cl', 'united states', 'canada', 'brazil', 'mexico'],
  uk:       [', uk', ', gb', 'united kingdom', 'england', 'scotland', 'wales'],
  emea:     [', de', ', fr', ', es', ', it', ', nl', ', be', ', ch', ', pl', ', ie',
             ', se', ', fi', ', no', ', dk', ', ro', ', il', ', sa', ', ae', ', za',
             ', sg', ', au', ', nz', ', jp', ', kr',
             'germany', 'france', 'spain', 'italy', 'netherlands', 'switzerland',
             'poland', 'ireland', 'sweden', 'finland', 'norway', 'denmark',
             'romania', 'israel', 'saudi', 'dubai', 'singapore', 'australia'],
  india:    [', in', ', india', 'bangalore', 'bengaluru', 'mumbai', 'chennai',
             'hyderabad', 'pune', 'delhi', 'nairobi', 'maharashtra', 'karnataka'],
};

function listSocialLeague({ q, member_identity, collaborate, geo, business_unit, talks_about_ai } = {}) {
  const clauses = [];
  const params = [];
  if (q) {
    clauses.push("(LOWER(name) LIKE ? OR LOWER(COALESCE(title,'')) LIKE ? OR LOWER(COALESCE(business_unit,'')) LIKE ? OR LOWER(COALESCE(location,'')) LIKE ?)");
    const like = '%' + q.toLowerCase() + '%';
    params.push(like, like, like, like);
  }
  if (member_identity) { clauses.push('LOWER(member_identity) = LOWER(?)'); params.push(member_identity); }
  if (collaborate)     { clauses.push("LOWER(COALESCE(collaborate,'')) LIKE ?"); params.push('%' + collaborate.toLowerCase() + '%'); }
  if (geo) {
    const patterns = GEO_PATTERNS[geo.toLowerCase()] || [];
    if (patterns.length > 0) {
      clauses.push('(' + patterns.map(() => "LOWER(COALESCE(location,'')) LIKE ?").join(' OR ') + ')');
      patterns.forEach(p => params.push('%' + p + '%'));
    }
  }
  if (business_unit)   { clauses.push("LOWER(COALESCE(business_unit,'')) LIKE ?"); params.push('%' + business_unit.toLowerCase() + '%'); }
  if (talks_about_ai === '1') { clauses.push('talks_about_ai = 1'); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  return db.prepare('SELECT * FROM social_league ' + where + ' ORDER BY followers DESC, name ASC').all(...params);
}

function createSocialLeagueMember({ name, title, linkedin, email, member_identity, collaborate, followers, location, business_unit, w3, talks_about_ai }) {
  const id = 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  db.prepare(`
    INSERT INTO social_league (id, name, title, linkedin, email, member_identity, collaborate, followers, location, business_unit, w3, talks_about_ai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name ?? null, title ?? null, linkedin ?? null, email ?? null, member_identity ?? null,
    collaborate ?? null, followers != null ? parseInt(followers, 10) || 0 : 0,
    location ?? null, business_unit ?? null, w3 ?? null,
    talks_about_ai ? 1 : 0
  );
  return db.prepare('SELECT * FROM social_league WHERE id = ?').get(id);
}

function upsertSocialLeagueMember(data) {
  const { name } = data;
  if (!name || !String(name).trim()) throw new Error('name is required');
  const existing = db.prepare('SELECT * FROM social_league WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(name);
  if (existing) return updateSocialLeagueMember(existing.id, data);
  return createSocialLeagueMember(data);
}

function updateSocialLeagueMember(id, { name, title, linkedin, email, member_identity, collaborate, followers, location, business_unit, w3, talks_about_ai }) {
  db.prepare(`
    UPDATE social_league
    SET name            = ?,
        title           = ?,
        linkedin        = ?,
        email           = ?,
        member_identity = ?,
        collaborate     = ?,
        followers       = ?,
        location        = ?,
        business_unit   = ?,
        w3              = ?,
        talks_about_ai  = ?
    WHERE id = ?
  `).run(
    name            || null,
    title           || null,
    linkedin        || null,
    email           || null,
    member_identity || null,
    collaborate     || null,
    followers != null ? parseInt(followers, 10) || 0 : 0,
    location      || null,
    business_unit || null,
    w3            || null,
    talks_about_ai ? 1 : 0,
    id
  );
  return db.prepare('SELECT * FROM social_league WHERE id = ?').get(id);
}

// ── Chat NLP query ────────────────────────────────────────────────────────────

// Known values for fuzzy matching
const KNOWN_EVENTS = [
  'AI Summit Korea', 'AWS re:Invent', 'Dreamforce', 'Ferrari / F1',
  'Gartner Data & Analytics', 'GRAMMYs', 'IBM Accelerate', 'IBM Think',
  'IBM TechXchange', 'KubeCon', 'Masters', 'Mobile World Congress',
  'NFL', 'NRF', 'NY Tech Week', 'SIBOS', 'SXSW', 'US Open', 'VivaTech', 'Wimbledon',
];

const KNOWN_CAMPAIGNS = [
  'AI for Business', 'Automation / webMethods', 'Cross-Geo',
  'Granite / Developer', 'Hybrid Cloud', 'Security',
  'Sports Survey 2025', 'UK Narrative',
];

const KNOWN_PLATFORMS = ['YouTube', 'LinkedIn', 'Instagram', 'TikTok', 'X', 'Reddit'];

const PERSONA_MAP = {
  'developer': 'Developer / Engineer',
  'engineer':  'Developer / Engineer',
  'data':      'Data & AI Specialist',
  'ai specialist': 'Data & AI Specialist',
  'security':  'Cybersecurity Expert',
  'ciso':      'Cybersecurity Expert',
  'cybersecurity': 'Cybersecurity Expert',
  'executive': 'C-Suite / Executive',
  'ceo':       'C-Suite / Executive',
  'cto':       'C-Suite / Executive',
  'cxo':       'C-Suite / Executive',
  'founder':   'Entrepreneur / Founder',
  'entrepreneur': 'Entrepreneur / Founder',
  'thought leader': 'Thought Leader (Author, Speaker, Analyst)',
  'analyst':   'Thought Leader (Author, Speaker, Analyst)',
  'speaker':   'Thought Leader (Author, Speaker, Analyst)',
  'podcast':   'Media / Content Creator (Podcast, YouTube)',
  'youtuber':  'Media / Content Creator (Podcast, YouTube)',
  'content creator': 'Media / Content Creator (Podcast, YouTube)',
  'educator':  'Educator / Researcher',
  'researcher': 'Educator / Researcher',
  'sustainability': 'Sustainability / Climate',
  'climate':   'Sustainability / Climate',
  'fintech':   'FinTech / Finance',
  'finance':   'FinTech / Finance',
};

const GEO_ALIASES = {
  'americas':       'americas',
  'america':        'americas',
  'us':             'americas',
  'usa':            'americas',
  'united states':  'americas',
  'canada':         'americas',
  'north america':  'americas',
  'latin america':  'americas',
  'brazil':         'americas',
  'mexico':         'americas',
  'uk':             'uk',
  'uki':            'uk',
  'united kingdom': 'uk',
  'britain':        'uk',
  'england':        'uk',
  'scotland':       'uk',
  'wales':          'uk',
  'ireland':        'uk',
  'emea':           'emea',
  'europe':         'emea',
  'germany':        'emea',
  'france':         'emea',
  'middle east':    'emea',
  'africa':         'emea',
  'india':          'india',
};

// GEO_PATTERNS already defined above — reuse it for matching
function geoMatch(text) {
  for (const [alias, geo] of Object.entries(GEO_ALIASES)) {
    if (text.includes(alias)) return geo;
  }
  return null;
}

function fuzzyMatch(text, candidates) {
  const lower = text.toLowerCase();
  // exact substring first
  const exact = candidates.find(c => lower.includes(c.toLowerCase()));
  if (exact) return exact;
  // word overlap — require at least 4-char words to avoid false matches on "in", "re", etc.
  const words = lower.split(/\s+/).filter(w => w.length >= 4);
  if (words.length === 0) return null;
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const cWords = c.toLowerCase().split(/[\s/&:,]+/).filter(w => w.length >= 4);
    if (cWords.length === 0) continue;
    const overlap = words.filter(w => cWords.some(cw => cw === w || (cw.length >= 5 && (cw.includes(w) || w.includes(cw))))).length;
    if (overlap > bestScore) { bestScore = overlap; best = c; }
  }
  return bestScore > 0 ? best : null;
}

function parseFollowerBound(text) {
  // "under 5k", "less than 10000", "below 50k", "over 100k", "more than 1m", "between 10k and 100k"
  const between = text.match(/between\s+(\d+\.?\d*)\s*([km]?)\s+and\s+(\d+\.?\d*)\s*([km]?)/i);
  if (between) {
    const mult = m => ({ k: 1000, m: 1000000 }[m.toLowerCase()] || 1);
    return {
      min: Math.round(parseFloat(between[1]) * mult(between[2] || '')),
      max: Math.round(parseFloat(between[3]) * mult(between[4] || '')),
    };
  }
  const under = text.match(/(?:under|below|less\s+than|fewer\s+than)\s+(\d+\.?\d*)\s*([km]?)/i);
  if (under) {
    const mult = { k: 1000, m: 1000000 }[under[2].toLowerCase()] || 1;
    return { min: 0, max: Math.round(parseFloat(under[1]) * mult) };
  }
  const over = text.match(/(?:over|above|more\s+than|at\s+least)\s+(\d+\.?\d*)\s*([km]?)/i);
  if (over) {
    const mult = { k: 1000, m: 1000000 }[over[2].toLowerCase()] || 1;
    return { min: Math.round(parseFloat(over[1]) * mult), max: Infinity };
  }
  return null;
}

function chatQuery(message) {
  const lower = message.toLowerCase();
  const filters = {};
  const appliedFilters = [];

  // ── Status / approval ────────────────────────────────────────────────────
  if (/\bactive\b/.test(lower))   { filters.status = 'active';   appliedFilters.push('status: active'); }
  if (/\bapproved\b/.test(lower)) { filters.approval_status = 'approved'; appliedFilters.push('approval: approved'); }
  if (/ibm content|\bibm\b.*post|has.*content/.test(lower)) { filters.has_content = 'true'; appliedFilters.push('has IBM content'); }

  // ── Type ─────────────────────────────────────────────────────────────────
  if (/\bexternal\b/.test(lower)) { filters.type = 'external'; appliedFilters.push('type: external'); }
  if (/internal|social league/.test(lower)) { filters.type = 'internal'; appliedFilters.push('type: internal'); }

  // ── Platform ─────────────────────────────────────────────────────────────
  const platform = fuzzyMatch(lower, KNOWN_PLATFORMS);
  if (platform) { filters.platform = platform; appliedFilters.push(`platform: ${platform}`); }

  // ── Event ────────────────────────────────────────────────────────────────
  const event = fuzzyMatch(lower, KNOWN_EVENTS);
  if (event) { filters.event = event; appliedFilters.push(`event: ${event}`); }

  // ── Campaign type ────────────────────────────────────────────────────────
  const campaign = fuzzyMatch(lower, KNOWN_CAMPAIGNS);
  if (campaign) { filters.campaign_type = campaign; appliedFilters.push(`campaign: ${campaign}`); }

  // ── Persona ───────────────────────────────────────────────────────────────
  let persona = null;
  for (const [alias, group] of Object.entries(PERSONA_MAP)) {
    if (lower.includes(alias)) { persona = group; break; }
  }
  if (persona) { filters.persona_group = persona; appliedFilters.push(`persona: ${persona}`); }

  // ── Geography ────────────────────────────────────────────────────────────
  const geo = geoMatch(lower);
  if (geo) { filters.location = geo; appliedFilters.push(`geo: ${geo}`); }

  // ── Follower bounds ───────────────────────────────────────────────────────
  const followerBound = parseFollowerBound(lower);

  // ── Run query ─────────────────────────────────────────────────────────────
  let results = listInfluencers(filters);

  // Post-filter follower count (can't easily do in SQL with current schema)
  if (followerBound) {
    results = results.filter(inf => {
      const total = inf.platforms.reduce((s, p) => s + (p.follower_count || 0), 0);
      return total >= followerBound.min && (followerBound.max === Infinity || total <= followerBound.max);
    });
    const label = followerBound.max === Infinity
      ? `followers > ${followerBound.min.toLocaleString()}`
      : followerBound.min === 0
        ? `followers < ${followerBound.max.toLocaleString()}`
        : `followers ${followerBound.min.toLocaleString()}–${followerBound.max.toLocaleString()}`;
    appliedFilters.push(label);
  }

  // Strip rate from results
  results = results.map(({ rate, ...rest }) => rest);

  // Build a human-readable reply
  let reply;
  if (appliedFilters.length === 0) {
    // No structured filters found — fall back to keyword search
    const searched = searchInfluencers(message).map(({ rate, ...rest }) => rest);
    if (searched.length > 0) {
      reply = `Found ${searched.length} creator${searched.length !== 1 ? 's' : ''} matching your query.`;
      return { reply, results: searched, filters: {} };
    }
    reply = "I couldn't identify any specific filters in your query. Try mentioning a location (e.g. \"Americas\"), event (e.g. \"IBM Think\"), platform, or follower range.";
    return { reply, results: [], filters: {} };
  }

  if (results.length === 0) {
    reply = `No creators found matching: ${appliedFilters.join(', ')}. Try broadening your criteria.`;
  } else {
    reply = `Found ${results.length} creator${results.length !== 1 ? 's' : ''} — filtered by ${appliedFilters.join(', ')}.`;
  }

  return { reply, results, filters };
}

// ── Extended knowledge (CSV import layer — read-only, never shown on dashboard) ──

function searchExtendedKnowledge(query) {
  if (!query || !query.trim()) return [];

  // Ensure the table exists — gracefully return empty if not yet imported
  try {
    db.prepare('SELECT 1 FROM influencers_csv LIMIT 1').get();
  } catch (_) {
    return [];
  }

  const q = query.trim().toLowerCase();
  // Build tokens from the query to fuzzy-match against name, handle, campaigns, bio
  const tokens = q.split(/\s+/).filter(t => t.length > 1);

  // Exact name match first
  const exact = db.prepare(`
    SELECT * FROM influencers_csv
    WHERE name_lower = ? OR name_lower LIKE ?
    LIMIT 5
  `).all(q, `%${q}%`);

  // Token-based match across name / handle / campaigns / bio
  const seen = new Set(exact.map(r => r.id));
  const token_results = [];
  for (const token of tokens) {
    const rows = db.prepare(`
      SELECT * FROM influencers_csv
      WHERE name_lower LIKE ?
         OR LOWER(IFNULL(handle,''))    LIKE ?
         OR LOWER(IFNULL(campaigns,'')) LIKE ?
         OR LOWER(IFNULL(bio,''))       LIKE ?
      LIMIT 10
    `).all(`%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`);
    for (const r of rows) {
      if (!seen.has(r.id)) { seen.add(r.id); token_results.push(r); }
    }
  }

  const combined = [...exact, ...token_results].slice(0, 8);

  return combined.map(r => ({
    name:              r.name,
    handle:            r.handle     || null,
    social_url:        r.social_url || null,
    persona:           r.persona    || null,
    bio:               r.bio        || null,
    campaigns:         r.campaigns  || null,
    platforms:         r.platforms  || null,
    geo:               r.geo        || null,
    followers:         r.followers  || null,
    total_impressions: r.total_impressions || null,
    total_engagement:  r.total_engagement  || null,
    post_count:        r.post_count        || null,
    source:            'csv_knowledge_base',
  }));
}

module.exports = {
  createInfluencer,
  deleteInfluencer,
  findInfluencerByName,
  updateInfluencer,
  saveFeedback,
  deleteFeedback,
  getContentFeed,
  createContentEntry,
  upsertContentEntry,
  updateContentEntry,
  deleteContentEntry,
  backfillPostDates,
  extractPostDateFromUrl,
  getInfluencerById,
  getInfluencerContent,
  getInfluencerRate,
  getInfluencerScore,
  getStats,
  listInfluencers,
  searchInfluencers,
  getCampaignTypes,
  chatQuery,
  listSocialLeague,
  createSocialLeagueMember,
  upsertSocialLeagueMember,
  updateSocialLeagueMember,
  searchExtendedKnowledge,
};
