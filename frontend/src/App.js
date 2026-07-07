import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

import {
  // UI Shell
  Header, HeaderMenuButton, HeaderName,
  HeaderNavigation, HeaderMenuItem, SkipToContent,
  // Layout
  Content,
  // Tiles
  Tile,
  // Inputs
  Search, Button, Dropdown, Tag, Modal, TextInput, TextArea, Select, SelectItem,
  FileUploader,
  // Tabs
  Tabs, Tab, TabList, TabPanels, TabPanel,
  // Notifications
  InlineNotification, ToastNotification,
  // Data display
  StructuredListWrapper, StructuredListHead, StructuredListRow,
  StructuredListCell, StructuredListBody,
  // Misc
  Loading, Link,
} from '@carbon/react';

// Backend runs on :3001
const API = 'http://localhost:3001/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw + 'T00:00:00');
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Status / Approval / Type badges as Carbon Tags ────────────────────────────

const STATUS_TYPE = { active: 'green', dormant: 'yellow', dnu: 'red' };
const STATUS_LABEL = { active: 'Active', dormant: 'Dormant', dnu: 'Do Not Use' };
const APPROVAL_TYPE = { approved: 'green', pending: 'blue', declined: 'red' };
const APPROVAL_LABEL = { approved: '✓ Approved', pending: '? Pending', declined: '✗ Declined' };

function StatusTag({ status }) {
  return <Tag type={STATUS_TYPE[status] || 'gray'} size="sm">{STATUS_LABEL[status] || status}</Tag>;
}
function ApprovalTag({ status }) {
  return <Tag type={APPROVAL_TYPE[status] || 'gray'} size="sm">{APPROVAL_LABEL[status] || status}</Tag>;
}
function TypeTag({ type }) {
  return <Tag type={type === 'internal' ? 'blue' : 'cool-gray'} size="sm">
    {type === 'internal' ? '⬡ IBM Social League' : '↗ External'}
  </Tag>;
}

const PLATFORM_COLOR = {
  YouTube:   { bg: '#fff0f0', color: '#c02020' },
  TikTok:    { bg: '#f3f0ff', color: '#6929c4' },
  Instagram: { bg: '#fff0f7', color: '#9f1853' },
  X:         { bg: '#f4f4f4', color: '#393939' },
  LinkedIn:  { bg: '#edf5ff', color: '#0043ce' },
  Reddit:    { bg: '#fff3ee', color: '#b23b00' },
};
function PlatformTag({ platform, size = 'sm' }) {
  const c = PLATFORM_COLOR[platform] || { bg: '#f4f4f4', color: '#525252' };
  const isLg = size === 'lg';
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg, color: c.color,
      fontSize: isLg ? '0.75rem' : '0.6875rem',
      fontWeight: 500,
      padding: isLg ? '0.1875rem 0.625rem' : '0.125rem 0.4375rem',
      borderRadius: '0.75rem',
      whiteSpace: 'nowrap',
      lineHeight: 1.5,
      fontFamily: 'inherit',
    }}>
      {platform}
    </span>
  );
}

// ── Stats Bar using Carbon Tiles ──────────────────────────────────────────────

function StatsBar({ stats }) {
  return (
    <div className="hub-stats-bar">
      <Tile className="hub-stat-tile">
        <p className="hub-stat-value">{stats ? stats.total : <Loading small withOverlay={false} />}</p>
        <p className="hub-stat-label">Total Influencers</p>
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
        follower_count: parseInt(String(p.follower_count).replace(/[^0-9]/g, ''), 10) || 0,
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
              <button className="hub-platform-remove" onClick={() => removePlatform(i)} aria-label="Remove platform">✕</button>
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
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });
    return row;
  }).filter(r => r.name);
}

