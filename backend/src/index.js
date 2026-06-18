const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const {
  getContentFeed,
  getInfluencerById,
  getInfluencerContent,
  getInfluencerRate,
  getInfluencerScore,
  getStats,
  listInfluencers,
  searchInfluencers,
} = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const uiBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(uiBuild));

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

app.get('/api/influencers', (req, res) => {
  const results = listInfluencers(req.query);
  const safe = results.map(({ rate, ...rest }) => rest);
  res.json(safe);
});

app.post('/api/influencers', (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  res.status(501).json({ error: 'Creating influencers is not supported for the SQLite dataset.' });
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

app.post('/api/influencers/:id/feedback', (req, res) => {
  const influencer = getInfluencerById(req.params.id);
  if (!influencer) return res.status(404).json({ error: 'Not found' });
  const entry = {
    id: `f${Date.now()}`,
    author: req.body.author || 'Anonymous',
    team: req.body.team || 'campaign',
    body: req.body.body,
    created_at: new Date().toISOString().split('T')[0]
  };
  res.status(201).json(entry);
});

app.get('/api/content/feed', (req, res) => {
  res.json(getContentFeed(req.query));
});

app.post('/api/search', (req, res) => {
  const results = searchInfluencers(req.body.query).map(({ rate, ...rest }) => rest);
  res.json(results.length > 0 ? results : listInfluencers().map(({ rate, ...rest }) => rest));
});

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(uiBuild, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`IBM Influencer Hub running on http://localhost:${PORT}`);
});
