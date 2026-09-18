import { useEffect, useState, useMemo } from 'react';
import {
  getReviews,
  approveReview,
  rejectReview,
  getMatch,
  getMaterial,
} from '../api/client';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Minus,
  RefreshCw,
} from 'lucide-react';

interface ReviewItem {
  review_id: string;
  match_id: string;
  source_material_id: string;
  candidate_material_id: string;
  source_description: string;
  candidate_description: string;
  source_cpse: string;
  candidate_cpse: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  reviewer: string;
  notes: string;
  confidence: number;
  created_at: string;
}

interface AttrRow {
  attribute: string;
  label: string;
  source_value: string;
  candidate_value: string;
  status: 'match' | 'mismatch' | 'missing';
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  material_type: 'Item Type',
  grade: 'Material Grade',
  diameter: 'Diameter / Size',
  length: 'Nominal Length',
  material: 'Base Material',
  standard: 'Technical Standard',
  pressure_class: 'Pressure Class',
  rating: 'Rating / Class',
  thickness: 'Thickness',
  schedule: 'Pipe Schedule',
};

export default function ReviewQueue() {
  const [allReviews, setAllReviews] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Cache of technical evidence per review_id: { attrs: AttrRow[], sourceCode: string, candCode: string, summary: string }
  const [evidenceCache, setEvidenceCache] = useState<Record<string, {
    attrs: AttrRow[];
    sourceCode: string;
    candCode: string;
    sourceDesc: string;
    candDesc: string;
    loading: boolean;
  }>>({});

  const loadReviews = () => {
    setLoading(true);
    setError('');
    getReviews('')
      .then(res => {
        setAllReviews(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to connect to review service.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReviews();
  }, []);

  // Compute live tab counts
  const counts = useMemo(() => {
    return {
      pending: allReviews.filter(r => r.status === 'pending').length,
      approved: allReviews.filter(r => r.status === 'approved').length,
      rejected: allReviews.filter(r => r.status === 'rejected').length,
      all: allReviews.length,
    };
  }, [allReviews]);

  // Filtered reviews
  const displayedReviews = useMemo(() => {
    if (!filter) return allReviews;
    return allReviews.filter(r => r.status === filter);
  }, [allReviews, filter]);

  // Load technical evidence for an expanded review case
  const loadEvidence = async (review: ReviewItem) => {
    if (evidenceCache[review.review_id]) return;

    setEvidenceCache(prev => ({
      ...prev,
      [review.review_id]: {
        attrs: [],
        sourceCode: review.source_material_id,
        candCode: review.candidate_material_id,
        sourceDesc: review.source_description,
        candDesc: review.candidate_description,
        loading: true,
      },
    }));

    try {
      let attrRows: AttrRow[] = [];
      let srcCode = review.source_material_id;
      let candCode = review.candidate_material_id;
      let srcDesc = review.source_description;
      let candDesc = review.candidate_description;

      // 1. Try getMatch from backend
      if (review.match_id) {
        try {
          const matchData = await getMatch(review.match_id);
          if (matchData?.attribute_details && matchData.attribute_details.length > 0) {
            attrRows = matchData.attribute_details.map((d: any) => ({
              attribute: d.attribute || d.label,
              label: d.label || d.attribute,
              source_value: d.source_value || '—',
              candidate_value: d.candidate_value || '—',
              status: d.status === 'match' ? 'match' : d.status === 'mismatch' ? 'mismatch' : 'missing',
            }));
          }
        } catch {}
      }

      // 2. If attribute details not in match, inspect source & candidate materials
      if (attrRows.length === 0) {
        let srcAttrs: Record<string, any> = {};
        let candAttrs: Record<string, any> = {};

        if (review.source_material_id && review.source_material_id !== 'manual-input') {
          try {
            const mSrc = await getMaterial(review.source_material_id);
            if (mSrc) {
              srcAttrs = mSrc.technical_attributes || {};
              srcCode = mSrc.original_code || mSrc.material_id;
              if (mSrc.original_description) srcDesc = mSrc.original_description;
            }
          } catch {}
        }

        if (review.candidate_material_id && review.candidate_material_id !== 'manual-input') {
          try {
            const mCand = await getMaterial(review.candidate_material_id);
            if (mCand) {
              candAttrs = mCand.technical_attributes || {};
              candCode = mCand.original_code || mCand.material_id;
              if (mCand.original_description) candDesc = mCand.original_description;
            }
          } catch {}
        }

        // Compare attributes
        const allKeys = Array.from(new Set([...Object.keys(srcAttrs), ...Object.keys(candAttrs)]));
        for (const k of allKeys) {
          const sVal = srcAttrs[k] ? String(srcAttrs[k]).trim() : '';
          const cVal = candAttrs[k] ? String(candAttrs[k]).trim() : '';
          let status: 'match' | 'mismatch' | 'missing' = 'missing';

          if (sVal && cVal) {
            status = sVal.toLowerCase() === cVal.toLowerCase() ? 'match' : 'mismatch';
          }

          attrRows.push({
            attribute: k,
            label: ATTRIBUTE_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            source_value: sVal || '—',
            candidate_value: cVal || '—',
            status,
          });
        }
      }

      setEvidenceCache(prev => ({
        ...prev,
        [review.review_id]: {
          attrs: attrRows,
          sourceCode: srcCode,
          candCode: candCode,
          sourceDesc: srcDesc || 'Description specified during AI analysis',
          candDesc: candDesc || 'Record retrieved from CPSE database',
          loading: false,
        },
      }));
    } catch {
      setEvidenceCache(prev => ({
        ...prev,
        [review.review_id]: {
          attrs: [],
          sourceCode: review.source_material_id,
          candCode: review.candidate_material_id,
          sourceDesc: review.source_description,
          candDesc: review.candidate_description,
          loading: false,
        },
      }));
    }
  };

  const toggleExpand = (review: ReviewItem) => {
    if (expandedId === review.review_id) {
      setExpandedId(null);
    } else {
      setExpandedId(review.review_id);
      loadEvidence(review);
    }
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActing(id);
    try {
      await approveReview(id, {
        reviewer: 'Engineer Sharma',
        notes: 'Verified technical compatibility and approved equivalence.',
      });
      loadReviews();
    } catch (err: any) {
      setError(err.message || 'Approval action failed.');
    } finally {
      setActing('');
    }
  };

  const handleReject = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActing(id);
    try {
      await rejectReview(id, {
        reviewer: 'Engineer Sharma',
        notes: 'Rejected — critical technical conflict or missing specification.',
      });
      loadReviews();
    } catch (err: any) {
      setError(err.message || 'Rejection action failed.');
    } finally {
      setActing('');
    }
  };

  return (
    <div className="rq-page">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <header className="rq-header">
        <span className="rq-eyebrow">HUMAN VALIDATION WORKSPACE</span>
        <h1 className="rq-title">REVIEW QUEUE</h1>
        <p className="rq-desc">
          AI recommendations that require human technical verification before harmonization.
        </p>
      </header>

      {/* ── 2. Principle Banner ────────────────────────────────────── */}
      <div className="rq-principle-banner" aria-label="Validation principle">
        <span className="rq-principle-step">AI RECOMMENDATION</span>
        <span className="rq-principle-arrow">→</span>
        <span className="rq-principle-step">TECHNICAL EVIDENCE</span>
        <span className="rq-principle-arrow">→</span>
        <span className="rq-principle-highlight">HUMAN VALIDATION</span>
        <span className="rq-principle-arrow">→</span>
        <span className="rq-principle-step">APPROVE / REJECT</span>
      </div>

      {/* ── 3. Queue Tabs ──────────────────────────────────────────── */}
      <nav className="rq-tabs-bar" aria-label="Review Queue Filter Tabs">
        <button
          className={`rq-tab ${filter === 'pending' ? 'rq-tab--active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
          <span className="rq-tab-count">{counts.pending}</span>
        </button>

        <button
          className={`rq-tab ${filter === 'approved' ? 'rq-tab--active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved
          <span className="rq-tab-count">{counts.approved}</span>
        </button>

        <button
          className={`rq-tab ${filter === 'rejected' ? 'rq-tab--active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected
          <span className="rq-tab-count">{counts.rejected}</span>
        </button>

        <button
          className={`rq-tab ${filter === '' ? 'rq-tab--active' : ''}`}
          onClick={() => setFilter('')}
        >
          All
          <span className="rq-tab-count">{counts.all}</span>
        </button>
      </nav>

      {/* ── Error Notification ─────────────────────────────────────── */}
      {error && (
        <div className="aim-alert-box aim-alert-box--fail" role="alert">
          <XCircle size={18} />
          <div className="aim-alert-content" style={{ flex: 1 }}>
            <div className="aim-alert-title">Review Queue Operation Error</div>
            <div className="aim-alert-desc">{error}</div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadReviews}
            style={{ color: '#B83232', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* ── 4. Review Queue List ───────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="skel"
              style={{ height: '88px', borderRadius: '8px', background: '#E8ECE9' }}
            />
          ))}
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="rq-empty-panel">
          <ShieldCheck size={36} style={{ color: '#087F68', marginBottom: '4px' }} />
          <h2 className="rq-empty-title">NO MATERIALS REQUIRE VALIDATION</h2>
          <p className="rq-empty-desc">
            {filter === 'pending'
              ? 'All current AI decisions have been resolved. No pending material records require human engineering verification.'
              : `No review records found in the '${filter}' queue category.`}
          </p>
        </div>
      ) : (
        <div className="rq-list" role="list">
          {displayedReviews.map(r => {
            const isExpanded = expandedId === r.review_id;
            const evidence = evidenceCache[r.review_id];
            const isPending = r.status === 'pending';
            const isActing = acting === r.review_id;

            return (
              <article
                key={r.review_id}
                className={`rq-card rq-card--${r.status}`}
                role="listitem"
              >
                {/* Collapsed Summary Row */}
                <div
                  className="rq-card-summary"
                  onClick={() => toggleExpand(r)}
                  aria-expanded={isExpanded}
                >
                  {/* Col 1: Material Pair */}
                  <div className="rq-pair-col">
                    <div className="rq-pair-nodes">
                      <div className="rq-node-chip">
                        <span className="rq-node-cpse">{r.source_cpse || 'SRC'}</span>
                        <span className="rq-node-code">{r.source_material_id}</span>
                      </div>
                      <div className="rq-pair-arrow" aria-hidden="true">
                        <ArrowRight size={13} />
                      </div>
                      <div className="rq-node-chip">
                        <span className="rq-node-cpse">{r.candidate_cpse || 'CAND'}</span>
                        <span className="rq-node-code">{r.candidate_material_id}</span>
                      </div>
                    </div>

                    <div className="rq-pair-descs">
                      <span className="rq-src-desc">
                        {r.source_description || 'Material Record Analysis'}
                      </span>
                      <span className="rq-cand-desc">
                        vs. {r.candidate_description || 'CPSE Candidate Match'}
                      </span>
                    </div>
                  </div>

                  {/* Col 2: AI Confidence */}
                  <div className="rq-conf-col">
                    <span
                      className="rq-conf-val"
                      style={{
                        color:
                          r.confidence >= 80
                            ? '#087F68'
                            : r.confidence >= 60
                            ? '#B56A00'
                            : '#7A8580',
                      }}
                    >
                      {r.confidence ? `${r.confidence.toFixed(0)}%` : '—'}
                    </span>
                    <span className="rq-conf-lbl">AI Confidence</span>
                  </div>

                  {/* Col 3: Why Review? */}
                  <div className="rq-reason-col">
                    <span className="rq-reason-lbl">WHY REVIEW?</span>
                    <span className="rq-reason-text">
                      {r.reason || 'Reason not available from analysis.'}
                    </span>
                  </div>

                  {/* Col 4: Technical Status Terminology */}
                  <div className="rq-status-col">
                    <span className={`rq-status-badge rq-status-badge--${r.status}`}>
                      {r.status === 'pending'
                        ? 'NEEDS VALIDATION'
                        : r.status === 'approved'
                        ? 'APPROVED'
                        : 'REJECTED'}
                    </span>
                  </div>

                  {/* Col 5: Quick Human Actions + Chevron */}
                  <div className="rq-summary-actions">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          className="rq-btn-quick-approve"
                          onClick={e => handleApprove(r.review_id, e)}
                          disabled={isActing}
                          title="Approve material equivalence"
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          type="button"
                          className="rq-btn-quick-reject"
                          onClick={e => handleReject(r.review_id, e)}
                          disabled={isActing}
                          title="Reject material equivalence"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="rq-btn-expand"
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpand(r);
                      }}
                      aria-label={isExpanded ? 'Collapse case details' : 'Expand case details'}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Inline Technical Evidence Workspace */}
                {isExpanded && (
                  <div className="rq-card-expanded">
                    {/* A. Source Material ↔ Candidate Material Detailed Cards */}
                    <div className="rq-detail-grid">
                      {/* Left: Source Material */}
                      <div className="rq-detail-card">
                        <div className="rq-detail-card-head">
                          <span className="rq-detail-role">SOURCE MATERIAL</span>
                          <span className="aim-cpse-badge">{r.source_cpse || 'SOURCE'}</span>
                        </div>
                        <div className="rq-detail-code">
                          CODE: {evidence?.sourceCode || r.source_material_id}
                        </div>
                        <div className="rq-detail-desc">
                          {evidence?.sourceDesc || r.source_description || 'Material Record'}
                        </div>
                      </div>

                      {/* Center Divider */}
                      <div className="aim-vs-divider" aria-hidden="true">
                        <div className="aim-vs-line" />
                        <div className="aim-vs-circle">↔</div>
                        <div className="aim-vs-line" />
                      </div>

                      {/* Right: Candidate Material */}
                      <div className="rq-detail-card">
                        <div className="rq-detail-card-head">
                          <span className="rq-detail-role">CANDIDATE MATERIAL</span>
                          <span className="aim-cpse-badge">{r.candidate_cpse || 'CANDIDATE'}</span>
                        </div>
                        <div className="rq-detail-code">
                          CODE: {evidence?.candCode || r.candidate_material_id}
                        </div>
                        <div className="rq-detail-desc">
                          {evidence?.candDesc || r.candidate_description || 'Candidate Material Record'}
                        </div>
                      </div>
                    </div>

                    {/* B. Technical Attribute Comparison Table */}
                    <div className="rq-table-wrap">
                      <div className="rq-table-head">
                        <span className="rq-table-title">TECHNICAL ATTRIBUTE COMPARISON</span>
                        <span style={{ fontFamily: 'var(--sans)', fontSize: '11.5px', color: '#7A8580' }}>
                          Physical specification verification
                        </span>
                      </div>

                      {evidence?.loading ? (
                        <div style={{ padding: '18px 24px', color: '#7A8580', fontSize: '13px' }}>
                          Loading extracted technical specifications...
                        </div>
                      ) : evidence?.attrs && evidence.attrs.length > 0 ? (
                        <table className="rq-table">
                          <thead>
                            <tr>
                              <th style={{ width: '25%' }}>ATTRIBUTE</th>
                              <th style={{ width: '32%' }}>SOURCE SPECIFICATION</th>
                              <th style={{ width: '32%' }}>CANDIDATE SPECIFICATION</th>
                              <th style={{ width: '11%' }}>STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evidence.attrs.map(row => (
                              <tr key={row.attribute}>
                                <td style={{ fontWeight: 600, color: '#17201D' }}>{row.label}</td>
                                <td className="aim-cell-mono">{row.source_value}</td>
                                <td className="aim-cell-mono">{row.candidate_value}</td>
                                <td>
                                  {row.status === 'match' ? (
                                    <span className="aim-status-badge aim-status-badge--match">
                                      <Check size={11} /> MATCH
                                    </span>
                                  ) : row.status === 'mismatch' ? (
                                    <span className="aim-status-badge aim-status-badge--conflict">
                                      <X size={11} /> MISMATCH
                                    </span>
                                  ) : (
                                    <span className="aim-status-badge aim-status-badge--missing">
                                      <Minus size={11} /> MISSING
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ padding: '16px 20px', color: '#56615C', fontSize: '12.5px' }}>
                          Attributes extracted during analysis indicate missing parameter coverage. Consult engineering specification sheet.
                        </div>
                      )}
                    </div>

                    {/* C. Why Review? (Visual Emphasis) */}
                    <div className="rq-why-box">
                      <AlertTriangle size={20} style={{ color: '#B56A00', flexShrink: 0, marginTop: 2 }} />
                      <div className="rq-why-content">
                        <span className="rq-why-title">WHY REVIEW?</span>
                        <span className="rq-why-desc">
                          {r.reason || 'Technical specification incomplete.'}
                        </span>
                        <span className="rq-why-sub">
                          Critical engineering specification requires engineer verification before harmonization. High text similarity cannot override incomplete specifications.
                        </span>
                      </div>
                    </div>

                    {/* D. AI Recommendation */}
                    <div className="rq-recommend-box">
                      <div className="rq-recommend-left">
                        <span className="rq-recommend-lbl">AI RECOMMENDATION</span>
                        <span className="rq-recommend-val">NEEDS VALIDATION</span>
                        <span className="rq-recommend-sub">
                          AI confidence ({r.confidence?.toFixed(0)}%) requires human engineering sign-off. Automated harmonization is blocked.
                        </span>
                      </div>
                      <span className="rq-status-badge rq-status-badge--pending">
                        HUMAN SIGN-OFF REQUIRED
                      </span>
                    </div>

                    {/* E. Human Decision (Action Bar) */}
                    <div className="rq-decision-bar">
                      <span className="rq-decision-title">HUMAN DECISION</span>

                      {isPending ? (
                        <div className="rq-decision-actions">
                          <button
                            type="button"
                            className="rq-btn-approve-lg"
                            onClick={e => handleApprove(r.review_id, e)}
                            disabled={isActing}
                          >
                            <CheckCircle2 size={16} /> APPROVE MATCH
                          </button>
                          <button
                            type="button"
                            className="rq-btn-reject-lg"
                            onClick={e => handleReject(r.review_id, e)}
                            disabled={isActing}
                          >
                            <XCircle size={16} /> REJECT MATCH
                          </button>
                        </div>
                      ) : (
                        <div className="rq-audit-resolved">
                          <span
                            className={`rq-status-badge rq-status-badge--${r.status}`}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {r.status === 'approved' ? 'Equivalence Approved' : 'Equivalence Rejected'}
                          </span>
                          {r.reviewer && (
                            <span>
                              by <strong>{r.reviewer}</strong>
                            </span>
                          )}
                          {r.created_at && (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#7A8580' }}>
                              ({new Date(r.created_at).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
