import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

import {
  // UI Shell
  Header, HeaderMenuButton, HeaderName,
  HeaderNavigation, HeaderMenuItem, SkipToContent,
  // Layout
  Content,
  // Tiles
  Tile, ClickableTile,
  // Inputs
  Search, Button, Tag, Modal, TextInput, TextArea, Select, SelectItem,
  FileUploader,
  // Tabs
  Tabs, Tab, TabList, TabPanels, TabPanel,
  // Notifications
  InlineNotification,
  // Data display
  StructuredListWrapper, StructuredListHead, StructuredListRow,
  StructuredListCell, StructuredListBody,
  // Misc
  Loading, Link,
  // Icon button
  IconButton,
} from '@carbon/react';

import {
  Edit,
  TrashCan,
  Close,
  SendAlt,
  DocumentImport,
  ArrowRight,
} from '@carbon/icons-react';

// Backend API base URL
const API = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_API_URL || '/api')
  : 'http://localhost:3001/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Parse human-friendly follower counts: "3.5k" → 3500, "1.2M" → 1200000, "500" → 500
function parseFollowerCount(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().toLowerCase().replace(/,/g, '');
  if (!s) return 0;
  const match = s.match(/^([\d.]+)\s*([kmb]?)$/);
  if (!match) return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
  const num = parseFloat(match[1]);
  const mult = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2]] || 1;
  return Math.round(num * mult);
}

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Creator Avatar ────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { bg: '#0f62fe', fg: '#ffffff' }, // IBM Blue 60
  { bg: '#6929c4', fg: '#ffffff' }, // Purple 70
  { bg: '#005d5d', fg: '#ffffff' }, // Teal 70
  { bg: '#9f1853', fg: '#ffffff' }, // Magenta 70
  { bg: '#198038', fg: '#ffffff' }, // Green 60
  { bg: '#b28600', fg: '#ffffff' }, // Yellow 40 (dark)
  { bg: '#0043ce', fg: '#ffffff' }, // Blue 70
  { bg: '#da1e28', fg: '#ffffff' }, // Red 60
];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function CreatorAvatar({ name, size = 'sm' }) {
  const { bg, fg } = avatarColor(name);
  return (
    <span
      className={`hub-avatar hub-avatar--${size}`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

// ── Platform tags as Carbon Tags ──────────────────────────────────────────────

const PLATFORM_TAG_TYPE = {
  YouTube:   'red',
  TikTok:    'purple',
  Instagram: 'magenta',
  X:         'cool-gray',
  LinkedIn:  'blue',
  Reddit:    'orange',
};

function PlatformTag({ platform, size = 'sm' }) {
  const type = PLATFORM_TAG_TYPE[platform] || 'gray';
  return <Tag type={type} size={size}>{platform}</Tag>;
}

// ── Stats Bar using Carbon Tiles ──────────────────────────────────────────────

function StatsBar({ stats }) {
  return (
    <div className="hub-stats-bar">
      <Tile className="hub-stat-tile">
        <p className="hub-stat-value">{stats ? stats.total : <Loading small withOverlay={false} />}</p>
        <p className="hub-stat-label">Total Influencers</p>
      </Tile>
      <Tile className="hub-stat-tile">
        <p className="hub-stat-value">{stats ? stats.socialLeague : <Loading small withOverlay={false} />}</p>
        <p className="hub-stat-label">Total Social Leaguers</p>
      </Tile>
    </div>
  );
}

// ── Influencer Form Modal (Add / Edit) ────────────────────────────────────────

const BLANK_PLATFORM = { url: '', handle: '', follower_count: '' };
const BLANK_FORM = {
  name: '', persona_group: 'Developer', bio: '', campaigns: '', location: '',
  platforms: [{ ...BLANK_PLATFORM }],
};

function platformsFromInfluencer(inf) {
  const plats = (inf.platforms || []).map(p => ({
    url: p.url || '', handle: p.handle || '', follower_count: p.follower_count != null ? String(p.follower_count) : '',
  }));
  // Ensure at least one slot
  return plats.length > 0 ? plats : [{ ...BLANK_PLATFORM }];
}

function InfluencerFormModal({ open, influencer, onClose, onSave, onDelete }) {
  const isEdit = Boolean(influencer);
  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => {
    if (open) {
      setForm(influencer
        ? {
            name: influencer.name || '',
            persona_group: influencer.persona_group || 'Developer',
            bio: influencer.bio || '',
            campaigns: (influencer.campaign_types || []).join(', '),
            location: influencer.location || '',
            platforms: platformsFromInfluencer(influencer),
          }
        : { ...BLANK_FORM, platforms: [{ ...BLANK_PLATFORM }] }
      );
    }
  }, [open, influencer]);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }
  function setPlatform(i, k, v) {
    setForm(prev => {
      const platforms = prev.platforms.map((p, idx) => idx === i ? { ...p, [k]: v } : p);
      return { ...prev, platforms };
    });
  }
  function addPlatform() {
    setForm(prev => ({ ...prev, platforms: [...prev.platforms, { ...BLANK_PLATFORM }] }));
  }
  function removePlatform(i) {
    setForm(prev => ({ ...prev, platforms: prev.platforms.filter((_, idx) => idx !== i) }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const platforms = form.platforms
      .filter(p => p.url.trim())
      .map(p => ({
        url: p.url.trim(),
        handle: p.handle.trim(),
        follower_count: parseFollowerCount(p.follower_count),
        platform: PLATFORM_FROM_URL(p.url.trim()) || 'Other',
      }));
    const campaign_types = form.campaigns
      ? form.campaigns.split(/[,;]+/).map(c => c.trim()).filter(Boolean)
      : [];
    onSave({ ...form, platforms, campaign_types });
  }

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleSave}
      modalHeading={isEdit ? `Edit — ${influencer?.name}` : 'Add New Influencer'}
      primaryButtonText={isEdit ? 'Save Changes' : 'Add Influencer'}
      secondaryButtonText="Cancel"
      onSecondarySubmit={onClose}
      size="md"
    >
      <div className="hub-form-grid">
        <TextInput
          id="inf-name" labelText="Name *" value={form.name}
          onChange={e => set('name', e.target.value)}
          invalid={form.name.trim() === ''} invalidText="Name is required"
          className="hub-form-full"
        />
        <Select id="inf-persona" labelText="Persona" value={form.persona_group}
          onChange={e => set('persona_group', e.target.value)} className="hub-form-full">
          {['Developer','AI Decision Makers','Data Leaders','Secure','Infrastructure','Industry','Sports, Entertainment, and Partnerships','CxO programs','Digital Sovereignty'].map(p => (
            <SelectItem key={p} value={p} text={p} />
          ))}
        </Select>
        <TextArea
          id="inf-bio" labelText="Description" value={form.bio}
          onChange={e => set('bio', e.target.value)}
          rows={3} className="hub-form-full"
        />
        <TextInput
          id="inf-campaigns" labelText="Campaigns" placeholder="e.g. IBM Think, F1"
          value={form.campaigns} onChange={e => set('campaigns', e.target.value)}
          className="hub-form-full"
          helperText="Separate multiple campaigns with commas"
        />
        <Select id="inf-geo" labelText="Geos" value={form.location}
          onChange={e => set('location', e.target.value)} className="hub-form-full">
          <SelectItem value="" text="Select a geo" />
          {['Americas','UK','EMEA','India'].map(g => <SelectItem key={g} value={g} text={g} />)}
        </Select>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Social Platforms</p>
        {form.platforms.map((p, i) => (
          <div key={i} className="hub-platform-form-row">
            <TextInput
              id={`inf-purl-${i}`} labelText={`URL #${i + 1}`} value={p.url}
              onChange={e => setPlatform(i, 'url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
            <TextInput
              id={`inf-phandle-${i}`} labelText="Handle" value={p.handle}
              onChange={e => setPlatform(i, 'handle', e.target.value)}
              placeholder="@username"
            />
            <TextInput
              id={`inf-pcount-${i}`} labelText="Follower Count" value={p.follower_count}
              onChange={e => setPlatform(i, 'follower_count', e.target.value)}
              placeholder="e.g. 12500"
            />
            {form.platforms.length > 1 && (
              <IconButton kind="ghost" size="sm" label="Remove platform" onClick={() => removePlatform(i)}>
                <Close size={16} />
              </IconButton>
            )}
          </div>
        ))}
        {form.platforms.length < 4 && (
          <Button kind="ghost" size="sm" onClick={addPlatform} style={{ marginTop: '0.5rem' }}>
            + Add platform
          </Button>
        )}
      </div>

      {isEdit && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--cds-border-subtle-00)' }}>
          <Button kind="danger--ghost" size="sm" onClick={() => onDelete(influencer.id)}>
            Delete influencer
          </Button>
        </div>
      )}
    </Modal>
  );
}

// ── CSV Upload Modal ──────────────────────────────────────────────────────────

const PLATFORM_FROM_URL = (url) => {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'X';
  if (u.includes('linkedin.com')) return 'LinkedIn';
  if (u.includes('reddit.com')) return 'Reddit';
  return null;
};

function parseCsv(text) {
  // Handles both CSV (comma-separated) and TSV (tab-separated, common Excel export)
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.trim()) return [];

  // Auto-detect delimiter: if the first non-empty line has more tabs than commas, use tab
  const firstLine = normalized.split('\n').find(l => l.trim()) || '';
  const delimiter = (firstLine.split('\t').length > firstLine.split(',').length) ? '\t' : ',';

  // Tokenise character-by-character so quoted fields with newlines are handled correctly
  const rows = [];
  let cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuote) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === delimiter) {
        cols.push(cur.trim());
        cur = '';
      } else if (ch === '\n') {
        cols.push(cur.trim());
        cur = '';
        rows.push(cols);
        cols = [];
      } else {
        cur += ch;
      }
    }
  }
  // flush last field / row
  cols.push(cur.trim());
  if (cols.some(c => c !== '')) rows.push(cols);

  if (rows.length < 2) return [];
  // Skip any leading title rows — find the first row that looks like a header
  const isHeaderRow = r => r.some(c => {
    const v = c.trim().toLowerCase();
    return v === 'name' || v === 'creator name' || v.endsWith(' name') || v === 'creator_name' || v === 'influencer';
  });
  const headerIdx = rows.findIndex(isHeaderRow);
  if (headerIdx === -1 || headerIdx >= rows.length - 1) return [];
  const headers = rows[headerIdx].map(h => h.toLowerCase().replace(/\s+/g, '_'));
  // Determine which column index holds the influencer/creator name
  const nameColIdx = headers.findIndex(h => h === 'influencer' || h === 'name' || h === 'creator_name');
  return rows.slice(headerIdx + 1).map(cols => {
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });
    return row;
  }).filter(r => {
    // Skip rows where the name column is empty or all data cols are empty (section label rows)
    const nameVal = nameColIdx >= 0 ? (rows[0][nameColIdx] || '') : '';
    const rowName = r['influencer'] || r['name'] || r['creator_name'] || '';
    if (!rowName.trim()) return false;
    // Skip section label rows: only first cell has a value, rest are empty
    const vals = headers.map(h => (r[h] || '').trim());
    const nonEmptyCount = vals.filter(v => v).length;
    return nonEmptyCount > 1;
  });
}

