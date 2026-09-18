import { useEffect, useState } from 'react';
import { getMaterials, getCategories, getCpses } from '../api/client';
import { Search, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react';

interface TechnicalAttributes {
  [key: string]: any;
}

interface MaterialItem {
  material_id: string;
  cpse: string;
  original_code: string;
  original_description: string;
  normalized_description?: string;
  category?: string;
  technical_attributes?: TechnicalAttributes;
  status: string;
  uom?: string;
  created_at?: string;
}

export default function MaterialMaster() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cpse, setCpse] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [cpses, setCpses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MaterialItem | null>(null);
  const pageSize = 20;

  const loadMaterials = () => {
    setLoading(true);
    getMaterials({
      page: String(page),
      page_size: String(pageSize),
      search,
      cpse,
      category,
      status,
    })
      .then(res => {
        setMaterials(res.materials || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMaterials();
  }, [page, cpse, category, status]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getCpses().then(setCpses).catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadMaterials();
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const hasActiveFilters = Boolean(search || cpse || category || status);

  const resetFilters = () => {
    setSearch('');
    setCpse('');
    setCategory('');
    setStatus('');
    setPage(1);
  };

  // Helper for CPSE Badge
  const getCpseBadge = (c: string) => {
    const upper = (c || '').toUpperCase();
    let modifier = 'mm-cpse-badge--generic';
    if (upper.includes('NTPC')) modifier = 'mm-cpse-badge--ntpc';
    else if (upper.includes('BHEL')) modifier = 'mm-cpse-badge--bhel';
    else if (upper.includes('ONGC')) modifier = 'mm-cpse-badge--ongc';

    return <span className={`mm-cpse-badge ${modifier}`}>{c}</span>;
  };

  // Helper for Status Badge
  const getStatusBadge = (s: string) => {
    const norm = (s || '').toLowerCase();
    let modifier = 'mm-status-badge--unprocessed';
    let label = 'Unprocessed';

    if (norm === 'matched') {
      modifier = 'mm-status-badge--match';
      label = 'Matched';
    } else if (norm === 'review' || norm === 'needs_validation') {
      modifier = 'mm-status-badge--review';
      label = 'Review';
    } else if (norm === 'no_match') {
      modifier = 'mm-status-badge--nomatch';
      label = 'No Match';
    }

    return <span className={`mm-status-badge ${modifier}`}>{label}</span>;
  };

  // Format key specs string compactly
  const formatKeySpecs = (attrs?: TechnicalAttributes) => {
    if (!attrs || Object.keys(attrs).length === 0) return '—';
    const entries = Object.entries(attrs);
    const parts = entries
      .slice(0, 3)
      .map(([, v]) => String(v).trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '—';
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="mm-page">
      {/* ── Page Header (Left-aligned) ── */}
      <header className="mm-header">
        <div className="mm-eyebrow">
          <span className="mm-eyebrow-dot" />
          SOURCE DATA LAYER
        </div>
        <h1 className="mm-title">MATERIAL MASTER</h1>
        <p className="mm-subtitle">
          {total} records across {cpses.length || 3} CPSEs
        </p>
      </header>

      {/* ── Search + Filter Bar ── */}
      <div className="mm-controls-bar">
        {/* Search */}
        <div className="mm-search-wrap">
          <Search size={15} className="mm-search-icon" />
          <input
            type="text"
            className="mm-search-input"
            placeholder="Search materials..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="mm-search-clear"
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* CPSE Filter */}
        <select
          className="mm-select"
          value={cpse}
          onChange={e => {
            setCpse(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by CPSE"
        >
          <option value="">All CPSEs</option>
          {cpses.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          className="mm-select"
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by Category"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="mm-select"
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by Status"
        >
          <option value="">All Statuses</option>
          <option value="matched">Matched</option>
          <option value="review">Review</option>
          <option value="no_match">No Match</option>
          <option value="unprocessed">Unprocessed</option>
        </select>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="mm-reset-btn"
            onClick={resetFilters}
            title="Reset all filters"
          >
            <X size={13} />
            Reset
          </button>
        )}
      </div>

      {/* ── Table Container ── */}
      <div className="mm-table-container">
        <div className="mm-table-scroll">
          <table className="mm-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>CPSE</th>
                <th style={{ width: '150px' }}>CODE</th>
                <th>DESCRIPTION</th>
                <th style={{ width: '140px' }}>CATEGORY</th>
                <th style={{ width: '220px' }}>KEY SPECS</th>
                <th style={{ width: '110px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td>
                      <div className="skel" style={{ height: 20, width: 50, borderRadius: 4 }} />
                    </td>
                    <td>
                      <div className="skel" style={{ height: 16, width: 110, borderRadius: 4 }} />
                    </td>
                    <td>
                      <div className="skel" style={{ height: 16, width: '85%', borderRadius: 4 }} />
                    </td>
                    <td>
                      <div className="skel" style={{ height: 16, width: 80, borderRadius: 4 }} />
                    </td>
                    <td>
                      <div className="skel" style={{ height: 16, width: 140, borderRadius: 4 }} />
                    </td>
                    <td>
                      <div className="skel" style={{ height: 20, width: 70, borderRadius: 4 }} />
                    </td>
                  </tr>
                ))
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div className="mm-empty-box">
                      <h3 className="mm-empty-title">NO MATERIAL RECORDS FOUND</h3>
                      <p className="mm-empty-desc">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                materials.map(m => (
                  <tr
                    key={m.material_id}
                    className="mm-row"
                    onClick={() => setDetail(m)}
                    title="Click to view material details"
                  >
                    <td className="mm-cell-cpse">{getCpseBadge(m.cpse)}</td>
                    <td className="mm-cell-code">{m.original_code}</td>
                    <td className="mm-cell-desc">
                      <div className="mm-desc-text" title={m.original_description}>
                        {m.original_description}
                      </div>
                    </td>
                    <td className="mm-cell-category">{m.category || '—'}</td>
                    <td className="mm-cell-specs" title={formatKeySpecs(m.technical_attributes)}>
                      {formatKeySpecs(m.technical_attributes)}
                    </td>
                    <td className="mm-cell-status">{getStatusBadge(m.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && total > 0 && (
          <div className="mm-pagination">
            <div className="mm-pagination-info">
              Showing <strong>{startRecord}–{endRecord}</strong> of <strong>{total}</strong>
            </div>
            <div className="mm-pagination-actions">
              <button
                type="button"
                className="mm-page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                className="mm-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slideout Detail Panel ── */}
      {detail && (
        <>
          <div
            className="mm-detail-overlay"
            onClick={() => setDetail(null)}
            aria-label="Close drawer backdrop"
          />
          <aside className="mm-detail-drawer" aria-label="Material Details">
            <div className="mm-drawer-header">
              <span className="mm-drawer-title">Material Detail</span>
              <button
                type="button"
                className="mm-drawer-close"
                onClick={() => setDetail(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mm-drawer-body">
              {/* Badges */}
              <div className="mm-drawer-badges">
                {getCpseBadge(detail.cpse)}
                {getStatusBadge(detail.status)}
                {detail.category && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#56615C',
                      background: '#F2F2EF',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {detail.category}
                  </span>
                )}
              </div>

              {/* Code & Description */}
              <div>
                <div className="mm-drawer-code">{detail.original_code}</div>
                <div className="mm-drawer-desc">{detail.original_description}</div>
              </div>

              {/* Normalized Description */}
              {detail.normalized_description && (
                <div>
                  <div className="mm-drawer-section-label">Normalized Description</div>
                  <div className="mm-normalized-box">{detail.normalized_description}</div>
                </div>
              )}

              {/* Technical Attributes Table */}
              {detail.technical_attributes &&
                Object.keys(detail.technical_attributes).length > 0 && (
                  <div>
                    <div className="mm-drawer-section-label">Technical Attributes</div>
                    <table className="mm-spec-table">
                      <tbody>
                        {Object.entries(detail.technical_attributes).map(([k, v]) => (
                          <tr key={k}>
                            <td className="mm-spec-key">
                              {k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </td>
                            <td className="mm-spec-val">{String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Primary Action Button */}
              <button
                type="button"
                className="mm-drawer-action-btn"
                onClick={() => {
                  setDetail(null);
                  window.location.href = '/matching';
                }}
              >
                Run AI Match
                <ArrowRight size={14} />
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

