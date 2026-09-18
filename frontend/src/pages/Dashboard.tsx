import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Upload,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { getAnalytics } from '../api/client';

interface ActivityItem {
  action: string;
  material_id: string;
  user: string;
  details: string;
  decision: string;
  timestamp: string;
}

interface AnalyticsData {
  total_materials: number;
  potential_duplicates: number;
  harmonized_identities: number;
  pending_reviews: number;
  no_match_count: number;
  match_rate: number;
  harmonization_rate: number;
  by_cpse: { name: string; count: number }[];
  by_category: { name: string; count: number }[];
  by_decision: { name: string; count: number }[];
  recent_activity: ActivityItem[];
  insights: string[];
}

function formatRelativeTime(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60 && diffMins >= 0) return `${Math.max(diffMins, 1)}m ago`;
    if (diffHours < 24 && diffHours >= 0) return `${diffHours}h ago`;
    if (diffDays < 7 && diffDays >= 0) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return isoStr;
  }
}

function formatActionLabel(action: string): string {
  switch (action) {
    case 'material_analyzed':
      return 'Material Analyzed';
    case 'review_completed':
    case 'review_updated':
      return 'Review Updated';
    case 'identity_created':
      return 'Identity Created';
    case 'match_approved':
      return 'Match Approved';
    case 'match_rejected':
      return 'Match Rejected';
    case 'data_imported':
      return 'Material Imported';
    default:
      return action
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

function getActivityBadgeClass(action: string): string {
  switch (action) {
    case 'material_analyzed':
      return 'overview-act-badge--analyzed';
    case 'match_approved':
      return 'overview-act-badge--approved';
    case 'identity_created':
      return 'overview-act-badge--identity';
    case 'review_completed':
    case 'review_updated':
      return 'overview-act-badge--review';
    case 'data_imported':
      return 'overview-act-badge--import';
    default:
      return 'overview-act-badge--import';
  }
}

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(res => {
        if (res) setData(res);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const matchCount = data?.potential_duplicates ?? 0;
  const validationCount = data?.pending_reviews ?? 0;
  const noMatchCount = data?.no_match_count ?? 0;
  const totalDecisions = matchCount + validationCount + noMatchCount;

  const matchPct = totalDecisions > 0 ? (matchCount / totalDecisions) * 100 : 33.3;
  const validationPct = totalDecisions > 0 ? (validationCount / totalDecisions) * 100 : 33.3;
  const noMatchPct = totalDecisions > 0 ? (noMatchCount / totalDecisions) * 100 : 33.4;

  return (
    <div className="overview-page">

      {/* ── 1. PAGE HEADER ───────────────────────────────────── */}
      <header className="overview-header">
        <span className="overview-header__eyebrow">
          MATERIAL INTELLIGENCE OVERVIEW
        </span>
        <h1 className="overview-header__title">
          Material Harmonization at a Glance
        </h1>
        <p className="overview-header__desc">
          Monitor fragmented CPSE material records, AI matching decisions, technical validation and standardized material identities.
        </p>
      </header>

      {/* ── 2. PRIMARY ACTION: ANALYZE A MATERIAL ────────────── */}
      <section className="overview-engine-panel" aria-label="Analyze a Material">
        {/* Left Column: Actions & Description */}
        <div className="overview-engine-left">
          <h2 className="overview-engine-headline">
            ANALYZE A MATERIAL
          </h2>
          <p className="overview-engine-desc">
            Compare a material description against existing CPSE records and generate an explainable harmonization decision.
          </p>
          <div className="overview-engine-actions">
            <button
              className="overview-btn-primary"
              onClick={() => navigate('/matching')}
              id="overview-btn-analyze"
            >
              START AI ANALYSIS <ArrowRight size={14} />
            </button>
            <button
              className="overview-btn-secondary"
              onClick={() => navigate('/import')}
              id="overview-btn-import"
            >
              <Upload size={14} /> IMPORT MATERIAL DATA
            </button>
          </div>
        </div>

        {/* Right Column: Balanced Engineering Workflow Progression */}
        <div className="overview-workflow" aria-label="Harmonization sequence">
          <div className="overview-wf-track">
            <div className="overview-wf-step overview-wf-step--1">
              <div className="overview-wf-node overview-wf-node--1">01</div>
              <span className="overview-wf-label overview-wf-label--1">Material Record</span>
            </div>

            <div className="overview-wf-line overview-wf-line--1" aria-hidden="true" />

            <div className="overview-wf-step overview-wf-step--2">
              <div className="overview-wf-node overview-wf-node--2">02</div>
              <span className="overview-wf-label overview-wf-label--2">AI Analysis</span>
            </div>

            <div className="overview-wf-line overview-wf-line--2" aria-hidden="true" />

            <div className="overview-wf-step overview-wf-step--3">
              <div className="overview-wf-node overview-wf-node--3">03</div>
              <span className="overview-wf-label overview-wf-label--3">Technical Validation</span>
            </div>

            <div className="overview-wf-line overview-wf-line--3" aria-hidden="true" />

            <div className="overview-wf-step overview-wf-step--4">
              <div className="overview-wf-node overview-wf-node--4">04</div>
              <span className="overview-wf-label overview-wf-label--4">Decision</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HARMONIZATION STATUS ──────────────────────────── */}
      <section className="overview-harmonization-panel" aria-label="Harmonization Status">
        <div className="overview-harmonization-head">
          <span className="overview-section-title">HARMONIZATION STATUS</span>
        </div>

        {/* Continuous Segmented Indicator across the 3 states */}
        <div className="overview-distribution-track" aria-hidden="true">
          <div
            className="overview-track-seg overview-track-seg--match"
            style={{ width: `${matchPct}%` }}
            title={`Match: ${matchCount}`}
          />
          <div
            className="overview-track-seg overview-track-seg--validation"
            style={{ width: `${validationPct}%` }}
            title={`Needs Validation: ${validationCount}`}
          />
          <div
            className="overview-track-seg overview-track-seg--nomatch"
            style={{ width: `${noMatchPct}%` }}
            title={`No Match: ${noMatchCount}`}
          />
        </div>

        <div className="overview-harmonization-cols">
          {/* MATCH */}
          <div className="overview-harm-col">
            <div className="overview-harm-badge overview-harm-badge--match">
              <span className="overview-harm-dot overview-harm-dot--match" />
              MATCH
            </div>
            <div className="overview-harm-count">
              {loading ? '–' : matchCount}
            </div>
            <div className="overview-harm-sub">
              Equivalent / technically compatible
            </div>
          </div>

          {/* NEEDS VALIDATION */}
          <div className="overview-harm-col">
            <div className="overview-harm-badge overview-harm-badge--validation">
              <span className="overview-harm-dot overview-harm-dot--validation" />
              NEEDS VALIDATION
            </div>
            <div className="overview-harm-count">
              {loading ? '–' : validationCount}
            </div>
            <div className="overview-harm-sub">
              Requires human validation
            </div>
          </div>

          {/* NO MATCH */}
          <div className="overview-harm-col">
            <div className="overview-harm-badge overview-harm-badge--nomatch">
              <span className="overview-harm-dot overview-harm-dot--nomatch" />
              NO MATCH
            </div>
            <div className="overview-harm-count">
              {loading ? '–' : noMatchCount}
            </div>
            <div className="overview-harm-sub">
              Technical constraint / incompatible
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. MATERIAL INTELLIGENCE SNAPSHOT ─────────────────── */}
      <section className="overview-snapshot-strip" aria-label="Material Intelligence Snapshot">
        <div className="overview-snapshot-cell">
          <span className="overview-snapshot-cell-val">
            {loading ? '–' : (data?.total_materials ?? 0)}
          </span>
          <span className="overview-snapshot-cell-label">TOTAL MATERIAL RECORDS</span>
        </div>

        <div className="overview-snapshot-cell">
          <span className="overview-snapshot-cell-val">
            {loading ? '–' : (data?.harmonized_identities ?? 0)}
          </span>
          <span className="overview-snapshot-cell-label">STANDARDIZED MATERIAL IDENTITIES</span>
        </div>

        <div className="overview-snapshot-cell">
          <span className="overview-snapshot-cell-val">
            {loading ? '–' : (data?.pending_reviews ?? 0)}
          </span>
          <span className="overview-snapshot-cell-label">MATERIALS REQUIRING REVIEW</span>
        </div>

        <div className="overview-snapshot-cell">
          <span className="overview-snapshot-cell-val">
            {loading ? '–' : (data?.by_cpse?.length ?? 0)}
          </span>
          <span className="overview-snapshot-cell-label">CPSEs / SOURCES CONNECTED</span>
        </div>
      </section>

      {/* ── 5. RECENT ACTIVITY (SYSTEM LOG LEDGER) ───────────── */}
      <section className="overview-activity-panel" aria-label="Recent Activity">
        <div className="overview-activity-head">
          <span className="overview-section-title">RECENT ACTIVITY</span>
          <button
            className="overview-activity-action"
            onClick={() => navigate('/audit')}
            id="overview-link-audit"
          >
            View Full Audit Trail <ExternalLink size={12} />
          </button>
        </div>

        <div className="overview-activity-body">
          {loading ? (
            <div className="overview-empty">
              <div className="overview-empty-desc">Loading activity...</div>
            </div>
          ) : !data?.recent_activity || data.recent_activity.length === 0 ? (
            <div className="overview-empty">
              <Clock size={18} style={{ color: '#9BA49F', marginBottom: 4 }} />
              <div className="overview-empty-title">NO RECENT ACTIVITY YET</div>
              <div className="overview-empty-desc">
                System events and audit records will appear here as materials are analyzed and harmonized.
              </div>
            </div>
          ) : (
            data.recent_activity.slice(0, 5).map((act, idx) => (
              <div key={idx} className="overview-act-row">
                <span className={`overview-act-badge ${getActivityBadgeClass(act.action)}`}>
                  {formatActionLabel(act.action)}
                </span>
                <span className="overview-act-actor">
                  {act.user || 'System'}
                </span>
                <div className="overview-act-detail" title={act.details}>
                  {act.material_id && (
                    <span className="overview-act-id">{act.material_id}</span>
                  )}
                  <span className="overview-act-text">{act.details}</span>
                </div>
                <span className="overview-act-time">
                  {formatRelativeTime(act.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
