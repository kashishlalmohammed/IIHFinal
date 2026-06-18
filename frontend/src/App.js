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
  Search, Button, Dropdown, Tag, Modal,
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

function scoreColor(s) {
  if (s >= 8.5) return '#24a148';
  if (s >= 7.0) return '#0f62fe';
  if (s >= 5.0) return '#f1c21b';
  return '#da1e28';
}

function scoreLabel(s) {
  if (s >= 8.5) return 'Strong — activate for next campaign';
  if (s >= 7.0) return 'Good — worth re-engaging';
  if (s >= 5.0) return 'Moderate — evaluate case by case';
  return 'Low — do not re-engage';
}

// ── Score Ring (SVG) ──────────────────────────────────────────────────────────

function ScoreRing({ score, size = 48, fontSize = 13, animate = false }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((score || 0) / 10) * circ;
  const color = scoreColor(score || 0);
  // Force CSS animation to restart by remounting via a key tied to the score
  const [animKey, setAnimKey] = useState(0);
  const prevScore = useRef(null);

  useEffect(() => {
    if (animate && score !== prevScore.current) {
      prevScore.current = score;
      setAnimKey(k => k + 1);
    }
  }, [animate, score]);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0e0e0" strokeWidth={5} />
      <circle
        key={animate ? animKey : undefined}
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={circ - fill}
        style={animate ? {
          animation: `hub-ring-draw 1.6s cubic-bezier(0, 0, 0.2, 1) forwards`,
          '--ring-from': circ,
          '--ring-to': circ - fill,
        } : undefined}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform:'rotate(90deg)', transformOrigin:'50% 50%',
          fill: color, fontSize: `${fontSize}px`, fontWeight: 600, fontFamily: 'IBM Plex Sans, sans-serif' }}>
        {score != null ? score.toFixed(1) : '—'}
      </text>
    </svg>
  );
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
  if (!stats) return (
    <div className="hub-stats-bar">
      {[...Array(5)].map((_, i) => <Tile key={i} className="hub-stat-tile"><Loading small withOverlay={false} /></Tile>)}
    </div>
  );
  const cells = [
    { label: 'Total Influencers', value: stats.total },
    { label: 'Active',            value: stats.active },
    { label: 'Approved',          value: stats.approved },
    { label: 'Avg Score',         value: stats.avgScore },
    { label: 'With IBM Content',  value: stats.withContent },
  ];
  return (
    <div className="hub-stats-bar">
      {cells.map(c => (
        <Tile key={c.label} className="hub-stat-tile">
          <p className="hub-stat-value">{c.value}</p>
          <p className="hub-stat-label">{c.label}</p>
        </Tile>
      ))}
    </div>
  );
}

// ── Influencer Card (Carbon Tile) ─────────────────────────────────────────────