// Normalise a CSV header key: lowercase, collapse spaces/special chars to underscores
function normKey(h) { return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

function csvRowToInfluencer(row, campaignName = '') {
  const platforms = [];

  // ── Agency template format ────────────────────────────────────────────────
  // Headers: Influencer, Location, About/Bio, Rationale, YouTube Link,
  // YouTube Followers, LinkedIn Link, LinkedIn Followers,
  // {Insert other relevant channels}, {Insert other relevant channel followers}
  const isAgencyFormat = Object.keys(row).some(k => normKey(k) === 'influencer');

  if (isAgencyFormat) {
    const fixedPlatforms = [
      { urlKey: 'youtube_link',   followersKey: 'youtube_followers',  name: 'YouTube'   },
      { urlKey: 'linkedin_link',  followersKey: 'linkedin_followers', name: 'LinkedIn'  },
      { urlKey: 'instagram_link', followersKey: 'instagram_followers',name: 'Instagram' },
      { urlKey: 'tiktok_link',    followersKey: 'tiktok_followers',   name: 'TikTok'    },
      { urlKey: 'x_link',         followersKey: 'x_followers',        name: 'X'         },
      { urlKey: 'twitter_link',   followersKey: 'twitter_followers',  name: 'X'         },
    ];
    for (const { urlKey, followersKey, name } of fixedPlatforms) {
      const urlVal = Object.keys(row).find(k => normKey(k) === urlKey);
      const flwVal = Object.keys(row).find(k => normKey(k) === followersKey);
      const url = urlVal ? (row[urlVal] || '').trim() : '';
      if (!url) continue;
      const follower_count = parseFollowerCount(flwVal ? (row[flwVal] || '0') : '0');
      platforms.push({ platform: name, url, handle: '', follower_count });
    }

    // Dynamic "other channel" columns — any remaining cell that looks like a URL
    const handledKeys = new Set(['influencer','location','about_bio','rationale',
      'notes_sj_feedback','youtube_link','youtube_followers','youtube_er',
      'linkedin_link','linkedin_followers','linkedin_er',
      'insert_other_relevant_channels','insert_other_relevant_channel_followers',
      'insert_other_relevant_channel_er']);
    for (const [key, val] of Object.entries(row)) {
      if (handledKeys.has(normKey(key))) continue;
      const v = (val || '').trim();
      if (!v) continue;
      const detectedPlatform = PLATFORM_FROM_URL(v);
      if (detectedPlatform && !platforms.find(p => p.platform === detectedPlatform)) {
        platforms.push({ platform: detectedPlatform, url: v, handle: '', follower_count: 0 });
      }
    }

    const bioKey       = Object.keys(row).find(k => normKey(k) === 'about_bio');
    const rationaleKey = Object.keys(row).find(k => normKey(k) === 'rationale');
    const locationKey  = Object.keys(row).find(k => normKey(k) === 'location');
    const nameKey      = Object.keys(row).find(k => normKey(k) === 'influencer');
    const bio          = (row[bioKey]       || '').trim();
    const rationale    = (row[rationaleKey] || '').trim();

    return {
      name:            (row[nameKey]     || '').trim(),
      persona_group:   'Developer / Engineer',
      bio:             [bio, rationale].filter(Boolean).join('\n\n'),
      location:        (row[locationKey] || '').trim(),
      status:          'active',
      approval_status: 'pending',
      platforms,
      campaign_types:  campaignName ? [campaignName] : [],
    };
  }

  // ── Standard / legacy format ──────────────────────────────────────────────
  const simplePlatformUrlKey = Object.keys(row).find(k => normKey(k) === 'social_platform_url');
  const simpleHandleKey      = Object.keys(row).find(k => normKey(k) === 'handle');
  const simpleFollowersKey   = Object.keys(row).find(k => normKey(k) === 'followers' || normKey(k) === 'follower_count');

  if (simplePlatformUrlKey) {
    const url = (row[simplePlatformUrlKey] || '').trim();
    if (url) {
      const platform = PLATFORM_FROM_URL(url);
      const handle   = simpleHandleKey ? (row[simpleHandleKey] || '').trim() : '';
      const countRaw = simpleFollowersKey ? (row[simpleFollowersKey] || '0') : '0';
      const follower_count = parseFollowerCount(countRaw);
      if (platform) platforms.push({ platform, url, handle, follower_count });
    }
  } else {
    for (let n = 1; n <= 10; n++) {
      const urlKey    = Object.keys(row).find(k => normKey(k) === normKey(`social platform url #${n}`) || normKey(k) === normKey(`social platform url ${n}`));
      const handleKey = Object.keys(row).find(k => normKey(k) === normKey(`handle #${n}`) || normKey(k) === normKey(`handle ${n}`));
      const countKey  = Object.keys(row).find(k => normKey(k) === normKey(`follower count #${n}`) || normKey(k) === normKey(`follower count ${n}`));
      const url = urlKey ? (row[urlKey] || '').trim() : '';
      if (!url) break;
      const platform = PLATFORM_FROM_URL(url);
      const handle   = handleKey ? (row[handleKey] || '').trim() : '';
      const countRaw = countKey  ? (row[countKey]  || '0') : '0';
      const follower_count = parseInt(String(countRaw).replace(/[^0-9]/g, ''), 10) || 0;
      if (platform) platforms.push({ platform, url, handle, follower_count });
    }
  }

  const personaRaw = row['persona'] || row['persona_group'] || 'Developer / Engineer';
  const campaigns  = row['campaigns']
    ? row['campaigns'].split(/[;|]+/).map(c => c.trim()).filter(Boolean)
    : campaignName ? [campaignName] : [];
  const geos = row['geos'] || row['geo'] || row['location'] || '';

  return {
    name:            row['name'] || '',
    persona_group:   personaRaw,
    bio:             row['description'] || row['bio'] || '',
    location:        geos,
    status:          'active',
    approval_status: 'pending',
    platforms,
    campaign_types:  campaigns,
  };
}

function CsvUploadModal({ open, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setFile(null); setPreview([]); setError(''); }
  }, [open]);

  function handleFileChange(e) {
    const f = e.target?.files?.[0] || (e.addedFiles && e.addedFiles[0]);
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setError('Please upload a .csv file.'); return; }
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target.result);
      if (rows.length === 0) { setError('No valid rows found in CSV.'); setPreview([]); return; }
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  }

  // Derive campaign name from filename: strip extension and clean up
  const campaignName = file ? file.name.replace(/\.csv$/i, '').trim() : '';

  function handleImport() {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target.result);
      const influencers = rows.map(r => csvRowToInfluencer(r, campaignName)).filter(i => i.name.trim());
      onImport(influencers, campaignName);
    };
    reader.readAsText(file);
  }

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={handleImport}
      modalHeading="Upload Influencers via CSV"
      primaryButtonText="Import"
      primaryButtonDisabled={!file || preview.length === 0}
      secondaryButtonText="Cancel"
      onSecondarySubmit={onClose}
      size="md"
    >
      <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
        The <strong>filename</strong> will be used as the campaign name. Existing influencers matched by name will be updated, not duplicated. Two formats accepted:
      </p>
      <p style={{ marginBottom: '0.25rem', fontSize: '0.8125rem', fontFamily: 'monospace', background: 'var(--cds-layer-01)', padding: '0.5rem', borderRadius: '2px', wordBreak: 'break-all' }}>
        <strong>Agency template:</strong> Influencer, Location, About/Bio, Rationale, YouTube Link, YouTube Followers, LinkedIn Link, LinkedIn Followers, …
      </p>
      <p style={{ marginBottom: '1rem', fontSize: '0.8125rem', fontFamily: 'monospace', background: 'var(--cds-layer-01)', padding: '0.5rem', borderRadius: '2px', wordBreak: 'break-all' }}>
        <strong>Standard:</strong> Name, Social Platform URL, Handle, Persona, Description, Campaigns, Followers, Geos — or numbered: Social Platform URL #1, Handle #1, Follower Count #1, …
      </p>
      <FileUploader
        labelTitle="Select CSV file"
        labelDescription="Only .csv files are accepted"
        buttonLabel="Add file"
        accept={['.csv']}
        filenameStatus="edit"
        onChange={handleFileChange}
      />
      {campaignName && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--cds-link-primary)' }}>
          Campaign: <strong>{campaignName}</strong>
        </p>
      )}
      {error && (
        <InlineNotification
          kind="error"
          title={error}
          style={{ marginTop: '1rem' }}
          hideCloseButton
        />
      )}
      {preview.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Preview (first {preview.length} row{preview.length !== 1 ? 's' : ''} of {file?.name}):
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.8125rem', width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--cds-layer-01)', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                  {['Name','Platforms','Location','Campaign'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => {
                  const inf = csvRowToInfluencer(row, campaignName);
                  const nameVal = row['influencer'] || row['name'] || '—';
                  const platformSummary = inf.platforms.length
                    ? inf.platforms.map(p => p.platform).join(', ')
                    : '—';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                      <td style={{ padding: '4px 8px' }}>{nameVal}</td>
                      <td style={{ padding: '4px 8px' }}>{platformSummary}</td>
                      <td style={{ padding: '4px 8px' }}>{inf.location || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{campaignName || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
            Ready to import all rows. Existing influencers (matched by name) will be merged.
          </p>
        </div>
      )}
    </Modal>
  );
}

// ── Influencer Card (Carbon Tile) ─────────────────────────────────────────────

function InfluencerCard({ influencer, selected, onClick, onEdit }) {
  const totalFollowers = (influencer.platforms || []).reduce((s, p) => s + (p.follower_count || 0), 0);
  const hasContent = influencer.content?.length > 0;

  return (
    <Tile
      id={`card-${influencer.id}`}
      className={`hub-influencer-tile ${selected ? 'hub-influencer-tile--selected' : ''}`}
      onClick={onClick}
    >
      <div className="hub-card-top">
        <CreatorAvatar name={influencer.name} size="sm" />
        <div className="hub-card-info">
          <p className="hub-card-name">{influencer.name}</p>
          <p className="hub-card-meta">{influencer.persona_group} · {influencer.location} · {fmt(totalFollowers)} followers</p>
        </div>
        <div className="hub-card-top-actions">
          <IconButton
            kind="ghost"
            size="sm"
            label={`Edit ${influencer.name}`}
            onClick={e => { e.stopPropagation(); onEdit(influencer); }}
          >
            <Edit size={16} />
          </IconButton>
        </div>
      </div>
      <div className="hub-card-tags">
        {(influencer.platforms || []).map(p => <PlatformTag key={p.platform} platform={p.platform} />)}
      </div>
      {hasContent && (
        <div className="hub-card-footer">
          <Tag type="blue" size="sm">IBM Content</Tag>
        </div>
      )}
      {(influencer.events?.length > 0) && (
        <div className="hub-card-event-tags">
          {influencer.events.slice(0, 2).map(e => (
            <Tag key={e} type="gray" size="sm">{e}</Tag>
          ))}
          {influencer.events.length > 2 && (
            <Tag type="gray" size="sm">+{influencer.events.length - 2}</Tag>
          )}
        </div>
      )}
    </Tile>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────────

const BASE_CAMPAIGN_OPTIONS = [
  { value: '', text: 'All Campaigns' },
  ...['AI Summit Korea','AWS re:Invent','Dreamforce','Ferrari / F1','Gartner Data & Analytics',
     'GRAMMYs','IBM Accelerate','IBM Think','IBM TechXchange','KubeCon','Masters',
     'Mobile World Congress','NFL','NRF','NY Tech Week','SIBOS','SXSW','US Open','VivaTech','Wimbledon',
  ].map(v => ({ value: v, text: v })),
];

function FilterSelect({ label, value, options, onChange }) {
  return (
    <Select id={`filter-${label.toLowerCase().replace(/\s+/g, '-')}`} labelText={label} value={value} onChange={e => onChange(e.target.value)} size="sm">
      {options.map(o => (
        <SelectItem key={o.value} value={o.value} text={o.text} />
      ))}
    </Select>
  );
}

function exportToCsv(influencers) {
  const headers = ['Name', 'Type', 'Persona', 'Location', 'Status', 'Approval Status', 'Platforms', 'Total Followers', 'Score', 'Campaigns', 'Bio'];
  const rows = influencers.map(inf => {
    const platforms = (inf.platforms || []).map(p => `${p.platform}${p.follower_count ? ` (${p.follower_count.toLocaleString()})` : ''}`).join(' | ');
    const totalFollowers = (inf.platforms || []).reduce((s, p) => s + (p.follower_count || 0), 0);
    const campaigns = (inf.campaign_types || []).join(' | ');
    const score = inf.score?.composite ?? '';
    const bio = (inf.bio || '').replace(/"/g, '""').replace(/\n/g, ' ');
    return [
      `"${inf.name || ''}"`,
      `"${inf.type || ''}"`,
      `"${inf.persona_group || ''}"`,
      `"${inf.location || ''}"`,
      `"${inf.status || ''}"`,
      `"${inf.approval_status || ''}"`,
      `"${platforms}"`,
      totalFollowers,
      score,
      `"${campaigns}"`,
      `"${bio}"`,
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `influencers-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function LeftPanel({ influencers, selectedId, onSelect, onSearch, onFilter, filters, searchQuery, onViewFeed, onAdd, onEdit, onUploadCsv, campaignOptions }) {
  return (
    <div className="hub-left-panel">
      <div className="hub-filters">
        <Search
          id="influencer-search"
          size="lg"
          labelText="Search"
          placeholder='e.g. "Shelby Jackson"'
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
        <p className="hub-search-hint">Search by name</p>

        <div className="hub-filter-grid">
          <FilterSelect label="Platform" value={filters.platform} options={[
            { value:'', text:'All Platforms' },
            ...['YouTube','TikTok','Instagram','X','LinkedIn','Reddit'].map(p => ({ value:p, text:p })),
          ]} onChange={v => onFilter('platform', v)} />
          <FilterSelect label="Persona" value={filters.persona_group} options={[
            { value:'', text:'All Personas' },
            ...['Developer','AI Decision Makers','Data Leaders','Secure','Infrastructure','Industry','Sports, Entertainment, and Partnerships','CxO programs','Digital Sovereignty'].map(p => ({ value:p, text:p })),
          ]} onChange={v => onFilter('persona_group', v)} />
          <FilterSelect label="Campaigns" value={filters.campaign_type} options={campaignOptions || BASE_CAMPAIGN_OPTIONS}
            onChange={v => onFilter('campaign_type', v)} />
          <FilterSelect label="Geo" value={filters.location} options={[
            { value: '', text: 'All Geos' },
            { value: 'americas', text: 'Americas (incl. US, USA)' },
            { value: 'uk', text: 'UK (incl. UKI)' },
            { value: 'emea', text: 'EMEA' },
            { value: 'india', text: 'India' },
          ]} onChange={v => onFilter('location', v)} />
        </div>

        <Button kind="ghost" size="sm" onClick={onViewFeed} className="hub-feed-btn">
          ↗ View IBM Content Feed
        </Button>
      </div>

      <div className="hub-list-header">
        <p className="hub-list-count">{influencers.length} influencer{influencers.length !== 1 ? 's' : ''}</p>
        <div className="hub-list-header-actions">
          <Button kind="ghost" size="sm" onClick={() => exportToCsv(influencers)} className="hub-add-btn" title="Export current list to CSV">↓ Export CSV</Button>
          <Button kind="ghost" size="sm" onClick={onUploadCsv} className="hub-add-btn">↑ Upload CSV</Button>
          <Button kind="primary" size="sm" onClick={onAdd} className="hub-add-btn">+ Add</Button>
        </div>
      </div>

      <div className="hub-card-list">
        {influencers.length === 0 && (
          <div className="hub-empty-list">
            <p>No influencers match these filters.</p>
          </div>
        )}
        {influencers.map(inf => (
          <InfluencerCard key={inf.id} influencer={inf}
            selected={selectedId === inf.id} onClick={() => onSelect(inf.id)} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ influencer }) {
  return (
    <div className="hub-tab-content">
      <div className="hub-section">
        <p className="hub-section-label">Bio</p>
        <p className="hub-body-text">{influencer.bio}</p>
      </div>

      {influencer.campaign_rationale && (
        <div className="hub-section">
          <p className="hub-section-label">Campaign Rationale</p>
          <div className="hub-callout">{influencer.campaign_rationale}</div>
        </div>
      )}

      <div className="hub-section">
        <p className="hub-section-label">Platforms</p>
        <div className="hub-platform-grid">
          {(influencer.platforms || []).map(p => (
            <Tile key={p.platform} className="hub-platform-card">
              <PlatformTag platform={p.platform} size="lg" />
              <p className="hub-platform-handle">
                {p.url
                  ? <Link href={p.url} target="_blank" rel="noopener noreferrer">{p.handle || p.url}</Link>
                  : (p.handle || '—')}
              </p>
              <p className="hub-muted">{fmt(p.follower_count)} followers</p>
            </Tile>
          ))}
        </div>
      </div>

      {(influencer.events?.length > 0 || influencer.campaign_types?.length > 0) && (
        <div className="hub-section">
          {influencer.events?.length > 0 && (
            <>
              <p className="hub-section-label">Events</p>
              <div className="hub-tag-row">
                {influencer.events.map(e => <Tag key={e} type="gray" size="sm">{e}</Tag>)}
              </div>
            </>
          )}
          {influencer.campaign_types?.length > 0 && (
            <>
              <p className="hub-section-label" style={{ marginTop: influencer.events?.length > 0 ? '0.75rem' : 0 }}>Campaign Types</p>
              <div className="hub-tag-row">
                {influencer.campaign_types.map(c => <Tag key={c} type="cyan" size="sm">{c}</Tag>)}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab({ influencer }) {
  const [content, setContent] = useState(influencer.content || []);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState(null);
  const [editEntry, setEditEntry] = useState(null);

  async function handleSync() {
    setSyncing(true); setSyncMsg(null);
    try {
      const res  = await fetch(`${API}/influencers/${influencer.id}/sync`, { method: 'POST' });
      const data = await res.json();
      setContent(data.content || []);
      setSyncMsg({ kind: 'success', title: 'Sync complete', subtitle: data.message });
    } catch {
      setSyncMsg({ kind: 'error', title: 'Sync failed', subtitle: 'Could not reach platform APIs. Try again.' });
    } finally { setSyncing(false); }
  }

  async function handleEdit(entry, formData) {
    const r = await fetch(`${API}/content/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (r.ok) {
      const updated = await r.json();
      setContent(prev => prev.map(c => c.id === updated.id ? updated : c));
    }
    setEditEntry(null);
  }

  const platforms = [...new Set((influencer.platforms || []).map(p => p.platform))];
  const syncInfo = [
    { p: 'YouTube',   kind: 'green',  label: 'YouTube — Live API' },
    { p: 'Instagram', kind: 'yellow', label: 'Instagram — Mock' },
    { p: 'X',         kind: 'yellow', label: 'X (Twitter) — Mock' },
    { p: 'TikTok',    kind: 'yellow', label: 'TikTok — Mock' },
    { p: 'LinkedIn',  kind: 'cool-gray', label: 'LinkedIn — Manual only' },
  ].filter(s => platforms.includes(s.p));

  return (
    <div className="hub-tab-content">
      <div className="hub-content-header">
        <div>
          <p className="hub-heading-sm">Past IBM Content</p>
          <p className="hub-muted">All #IBMPartner posts by {influencer.name}</p>
        </div>
        <Button kind="primary" size="sm" onClick={handleSync} disabled={syncing} renderIcon={syncing ? undefined : SendAlt}>
          {syncing ? 'Syncing…' : 'Sync Content'}
        </Button>
      </div>

      {syncMsg && (
        <InlineNotification kind={syncMsg.kind} title={syncMsg.title}
          subtitle={syncMsg.subtitle} lowContrast style={{ marginBottom: '1rem' }} />
      )}

      {syncInfo.length > 0 && (
        <div className="hub-sync-strip">
          {syncInfo.map(s => <Tag key={s.p} type={s.kind} size="sm">{s.label}</Tag>)}
        </div>
      )}

      {syncing && (
        <div className="hub-loading-row">
          <Loading small withOverlay={false} />
          <span className="hub-muted" style={{ marginLeft: '0.5rem' }}>Querying #IBMPartner on all platforms…</span>
        </div>
      )}

      {!syncing && content.length === 0 && (
        <Tile className="hub-empty-tile">
          <p className="hub-heading-sm">No IBM content synced yet</p>
          <p className="hub-muted" style={{ marginTop: '0.25rem' }}>
            Click <strong>Sync Content</strong> to query platform APIs using {influencer.name}'s handle + #IBMPartner.
          </p>
        </Tile>
      )}

      {!syncing && content.length > 0 && (
        <div className="hub-table-scroll">
          <StructuredListWrapper>
            <StructuredListHead>
              <StructuredListRow head>
                <StructuredListCell head>Platform</StructuredListCell>
                <StructuredListCell head>Campaign</StructuredListCell>
                <StructuredListCell head>Link</StructuredListCell>
                <StructuredListCell head></StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {content.map(c => (
                <StructuredListRow key={c.id}>
                  <StructuredListCell><PlatformTag platform={c.platform} /></StructuredListCell>
                  <StructuredListCell>{c.campaign || '—'}</StructuredListCell>
                  <StructuredListCell>
                    {c.permalink
                      ? <Link href={c.permalink} target="_blank" rel="noopener noreferrer" renderIcon={ArrowRight} style={{ whiteSpace: 'nowrap' }}>View</Link>
                      : '—'}
                  </StructuredListCell>
                  <StructuredListCell>
                    <IconButton kind="ghost" size="sm" label="Edit content entry" onClick={() => setEditEntry(c)}>
                      <Edit size={16} />
                    </IconButton>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      )}
      <ContentEditModal open={!!editEntry} entry={editEntry} onClose={() => setEditEntry(null)} onSave={fd => handleEdit(editEntry, fd)} />
    </div>
  );
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────

function FeedbackTab({ influencer }) {
  const [entries, setEntries] = useState(influencer.feedback || []);
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState({ author: '', body: '' });
  const [saving, setSaving]   = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  function setF(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSubmit() {
    if (!form.body.trim()) return;
    setSaving(true);
    const r = await fetch(`${API}/influencers/${influencer.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const entry = await r.json();
      setEntries(prev => [entry, ...prev]);
      setForm({ author: '', body: '' });
      setOpen(false);
    }
    setSaving(false);
  }

  async function handleDelete(fid) {
    const r = await fetch(`${API}/influencers/${influencer.id}/feedback/${fid}`, { method: 'DELETE' });
    if (r.ok) setEntries(prev => prev.filter(f => f.id !== fid));
  }

  return (
    <div className="hub-tab-content">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <Button kind={open ? 'ghost' : 'primary'} size="sm" onClick={() => setOpen(v => !v)}>
          {open ? 'Cancel' : '+ Add Feedback'}
        </Button>
      </div>

      {open && (
        <Tile className="hub-feedback-form">
          <TextInput
            id="fb-author" labelText="Your name" value={form.author}
            onChange={e => setF('author', e.target.value)}
          />
          <TextArea
            id="fb-body" labelText="Feedback *" value={form.body}
            onChange={e => setF('body', e.target.value)}
            rows={3}
            invalid={form.body.trim() === '' && saving}
            invalidText="Feedback cannot be empty"
            style={{ marginTop: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button kind="primary" size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Submit'}
            </Button>
            <Button kind="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Tile>
      )}

      {entries.length === 0
        ? <p className="hub-muted" style={{ fontStyle: 'italic' }}>No feedback logged.</p>
        : entries.map(f => (
          <Tile key={f.id} className="hub-feedback-tile">
            <div className="hub-feedback-header">
              <span className="hub-feedback-author">{f.author}</span>
              <span className="hub-muted">{f.created_at}</span>
            </div>
            <p className="hub-body-text" style={{ marginTop: '0.25rem' }}>{f.body}</p>
            {confirmId === f.id
              ? (
                <div className="hub-feedback-confirm">
                  <span className="hub-muted" style={{ fontSize: '0.8125rem' }}>This is permanent. Are you sure?</span>
                  <Button kind="danger" size="sm" onClick={() => handleDelete(f.id)}>Yes, delete</Button>
                  <Button kind="ghost" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                </div>
              ) : (
                <IconButton kind="ghost" size="sm" label="Delete feedback" onClick={() => setConfirmId(f.id)}>
                  <TrashCan size={16} />
                </IconButton>
              )
            }
          </Tile>
        ))
      }
    </div>
  );
}

// ── Profile View (Right Panel) ────────────────────────────────────────────────

function ProfileView({ influencerId, localOverrides = {}, onEdit }) {
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!influencerId) { setInfluencer(null); return; }
    setLoading(true);
    fetch(`${API}/influencers/${influencerId}`)
      .then(r => r.json())
      .then(d => {
        const merged = localOverrides[influencerId] ? { ...d, ...localOverrides[influencerId] } : d;
        setInfluencer(merged);
        setLoading(false);
      });
  }, [influencerId, localOverrides]); // eslint-disable-line

  if (!influencerId) return (
    <div className="hub-right-panel hub-empty-state">
      <Tile className="hub-empty-tile" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.3 }}>◎</p>
        <p className="hub-heading-sm">Select an influencer</p>
        <p className="hub-muted" style={{ marginTop: '0.25rem' }}>Use the search or filters on the left to find creators</p>
      </Tile>
    </div>
  );

  if (loading) return (
    <div className="hub-right-panel hub-empty-state">
      <Loading description="Loading profile…" withOverlay={false} />
    </div>
  );

  if (!influencer) return null;

  const totalFollowers = (influencer.platforms || []).reduce((s, p) => s + (p.follower_count || 0), 0);

  return (
    <div className="hub-right-panel">
      {/* Dark profile header */}
      <div className="hub-profile-header">
        <div className="hub-profile-header-top">
          <CreatorAvatar name={influencer.name} size="lg" />
          <div className="hub-profile-header-info">
            <h1 className="hub-profile-name">{influencer.name}</h1>
            <div className="hub-profile-badges">
              <Tag type="cool-gray" size="sm">{influencer.persona_group}</Tag>
            </div>
            <p className="hub-profile-meta">
              📍 {influencer.location} &nbsp;·&nbsp; {fmt(totalFollowers)} total followers
              {influencer.owner && <> &nbsp;·&nbsp; Owner: {influencer.owner}</>}
            </p>
          </div>
          {onEdit && (
            <IconButton kind="ghost" size="sm" label={`Edit ${influencer.name}`} onClick={() => onEdit(influencer)}>
              <Edit size={16} />
            </IconButton>
          )}
        </div>
        <div className="hub-platform-strip">
          {(influencer.platforms || []).map(p => (
            <div key={p.platform} className="hub-platform-stat">
              <PlatformTag platform={p.platform} />
              <p className="hub-platform-stat-value">{fmt(p.follower_count)}</p>
              <p className="hub-platform-stat-handle">{p.handle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="hub-profile-tabs">
        <Tabs>
          <TabList aria-label="Profile sections" contained>
            <Tab>Overview</Tab>
            <Tab>Past IBM Content</Tab>
            <Tab>Feedback</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              <OverviewTab influencer={influencer} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <ContentTab influencer={influencer} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <FeedbackTab influencer={influencer} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}

// ── Global Feed ───────────────────────────────────────────────────────────────

const FEED_COLS = [
  { key: 'influencer_name', label: 'Creator' },
  { key: 'platform',        label: 'Platform' },
  { key: 'campaign',        label: 'Campaign' },
  { key: null,              label: 'Link' },
  { key: null,              label: '' },
];

const BLANK_CONTENT_FORM = { creator_name: '', platform: '', permalink: '', campaign: '' };

function ContentAddModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ ...BLANK_CONTENT_FORM });
  useEffect(() => { if (!open) setForm({ ...BLANK_CONTENT_FORM }); }, [open]);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit() {
    if (!form.creator_name.trim()) return;
    onSave({ ...form });
  }
  return (
    <Modal open={open} onRequestClose={onClose} onRequestSubmit={handleSubmit}
      modalHeading="Add Content Entry" primaryButtonText="Add" secondaryButtonText="Cancel"
      onSecondarySubmit={onClose} size="sm">
      <TextInput id="cnt-creator" labelText="Creator Name *" value={form.creator_name} onChange={e => set('creator_name', e.target.value)}
        helperText="If this creator has a profile in the hub, the content will be linked automatically."
        style={{ marginBottom: '1rem' }}
      />
      <Select id="cnt-platform" labelText="Platform" value={form.platform} onChange={e => set('platform', e.target.value)} style={{ marginBottom: '1rem' }}>
        <SelectItem value="" text="— Auto-detect from URL —" />
        {['LinkedIn','YouTube','X','Instagram','TikTok','Reddit','Other'].map(p => <SelectItem key={p} value={p} text={p} />)}
      </Select>
      <TextInput id="cnt-link"     labelText="Content Link"    value={form.permalink}    onChange={e => set('permalink', e.target.value)}    style={{ marginBottom: '1rem' }} />
      <TextInput id="cnt-campaign" labelText="Campaign"        value={form.campaign}     onChange={e => set('campaign', e.target.value)}     style={{ marginBottom: '1rem' }} />
    </Modal>
  );
}

function ContentEditModal({ open, entry, onClose, onSave }) {
  const [form, setForm] = useState({ creator_name: '', platform: '', permalink: '', campaign: '' });
  useEffect(() => {
    if (open && entry) setForm({
      creator_name: entry.creator_name || entry.influencer_name || '',
      platform:     entry.platform || '',
      permalink:    entry.permalink || '',
      campaign:     entry.campaign || '',
    });
  }, [open, entry]);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit() { onSave({ ...form }); }
  return (
    <Modal open={open} onRequestClose={onClose} onRequestSubmit={handleSubmit}
      modalHeading="Edit Content Entry" primaryButtonText="Save" secondaryButtonText="Cancel"
      onSecondarySubmit={onClose} size="sm">
      <TextInput id="cnt-edit-creator"   labelText="Creator Name"  value={form.creator_name} onChange={e => set('creator_name', e.target.value)} style={{ marginBottom: '1rem' }} />
      <Select id="cnt-edit-platform" labelText="Platform" value={form.platform} onChange={e => set('platform', e.target.value)} style={{ marginBottom: '1rem' }}>
        <SelectItem value="" text="— Select —" />
        {['LinkedIn','YouTube','X','Instagram','TikTok','Reddit','Other'].map(p => <SelectItem key={p} value={p} text={p} />)}
      </Select>
      <TextInput id="cnt-edit-link"     labelText="Content Link"    value={form.permalink}    onChange={e => set('permalink', e.target.value)}    style={{ marginBottom: '1rem' }} />
      <TextInput id="cnt-edit-campaign" labelText="Campaign"        value={form.campaign}     onChange={e => set('campaign', e.target.value)}     style={{ marginBottom: '1rem' }} />
    </Modal>
  );
}

function contentCsvRowToEntry(row) {
  const n = k => k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '');
  const get = (...keys) => { for (const k of keys) { const v = row[n(k)] ?? row[k.trim().toLowerCase().replace(/\s+/g,'_')]; if (v != null && String(v).trim() !== '') return String(v).trim(); } return ''; };
  return {
    creator_name: get('creator_name', 'creator name', 'name'),
    platform:     get('platform'),
    permalink:    get('content_link', 'content link', 'link', 'url', 'permalink'),
    campaign:     get('campaign'),
    title:        get('title'),
    post_date:    get('post_date', 'date'),
  };
}

function ContentCsvUploadModal({ open, onClose, onImport }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError]     = useState('');
  useEffect(() => { if (!open) { setFile(null); setPreview([]); setError(''); } }, [open]);

  function handleFileChange(e) {
    const f = e.target?.files?.[0] || (e.addedFiles && e.addedFiles[0]);
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setError('Please upload a .csv file.'); return; }
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result);
      if (rows.length === 0) { setError('No valid rows found in CSV.'); setPreview([]); return; }
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  }

  function handleImport() {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result);
      const entries = rows.map(contentCsvRowToEntry).filter(e => e.creator_name.trim());
      onImport(entries);
    };
    reader.readAsText(file);
  }

  return (
    <Modal open={open} onRequestClose={onClose} onRequestSubmit={handleImport}
      modalHeading="Upload Content via CSV"
      primaryButtonText="Import" primaryButtonDisabled={!file || preview.length === 0}
      secondaryButtonText="Cancel" onSecondarySubmit={onClose} size="md">
      <p style={{ marginBottom: '1rem', fontSize: '0.8125rem', fontFamily: 'monospace', background: 'var(--cds-layer-01)', padding: '0.5rem', borderRadius: '2px', wordBreak: 'break-all' }}>
        Creator Name, Platform, Content Link, Campaign
      </p>
      <p style={{ marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
        Entries are matched by Content Link — existing links will be updated. Creator names matching an influencer profile will be linked automatically.
      </p>
      <FileUploader labelTitle="Select CSV file" labelDescription="Only .csv files are accepted"
        buttonLabel="Add file" accept={['.csv']} filenameStatus="edit" onChange={handleFileChange} />
      {error && <InlineNotification kind="error" title={error} style={{ marginTop: '1rem' }} hideCloseButton />}
      {preview.length > 0 && (
        <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Preview (first {preview.length} rows):</p>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.8125rem', width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--cds-layer-01)', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                {['Creator','Platform','Campaign','Link'].map(h => <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => {
                const e = contentCsvRowToEntry(row);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                    <td style={{ padding: '4px 8px' }}>{e.creator_name || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{e.platform || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{e.campaign || '—'}</td>
                    <td style={{ padding: '4px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.permalink || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>Ready to import all rows.</p>
        </div>
      )}
    </Modal>
  );
}

function GlobalFeed({ onClose, onSelectInfluencer }) {
  const [feed, setFeed]         = useState([]);
  const platform = '';
  const product  = '';
  const [sortCol, setSortCol]   = useState('influencer_name');
  const [sortDir, setSortDir]   = useState('desc');
  const [addModal, setAddModal] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  function loadFeed() {
    const p = new URLSearchParams();
    if (platform) p.set('platform', platform);
    if (product)  p.set('ibm_product', product);
    fetch(`${API}/content/feed?${p}`).then(r => r.json()).then(setFeed);
  }

  useEffect(() => { loadFeed(); }, [platform, product]); // eslint-disable-line

  async function handleAdd(formData) {
    const r = await fetch(`${API}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (r.ok) { const entry = await r.json(); setFeed(prev => [entry, ...prev]); }
    setAddModal(false);
  }

  async function handleCsvImport(entries) {
    for (const entry of entries) {
      await fetch(`${API}/content/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    }
    loadFeed();
    setCsvModal(false);
  }

  async function handleEdit(entry, formData) {
    const r = await fetch(`${API}/content/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (r.ok) {
      const updated = await r.json();
      setFeed(prev => prev.map(e => e.id === updated.id ? updated : e));
    }
    setEditEntry(null);
  }

  async function handleDelete(id) {
    await fetch(`${API}/content/${id}`, { method: 'DELETE' });
    setFeed(prev => prev.filter(e => e.id !== id));
  }

  function handleSort(key) {
    if (!key) return;
    if (sortCol === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(key); setSortDir('asc'); }
  }

  const sorted = [...feed].sort((a, b) => {
    const av = a[sortCol] ?? '';
    const bv = b[sortCol] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="hub-right-panel hub-feed-view">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="hub-heading-lg">IBM Content Feed</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <Button kind="ghost" size="sm" onClick={() => setCsvModal(true)} className="hub-add-btn">↑ Upload CSV</Button>
          <Button kind="primary" size="sm" onClick={() => setAddModal(true)} className="hub-add-btn">+ Add</Button>
        </div>
      </div>

      {feed.length === 0
        ? <Tile className="hub-empty-tile" style={{ textAlign: 'center' }}>No posts yet. Add one or upload a CSV.</Tile>
        : (
          <div className="hub-table-scroll">
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  {FEED_COLS.map(col => {
                    const active = col.key && sortCol === col.key;
                    return (
                      <StructuredListCell key={col.label} head
                        className={col.key ? 'hub-th-sortable' : ''} onClick={() => handleSort(col.key)}>
                        <span className="hub-th-inner">
                          {col.label}
                          {col.key && (
                            <svg className={`hub-sort-arrow${active ? ' hub-sort-arrow--active' : ''}${active && sortDir === 'desc' ? ' hub-sort-arrow--desc' : ''}`}
                              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 12" width="10" height="12" fill="none" aria-hidden="true">
                              <line x1="5" y1="1" x2="5" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              <polyline points="1,7 5,11 9,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                      </StructuredListCell>
                    );
                  })}
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {sorted.map(e => (
                  <StructuredListRow key={e.id}>
                    <StructuredListCell>
                      {e.influencer_id && onSelectInfluencer
                        ? <Link onClick={() => onSelectInfluencer(e.influencer_id)} style={{ cursor: 'pointer' }}>{e.influencer_name || '—'}</Link>
                        : <span style={{ fontWeight: 500 }}>{e.influencer_name || '—'}</span>
                      }
                    </StructuredListCell>
                    <StructuredListCell><PlatformTag platform={e.platform} /></StructuredListCell>
                    <StructuredListCell>{e.campaign || '—'}</StructuredListCell>
                    <StructuredListCell>
                      {e.permalink
                        ? <Link href={e.permalink} target="_blank" rel="noopener noreferrer" renderIcon={ArrowRight} style={{ whiteSpace: 'nowrap' }}>View</Link>
                        : '—'}
                    </StructuredListCell>
                    <StructuredListCell>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <IconButton kind="ghost" size="sm" label="Edit entry" onClick={() => setEditEntry(e)}>
                          <Edit size={16} />
                        </IconButton>
                        <IconButton kind="danger--ghost" size="sm" label="Delete entry" onClick={() => handleDelete(e.id)}>
                          <TrashCan size={16} />
                        </IconButton>
                      </div>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </div>
        )
      }

      <ContentAddModal open={addModal} onClose={() => setAddModal(false)} onSave={handleAdd} />
      <ContentCsvUploadModal open={csvModal} onClose={() => setCsvModal(false)} onImport={handleCsvImport} />
      <ContentEditModal open={!!editEntry} entry={editEntry} onClose={() => setEditEntry(null)} onSave={fd => handleEdit(editEntry, fd)} />
    </div>
  );
}

// ── Social League View ────────────────────────────────────────────────────────

const IDENTITY_COLORS = {
  'Superstars': 'purple',
  'Engager': 'blue',
  'Observer': 'cool-gray',
  'Reserved -': 'gray',
};

const SL_BUSINESS_UNITS = ['CHQ','Consulting','Data and AI','Ecosystem','Finance and Operations','Infrastructure & Hybrid Cloud','Quantum','Research','Sales','Security','Software'];

// Shared form fields for add/edit — rendered inside both modals
function SocialLeagueFormFields({ form, set }) {
  return (
    <>
      <TextInput id="sl-name"      labelText="Name *"              value={form.name || ''}          onChange={e => set('name', e.target.value)}          style={{ marginBottom: '1rem' }} />
      <TextInput id="sl-title"     labelText="Title"               value={form.title || ''}         onChange={e => set('title', e.target.value)}         style={{ marginBottom: '1rem' }} />
      <TextInput id="sl-location"  labelText="Location"            value={form.location || ''}      onChange={e => set('location', e.target.value)}      style={{ marginBottom: '1rem' }} />
      <Select    id="sl-bu"        labelText="Business Unit"       value={form.business_unit || ''} onChange={e => set('business_unit', e.target.value)} style={{ marginBottom: '1rem' }}>
        <SelectItem value="" text="—" />
        {SL_BUSINESS_UNITS.map(u => <SelectItem key={u} value={u} text={u} />)}
      </Select>
      <TextInput id="sl-email"     labelText="Email"               value={form.email || ''}         onChange={e => set('email', e.target.value)}         style={{ marginBottom: '1rem' }} />
      <TextInput id="sl-linkedin"  labelText="LinkedIn URL"        value={form.linkedin || ''}      onChange={e => set('linkedin', e.target.value)}      style={{ marginBottom: '1rem' }} />
      <TextInput id="sl-w3"        labelText="w3 Profile URL"      value={form.w3 || ''}            onChange={e => set('w3', e.target.value)}            style={{ marginBottom: '1rem' }} />
      <TextInput id="sl-followers" labelText="LinkedIn Followers"  value={form.followers || ''}     onChange={e => set('followers', e.target.value)}     style={{ marginBottom: '1rem' }} />
      <Select id="sl-identity"    labelText="Member Identity"     value={form.member_identity || ''} onChange={e => set('member_identity', e.target.value)} style={{ marginBottom: '1rem' }}>
        <SelectItem value="" text="—" />
        {['Superstars','Engager','Observer','Reserved -'].map(v => <SelectItem key={v} value={v} text={v} />)}
      </Select>
      <Select id="sl-collaborate"  labelText="Collaborates with SM+I" value={form.collaborate || ''} onChange={e => set('collaborate', e.target.value)} style={{ marginBottom: '1rem' }}>
        <SelectItem value="" text="—" />
        {['Yes','Recommended','No'].map(v => <SelectItem key={v} value={v} text={v} />)}
      </Select>
      <Select id="sl-ai"           labelText="Talks about AI"      value={form.talks_about_ai || '0'} onChange={e => set('talks_about_ai', e.target.value)}>
        <SelectItem value="0" text="No" />
        <SelectItem value="1" text="Yes" />
      </Select>
    </>
  );
}

const BLANK_SL_FORM = { name:'', title:'', location:'', business_unit:'', email:'', linkedin:'', w3:'', followers:'', member_identity:'', collaborate:'', talks_about_ai:'0' };

function SocialLeagueAddModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ ...BLANK_SL_FORM });
  useEffect(() => { if (!open) setForm({ ...BLANK_SL_FORM }); }, [open]);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit() {
    if (!form.name.trim()) return;
    onSave({ ...form, followers: parseFollowerCount(form.followers), talks_about_ai: form.talks_about_ai === '1' ? 1 : 0 });
  }
  return (
    <Modal open={open} onRequestClose={onClose} onRequestSubmit={handleSubmit}
      modalHeading="Add Social League Member" primaryButtonText="Add" secondaryButtonText="Cancel"
      onSecondarySubmit={onClose} size="sm">
      <SocialLeagueFormFields form={form} set={set} />
    </Modal>
  );
}

function slCsvRowToMember(row) {
  // parseCsv normalises headers by only collapsing spaces → underscores (not other chars).
  // This lookup normalises both the lookup key AND the row keys the same way so they match.
  const normHeader = k => k.trim().toLowerCase().replace(/\s+/g, '_');
  // Also try stripping all non-alphanumeric (for keys passed as plain names)
  const normStrict = k => k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '');
  const normRow = Object.fromEntries(Object.entries(row).map(([k, v]) => [normStrict(k), v]));
  const get = (...keys) => {
    for (const k of keys) {
      // Try exact parseCsv-normalised key first, then strict-normalised key
      const v1 = row[normHeader(k)];
      if (v1 != null && v1 !== '') return v1;
      const v2 = normRow[normStrict(k)];
      if (v2 != null && v2 !== '') return v2;
    }
    return '';
  };
  const aiRaw = get('talks_about_ai', 'talks about ai').toLowerCase();
  return {
    name:            get('name'),
    title:           get('title'),
    linkedin:        get('linkedin'),
    email:           get('email'),
    member_identity: get('member_identity', 'member identity'),
    collaborate:     get('collaborate_with_sm_i', 'collaborate with sm+i', 'collaborate'),
    followers:       parseFollowerCount(get('followers')),
    location:        get('location'),
    business_unit:   get('business_unit___aligned', 'business_unit_aligned', 'business unit + aligned', 'business_unit'),
    w3:              get('w3'),
    talks_about_ai:  (aiRaw === 'yes' || aiRaw === '1' || aiRaw === 'v') ? 1 : 0,
  };
}

function SocialLeagueCsvUploadModal({ open, onClose, onImport }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError]     = useState('');

  useEffect(() => { if (!open) { setFile(null); setPreview([]); setError(''); } }, [open]);

  function handleFileChange(e) {
    const f = e.target?.files?.[0] || (e.addedFiles && e.addedFiles[0]);
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setError('Please upload a .csv file.'); return; }
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result);
      if (rows.length === 0) { setError('No valid rows found in CSV.'); setPreview([]); return; }
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  }

  function handleImport() {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result);
      const members = rows.map(slCsvRowToMember).filter(m => m.name.trim());
      onImport(members);
    };
    reader.readAsText(file);
  }

  return (
    <Modal open={open} onRequestClose={onClose} onRequestSubmit={handleImport}
      modalHeading="Upload Social League Members via CSV"
      primaryButtonText="Import" primaryButtonDisabled={!file || preview.length === 0}
      secondaryButtonText="Cancel" onSecondarySubmit={onClose} size="md">
      <p style={{ marginBottom: '1rem', fontSize: '0.8125rem', fontFamily: 'monospace', background: 'var(--cds-layer-01)', padding: '0.5rem', borderRadius: '2px', wordBreak: 'break-all' }}>
        Name, Title, LinkedIn, Email, Member Identity, Collaborate with SM+I, Followers, Location, Business Unit + Aligned, w3, Talks about AI
      </p>
      <FileUploader labelTitle="Select CSV file" labelDescription="Only .csv files are accepted"
        buttonLabel="Add file" accept={['.csv']} filenameStatus="edit" onChange={handleFileChange} />
      {error && <InlineNotification kind="error" title={error} style={{ marginTop: '1rem' }} hideCloseButton />}
      {preview.length > 0 && (
        <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Preview (first {preview.length} rows):</p>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.8125rem', width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--cds-layer-01)', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                {['Name','Title','Identity','Location','Followers'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => {
                const m = slCsvRowToMember(row);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                    <td style={{ padding: '4px 8px' }}>{m.name || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{m.title || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{m.member_identity || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{m.location || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{m.followers || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>Ready to import all rows. Existing members (matched by name) will be updated.</p>
        </div>
      )}
    </Modal>
  );
}


function SocialLeagueEditModal({ open, member, onClose, onSave }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (member) setForm({
      name:            member.name || '',
      title:           member.title || '',
      location:        member.location || '',
      business_unit:   member.business_unit || '',
      email:           member.email || '',
      linkedin:        member.linkedin || '',
      w3:              member.w3 || '',
      followers:       member.followers != null ? String(member.followers) : '',
      member_identity: member.member_identity || '',
      collaborate:     member.collaborate || '',
      talks_about_ai:  member.talks_about_ai === 1 ? '1' : '0',
    });
  }, [member]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit() {
    onSave({ ...form, followers: parseFollowerCount(form.followers), talks_about_ai: form.talks_about_ai === '1' ? 1 : 0 });
  }

  return (
    <Modal open={open} onRequestClose={onClose} onRequestSubmit={handleSubmit}
      modalHeading="Edit Social League Member" primaryButtonText="Save" secondaryButtonText="Cancel"
      onSecondarySubmit={onClose} size="sm">
      <SocialLeagueFormFields form={form} set={set} />
    </Modal>
  );
}

function SocialLeagueView() {
  const [members, setMembers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [filterIdentity, setFilterIdentity] = useState('');
  const [filterCollaborate, setFilterCollaborate] = useState('');
  const [filterGeo, setFilterGeo]           = useState('');
  const [filterBU, setFilterBU]             = useState('');
  const [filterAI, setFilterAI]             = useState('');
  const [selected, setSelected]             = useState(null);
  const [editModal, setEditModal]           = useState(false);
  const [addModal, setAddModal]             = useState(false);
  const [csvModal, setCsvModal]             = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim())       params.set('q', search.trim());
      if (filterIdentity)      params.set('member_identity', filterIdentity);
      if (filterCollaborate)   params.set('collaborate', filterCollaborate);
      if (filterGeo)           params.set('geo', filterGeo);
      if (filterBU)            params.set('business_unit', filterBU);
      if (filterAI)            params.set('talks_about_ai', filterAI);
      setLoading(true);
      fetch(`${API}/social-league?${params}`)
        .then(r => r.json())
        .then(data => { setMembers(Array.isArray(data) ? data : []); setLoading(false); });
    }, 300);
  }, [search, filterIdentity, filterCollaborate, filterGeo, filterBU, filterAI]); // eslint-disable-line

  const selectedMember = members.find(m => m.id === selected) || null;

  async function handleSave(formData) {
    const r = await fetch(`${API}/social-league/${selectedMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (r.ok) {
      const updated = await r.json();
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    }
    setEditModal(false);
  }

  async function handleAdd(formData) {
    const r = await fetch(`${API}/social-league`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (r.ok) {
      const created = await r.json();
      setMembers(prev => [created, ...prev]);
    }
    setAddModal(false);
  }

  async function handleCsvImport(newMembers) {
    const results = [];
    for (const m of newMembers) {
      const r = await fetch(`${API}/social-league/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      });
      if (r.ok) results.push(await r.json());
    }
    // Refresh full list to reflect upserts accurately
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    fetch(`${API}/social-league?${params}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMembers(data); });
    setCsvModal(false);
  }

  return (
    <div className="hub-main">
      {/* Left panel */}
      <div className="hub-left-panel">
        <div className="hub-filters">
          <Search id="sl-search" size="lg" labelText="Search" placeholder='e.g. "Aaron Baughman"'
            value={search} onChange={e => setSearch(e.target.value)} />
          <p className="hub-search-hint">Search by name, title, location, or business unit</p>
          <div className="hub-filter-grid">
            <FilterSelect label="Member Identity" value={filterIdentity} options={[
              { value: '', text: 'All Identities' },
              { value: 'Superstars', text: 'Superstars' },
              { value: 'Engager', text: 'Engager' },
              { value: 'Observer', text: 'Observer' },
              { value: 'Reserved -', text: 'Reserved' },
            ]} onChange={v => setFilterIdentity(v)} />
            <FilterSelect label="Collaborates with SM+I" value={filterCollaborate} options={[
              { value: '', text: 'All' },
              { value: 'yes', text: 'Yes' },
              { value: 'recommended', text: 'Recommended' },
              { value: 'no', text: 'No' },
            ]} onChange={v => setFilterCollaborate(v)} />
            <FilterSelect label="Business Unit" value={filterBU} options={[
              { value: '', text: 'All Business Units' },
              ...SL_BUSINESS_UNITS.map(u => ({ value: u, text: u })),
            ]} onChange={v => setFilterBU(v)} />
            <FilterSelect label="Talks about AI" value={filterAI} options={[
              { value: '', text: 'All' },
              { value: '1', text: 'Yes' },
            ]} onChange={v => setFilterAI(v)} />
            <FilterSelect label="Geos" value={filterGeo} options={[
              { value: '', text: 'All Geos' },
              { value: 'Americas', text: 'Americas' },
              { value: 'UK', text: 'UK' },
              { value: 'EMEA', text: 'EMEA' },
              { value: 'India', text: 'India' },
            ]} onChange={v => setFilterGeo(v)} />
          </div>
        </div>
        <div className="hub-list-header">
          <p className="hub-list-count">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          <div className="hub-list-header-actions">
            <Button kind="ghost" size="sm" onClick={() => setCsvModal(true)} className="hub-add-btn">↑ Upload CSV</Button>
            <Button kind="primary" size="sm" onClick={() => setAddModal(true)} className="hub-add-btn">+ Add</Button>
          </div>
        </div>
        <div className="hub-card-list">
          {loading && <div style={{ padding: '1rem' }}><Loading small withOverlay={false} /></div>}
          {!loading && members.length === 0 && (
            <div className="hub-empty-list"><p>No members match.</p></div>
          )}
          {members.map(m => (
            <Tile key={m.id}
              className={`hub-influencer-tile ${selected === m.id ? 'hub-influencer-tile--selected' : ''}`}
              onClick={() => setSelected(m.id)}
            >
              <div className="hub-card-top">
                <CreatorAvatar name={m.name} size="sm" />
                <div className="hub-card-info">
                  <p className="hub-card-name">{m.name}</p>
                  <p className="hub-card-meta">{m.title} · {fmt(m.followers)} followers</p>
                </div>
                <div className="hub-card-top-actions">
                  <Tag type={IDENTITY_COLORS[m.member_identity] || 'gray'} size="sm">{m.member_identity}</Tag>
                  <IconButton
                    kind="ghost"
                    size="sm"
                    label={`Edit ${m.name}`}
                    onClick={e => { e.stopPropagation(); setSelected(m.id); setEditModal(true); }}
                  >
                    <Edit size={16} />
                  </IconButton>
                </div>
              </div>
            </Tile>
          ))}
        </div>
      </div>

      {/* Right panel */}
      {selectedMember ? (
        <div className="hub-right-panel">
          <div className="hub-profile-header">
            <div className="hub-profile-header-top">
              <CreatorAvatar name={selectedMember.name} size="lg" />
              <div className="hub-profile-header-info">
                <h1 className="hub-profile-name">{selectedMember.name}</h1>
                <div className="hub-profile-badges">
                  <Tag type={IDENTITY_COLORS[selectedMember.member_identity] || 'gray'} size="sm">
                    {selectedMember.member_identity}
                  </Tag>
                  {selectedMember.talks_about_ai === 1 && <Tag type="teal" size="sm">Talks about AI</Tag>}
                  {selectedMember.collaborate
                    ? <Tag type={selectedMember.collaborate.toLowerCase() === 'no' ? 'gray' : 'green'} size="sm">Collaborate with SM+I: {selectedMember.collaborate}</Tag>
                    : <Tag type="gray" size="sm">Collaborate with SM+I: No</Tag>
                  }
                </div>
                <p className="hub-profile-meta">
                  📍 {selectedMember.location || '—'}
                  &nbsp;·&nbsp; {fmt(selectedMember.followers)} LinkedIn followers
                </p>
              </div>
              <IconButton kind="ghost" size="sm" label={`Edit ${selectedMember.name}`} onClick={() => setEditModal(true)}>
                <Edit size={16} />
              </IconButton>
            </div>
          </div>
          <div className="hub-tab-content" style={{ padding: '1.5rem 2rem' }}>
            <div className="hub-section">
              <p className="hub-section-label">Title</p>
              <p className="hub-body-text">{selectedMember.title || '—'}</p>
            </div>
            <div className="hub-section">
              <p className="hub-section-label">Business Unit</p>
              <p className="hub-body-text">{selectedMember.business_unit || '—'}</p>
            </div>
            <div className="hub-section hub-meta-row">
              <Tile className="hub-meta-tile">
                <p className="hub-section-label">Email</p>
                <p className="hub-body-text" style={{ wordBreak: 'break-all' }}>{selectedMember.email || '—'}</p>
              </Tile>
              <Tile className="hub-meta-tile">
                <p className="hub-section-label">LinkedIn</p>
                <p className="hub-body-text" style={{ wordBreak: 'break-all' }}>
                  {selectedMember.linkedin
                    ? <Link href={selectedMember.linkedin} target="_blank" rel="noopener noreferrer">View profile</Link>
                    : '—'}
                </p>
              </Tile>
            </div>
            {selectedMember.w3 && (
              <div className="hub-section">
                <p className="hub-section-label">w3 Profile</p>
                <p className="hub-body-text">
                  <Link href={selectedMember.w3} target="_blank" rel="noopener noreferrer">{selectedMember.w3}</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hub-right-panel hub-empty-state">
          <Tile className="hub-empty-tile" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.3 }}>◎</p>
            <p className="hub-heading-sm">Select a member</p>
            <p className="hub-muted" style={{ marginTop: '0.25rem' }}>Click a card to view their profile</p>
          </Tile>
        </div>
      )}
      <SocialLeagueEditModal
        open={editModal}
        member={selectedMember}
        onClose={() => setEditModal(false)}
        onSave={handleSave}
      />
      <SocialLeagueAddModal
        open={addModal}
        onClose={() => setAddModal(false)}
        onSave={handleAdd}
      />
      <SocialLeagueCsvUploadModal
        open={csvModal}
        onClose={() => setCsvModal(false)}
        onImport={handleCsvImport}
      />
    </div>
  );
}

// ── Chat Bot ──────────────────────────────────────────────────────────────────

const CHAT_SUGGESTIONS = [
  'Find active external creators in EMEA',
  'Who worked on IBM Think with a score above 8?',
  'Show YouTube creators with IBM content',
  'How many influencers are in the database?',
  '📋 Paste a message to vet influencers',
];

function ChatBot({ onSelectInfluencer }) {
  const [open, setOpen]       = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m powered by AI and have full access to the influencer database. Ask me anything — find creators by location, event, platform, score, or ask general questions like "how many active influencers do we have?"\n\nTip: use the 📋 button to paste a forwarded message or email and I\'ll automatically vet every influencer mentioned.' },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const pasteRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setGreetingDismissed(true);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => {
      const updated = [...prev, { role: 'user', text: msg }];
      // Fire the request inside the state updater so we have the latest messages
      _sendRequest(msg, updated);
      return updated;
    });
  }

  function sendPaste() {
    const msg = pasteText.trim();
    if (!msg) return;
    setPasteMode(false);
    setPasteText('');
    const wrapped = `Please vet the following forwarded message and check if any influencers mentioned have been worked with before. Also report their rate if the message asks about cost.\n\n---\n${msg}`;
    setMessages(prev => {
      const updated = [...prev, { role: 'user', text: msg }];
      _sendRequest(wrapped, updated);
      return updated;
    });
  }

  function openPasteMode() {
    setPasteMode(true);
    setTimeout(() => pasteRef.current?.focus(), 80);
  }

  async function _sendRequest(msg, currentMessages) {
    setLoading(true);
    // Build conversation history for the AI (exclude the initial bot greeting and the
    // current user message, which is sent separately as `message`)
    const history = currentMessages
      .slice(1) // skip greeting
      .slice(0, -1) // exclude the last message (the current user message, sent as `message`)
      .slice(-10) // last 10 messages for context window efficiency
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', text: m.text }));
    try {
      const r = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await r.json();
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: data.reply, results: data.results || [] },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Greeting bubble */}
      {!open && !greetingDismissed && (
        <div className="hub-chat-greeting" role="status" aria-live="polite">
          <p className="hub-chat-greeting-text">Hi there! Let me know how I can be of assistance!</p>
          <IconButton kind="ghost" size="sm" label="Dismiss greeting" onClick={() => setGreetingDismissed(true)}>
            <Close size={12} />
          </IconButton>
        </div>
      )}

      {/* FAB trigger */}
      <button
        className={`hub-chat-fab ${open ? 'hub-chat-fab--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close assistant' : 'Open creator search assistant'}
        title={open ? 'Close' : 'Creator search assistant'}
      >
        {open
          ? /* close X */
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M12 4.7L11.3 4 8 7.3 4.7 4 4 4.7 7.3 8 4 11.3l.7.7L8 8.7l3.3 3.3.7-.7L8.7 8z"/>
            </svg>
          : /* IBM bee */
            <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M27.299,28.258c-0.653,0-1.314-0.155-1.927-0.484c-1.535-0.823-2.362-2.52-2.059-4.22l1.498-8.146c0.026-0.14,0.132-0.251,0.27-0.285c0.139-0.033,0.283,0.017,0.37,0.129l5.087,6.581c0.959,1.255,1.087,2.955,0.328,4.334C30.132,27.501,28.737,28.258,27.299,28.258z M25.374,16.33l-1.335,7.263c-0.001,0.002-0.017,0.088-0.018,0.09c-0.248,1.391,0.431,2.78,1.69,3.456l0,0c1.618,0.868,3.646,0.276,4.523-1.319c0.622-1.129,0.517-2.521-0.269-3.548L25.374,16.33z M14.611,25.505c-0.84,0-1.683-0.209-2.452-0.632c-1.688-0.926-2.68-2.688-2.589-4.598c0.006-0.124,0.075-0.236,0.184-0.297c0.109-0.059,0.24-0.06,0.349-0.001l7.339,4.03c0.11,0.061,0.181,0.173,0.187,0.299c0.006,0.125-0.054,0.244-0.157,0.314C16.606,25.209,15.61,25.505,14.611,25.505z M10.302,20.908c0.128,1.396,0.937,2.639,2.204,3.334l0,0c1.267,0.696,2.765,0.72,4.033,0.091L10.302,20.908z M18.822,22.913c-0.059,0-0.118-0.015-0.173-0.045l-8.19-4.496c-0.084-0.046-0.146-0.124-0.173-0.217s-0.015-0.191,0.033-0.275l1.144-2.031c0.096-0.171,0.312-0.233,0.487-0.139l8.189,4.496c0.085,0.046,0.146,0.124,0.173,0.217c0.027,0.092,0.016,0.191-0.032,0.275l-1.144,2.031C19.07,22.847,18.948,22.913,18.822,22.913z M11.125,17.916l7.559,4.149l0.79-1.403l-7.559-4.149L11.125,17.916z M21.094,18.879c-0.059,0-0.118-0.015-0.173-0.045l-8.19-4.497c-0.084-0.046-0.146-0.124-0.173-0.217c-0.026-0.092-0.015-0.191,0.033-0.275l1.144-2.031c0.097-0.171,0.312-0.235,0.487-0.139l8.189,4.496c0.085,0.046,0.146,0.124,0.173,0.217c0.027,0.092,0.016,0.191-0.032,0.275l-1.144,2.031C21.342,18.812,21.22,18.879,21.094,18.879z M13.396,13.881l7.559,4.15l0.79-1.403l-7.558-4.15L13.396,13.881z M4.694,15.845c-0.687,0-1.376-0.172-2.002-0.524c-0.946-0.531-1.624-1.395-1.909-2.433C0.5,11.859,0.638,10.782,1.172,9.854c0.783-1.361,2.314-2.15,3.892-2.007L13.41,8.64c0.142,0.014,0.263,0.11,0.308,0.246c0.045,0.136,0.005,0.286-0.102,0.381L7.469,14.76c-0.001,0.001-0.067,0.06-0.069,0.061C6.636,15.497,5.669,15.845,4.694,15.845z M4.697,8.551c-1.191,0-2.307,0.631-2.901,1.663c-0.438,0.759-0.551,1.641-0.319,2.483c0.234,0.851,0.791,1.56,1.568,1.996l0,0c1.249,0.703,2.808,0.538,3.876-0.41l5.601-5.004L4.997,8.564C4.897,8.555,4.796,8.551,4.697,8.551z M22.941,14.61c-0.06,0-0.119-0.015-0.173-0.044l-7.341-4.03c-0.11-0.06-0.18-0.173-0.186-0.298s0.053-0.245,0.157-0.315c1.589-1.081,3.625-1.179,5.312-0.252l0,0c1.688,0.927,2.681,2.688,2.59,4.597c-0.006,0.124-0.075,0.236-0.184,0.297C23.062,14.595,23.002,14.61,22.941,14.61z M16.331,10.21l6.237,3.425c-0.128-1.395-0.937-2.638-2.203-3.334C19.098,9.607,17.601,9.583,16.331,10.21z M24.816,10.698c-0.329,0-0.662-0.08-0.97-0.249c-0.47-0.257-0.81-0.682-0.956-1.194c-0.145-0.509-0.082-1.043,0.179-1.506c0.537-0.952,1.756-1.298,2.723-0.768c0.47,0.258,0.81,0.682,0.956,1.195c0.145,0.508,0.082,1.042-0.179,1.504l0,0C26.204,10.331,25.521,10.698,24.816,10.698z M24.821,7.452c-0.452,0-0.891,0.235-1.125,0.651c-0.165,0.293-0.205,0.632-0.113,0.955c0.094,0.326,0.311,0.596,0.61,0.76c0.622,0.343,1.405,0.121,1.749-0.49l0,0c0.165-0.293,0.205-0.632,0.113-0.954c-0.093-0.326-0.31-0.596-0.61-0.761C25.247,7.504,25.032,7.452,24.821,7.452z M19.367,7.707c-0.328,0-0.661-0.08-0.968-0.249c-0.471-0.258-0.811-0.682-0.957-1.194c-0.145-0.509-0.082-1.043,0.179-1.506c0.537-0.953,1.759-1.298,2.723-0.768c0.471,0.258,0.811,0.683,0.957,1.195c0.145,0.509,0.081,1.043-0.179,1.504C20.756,7.34,20.071,7.707,19.367,7.707z M19.373,4.461c-0.452,0-0.891,0.235-1.125,0.651c-0.165,0.293-0.205,0.632-0.113,0.955c0.094,0.326,0.311,0.596,0.61,0.761c0.623,0.341,1.406,0.12,1.75-0.491c0.165-0.292,0.205-0.631,0.113-0.953c-0.094-0.326-0.311-0.597-0.61-0.762C19.8,4.513,19.585,4.461,19.373,4.461z"/>
            </svg>
        }
      </button>

      {/* Panel */}
      {open && (
        <div className="hub-chat-panel" role="dialog" aria-label="Creator search assistant">
          {/* Header */}
          <div className="hub-chat-header">
            <div className="hub-chat-header-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
                <path d="M27.299,28.258c-0.653,0-1.314-0.155-1.927-0.484c-1.535-0.823-2.362-2.52-2.059-4.22l1.498-8.146c0.026-0.14,0.132-0.251,0.27-0.285c0.139-0.033,0.283,0.017,0.37,0.129l5.087,6.581c0.959,1.255,1.087,2.955,0.328,4.334C30.132,27.501,28.737,28.258,27.299,28.258z M25.374,16.33l-1.335,7.263c-0.001,0.002-0.017,0.088-0.018,0.09c-0.248,1.391,0.431,2.78,1.69,3.456l0,0c1.618,0.868,3.646,0.276,4.523-1.319c0.622-1.129,0.517-2.521-0.269-3.548L25.374,16.33z M14.611,25.505c-0.84,0-1.683-0.209-2.452-0.632c-1.688-0.926-2.68-2.688-2.589-4.598c0.006-0.124,0.075-0.236,0.184-0.297c0.109-0.059,0.24-0.06,0.349-0.001l7.339,4.03c0.11,0.061,0.181,0.173,0.187,0.299c0.006,0.125-0.054,0.244-0.157,0.314C16.606,25.209,15.61,25.505,14.611,25.505z M10.302,20.908c0.128,1.396,0.937,2.639,2.204,3.334l0,0c1.267,0.696,2.765,0.72,4.033,0.091L10.302,20.908z M18.822,22.913c-0.059,0-0.118-0.015-0.173-0.045l-8.19-4.496c-0.084-0.046-0.146-0.124-0.173-0.217s-0.015-0.191,0.033-0.275l1.144-2.031c0.096-0.171,0.312-0.233,0.487-0.139l8.189,4.496c0.085,0.046,0.146,0.124,0.173,0.217c0.027,0.092,0.016,0.191-0.032,0.275l-1.144,2.031C19.07,22.847,18.948,22.913,18.822,22.913z M11.125,17.916l7.559,4.149l0.79-1.403l-7.559-4.149L11.125,17.916z M21.094,18.879c-0.059,0-0.118-0.015-0.173-0.045l-8.19-4.497c-0.084-0.046-0.146-0.124-0.173-0.217c-0.026-0.092-0.015-0.191,0.033-0.275l1.144-2.031c0.097-0.171,0.312-0.235,0.487-0.139l8.189,4.496c0.085,0.046,0.146,0.124,0.173,0.217c0.027,0.092,0.016,0.191-0.032,0.275l-1.144,2.031C21.342,18.812,21.22,18.879,21.094,18.879z M13.396,13.881l7.559,4.15l0.79-1.403l-7.558-4.15L13.396,13.881z M4.694,15.845c-0.687,0-1.376-0.172-2.002-0.524c-0.946-0.531-1.624-1.395-1.909-2.433C0.5,11.859,0.638,10.782,1.172,9.854c0.783-1.361,2.314-2.15,3.892-2.007L13.41,8.64c0.142,0.014,0.263,0.11,0.308,0.246c0.045,0.136,0.005,0.286-0.102,0.381L7.469,14.76c-0.001,0.001-0.067,0.06-0.069,0.061C6.636,15.497,5.669,15.845,4.694,15.845z M4.697,8.551c-1.191,0-2.307,0.631-2.901,1.663c-0.438,0.759-0.551,1.641-0.319,2.483c0.234,0.851,0.791,1.56,1.568,1.996l0,0c1.249,0.703,2.808,0.538,3.876-0.41l5.601-5.004L4.997,8.564C4.897,8.555,4.796,8.551,4.697,8.551z M22.941,14.61c-0.06,0-0.119-0.015-0.173-0.044l-7.341-4.03c-0.11-0.06-0.18-0.173-0.186-0.298s0.053-0.245,0.157-0.315c1.589-1.081,3.625-1.179,5.312-0.252l0,0c1.688,0.927,2.681,2.688,2.59,4.597c-0.006,0.124-0.075,0.236-0.184,0.297C23.062,14.595,23.002,14.61,22.941,14.61z M16.331,10.21l6.237,3.425c-0.128-1.395-0.937-2.638-2.203-3.334C19.098,9.607,17.601,9.583,16.331,10.21z M24.816,10.698c-0.329,0-0.662-0.08-0.97-0.249c-0.47-0.257-0.81-0.682-0.956-1.194c-0.145-0.509-0.082-1.043,0.179-1.506c0.537-0.952,1.756-1.298,2.723-0.768c0.47,0.258,0.81,0.682,0.956,1.195c0.145,0.508,0.082,1.042-0.179,1.504l0,0C26.204,10.331,25.521,10.698,24.816,10.698z M24.821,7.452c-0.452,0-0.891,0.235-1.125,0.651c-0.165,0.293-0.205,0.632-0.113,0.955c0.094,0.326,0.311,0.596,0.61,0.76c0.622,0.343,1.405,0.121,1.749-0.49l0,0c0.165-0.293,0.205-0.632,0.113-0.954c-0.093-0.326-0.31-0.596-0.61-0.761C25.247,7.504,25.032,7.452,24.821,7.452z M19.367,7.707c-0.328,0-0.661-0.08-0.968-0.249c-0.471-0.258-0.811-0.682-0.957-1.194c-0.145-0.509-0.082-1.043,0.179-1.506c0.537-0.953,1.759-1.298,2.723-0.768c0.471,0.258,0.811,0.683,0.957,1.195c0.145,0.509,0.081,1.043-0.179,1.504C20.756,7.34,20.071,7.707,19.367,7.707z M19.373,4.461c-0.452,0-0.891,0.235-1.125,0.651c-0.165,0.293-0.205,0.632-0.113,0.955c0.094,0.326,0.311,0.596,0.61,0.761c0.623,0.341,1.406,0.12,1.75-0.491c0.165-0.292,0.205-0.631,0.113-0.953c-0.094-0.326-0.311-0.597-0.61-0.762C19.8,4.513,19.585,4.461,19.373,4.461z"/>
              </svg>
            </div>
            <div>
              <p className="hub-chat-title">Creator Assistant</p>
              <p className="hub-chat-subtitle">AI-powered · Ask anything about your influencers</p>
            </div>
            <IconButton kind="ghost" size="sm" label="Close assistant" onClick={() => setOpen(false)}>
              <Close size={16} />
            </IconButton>
          </div>

          {/* Messages */}
          <div className="hub-chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`hub-chat-msg hub-chat-msg--${m.role}`}>
                <p className="hub-chat-msg-text">{m.text}</p>
                {m.results && m.results.length > 0 && (
                  <div className="hub-chat-results">
                    {m.results.slice(0, 8).map(inf => (
                      <ClickableTile
                        key={inf.id}
                        className="hub-chat-result-card"
                        onClick={() => { onSelectInfluencer(inf.id); setOpen(false); }}
                      >
                        <CreatorAvatar name={inf.name} size="sm" />
                        <div className="hub-chat-result-info">
                          <p className="hub-chat-result-name">{inf.name}</p>
                          <p className="hub-chat-result-meta">
                            {inf.persona_group}
                            {inf.location ? ` · ${inf.location}` : ''}
                          </p>
                        </div>
                        <ArrowRight size={12} className="hub-chat-result-arrow" aria-hidden="true" />
                      </ClickableTile>
                    ))}
                    <Button
                      kind="tertiary"
                      size="sm"
                      renderIcon={DocumentImport}
                      onClick={() => exportToCsv(m.results)}
                    >
                      Export {m.results.length} creator{m.results.length !== 1 ? 's' : ''} to CSV
                    </Button>
                    {m.results.length > 8 && (
                      <p className="hub-chat-more">+{m.results.length - 8} more — refine your query to narrow results</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="hub-chat-msg hub-chat-msg--bot">
                <div className="hub-chat-typing">
                  <span/><span/><span/>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts — always visible */}
          {!pasteMode && (
            <div className="hub-chat-suggestions">
              {CHAT_SUGGESTIONS.map(s => (
                <Tag
                  key={s}
                  className="hub-chat-suggestion"
                  onClick={() => s === '📋 Paste a message to vet influencers' ? openPasteMode() : send(s)}
                  type="blue"
                  size="sm"
                  style={{ cursor: 'pointer' }}
                >
                  {s}
                </Tag>
              ))}
            </div>
          )}

          {/* Paste mode */}
          {pasteMode ? (
            <div className="hub-chat-paste-area">
              <div className="hub-chat-paste-header">
                <span>Paste a forwarded message, email, or Slack thread</span>
                <IconButton kind="ghost" size="sm" label="Cancel paste" onClick={() => { setPasteMode(false); setPasteText(''); }}>
                  <Close size={16} />
                </IconButton>
              </div>
              <TextArea
                ref={pasteRef}
                id="chat-paste-input"
                labelText=""
                hideLabel
                placeholder={'Paste your message here… e.g. "The CSR team is considering will.i.am and https://sineadbovell.com/ for IBM SkillsBuild…"'}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={5}
                aria-label="Paste message to vet"
              />
              <Button
                kind="primary"
                size="sm"
                renderIcon={ArrowRight}
                onClick={sendPaste}
                disabled={loading || !pasteText.trim()}
              >
                Vet these influencers
              </Button>
            </div>
          ) : (
            /* Normal input */
            <div className="hub-chat-input-row">
              <IconButton
                kind="ghost"
                size="md"
                label="Paste message to vet influencers"
                onClick={openPasteMode}
                className="hub-chat-paste-fab"
              >
                <DocumentImport size={20} />
              </IconButton>
              <TextInput
                ref={inputRef}
                id="chat-message-input"
                className="hub-chat-input"
                labelText=""
                hideLabel
                placeholder="Ask me to find creators…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <IconButton
                kind="primary"
                size="md"
                label="Send message"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="hub-chat-send"
              >
                <SendAlt size={16} />
              </IconButton>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [stats, setStats]       = useState(null);
  const [influencers, setList]  = useState([]);
  const [localOverrides, setLocalOverrides] = useState({}); // id -> patched fields
  const [selectedId, setSelected] = useState(null);
  const [searchQuery, setSearch] = useState('');
  const [filters, setFilters]   = useState({ type:'', status:'', platform:'', approval_status:'', persona_group:'', has_content:'', campaign_type:'', location:'' });
  const [showFeed, setShowFeed] = useState(false);
  const [showSocialLeague, setShowSocialLeague] = useState(false);
  const [sideNavExpanded, setSideNavExpanded] = useState(false);
  const [formModal, setFormModal] = useState({ open: false, influencer: null });
  const [csvModal, setCsvModal] = useState(false);
  const [campaignOptions, setCampaignOptions] = useState(BASE_CAMPAIGN_OPTIONS);
  const nlTimer = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/stats`).then(r => r.json()),
      fetch(`${API}/social-league`).then(r => r.json()),
      fetch(`${API}/campaigns`).then(r => r.json()),
    ]).then(([s, league, campaigns]) => {
      setStats({ ...s, socialLeague: Array.isArray(league) ? league.length : 0 });
      if (Array.isArray(campaigns) && campaigns.length > 0) {
        setCampaignOptions(prev => {
          const existing = new Set(prev.map(o => o.value));
          const newOpts = campaigns.filter(c => !existing.has(c)).map(c => ({ value: c, text: c }));
          return newOpts.length > 0 ? [...prev, ...newOpts] : prev;
        });
      }
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    if (searchQuery.trim()) {
      clearTimeout(nlTimer.current);
      nlTimer.current = setTimeout(() => {
        fetch(`${API}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        }).then(r => r.json()).then(data => { if (Array.isArray(data)) setList(data); });
      }, 400);
    } else {
      fetch(`${API}/influencers?${params}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setList(data); });
    }
  }, [filters, searchQuery]); // eslint-disable-line

  // Apply local overrides on top of server list
  const displayList = influencers.map(inf =>
    localOverrides[inf.id] ? { ...inf, ...localOverrides[inf.id] } : inf
  );

  const handleSelect = useCallback((id) => { setSelected(id); setShowFeed(false); setShowSocialLeague(false); }, []);
  const handleFilter = useCallback((k, v) => setFilters(prev => ({ ...prev, [k]: v })), []);
  const handleViewFeed = useCallback(() => setShowFeed(true), []);
  const handleOpenAdd     = useCallback(() => setFormModal({ open: true, influencer: null }), []);
  const handleOpenEdit    = useCallback((inf) => setFormModal({ open: true, influencer: inf }), []);
  const handleCloseForm   = useCallback(() => setFormModal({ open: false, influencer: null }), []);
  const handleOpenCsv   = useCallback(() => setCsvModal(true), []);
  const handleCloseCsv  = useCallback(() => setCsvModal(false), []);

  const handleCsvImport = useCallback(async (newInfluencers, campaignName) => {
    const results = [];
    for (const inf of newInfluencers) {
      const r = await fetch(`${API}/influencers/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inf),
      });
      if (r.ok) results.push(await r.json());
    }
    setList(prev => {
      // Replace updated entries in-place, prepend newly created ones
      const updated = results.filter(r => r._upserted === 'updated');
      const created = results.filter(r => r._upserted === 'created');
      const updatedIds = new Set(updated.map(r => r.id));
      const updatedMap = Object.fromEntries(updated.map(r => [r.id, r]));
      const merged = prev.map(i => updatedIds.has(i.id) ? updatedMap[i.id] : i);
      return [...created, ...merged];
    });
    // Add the campaign name to the filter dropdown if it's new
    if (campaignName) {
      setCampaignOptions(prev => {
        if (prev.some(o => o.value === campaignName)) return prev;
        return [...prev, { value: campaignName, text: campaignName }];
      });
    }
    setCsvModal(false);
  }, []);

  const handleDelete = useCallback(async (id) => {
    await fetch(`${API}/influencers/${id}`, { method: 'DELETE' });
    setList(prev => prev.filter(i => i.id !== id));
    setLocalOverrides(prev => { const next = { ...prev }; delete next[id]; return next; });
    setSelected(s => s === id ? null : s);
    setFormModal({ open: false, influencer: null });
  }, []);

  async function handleFormSave(formData) {
    if (formModal.influencer) {
      // Edit: persist to backend
      const r = await fetch(`${API}/influencers/${formModal.influencer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (r.ok) {
        const updated = await r.json();
        setList(prev => prev.map(i => i.id === updated.id ? updated : i));
        // Bump localOverrides so ProfileView re-fetches the saved data
        setLocalOverrides(prev => ({ ...prev, [updated.id]: {} }));
      }
    } else {
      // Add: persist to backend
      const r = await fetch(`${API}/influencers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (r.ok) {
        const newInf = await r.json();
        setList(prev => [newInf, ...prev]);
      }
    }
    setFormModal({ open: false, influencer: null });
  }

  return (
    <>
      <Header aria-label="IBM Influencer Intelligence Hub">
        <SkipToContent />
        <HeaderMenuButton aria-label="Open menu" onClick={() => setSideNavExpanded(v => !v)} isActive={sideNavExpanded} />
        <HeaderName href="#" prefix="IBM">Influencer Intelligence Hub</HeaderName>
        <HeaderNavigation aria-label="IBM Influencer Hub">
          <HeaderMenuItem isActive={!showFeed && !showSocialLeague} onClick={() => { setShowFeed(false); setShowSocialLeague(false); }}>Influencers</HeaderMenuItem>
          <HeaderMenuItem isActive={showSocialLeague} onClick={() => { setShowFeed(false); setShowSocialLeague(true); }}>Social League</HeaderMenuItem>
          <HeaderMenuItem isActive={showFeed} onClick={() => { setShowFeed(true); setShowSocialLeague(false); }}>IBM Content Feed</HeaderMenuItem>
        </HeaderNavigation>
      </Header>

      <Content className="hub-content">
        <StatsBar stats={stats} />
        {showSocialLeague
          ? <SocialLeagueView />
          : <div className="hub-main">
          <LeftPanel
            influencers={displayList}
            selectedId={selectedId}
            onSelect={handleSelect}
            onSearch={setSearch}
            onFilter={handleFilter}
            filters={filters}
            searchQuery={searchQuery}
            onViewFeed={handleViewFeed}
            onAdd={handleOpenAdd}
            onEdit={handleOpenEdit}
            onUploadCsv={handleOpenCsv}
            campaignOptions={campaignOptions}
          />
          {showFeed
            ? <GlobalFeed onClose={() => setShowFeed(false)} onSelectInfluencer={(id) => { setSelected(id); setShowFeed(false); setShowSocialLeague(false); }} />
            : <ProfileView influencerId={selectedId} localOverrides={localOverrides} onEdit={handleOpenEdit} />
          }
        </div>}
      </Content>

      <InfluencerFormModal
        open={formModal.open}
        influencer={formModal.influencer}
        onClose={handleCloseForm}
        onSave={handleFormSave}
        onDelete={handleDelete}
      />
      <CsvUploadModal
        open={csvModal}
        onClose={handleCloseCsv}
        onImport={handleCsvImport}
      />
    </>
  );
}
