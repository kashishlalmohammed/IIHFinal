const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../data/influencers.sqlite'));

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
    clauses.push('LOWER(COALESCE(i.location, \'\')) LIKE ?');
    params.push(`%${filters.location.toLowerCase()}%`);
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

function getInfluencerContent(id) {
  return listContent(id);
}

function createContentEntry({ creator_name, platform, permalink, campaign, title, content_type, post_date, views, engagement_rate, ibm_product_tag, ibm_partner_confirmed }) {
  // Try to match creator to an existing influencer (case-insensitive)
  const influencerRow = creator_name
    ? db.prepare('SELECT id FROM influencers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(creator_name)
    : null;

  let influencer_id = influencerRow?.id;

  // If no match, create a minimal stub so the content has something to link to
  if (!influencer_id && creator_name && creator_name.trim()) {
    influencer_id = 'inf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    db.prepare(
      `INSERT INTO influencers (id, name, type, persona_group, location, bio, status, approval_status)
       VALUES (?, ?, 'external', 'Other', '', '', 'active', 'pending')`
    ).run(influencer_id, creator_name.trim());
  }

  if (!influencer_id) throw new Error('creator_name is required');

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
    `INSERT INTO influencer_content (id, influencer_id, platform, title, content_type, ibm_product_tag, post_date, views, engagement_rate, permalink, ibm_partner_confirmed, campaign)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, influencer_id, resolvedPlatform,
    title || null, content_type || null, ibm_product_tag || null,
    post_date || null, views ? parseInt(views, 10) || 0 : 0,
    engagement_rate ? parseFloat(engagement_rate) || null : null,
    permalink || null, ibm_partner_confirmed ? 1 : 0,
    campaign || null
  );

  return db.prepare(
    `SELECT c.*, i.name AS influencer_name, i.type AS influencer_type
     FROM influencer_content c JOIN influencers i ON i.id = c.influencer_id
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
        `SELECT c.*, i.name AS influencer_name, i.type AS influencer_type
         FROM influencer_content c JOIN influencers i ON i.id = c.influencer_id WHERE c.id = ?`
      ).get(existing.id);
    }
  }
  return createContentEntry(data);
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
  // Update scalar fields (only overwrite non-empty values from CSV)
  db.prepare(
    `UPDATE influencers SET
       name             = COALESCE(NULLIF(?, ''), name),
       type             = COALESCE(NULLIF(?, ''), type),
       persona_group    = COALESCE(NULLIF(?, ''), persona_group),
       location         = COALESCE(NULLIF(?, ''), location),
       bio              = COALESCE(NULLIF(?, ''), bio),
       status           = COALESCE(NULLIF(?, ''), status),
       approval_status  = COALESCE(NULLIF(?, ''), approval_status),
       owner            = COALESCE(NULLIF(?, ''), owner)
     WHERE id = ?`
  ).run(name || '', type || '', persona_group || '', location || '', bio || '', status || '', approval_status || '', owner || '', id);

  // Replace platforms if any were provided in the CSV
  if (Array.isArray(platforms) && platforms.length > 0) {
    db.prepare('DELETE FROM influencer_platforms WHERE influencer_id = ?').run(id);
    for (const p of platforms) {
      db.prepare(
        `INSERT INTO influencer_platforms (influencer_id, platform, handle, url, follower_count) VALUES (?, ?, ?, ?, ?)`
      ).run(id, p.platform, p.handle || '', p.url || '', p.follower_count || 0);
    }
  }

  // Replace campaign types if any were provided
  if (Array.isArray(campaign_types) && campaign_types.length > 0) {
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
  const slug = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id}`;
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
    SET name = ?, title = ?, linkedin = ?, email = ?, member_identity = ?,
        collaborate = ?, followers = ?, location = ?, business_unit = ?, w3 = ?, talks_about_ai = ?
    WHERE id = ?
  `).run(
    name ?? null, title ?? null, linkedin ?? null, email ?? null, member_identity ?? null,
    collaborate ?? null, followers != null ? parseInt(followers, 10) || 0 : null,
    location ?? null, business_unit ?? null, w3 ?? null,
    talks_about_ai != null ? (talks_about_ai ? 1 : 0) : 0,
    id
  );
  return db.prepare('SELECT * FROM social_league WHERE id = ?').get(id);
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
  getInfluencerById,
  getInfluencerContent,
  getInfluencerRate,
  getInfluencerScore,
  getStats,
  listInfluencers,
  searchInfluencers,
  listSocialLeague,
  createSocialLeagueMember,
  upsertSocialLeagueMember,
  updateSocialLeagueMember,
};