// Normalise a CSV header key: lowercase, collapse spaces/special chars to underscores
function normKey(h) { return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

function csvRowToInfluencer(row) {
  // Collect numbered platform slots: Social Platform URL #1, Handle #1, Follower Count #1 … up to however many exist
  const platforms = [];
  for (let n = 1; n <= 10; n++) {
    // Accept "social_platform_url_#1", "social_platform_url_1", "social_platform_url__1" etc.
    const urlKey   = Object.keys(row).find(k => normKey(k) === normKey(`social platform url #${n}`) || normKey(k) === normKey(`social platform url ${n}`));
    const handleKey = Object.keys(row).find(k => normKey(k) === normKey(`handle #${n}`) || normKey(k) === normKey(`handle ${n}`));
    const countKey  = Object.keys(row).find(k => normKey(k) === normKey(`follower count #${n}`) || normKey(k) === normKey(`follower count ${n}`));
    const url = urlKey ? (row[urlKey] || '').trim() : '';
    if (!url) break; // slots are in order; stop at first empty URL
    const platform = PLATFORM_FROM_URL(url);
    const handle   = handleKey ? (row[handleKey] || '').trim() : '';
    const countRaw = countKey  ? (row[countKey]  || '0') : '0';
    const follower_count = parseInt(String(countRaw).replace(/[^0-9]/g, ''), 10) || 0;
    if (platform) platforms.push({ platform, url, handle, follower_count });
  }

  const typeRaw = (row['type'] || '').toLowerCase();
  const type = typeRaw.includes('ibm') || typeRaw.includes('internal') || typeRaw.includes('league')
    ? 'internal' : 'external';

  const personaRaw = row['persona'] || row['persona_group'] || 'Developer / Engineer';

  const campaigns = row['campaigns']
    ? row['campaigns'].split(/[;|]+/).map(c => c.trim()).filter(Boolean)
    : [];

  const geos = row['geos'] || row['geo'] || row['location'] || '';

  return {
    name: row['name'] || '',
    type,
    persona_group: personaRaw,
    bio: row['description'] || row['bio'] || '',
    location: geos,
    status: 'active',
    approval_status: 'pending',
    platforms,
    campaign_types: campaigns,
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

  function handleImport() {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target.result);
      const influencers = rows.map(csvRowToInfluencer).filter(i => i.name.trim());
      onImport(influencers);
    };
    reader.readAsText(file);
  }

  const expectedCols = 'Name, Type, Persona, Description, Campaigns, Geos, Social Platform URL #1, Handle #1, Follower Count #1, Social Platform URL #2, Handle #2, Follower Count #2, …';

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
      <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#57606a' }}>
        Upload a CSV with the following columns:
      </p>
      <p style={{ marginBottom: '1rem', fontSize: '0.8125rem', fontFamily: 'monospace', background: '#f7f8fa', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>
        {expectedCols}
      </p>
      <FileUploader
        labelTitle="Select CSV file"
        labelDescription="Only .csv files are accepted"
        buttonLabel="Add file"
        accept={['.csv']}
        filenameStatus="edit"
        onChange={handleFileChange}
      />
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
                <tr style={{ background: '#f7f8fa', borderBottom: '1px solid #e5e7eb' }}>
                  {['Name','Type','Persona','Platforms','Geos'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => {
                  const inf = csvRowToInfluencer(row);
                  const platformSummary = inf.platforms.length
                    ? inf.platforms.map(p => `${p.platform}${p.handle ? ` (${p.handle})` : ''}`).join(', ')
                    : '—';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '4px 8px' }}>{row['name']}</td>
                      <td style={{ padding: '4px 8px' }}>{row['type']}</td>
                      <td style={{ padding: '4px 8px' }}>{row['persona'] || row['persona_group'] || '—'}</td>
                      <td style={{ padding: '4px 8px' }}>{platformSummary}</td>
                      <td style={{ padding: '4px 8px' }}>{row['geos'] || row['geo'] || row['location'] || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#57606a' }}>
            {/* total row count shown after reading full file on import */}
            Ready to import all rows from this file.
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
        <div className="hub-card-info">
          <p className="hub-card-name">{influencer.name}</p>
          <p className="hub-card-meta">{influencer.persona_group} · {influencer.location}</p>
        </div>
        <div className="hub-card-top-actions">
          <StatusTag status={influencer.status} />
          <button
            className="hub-edit-btn"
            title="Edit influencer"
            onClick={e => { e.stopPropagation(); onEdit(influencer); }}
            aria-label={`Edit ${influencer.name}`}
          >✎</button>
        </div>
      </div>
      <div className="hub-card-tags">
        <TypeTag type={influencer.type} />
        {(influencer.platforms || []).map(p => <PlatformTag key={p.platform} platform={p.platform} />)}
      </div>
      <div className="hub-card-footer">
        <span className="hub-muted">{fmt(totalFollowers)} followers</span>
        {hasContent && <Tag type="blue" size="sm">IBM Content</Tag>}
      </div>
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

const mkItems = (opts) => opts.map(v => ({ id: v, label: v }));

const TYPE_ITEMS    = mkItems(['All Types', 'IBM Social League', 'External']);
const STATUS_ITEMS  = mkItems(['All Statuses', 'Active', 'Dormant', 'Do Not Use']);
const PLATFORM_ITEMS= mkItems(['All Platforms', 'YouTube', 'TikTok', 'Instagram', 'X', 'LinkedIn', 'Reddit']);
const APPROVAL_ITEMS= mkItems(['All Approvals', 'Approved', 'Pending', 'Declined']);
const PERSONA_ITEMS = mkItems([
  'All Personas',
  'Developer / Engineer',
  'Data & AI Specialist',
  'Cybersecurity Expert',
  'C-Suite / Executive',
  'Entrepreneur / Founder',
  'Thought Leader (Author, Speaker, Analyst)',
  'Media / Content Creator (Podcast, YouTube)',
  'Educator / Researcher',
  'Sustainability / Climate',
  'FinTech / Finance',
]);
const CONTENT_ITEMS = mkItems(['Any', 'Has IBM Content']);

const CAMPAIGN_TYPE_OPTIONS = [
  { value: '', text: 'All Campaign Types' },
  ...['AI for Business','Automation / webMethods','Cross-Geo','Granite / Developer','Hybrid Cloud','Security','Sports Survey 2025','UK Narrative']
    .map(v => ({ value: v, text: v })),
];

const EVENT_OPTIONS = [
  { value: '', text: 'All Campaigns' },
  ...['AI Summit Korea','AWS re:Invent','Dreamforce','Ferrari / F1','Gartner Data & Analytics',
     'GRAMMYs','IBM Accelerate','IBM Think','IBM TechXchange','KubeCon','Masters',
     'Mobile World Congress','NFL','NRF','NY Tech Week','SIBOS','SXSW','US Open','VivaTech','Wimbledon',
  ].map(v => ({ value: v, text: v })),
];

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="hub-filter-select">
      <label className="hub-filter-label">{label}</label>
      <select className="hub-filter-native" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.text}</option>
        ))}
      </select>
    </div>
  );
}