function InfluencerCard({ influencer, selected, onClick }) {
  const totalFollowers = (influencer.platforms || []).reduce((s, p) => s + (p.follower_count || 0), 0);
  const hasContent = influencer.content?.length > 0;

  return (
    <Tile
      id={`card-${influencer.id}`}
      className={`hub-influencer-tile ${selected ? 'hub-influencer-tile--selected' : ''}`}
      onClick={onClick}
    >
      <div className="hub-card-top">
        <ScoreRing score={influencer.score?.composite} size={48} fontSize={11} />
        <div className="hub-card-info">
          <p className="hub-card-name">{influencer.name}</p>
          <p className="hub-card-meta">{influencer.persona_group} · {influencer.location}</p>
        </div>
        <StatusTag status={influencer.status} />
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
  { value: '', text: 'All Events' },
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

function LeftPanel({ influencers, selectedId, onSelect, onSearch, onFilter, filters, searchQuery, onViewFeed }) {
  return (
    <div className="hub-left-panel">
      <div className="hub-filters">
        <Search
          id="influencer-search"
          size="lg"
          labelText="Search"
          placeholder='e.g. "watsonx developer"'
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
        <p className="hub-search-hint">Search by name, platform, or IBM product</p>

        <div className="hub-filter-grid">
          <FilterSelect label="Type" value={filters.type} options={[
            { value:'', text:'All Types' },
            { value:'internal', text:'IBM Social League' },
            { value:'external', text:'External' },
          ]} onChange={v => onFilter('type', v)} />
          <FilterSelect label="Status" value={filters.status} options={[
            { value:'', text:'All Statuses' },
            { value:'active', text:'Active' },
            { value:'dormant', text:'Dormant' },
            { value:'dnu', text:'Do Not Use' },
          ]} onChange={v => onFilter('status', v)} />
          <FilterSelect label="Platform" value={filters.platform} options={[
            { value:'', text:'All Platforms' },
            ...['YouTube','TikTok','Instagram','X','LinkedIn','Reddit'].map(p => ({ value:p, text:p })),
          ]} onChange={v => onFilter('platform', v)} />
          <FilterSelect label="Approval" value={filters.approval_status} options={[
            { value:'', text:'All Approvals' },
            { value:'approved', text:'Approved' },
            { value:'pending', text:'Pending' },
            { value:'declined', text:'Declined' },
          ]} onChange={v => onFilter('approval_status', v)} />
          <FilterSelect label="Persona" value={filters.persona_group} options={[
            { value:'', text:'All Personas' },
            ...['Developer / Engineer','Data & AI Specialist','Cybersecurity Expert','C-Suite / Executive','Entrepreneur / Founder','Thought Leader (Author, Speaker, Analyst)','Media / Content Creator (Podcast, YouTube)','Educator / Researcher','Sustainability / Climate','FinTech / Finance'].map(p => ({ value:p, text:p })),
          ]} onChange={v => onFilter('persona_group', v)} />
          <FilterSelect label="IBM Content" value={filters.has_content} options={[
            { value:'', text:'Any' },
            { value:'true', text:'Has IBM Content' },
          ]} onChange={v => onFilter('has_content', v)} />
          <FilterSelect label="Campaign Type" value={filters.campaign_type} options={CAMPAIGN_TYPE_OPTIONS}
            onChange={v => onFilter('campaign_type', v)} />
          <FilterSelect label="Events" value={filters.events} options={EVENT_OPTIONS}
            onChange={v => onFilter('events', v)} />
        </div>

        <Button kind="ghost" size="sm" onClick={onViewFeed} className="hub-feed-btn">
          ↗ View Global #IBMPartner Feed
        </Button>
      </div>

      <p className="hub-list-count">{influencers.length} influencer{influencers.length !== 1 ? 's' : ''}</p>

      <div className="hub-card-list">
        {influencers.length === 0 && (
          <div className="hub-empty-list">
            <p>No influencers match these filters.</p>
          </div>
        )}
        {influencers.map(inf => (
          <InfluencerCard key={inf.id} influencer={inf}
            selected={selectedId === inf.id} onClick={() => onSelect(inf.id)} />
        ))}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ influencer, onRequestRate }) {
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
              <p className="hub-platform-handle">{p.handle}</p>
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

      <div className="hub-section hub-meta-row">
        <Tile className="hub-meta-tile">
          <p className="hub-section-label">Relationship Owner</p>
          <p className="hub-body-text">{influencer.owner || '—'}</p>
        </Tile>
        <Tile className="hub-meta-tile">
          <p className="hub-section-label">Last Collaborated</p>
          <p className="hub-body-text">{influencer.last_collaborated || '—'}</p>
        </Tile>
      </div>

      {influencer.type === 'external' && (
        <div style={{ marginTop: '1rem' }}>
          <Button kind="tertiary" size="sm" onClick={onRequestRate}>
            Request Rate Information
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Scorecard Tab ─────────────────────────────────────────────────────────────

function ScorecardTab({ influencer }) {
  const s = influencer.score || {};
  const isInternal = influencer.type === 'internal';

  const metrics = [
    { label: 'Engagement Rate',           value: s.engagement_score, weight: isInternal ? '40%' : '35%' },
    { label: 'Reach / Impressions',       value: s.reach_score,      weight: isInternal ? '30%' : '25%' },
    { label: 'Content Quality & Brand Fit', value: s.quality_score,  weight: '20%' },
    !isInternal && { label: 'Cost Efficiency (CPE)', value: s.cost_score, weight: '20%' },
    isInternal  && { label: 'Advocacy Consistency',  value: s.advocacy_score, weight: '10%' },
  ].filter(Boolean);

  function barColor(v) {
    if (v >= 8.5) return '#24a148';
    if (v >= 7.0) return '#0f62fe';
    if (v >= 5.0) return '#f1c21b';
    return '#da1e28';
  }

  return (
    <div className="hub-tab-content">
      <div className="hub-scorecard-layout">
        <div className="hub-score-hero">
          <ScoreRing score={s.composite} size={120} fontSize={22} animate />
          <p className="hub-score-label" style={{ color: scoreColor(s.composite || 0) }}>
            {scoreLabel(s.composite || 0)}
          </p>
        </div>
        <div className="hub-metrics">
          {metrics.map(m => (
            <div key={m.label} className="hub-metric-bar">
              <div className="hub-metric-header">
                <span className="hub-metric-label">{m.label} <span className="hub-muted">({m.weight})</span></span>
                <span className="hub-muted">{m.value != null ? m.value.toFixed(1) + ' / 10' : 'N/A'}</span>
              </div>
              <div className="hub-progress-track">
                {m.value != null && (
                  <div className="hub-progress-fill"
                    style={{ width: `${(m.value / 10) * 100}%`, background: barColor(m.value) }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="hub-methodology">
        <summary>Scoring methodology</summary>
        <div className="hub-methodology-body">
          Raw follower counts are excluded. Engagement Rate = interactions ÷ reach, normalized against peer group.
          Reach is indexed to peer average. Content Quality uses watsonx sentiment on comments + IBM alignment.
          {isInternal ? ' Internal creators use Advocacy Consistency instead of CPE.' : ' CPE = cost per engagement vs. IBM benchmark.'}
          <br /><br />
          <strong>Thresholds:</strong> 8.5–10 Strong · 7.0–8.4 Good · 5.0–6.9 Moderate · &lt;5.0 Low
        </div>
      </details>
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
                  <StructuredListCell style={{ whiteSpace: 'nowrap' }}>{c.post_date}</StructuredListCell>
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
  const all = influencer.feedback || [];
  const campaign = all.filter(f => f.team === 'campaign');
  const devrel   = all.filter(f => f.team === 'devrel');

  const Section = ({ title, items }) => (
    <div className="hub-section">
      <p className="hub-section-label">{title}</p>
      {items.length === 0
        ? <p className="hub-muted" style={{ fontStyle: 'italic' }}>No {title.toLowerCase()} feedback logged.</p>
        : items.map(f => (
          <Tile key={f.id} className="hub-feedback-tile">
            <div className="hub-feedback-header">
              <span className="hub-feedback-author">{f.author}</span>
              <span className="hub-muted">{f.created_at}</span>
            </div>
            <p className="hub-body-text" style={{ marginTop: '0.25rem' }}>{f.body}</p>
          </Tile>
        ))
      }
    </div>
  );

  return (
    <div className="hub-tab-content">
      <Section title="Campaign Team" items={campaign} />
      <Section title="IBM Developer Relations" items={devrel} />
    </div>
  );
}

// ── Profile View (Right Panel) ────────────────────────────────────────────────

function ProfileView({ influencerId }) {
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [rateOpen, setRateOpen]     = useState(false);
  const [rate, setRate]             = useState(null);

  useEffect(() => {
    if (!influencerId) { setInfluencer(null); return; }
    setLoading(true);
    fetch(`${API}/influencers/${influencerId}`)
      .then(r => r.json())
      .then(d => { setInfluencer(d); setLoading(false); });
  }, [influencerId]);

  async function fetchRate() {
    const r = await fetch(`${API}/influencers/${influencerId}/rate`);
    const d = await r.json();
    setRate(d.rate);
    setRateOpen(true);
  }

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
          <ScoreRing score={influencer.score?.composite} size={80} fontSize={18} />
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
            <Tab>Scorecard</Tab>
            <Tab>Past IBM Content</Tab>
            <Tab>Feedback</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              <OverviewTab influencer={influencer} onRequestRate={fetchRate} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <ScorecardTab influencer={influencer} />
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

      {/* Gated rate modal */}
      <Modal open={rateOpen} onRequestClose={() => setRateOpen(false)}
        modalHeading="Rate Information" passiveModal size="xs">
        <p className="hub-muted">Previously quoted rate for <strong>{influencer.name}</strong>:</p>
        <p className="hub-rate-value">{rate || '—'}</p>
        <p className="hub-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Confirm with the relationship owner before re-engaging.
        </p>
      </Modal>
    </div>
  );
}

// ── Global Feed ───────────────────────────────────────────────────────────────

function GlobalFeed({ onClose }) {
  const [feed, setFeed]     = useState([]);
  const [platform, setPlatform] = useState('');
  const [product, setProduct]   = useState('');

  useEffect(() => {
    const p = new URLSearchParams();
    if (platform) p.set('platform', platform);
    if (product)  p.set('ibm_product', product);
    fetch(`${API}/content/feed?${p}`).then(r => r.json()).then(setFeed);
  }, [platform, product]);

  const PROD_ITEMS = mkItems(['All Products','watsonx.ai','watsonx.governance','IBM Cloud','Red Hat OpenShift','Granite 4.0']);

  return (
    <div className="hub-right-panel hub-feed-view">
      <div className="hub-feed-header">
        <div>
          <h2 className="hub-heading-lg">#IBMPartner Global Content Feed</h2>
          <p className="hub-muted">Every IBM-sponsored post, across all creators — {feed.length} posts</p>
        </div>
        <Button kind="ghost" size="sm" onClick={onClose}>← Back to profiles</Button>
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
                  <StructuredListCell head>Creator</StructuredListCell>
                  <StructuredListCell head>Platform</StructuredListCell>
                  <StructuredListCell head>Title</StructuredListCell>
                  <StructuredListCell head>IBM Product</StructuredListCell>
                  <StructuredListCell head>Date</StructuredListCell>
                  <StructuredListCell head>Views</StructuredListCell>
                  <StructuredListCell head>ER</StructuredListCell>
                  <StructuredListCell head>Link</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {feed.map(e => (
                  <StructuredListRow key={e.id}>
                    <StructuredListCell>
                      <Tag type={e.influencer_type === 'internal' ? 'blue' : 'cool-gray'} size="sm">
                        {e.influencer_name}
                      </Tag>
                    </StructuredListCell>
                    <StructuredListCell><PlatformTag platform={e.platform} /></StructuredListCell>
                    <StructuredListCell style={{ maxWidth: 260 }}>{e.title || e.content_type}</StructuredListCell>
                    <StructuredListCell>{e.ibm_product_tag || '—'}</StructuredListCell>
                    <StructuredListCell>{e.post_date}</StructuredListCell>
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

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [stats, setStats]       = useState(null);
  const [influencers, setList]  = useState([]);
  const [selectedId, setSelected] = useState(null);
  const [searchQuery, setSearch] = useState('');
  const [filters, setFilters]   = useState({ type:'', status:'', platform:'', approval_status:'', persona_group:'', has_content:'', campaign_type:'', events:'' });
  const [showFeed, setShowFeed] = useState(false);
  const [sideNavExpanded, setSideNavExpanded] = useState(false);
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

  const handleSelect = useCallback((id) => { setSelected(id); setShowFeed(false); }, []);
  const handleFilter = useCallback((k, v) => setFilters(prev => ({ ...prev, [k]: v })), []);
  const handleViewFeed = useCallback(() => setShowFeed(true), []);

  return (
    <>
      <Header aria-label="IBM Influencer Intelligence Hub">
        <SkipToContent />
        <HeaderMenuButton aria-label="Open menu" onClick={() => setSideNavExpanded(v => !v)} isActive={sideNavExpanded} />
        <HeaderName href="#" prefix="IBM">Influencer Intelligence Hub</HeaderName>
        <HeaderNavigation aria-label="IBM Influencer Hub">
          <HeaderMenuItem isActive={!showFeed} onClick={() => setShowFeed(false)}>Influencers</HeaderMenuItem>
          <HeaderMenuItem isActive={showFeed} onClick={() => setShowFeed(true)}>#IBMPartner Feed</HeaderMenuItem>
        </HeaderNavigation>
      </Header>

      <Content className="hub-content">
        <StatsBar stats={stats} />
        <div className="hub-main">
          <LeftPanel
            influencers={influencers}
            selectedId={selectedId}
            onSelect={handleSelect}
            onSearch={setSearch}
            onFilter={handleFilter}
            filters={filters}
            searchQuery={searchQuery}
            onViewFeed={handleViewFeed}
          />
          {showFeed
            ? <GlobalFeed onClose={() => setShowFeed(false)} />
            : <ProfileView influencerId={selectedId} />
          }
        </div>
      </Content>
    </>
  );
}
