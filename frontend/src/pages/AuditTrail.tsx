import { useEffect, useState, useMemo } from 'react';
import { getAudit } from '../api/client';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  User,
  Cpu,
  Hash,
  AlertCircle,
} from 'lucide-react';

interface AuditItem {
  id: number;
  action: string;
  action_label: string;
  material_id: string;
  user: string;
  details: string;
  decision: string;
  timestamp: string;
}

const ACTION_LABELS: Record<string, string> = {
  material_analyzed: 'MATERIAL ANALYZED',
  match_approved: 'MATCH APPROVED',
  match_rejected: 'MATCH REJECTED',
  identity_created: 'IDENTITY CREATED',
  review_requested: 'REVIEW REQUESTED',
  review_completed: 'REVIEW COMPLETED',
  dataset_imported: 'DATASET IMPORTED',
  material_updated: 'MATERIAL UPDATED',
};

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedActor, setSelectedActor] = useState('ALL');
  const [selectedDecision, setSelectedDecision] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Expansion state
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Ensure scroll position is reset to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadData = () => {
    setLoading(true);
    setError(false);
    getAudit(200)
      .then(res => {
        setEntries(res || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute real metrics from loaded data
  const metrics = useMemo(() => {
    const total = entries.length;
    const aiCount = entries.filter(
      e => e.user === 'System' || e.user?.toLowerCase().includes('system') || e.user?.toLowerCase().includes('ai')
    ).length;
    const humanCount = total - aiCount;
    const decisionsCount = entries.filter(e => e.decision && e.decision.trim() !== '').length;

    return {
      total,
      aiCount,
      humanCount,
      decisionsCount,
    };
  }, [entries]);

  // Unique actions list from real entries
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.action) set.add(e.action);
    });
    return Array.from(set);
  }, [entries]);

  // Filtering
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Action filter
      if (selectedAction !== 'ALL' && entry.action !== selectedAction) {
        return false;
      }

      // Actor filter
      if (selectedActor === 'AI') {
        const isAI = entry.user === 'System' || entry.user?.toLowerCase().includes('system');
        if (!isAI) return false;
      } else if (selectedActor === 'HUMAN') {
        const isAI = entry.user === 'System' || entry.user?.toLowerCase().includes('system');
        if (isAI) return false;
      }

      // Decision filter
      if (selectedDecision !== 'ALL') {
        if (selectedDecision === 'NONE') {
          if (entry.decision && entry.decision.trim() !== '') return false;
        } else if (entry.decision?.toLowerCase() !== selectedDecision.toLowerCase()) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matMatch = entry.material_id?.toLowerCase().includes(q);
        const detMatch = entry.details?.toLowerCase().includes(q);
        const usrMatch = entry.user?.toLowerCase().includes(q);
        const actMatch = (ACTION_LABELS[entry.action] || entry.action_label || entry.action)
          .toLowerCase()
          .includes(q);
        const decMatch = entry.decision?.toLowerCase().includes(q);

        if (!matMatch && !detMatch && !usrMatch && !actMatch && !decMatch) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedAction, selectedActor, selectedDecision, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAction, selectedActor, selectedDecision]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const toggleRow = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAction('ALL');
    setSelectedActor('ALL');
    setSelectedDecision('ALL');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedAction !== 'ALL' ||
    selectedActor !== 'ALL' ||
    selectedDecision !== 'ALL';

  // Format date & time cleanly
  const formatTimestamp = (ts: string) => {
    if (!ts) return { date: '—', time: '' };
    try {
      const d = new Date(ts);
      const date = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      return { date, time };
    } catch {
      return { date: ts, time: '' };
    }
  };

  const formatDecisionBadge = (decision: string) => {
    if (!decision) return <span className="audit-muted-dash">—</span>;
    const d = decision.toLowerCase();
    if (d === 'match') {
      return <span className="audit-badge audit-badge--match">MATCH</span>;
    }
    if (d === 'review') {
      return <span className="audit-badge audit-badge--review">REVIEW</span>;
    }
    if (d === 'no_match' || d === 'no match') {
      return <span className="audit-badge audit-badge--nomatch">NO MATCH</span>;
    }
    return <span className="audit-badge audit-badge--neutral">{decision.toUpperCase()}</span>;
  };

  return (
    <div className="audit-page">
      {/* ── Page Header (Left Aligned, Full Breathing Space) ── */}
      <header className="audit-header">
        <h1 className="audit-title">AUDIT TRAIL</h1>
        <p className="audit-subtitle">
          Trace material changes, AI decisions, validations, and harmonization activity across the system.
        </p>
      </header>

      {/* ── Top Summary Strip (Technical Status Line, Real Values Only) ── */}
      {!loading && !error && (
        <div className="audit-summary-strip" aria-label="Audit Events Summary">
          <div className="audit-summary-item">
            <span className="audit-summary-label">TOTAL EVENTS</span>
            <span className="audit-summary-val">{metrics.total}</span>
          </div>
          <span className="audit-summary-sep" aria-hidden="true">·</span>
          <div className="audit-summary-item">
            <span className="audit-summary-label">AI ACTIONS</span>
            <span className="audit-summary-val">{metrics.aiCount}</span>
          </div>
          <span className="audit-summary-sep" aria-hidden="true">·</span>
          <div className="audit-summary-item">
            <span className="audit-summary-label">HUMAN ACTIONS</span>
            <span className="audit-summary-val">{metrics.humanCount}</span>
          </div>
          <span className="audit-summary-sep" aria-hidden="true">·</span>
          <div className="audit-summary-item">
            <span className="audit-summary-label">DECISIONS RECORDED</span>
            <span className="audit-summary-val">{metrics.decisionsCount}</span>
          </div>
        </div>
      )}

      {/* ── Filter & Search Control Bar ── */}
      <div className="audit-filter-bar">
        {/* Search input */}
        <div className="audit-search-wrap">
          <Search size={15} className="audit-search-icon" />
          <input
            type="text"
            className="audit-search-input"
            placeholder="Search audit events by material, details, actor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="audit-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Filter */}
        <div className="audit-filter-select-wrap">
          <select
            className="audit-filter-select"
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            aria-label="Filter by action"
          >
            <option value="ALL">All Actions ({entries.length})</option>
            {availableActions.map(action => (
              <option key={action} value={action}>
                {ACTION_LABELS[action] || action.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Actor Filter */}
        <div className="audit-filter-select-wrap">
          <select
            className="audit-filter-select"
            value={selectedActor}
            onChange={e => setSelectedActor(e.target.value)}
            aria-label="Filter by actor"
          >
            <option value="ALL">All Actors</option>
            <option value="AI">AI Engine ({metrics.aiCount})</option>
            <option value="HUMAN">Human Engineers ({metrics.humanCount})</option>
          </select>
        </div>

        {/* Decision Filter */}
        <div className="audit-filter-select-wrap">
          <select
            className="audit-filter-select"
            value={selectedDecision}
            onChange={e => setSelectedDecision(e.target.value)}
            aria-label="Filter by decision"
          >
            <option value="ALL">All Decisions</option>
            <option value="match">Match</option>
            <option value="review">Review</option>
            <option value="no_match">No Match</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {isFiltered && (
          <button
            type="button"
            className="audit-clear-btn"
            onClick={clearFilters}
            title="Reset all filters"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Main Content Area: Audit Table ── */}
      <div className="audit-table-card">
        {loading ? (
          /* Loading Table Skeleton */
          <div className="audit-skeleton-table">
            <div className="audit-skeleton-row audit-skeleton-header" />
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="audit-skeleton-row" />
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="audit-state-box">
            <AlertCircle size={24} className="audit-state-icon audit-state-icon--error" />
            <h3 className="audit-state-title">UNABLE TO LOAD AUDIT TRAIL</h3>
            <p className="audit-state-desc">
              Failed to retrieve audit log entries from the MaterialDNA backend.
            </p>
            <button type="button" className="audit-retry-btn" onClick={loadData}>
              <RefreshCw size={13} style={{ marginRight: 6 }} />
              Retry Connection
            </button>
          </div>
        ) : entries.length === 0 ? (
          /* Zero Total Entries */
          <div className="audit-state-box">
            <Layers size={24} className="audit-state-icon" />
            <h3 className="audit-state-title">NO AUDIT EVENTS</h3>
            <p className="audit-state-desc">No material activity has been recorded yet.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          /* Filtered Zero Results */
          <div className="audit-state-box">
            <Search size={22} className="audit-state-icon" />
            <h3 className="audit-state-title">NO MATCHING EVENTS</h3>
            <p className="audit-state-desc">Try changing your search terms or filter selections.</p>
            <button type="button" className="audit-retry-btn" onClick={clearFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          /* Primary Technical Audit Table */
          <>
            <div className="audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>TIMESTAMP</th>
                    <th style={{ width: '180px' }}>ACTION</th>
                    <th style={{ width: '160px' }}>MATERIAL / TARGET</th>
                    <th>CHANGE / DETAILS</th>
                    <th style={{ width: '110px' }}>DECISION</th>
                    <th style={{ width: '140px' }}>ACTOR</th>
                    <th style={{ width: '44px', textAlign: 'center' }} aria-label="Expand"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map(entry => {
                    const isExpanded = expandedId === entry.id;
                    const { date, time } = formatTimestamp(entry.timestamp);
                    const isAI =
                      entry.user === 'System' || entry.user?.toLowerCase().includes('system');
                    const actionLabel =
                      ACTION_LABELS[entry.action] ||
                      entry.action_label ||
                      entry.action.replace(/_/g, ' ').toUpperCase();

                    return (
                      <tr
                        key={entry.id}
                        className={`audit-row ${isExpanded ? 'audit-row--expanded' : ''}`}
                        onClick={() => toggleRow(entry.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleRow(entry.id);
                          }
                        }}
                      >
                        {/* 1. Timestamp */}
                        <td className="audit-col-time">
                          <div className="audit-time-date">{date}</div>
                          <div className="audit-time-clock">{time}</div>
                        </td>

                        {/* 2. Action */}
                        <td className="audit-col-action">
                          <span className="audit-action-label">{actionLabel}</span>
                        </td>

                        {/* 3. Material / Target */}
                        <td className="audit-col-mat">
                          {entry.material_id ? (
                            <span className="audit-mat-code" title={entry.material_id}>
                              {entry.material_id}
                            </span>
                          ) : (
                            <span className="audit-scope-tag">System Scope</span>
                          )}
                        </td>

                        {/* 4. Change / Details */}
                        <td className="audit-col-details" title={entry.details}>
                          <div className="audit-details-text">{entry.details}</div>
                        </td>

                        {/* 5. Decision */}
                        <td className="audit-col-decision">
                          {formatDecisionBadge(entry.decision)}
                        </td>

                        {/* 6. Actor */}
                        <td className="audit-col-actor">
                          {isAI ? (
                            <span className="audit-actor audit-actor--system">
                              <span className="audit-actor-dot" aria-hidden="true" />
                              <Cpu size={12} style={{ marginRight: 4 }} />
                              AI Engine
                            </span>
                          ) : (
                            <span className="audit-actor audit-actor--human">
                              <span className="audit-actor-dot" aria-hidden="true" />
                              <User size={12} style={{ marginRight: 4 }} />
                              {entry.user}
                            </span>
                          )}
                        </td>

                        {/* 7. Row Toggle Chevron */}
                        <td className="audit-col-toggle">
                          <button
                            type="button"
                            className="audit-toggle-btn"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse event' : 'Expand event details'}
                            onClick={e => {
                              e.stopPropagation();
                              toggleRow(entry.id);
                            }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inline Detail Expansion Rendered Below Active Row */}
            {expandedId !== null && (
              <div className="audit-expansion-panel" aria-label="Event Details">
                {(() => {
                  const item = entries.find(e => e.id === expandedId);
                  if (!item) return null;
                  const { date, time } = formatTimestamp(item.timestamp);
                  const isAI = item.user === 'System' || item.user?.toLowerCase().includes('system');

                  return (
                    <div className="audit-drawer-content">
                      <div className="audit-drawer-header">
                        <div className="audit-drawer-id">
                          <Hash size={13} style={{ marginRight: 4, color: '#16856F' }} />
                          EVENT ID: <strong>LOG-{String(item.id).padStart(4, '0')}</strong>
                        </div>
                        <button
                          type="button"
                          className="audit-drawer-close"
                          onClick={() => setExpandedId(null)}
                          title="Close details"
                        >
                          <X size={14} />
                          Close
                        </button>
                      </div>

                      <div className="audit-drawer-grid">
                        <div className="audit-drawer-col">
                          <span className="audit-drawer-label">TIMESTAMP</span>
                          <span className="audit-drawer-val">
                            {date} at {time}
                          </span>
                        </div>

                        <div className="audit-drawer-col">
                          <span className="audit-drawer-label">ACTION TYPE</span>
                          <span className="audit-drawer-val">
                            {ACTION_LABELS[item.action] || item.action}
                          </span>
                        </div>

                        <div className="audit-drawer-col">
                          <span className="audit-drawer-label">TARGET MATERIAL</span>
                          <span className="audit-drawer-val font-mono">
                            {item.material_id || 'System Scope (No specific material ID)'}
                          </span>
                        </div>

                        <div className="audit-drawer-col">
                          <span className="audit-drawer-label">ACTOR</span>
                          <span className="audit-drawer-val">
                            {isAI ? 'AI Engine (Automated Execution)' : `Human Engineer (${item.user})`}
                          </span>
                        </div>

                        {item.decision && (
                          <div className="audit-drawer-col">
                            <span className="audit-drawer-label">DECISION RESULT</span>
                            <span className="audit-drawer-val">
                              {formatDecisionBadge(item.decision)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="audit-drawer-message">
                        <div className="audit-drawer-label">EVENT LOG DETAILS</div>
                        <div className="audit-drawer-log-box">
                          <code>{item.details}</code>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Table Footer: Compact Pagination & Count ── */}
            <div className="audit-pagination-bar">
              <span className="audit-pagination-info">
                Showing{' '}
                <strong>
                  {Math.min(filteredEntries.length, (currentPage - 1) * pageSize + 1)}–
                  {Math.min(filteredEntries.length, currentPage * pageSize)}
                </strong>{' '}
                of <strong>{filteredEntries.length}</strong> events
              </span>

              {totalPages > 1 && (
                <div className="audit-pagination-controls">
                  <button
                    type="button"
                    className="audit-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <span className="audit-page-indicator">
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    className="audit-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    title="Next page"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