function LeftPanel({ influencers, selectedId, onSelect, onSearch, onFilter, filters, searchQuery, onViewFeed, onAdd, onEdit, onUploadCsv }) {
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
          <FilterSelect label="Campaigns" value={filters.events} options={EVENT_OPTIONS}
            onChange={v => onFilter('events', v)} />
          <FilterSelect label="Geo" value={filters.location} options={[
            { value: '', text: 'All Geos' },
            { value: 'Americas', text: 'Americas' },
            { value: 'UK', text: 'UK' },
            { value: 'EMEA', text: 'EMEA' },
            { value: 'India', text: 'India' },
          ]} onChange={v => onFilter('location', v)} />
        </div>

        <Button kind="ghost" size="sm" onClick={onViewFeed} className="hub-feed-btn">
          ↗ View IBM Content Feed
        </Button>
      </div>

      <div className="hub-list-header">
        <p className="hub-list-count">{influencers.length} influencer{influencers.length !== 1 ? 's' : ''}</p>
        <div className="hub-list-header-actions">
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
                  ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.handle || p.url}</a>
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
        <Button kind="primary" size="sm" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : '↻ Sync Content'}
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
                <StructuredListCell head>Title / Type</StructuredListCell>
                <StructuredListCell head>IBM Product</StructuredListCell>
                <StructuredListCell head style={{ whiteSpace: 'nowrap' }}>Date</StructuredListCell>
                <StructuredListCell head style={{ whiteSpace: 'nowrap' }}>Views</StructuredListCell>
                <StructuredListCell head style={{ whiteSpace: 'nowrap' }}>Eng. Rate</StructuredListCell>
                <StructuredListCell head style={{ whiteSpace: 'nowrap' }}>Link</StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {content.map(c => (
                <StructuredListRow key={c.id}>
                  <StructuredListCell><PlatformTag platform={c.platform} /></StructuredListCell>
                  <StructuredListCell>
                    <span style={{ fontSize: '0.875rem' }}>{c.title || c.content_type}</span>
                    {c.ibm_partner_confirmed && <Tag type="blue" size="sm" style={{ marginLeft: '0.5rem' }}>#IBMPartner</Tag>}
                  </StructuredListCell>
                  <StructuredListCell>{c.ibm_product_tag || '—'}</StructuredListCell>
                  <StructuredListCell style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.post_date)}</StructuredListCell>
                  <StructuredListCell style={{ whiteSpace: 'nowrap' }}>{fmt(c.views)}</StructuredListCell>
                  <StructuredListCell style={{ whiteSpace: 'nowrap' }}>{c.engagement_rate != null ? c.engagement_rate.toFixed(2) + '%' : '—'}</StructuredListCell>
                  <StructuredListCell>
                    <Link href={c.permalink} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: 'nowrap' }}>View ↗</Link>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      )}
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
        <Button kind="primary" size="sm" onClick={() => setOpen(v => !v)}>
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
                  <button className="hub-feedback-delete" onClick={() => handleDelete(f.id)}>Yes, delete</button>
                  <button className="hub-feedback-cancel-delete" onClick={() => setConfirmId(null)}>Cancel</button>
                </div>
              ) : (
                <button
                  className="hub-feedback-delete"
                  onClick={() => setConfirmId(f.id)}
                  aria-label="Delete feedback"
                >✕ Delete</button>
              )
            }
          </Tile>
        ))
      }
    </div>
  );
}

