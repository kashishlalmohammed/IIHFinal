const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../data/influencers.sqlite'), { readonly: true });

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
    `SELECT id, platform, title, content_type, ibm_product_tag, post_date, views, engagement_rate, permalink, ibm_partner_confirmed
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
    feedback: [],
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
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
      (SELECT COUNT(DISTINCT influencer_id) FROM influencer_content) AS withContent,
      ROUND(AVG(composite_score), 1) AS avgScore
     FROM influencers`
  ).get();

  return {
    total: counts.total || 0,
    active: counts.active || 0,
    approved: counts.approved || 0,
    withContent: counts.withContent || 0,
    avgScore: counts.avgScore || 0,
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
     JOIN influencers i ON i.id = c.influencer_id
     ${where}
     ORDER BY c.post_date DESC, c.id DESC`
  ).all(...params);
}

module.exports = {
  getContentFeed,
  getInfluencerById,
  getInfluencerContent,
  getInfluencerRate,
  getInfluencerScore,
  getStats,
  listInfluencers,
  searchInfluencers,
};
