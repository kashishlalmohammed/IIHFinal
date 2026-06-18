const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve the React production build
const uiBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(uiBuild));

let influencers = require('./data/influencers');

// ── Stats ──────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const total = influencers.length;
  const active = influencers.filter(i => i.status === 'active').length;
  const approved = influencers.filter(i => i.approval_status === 'approved').length;
  const withContent = influencers.filter(i => i.content && i.content.length > 0).length;
  const avgScore = (
    influencers.reduce((acc, i) => acc + (i.score?.composite || 0), 0) / total
  ).toFixed(1);
  res.json({ total, active, approved, withContent, avgScore });
});

// ── Influencer list ────────────────────────────────────────────────────────
app.get('/api/influencers', (req, res) => {
  let results = [...influencers];
  const { type, persona_group, platform, approval_status, status, has_content, q } = req.query;

  if (type) results = results.filter(i => i.type === type);
  if (persona_group) results = results.filter(i => i.persona_group === persona_group);
  if (approval_status) results = results.filter(i => i.approval_status === approval_status);
  if (status) results = results.filter(i => i.status === status);
  if (has_content === 'true') results = results.filter(i => i.content && i.content.length > 0);
  if (platform) results = results.filter(i =>
    i.platforms && i.platforms.some(p => p.platform.toLowerCase() === platform.toLowerCase())
  );
  if (q) {
    const lower = q.toLowerCase();
    results = results.filter(i =>
      i.name.toLowerCase().includes(lower) ||
      i.bio?.toLowerCase().includes(lower) ||
      i.persona_group?.toLowerCase().includes(lower) ||
      i.location?.toLowerCase().includes(lower) ||
      i.platforms?.some(p => p.handle.toLowerCase().includes(lower)) ||
      i.content?.some(c => c.ibm_product_tag?.toLowerCase().includes(lower) || c.title?.toLowerCase().includes(lower))
    );
  }

  // Strip sensitive rate field from list view
  const safe = results.map(({ rate, ...rest }) => rest);
  res.json(safe);
});

// ── Single profile ────────────────────────────────────────────────────────
app.get('/api/influencers/:id', (req, res) => {
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  const { rate, ...safe } = influencer;
  res.json(safe);
});

// ── Rate (gated) ──────────────────────────────────────────────────────────
app.get('/api/influencers/:id/rate', (req, res) => {
  // In production, check role/session here
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  res.json({ rate: influencer.rate || 'Not on file' });
});

// ── Scorecard ─────────────────────────────────────────────────────────────
app.get('/api/influencers/:id/score', (req, res) => {
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  res.json(influencer.score || {});
});

// ── Content history ───────────────────────────────────────────────────────
app.get('/api/influencers/:id/content', (req, res) => {
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  res.json(influencer.content || []);
});

// ── Sync (mock + YouTube stub) ────────────────────────────────────────────
app.post('/api/influencers/:id/sync', async (req, res) => {
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });

  // Simulate brief processing delay
  await new Promise(r => setTimeout(r, 1200));

  // Return existing content as "synced" result (pre-cached for demo safety)
  res.json({
    status: 'success',
    posts_found: influencer.content.length,
    content: influencer.content,
    message: `Synced ${influencer.content.length} #IBMPartner post(s) across all platforms.`
  });
});

// ── Feedback ──────────────────────────────────────────────────────────────
app.get('/api/influencers/:id/feedback', (req, res) => {
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  res.json(influencer.feedback || []);
});

app.post('/api/influencers/:id/feedback', (req, res) => {
  const influencer = influencers.find(i => i.id === req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  const entry = {
    id: `f${Date.now()}`,
    author: req.body.author || 'Anonymous',
    team: req.body.team || 'campaign',
    body: req.body.body,
    created_at: new Date().toISOString().split('T')[0]
  };
  influencer.feedback.push(entry);
  res.status(201).json(entry);
});

// ── Global content feed ───────────────────────────────────────────────────
app.get('/api/content/feed', (req, res) => {
  let all = [];
  influencers.forEach(inf => {
    (inf.content || []).forEach(c => {
      all.push({ ...c, influencer_id: inf.id, influencer_name: inf.name, influencer_type: inf.type });
    });
  });

  const { platform, ibm_product } = req.query;
  if (platform) all = all.filter(c => c.platform.toLowerCase() === platform.toLowerCase());
  if (ibm_product) all = all.filter(c => c.ibm_product_tag?.toLowerCase().includes(ibm_product.toLowerCase()));

  all.sort((a, b) => new Date(b.post_date) - new Date(a.post_date));
  res.json(all);
});

// ── NL Search (watsonx mock) ──────────────────────────────────────────────
app.post('/api/search', (req, res) => {
  const { query } = req.body;
  if (!query) return res.json(influencers.map(({ rate, ...rest }) => rest));

  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/);

  // Score-based fuzzy matching on keywords
  const scored = influencers.map(inf => {
    const text = [
      inf.name, inf.type, inf.persona_group, inf.location, inf.bio,
      inf.campaign_rationale,
      ...(inf.platforms || []).map(p => `${p.platform} ${p.handle}`),
      ...(inf.content || []).map(c => `${c.ibm_product_tag} ${c.title}`)
    ].join(' ').toLowerCase();

    const hits = keywords.filter(k => text.includes(k)).length;
    return { influencer: inf, hits };
  });

  const results = scored
    .filter(s => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map(s => {
      const { rate, ...safe } = s.influencer;
      return safe;
    });

  res.json(results.length > 0 ? results : influencers.map(({ rate, ...rest }) => rest));
});

// All non-API routes return the React app
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(uiBuild, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`IBM Influencer Hub running on http://localhost:${PORT}`);
});
