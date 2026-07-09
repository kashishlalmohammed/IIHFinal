const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const {
  createInfluencer,
  deleteInfluencer,
  findInfluencerByName,
  updateInfluencer,
  saveFeedback,
  deleteFeedback,
  listSocialLeague,
  createSocialLeagueMember,
  upsertSocialLeagueMember,
  updateSocialLeagueMember,
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
} = require('./db');

const { aiChatQuery } = require('./ai');

const app = express();
app.use(cors());
app.use(express.json());

// In Docker the frontend build is copied to /app/frontend/build (sibling of src/).
// Locally (running from backend/) it resolves to the same relative path.
const uiBuild = process.env.DATA_DIR
  ? path.join(__dirname, '../frontend/build')   // Docker: /app/frontend/build
  : path.join(__dirname, '../../frontend/build'); // Local: backend/../frontend/build

app.get('/api/social-league', (req, res) => {
  res.json(listSocialLeague(req.query));
});

app.post('/api/social-league', (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const member = createSocialLeagueMember(req.body);
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/social-league/upsert', (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const member = upsertSocialLeagueMember(req.body);
    res.status(200).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/social-league/:id', (req, res) => {
  try {
    const updated = updateSocialLeagueMember(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

app.get('/api/campaigns', (req, res) => {
  res.json(getCampaignTypes());
});

app.get('/api/influencers', (req, res) => {
  const results = listInfluencers(req.query);
  const safe = results.map(({ rate, ...rest }) => rest);
  res.json(safe);
});

app.post('/api/influencers', (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const influencer = createInfluencer(req.body);
    const { rate, ...safe } = influencer;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert by name: update existing if name matches, otherwise create new
app.post('/api/influencers/upsert', (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const existing = findInfluencerByName(name);
    if (existing) {
      const influencer = updateInfluencer(existing.id, req.body);
      const { rate, ...safe } = influencer;
      return res.json({ ...safe, _upserted: 'updated' });
    }
    const influencer = createInfluencer(req.body);
    const { rate, ...safe } = influencer;
    res.status(201).json({ ...safe, _upserted: 'created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/influencers/:id', (req, res) => {
  const existing = getInfluencerById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  try {
    const influencer = updateInfluencer(req.params.id, req.body);
    const { rate, ...safe } = influencer;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/influencers/:id', (req, res) => {
  const deleted = deleteInfluencer(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

app.get('/api/influencers/:id', (req, res) => {
  const influencer = getInfluencerById(req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  const { rate, ...safe } = influencer;
  res.json(safe);
});

app.get('/api/influencers/:id/rate', (req, res) => {
  const rate = getInfluencerRate(req.params.id);
  if (rate === undefined) return res.status(404).json({ error: 'Not found' });
  res.json({ rate: rate || 'Not on file' });
});

app.get('/api/influencers/:id/score', (req, res) => {
  const score = getInfluencerScore(req.params.id);
  if (!score) return res.status(404).json({ error: 'Not found' });
  res.json(score);
});

app.get('/api/influencers/:id/content', (req, res) => {
  const influencer = getInfluencerById(req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  res.json(getInfluencerContent(req.params.id));
});

app.post('/api/influencers/:id/sync', async (req, res) => {
  const influencer = getInfluencerById(req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });

  await new Promise(resolve => setTimeout(resolve, 1200));

  res.json({
    status: 'success',
    posts_found: influencer.content.length,
    content: influencer.content,
    message: `Synced ${influencer.content.length} #IBMPartner post(s) across all platforms.`
  });
});

app.get('/api/influencers/:id/feedback', (req, res) => {
  const influencer = getInfluencerById(req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  res.json(influencer.feedback || []);
});

app.delete('/api/influencers/:id/feedback/:fid', (req, res) => {
  const deleted = deleteFeedback(req.params.id, req.params.fid);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

app.post('/api/influencers/:id/feedback', (req, res) => {
  const influencer = getInfluencerById(req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  if (!req.body.body?.trim()) return res.status(400).json({ error: 'body is required' });
  const entry = saveFeedback(req.params.id, req.body);
  res.status(201).json(entry);
});

app.get('/api/content/feed', (req, res) => {
  res.json(getContentFeed(req.query));
});

app.post('/api/content', (req, res) => {
  const { creator_name } = req.body;
  if (!creator_name || !String(creator_name).trim()) return res.status(400).json({ error: 'creator_name is required' });
  try {
    const entry = createContentEntry(req.body);
    if (!entry) return res.status(200).json({ _skipped: true, reason: 'creator not found in hub' });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/content/upsert', (req, res) => {
  const { creator_name } = req.body;
  if (!creator_name || !String(creator_name).trim()) return res.status(400).json({ error: 'creator_name is required' });
  try {
    const entry = upsertContentEntry(req.body);
    if (!entry) return res.status(200).json({ _skipped: true, reason: 'creator not found in hub' });
    res.status(200).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/content/:id', (req, res) => {
  try {
    const body = { ...req.body };
    // Auto-extract date from URL if not manually provided
    if (!body.post_date && body.permalink) {
      body.post_date = extractPostDateFromUrl(body.permalink) || null;
    }
    const entry = updateContentEntry(req.params.id, body);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/content/:id', (req, res) => {
  try {
    deleteContentEntry(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/content/backfill-dates', async (req, res) => {
  try {
    const result = await backfillPostDates();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/search', (req, res) => {
  const results = searchInfluencers(req.body.query).map(({ rate, ...rest }) => rest);
  res.json(results.length > 0 ? results : listInfluencers().map(({ rate, ...rest }) => rest));
});

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    const result = await aiChatQuery(String(message).trim(), Array.isArray(history) ? history : []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend AFTER all API routes so the wildcard never intercepts API calls
app.use(express.static(uiBuild));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(uiBuild, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`IBM Influencer Hub running on http://localhost:${PORT}`);
});