// ── Profile View (Right Panel) ────────────────────────────────────────────────

function ProfileView({ influencerId, localOverrides = {} }) {
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
          <div className="hub-profile-header-info">
            <h1 className="hub-profile-name">{influencer.name}</h1>
            <div className="hub-profile-badges">
              <TypeTag type={influencer.type} />
              <StatusTag status={influencer.status} />
              <ApprovalTag status={influencer.approval_status} />
              <Tag type="cool-gray" size="sm">{influencer.persona_group}</Tag>
            </div>
            <p className="hub-profile-meta">
              📍 {influencer.location} &nbsp;·&nbsp; {fmt(totalFollowers)} total followers
              {influencer.owner && <> &nbsp;·&nbsp; Owner: {influencer.owner}</>}
            </p>
          </div>
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
  { key: 'title',           label: 'Title' },
  { key: 'ibm_product_tag', label: 'IBM Product' },
  { key: 'post_date',       label: 'Date' },
  { key: 'views',           label: 'Views' },
  { key: 'engagement_rate', label: 'ER' },
  { key: null,              label: 'Link' },
];

function GlobalFeed({ onClose }) {
  const [feed, setFeed]         = useState([]);
  const [platform, setPlatform] = useState('');
  const [product, setProduct]   = useState('');
  const [sortCol, setSortCol]   = useState('post_date');
  const [sortDir, setSortDir]   = useState('desc');

  useEffect(() => {
    const p = new URLSearchParams();
    if (platform) p.set('platform', platform);
    if (product)  p.set('ibm_product', product);
    fetch(`${API}/content/feed?${p}`).then(r => r.json()).then(setFeed);
  }, [platform, product]);

  const PROD_ITEMS = mkItems(['All Products','watsonx.ai','watsonx.governance','IBM Cloud','Red Hat OpenShift','Granite 4.0']);

  function handleSort(key) {
    if (!key) return;
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  }

  const sorted = [...feed].sort((a, b) => {
    const av = a[sortCol] ?? '';
    const bv = b[sortCol] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="hub-right-panel hub-feed-view">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 className="hub-heading-lg">IBM Content Feed</h2>
        <p className="hub-muted">Every IBM-sponsored post, across all creators — {feed.length} posts</p>
      </div>

      <div className="hub-feed-filters">
        <Dropdown id="feed-platform" titleText="Platform" label="All Platforms"
          items={PLATFORM_ITEMS} itemToString={i => i?.label || ''}
          selectedItem={PLATFORM_ITEMS[0]}
          onChange={({ selectedItem }) => setPlatform(selectedItem.id === 'All Platforms' ? '' : selectedItem.id)}
          size="sm" style={{ minWidth: 180 }} />
        <Dropdown id="feed-product" titleText="IBM Product" label="All Products"
          items={PROD_ITEMS} itemToString={i => i?.label || ''}
          selectedItem={PROD_ITEMS[0]}
          onChange={({ selectedItem }) => setProduct(selectedItem.id === 'All Products' ? '' : selectedItem.id)}
          size="sm" style={{ minWidth: 200 }} />
      </div>

      {feed.length === 0
        ? <Tile className="hub-empty-tile" style={{ textAlign: 'center' }}>No posts match these filters.</Tile>
        : (
          <div className="hub-table-scroll">
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  {FEED_COLS.map(col => {
                    const active = col.key && sortCol === col.key;
                    return (
                      <StructuredListCell
                        key={col.label}
                        head
                        className={col.key ? 'hub-th-sortable' : ''}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="hub-th-inner">
                          {col.label}
                          {col.key && (
                            <svg
                              className={`hub-sort-arrow${active ? ' hub-sort-arrow--active' : ''}${active && sortDir === 'desc' ? ' hub-sort-arrow--desc' : ''}`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 10 12"
                              width="10" height="12"
                              fill="none"
                              aria-hidden="true"
                            >
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
                      <Tag type={e.influencer_type === 'internal' ? 'blue' : 'cool-gray'} size="sm">
                        {e.influencer_name}
                      </Tag>
                    </StructuredListCell>
                    <StructuredListCell><PlatformTag platform={e.platform} /></StructuredListCell>
                    <StructuredListCell style={{ maxWidth: 260 }}>{e.title || e.content_type}</StructuredListCell>
                    <StructuredListCell>{e.ibm_product_tag || '—'}</StructuredListCell>
                    <StructuredListCell style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.post_date)}</StructuredListCell>
                    <StructuredListCell>{fmt(e.views)}</StructuredListCell>
                    <StructuredListCell>{e.engagement_rate != null ? e.engagement_rate.toFixed(2) + '%' : '—'}</StructuredListCell>
                    <StructuredListCell>
                      <Link href={e.permalink} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: 'nowrap' }}>View ↗</Link>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </div>
        )
      }
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
            <FilterSelect label="Location" value={filterGeo} options={[
              { value: '', text: 'All Locations' },
              { value: 'Americas', text: 'Americas' },
              { value: 'UK', text: 'UK' },
              { value: 'EMEA', text: 'EMEA' },
              { value: 'India', text: 'India' },
            ]} onChange={v => setFilterGeo(v)} />
          </div>
        </div>
        <div className="hub-list-header">
          <p className="hub-list-count">{members.length} member{members.length !== 1 ? 's' : ''}</p>
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
                <div className="hub-card-info">
                  <p className="hub-card-name">{m.name}</p>
                  <p className="hub-card-meta">{m.title}</p>
                </div>
                <div className="hub-card-top-actions">
                  <Tag type={IDENTITY_COLORS[m.member_identity] || 'gray'} size="sm">{m.member_identity}</Tag>
                </div>
              </div>
              <div className="hub-card-footer" style={{ marginTop: '0.375rem' }}>
                <span className="hub-muted">{fmt(m.followers)} followers</span>
                <span className="hub-muted">{m.location}</span>
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
              <div className="hub-profile-header-info">
                <h1 className="hub-profile-name">{selectedMember.name}</h1>
                <div className="hub-profile-badges">
                  <Tag type={IDENTITY_COLORS[selectedMember.member_identity] || 'gray'} size="sm">
                    {selectedMember.member_identity}
                  </Tag>
                  {selectedMember.talks_about_ai === 1 && <Tag type="teal" size="sm">Talks about AI</Tag>}
                  {selectedMember.collaborate && selectedMember.collaborate !== 'No' && (
                    <Tag type="green" size="sm">Collaborate: {selectedMember.collaborate}</Tag>
                  )}
                </div>
                <p className="hub-profile-meta">
                  📍 {selectedMember.location || '—'}
                  &nbsp;·&nbsp; {fmt(selectedMember.followers)} LinkedIn followers
                </p>
              </div>
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
                    ? <a href={selectedMember.linkedin} target="_blank" rel="noopener noreferrer">View profile</a>
                    : '—'}
                </p>
              </Tile>
            </div>
            {selectedMember.w3 && (
              <div className="hub-section">
                <p className="hub-section-label">w3 Profile</p>
                <p className="hub-body-text">
                  <a href={selectedMember.w3} target="_blank" rel="noopener noreferrer">{selectedMember.w3}</a>
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
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [stats, setStats]       = useState(null);
  const [influencers, setList]  = useState([]);
  const [localOverrides, setLocalOverrides] = useState({}); // id -> patched fields
  const [selectedId, setSelected] = useState(null);
  const [searchQuery, setSearch] = useState('');
  const [filters, setFilters]   = useState({ type:'', status:'', platform:'', approval_status:'', persona_group:'', has_content:'', campaign_type:'', events:'', location:'' });
  const [showFeed, setShowFeed] = useState(false);
  const [showSocialLeague, setShowSocialLeague] = useState(false);
  const [sideNavExpanded, setSideNavExpanded] = useState(false);
  const [formModal, setFormModal] = useState({ open: false, influencer: null });
  const [csvModal, setCsvModal] = useState(false);
  const nlTimer = useRef(null);

  useEffect(() => {
    fetch(`${API}/stats`).then(r => r.json()).then(setStats);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (k === 'events') {
        if (v) params.set('event', v);
      } else if (v) {
        params.set(k, v);
      }
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

  const handleCsvImport = useCallback(async (newInfluencers) => {
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
      // Edit: store override locally (no backend edit endpoint yet)
      setLocalOverrides(prev => ({
        ...prev,
        [formModal.influencer.id]: { ...prev[formModal.influencer.id], ...formData },
      }));
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
          />
          {showFeed
            ? <GlobalFeed onClose={() => setShowFeed(false)} />
            : <ProfileView influencerId={selectedId} localOverrides={localOverrides} />
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
