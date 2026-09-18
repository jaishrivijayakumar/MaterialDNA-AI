import { useEffect, useState, useMemo } from 'react';
import { getIdentities, getCategories, getMaterials } from '../api/client';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Fingerprint,
  Layers,
  ArrowRight,
  FileCheck,
  Clock,
  Tag,
} from 'lucide-react';

interface MaterialItem {
  material_id: string;
  cpse: string;
  original_code: string;
  original_description: string;
  category?: string;
  technical_attributes?: Record<string, any>;
}

interface IdentityItem {
  identity_id: string;
  standardized_code: string;
  category: string;
  attributes: Record<string, any>;
  linked_materials: string[];
  cpse_codes: Record<string, string>;
  linked_count: number;
  status: string;
  created_at?: string;
}

// ── Technical Convergence SVG Diagram ──
function ConvergenceDiagram({ count }: { count: number }) {
  const n = Math.max(1, Math.min(count, 6));

  // Calculate percentage vertical positions for each CPSE line
  const positions = useMemo(() => {
    if (n === 1) return [50];
    const margin = 16;
    const available = 100 - margin * 2;
    const step = available / (n - 1);
    return Array.from({ length: n }, (_, i) => margin + i * step);
  }, [n]);

  const midY = 50;
  const turnX = 46;
  const arrowEndX = 92;

  return (
    <div className="dna-convergence-column" aria-hidden="true">
      <svg
        className="dna-convergence-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="dna-arrow"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-flow"
          >
            <path d="M 0 1 L 6 4 L 0 7 z" className="dna-arrow-head" />
          </marker>
        </defs>

        {/* Ingress engineering lines from CPSE items */}
        {positions.map((y, idx) => (
          <path
            key={idx}
            d={`M 0 ${y} L ${turnX} ${y} L ${turnX} ${midY}`}
            className="dna-line-path"
          />
        ))}

        {/* Egress trunk line to Standardized Identity */}
        <path
          d={`M ${turnX} ${midY} L ${arrowEndX} ${midY}`}
          className="dna-line-path dna-line-path--active"
          markerEnd="url(#dna-arrow)"
        />

        {/* Small engineering connector nodes */}
        {positions.map((y, idx) => (
          <circle
            key={`node-${idx}`}
            cx="2"
            cy={y}
            r="2.5"
            fill="#087F68"
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        ))}

        {/* Convergence junction point */}
        <circle
          cx={turnX}
          cy={midY}
          r="3"
          fill="#087F68"
          stroke="#FFFFFF"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export default function MaterialDNA() {
  const [identities, setIdentities] = useState<IdentityItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [materialsMap, setMaterialsMap] = useState<Record<string, MaterialItem>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load live data from real APIs
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [identitiesRes, categoriesRes, materialsRes] = await Promise.all([
          getIdentities(),
          getCategories().catch(() => []),
          getMaterials({ page_size: '100' }).catch(() => ({ materials: [] })),
        ]);

        if (!isMounted) return;

        setIdentities(identitiesRes || []);
        setCategories(categoriesRes || []);

        // Build quick lookup map of materials by ID and by code
        const map: Record<string, MaterialItem> = {};
        if (materialsRes?.materials) {
          materialsRes.materials.forEach((m: MaterialItem) => {
            if (m.material_id) map[m.material_id] = m;
            if (m.original_code) map[m.original_code] = m;
          });
        }
        setMaterialsMap(map);
      } catch (err) {
        console.error('Failed to load MaterialDNA data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute real summary numbers
  const totalLinkedCPSE = useMemo(() => {
    return identities.reduce((acc, curr) => {
      const count = curr.linked_count || curr.linked_materials?.length || Object.keys(curr.cpse_codes || {}).length;
      return acc + count;
    }, 0);
  }, [identities]);

  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    identities.forEach(i => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats);
  }, [identities]);

  // Filtering
  const filteredIdentities = useMemo(() => {
    return identities.filter(identity => {
      // Category filter
      if (selectedCategory !== 'ALL' && identity.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      // Check standardized code
      if (identity.standardized_code.toLowerCase().includes(q)) return true;

      // Check category
      if (identity.category?.toLowerCase().includes(q)) return true;

      // Check CPSE codes
      const cpseMatches = Object.entries(identity.cpse_codes || {}).some(
        ([cpse, code]) => cpse.toLowerCase().includes(q) || String(code).toLowerCase().includes(q)
      );
      if (cpseMatches) return true;

      // Check linked materials descriptions from map
      const descMatches = (identity.linked_materials || []).some(id => {
        const mat = materialsMap[id];
        return mat?.original_description?.toLowerCase().includes(q);
      });
      if (descMatches) return true;

      return false;
    });
  }, [identities, selectedCategory, searchQuery, materialsMap]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Helper to format CPSE record details
  const getCpseBadgeClass = (cpse: string) => {
    const upper = cpse.toUpperCase();
    if (upper.includes('NTPC')) return 'dna-cpse-badge--ntpc';
    if (upper.includes('BHEL')) return 'dna-cpse-badge--bhel';
    if (upper.includes('ONGC')) return 'dna-cpse-badge--ongc';
    return 'dna-cpse-badge--generic';
  };

  return (
    <div className="dna-page">
      {/* ── Page Header (Left-aligned) ── */}
      <header className="dna-header">
        <div className="dna-eyebrow">
          <span className="dna-eyebrow-dot" />
          MATERIAL HARMONIZATION EXPLORER
        </div>
        <h1 className="dna-title">MATERIALDNA</h1>
        <div className="dna-headline">
          One technical identity across fragmented CPSE records.
        </div>
        <p className="dna-description">
          Explore how material records from different CPSEs are linked to a common, verified technical identity.
        </p>

        {/* Compact Summary Strip (Real backend values only) */}
        {!loading && identities.length > 0 && (
          <div className="dna-summary-strip">
            <span className="dna-summary-item">
              <strong>{identities.length}</strong> IDENTITIES
            </span>
            <span className="dna-summary-sep">·</span>
            <span className="dna-summary-item">
              <strong>{totalLinkedCPSE}</strong> CPSE RECORDS
            </span>
            <span className="dna-summary-sep">·</span>
            <span className="dna-summary-item">
              <strong>{activeCategories.length || categories.length}</strong> CATEGORIES
            </span>
          </div>
        )}
      </header>

      {/* ── Search & Category Controls ── */}
      <div className="dna-controls">
        <div className="dna-search-wrap">
          <Search size={17} className="dna-search-icon" />
          <input
            type="text"
            className="dna-search-input"
            placeholder="Search material identity or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="dna-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Compact Category Pills */}
        <div className="dna-categories-bar" role="tablist" aria-label="Filter by Category">
          <button
            type="button"
            className={`dna-cat-pill ${selectedCategory === 'ALL' ? 'dna-cat-pill--active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            All
            <span className="dna-cat-count">({identities.length})</span>
          </button>
          {(activeCategories.length > 0 ? activeCategories : categories).map(cat => {
            const count = identities.filter(i => i.category.toLowerCase() === cat.toLowerCase()).length;
            return (
              <button
                key={cat}
                type="button"
                className={`dna-cat-pill ${selectedCategory.toLowerCase() === cat.toLowerCase() ? 'dna-cat-pill--active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
                {count > 0 && <span className="dna-cat-count">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section Title: STANDARDIZED MATERIAL IDENTITIES ── */}
      <div className="dna-section-header">
        <h2 className="dna-section-title">
          STANDARDIZED MATERIAL IDENTITIES
          {!loading && (
            <span className="dna-section-badge">
              {filteredIdentities.length} {filteredIdentities.length === 1 ? 'RECORD' : 'RECORDS'}
            </span>
          )}
        </h2>
      </div>

      {/* ── Main Content Area ── */}
      {loading ? (
        <div className="dna-identity-list">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="skel"
              style={{ height: 210, borderRadius: 8, background: '#FFFFFF', border: '1px solid #D7DDD9' }}
            />
          ))}
        </div>
      ) : identities.length === 0 ? (
        /* Empty State: Zero Identities */
        <div className="dna-empty-box">
          <div className="dna-empty-icon">
            <Fingerprint size={24} />
          </div>
          <h3 className="dna-empty-title">NO STANDARDIZED MATERIAL IDENTITIES</h3>
          <p className="dna-empty-desc">
            No verified harmonized material identities are currently available.
          </p>
        </div>
      ) : filteredIdentities.length === 0 ? (
        /* Empty State: Search / Filter No Match */
        <div className="dna-empty-box">
          <div className="dna-empty-icon">
            <Search size={22} />
          </div>
          <h3 className="dna-empty-title">NO MATCHING MATERIAL IDENTITIES</h3>
          <p className="dna-empty-desc">
            Try a different material identity, code or description.
          </p>
        </div>
      ) : (
        /* Primary Identities List */
        <div className="dna-identity-list">
          {filteredIdentities.map(identity => {
            const isExpanded = expandedId === identity.identity_id;

            // Resolve linked records
            const linkedMaterialIds = identity.linked_materials || [];
            const cpseEntries = Object.entries(identity.cpse_codes || {});

            // Create structured records list
            interface LinkedRecordInfo {
              id: string;
              cpse: string;
              code: string;
              description: string;
              attributes?: Record<string, any>;
            }

            const records: LinkedRecordInfo[] = [];

            if (linkedMaterialIds.length > 0) {
              linkedMaterialIds.forEach(matId => {
                const mat = materialsMap[matId];
                if (mat) {
                  records.push({
                    id: mat.material_id,
                    cpse: mat.cpse || 'CPSE',
                    code: mat.original_code || mat.material_id,
                    description: mat.original_description || 'Material specification record',
                    attributes: mat.technical_attributes,
                  });
                } else {
                  // Find CPSE if available from cpse_codes
                  const foundCpse = Object.keys(identity.cpse_codes || {}).find(
                    c => identity.cpse_codes[c] === matId
                  );
                  records.push({
                    id: matId,
                    cpse: foundCpse || 'CPSE',
                    code: matId,
                    description: 'Linked CPSE material record',
                  });
                }
              });
            } else if (cpseEntries.length > 0) {
              cpseEntries.forEach(([cpse, code]) => {
                const mat = materialsMap[code];
                records.push({
                  id: code,
                  cpse,
                  code,
                  description: mat?.original_description || 'Linked CPSE material record',
                  attributes: mat?.technical_attributes,
                });
              });
            }

            const recordCount = records.length;
            const attributesList = Object.entries(identity.attributes || {});

            return (
              <article
                key={identity.identity_id}
                className={`dna-card ${isExpanded ? 'dna-card--expanded' : ''}`}
                id={`identity-${identity.identity_id}`}
              >
                {/* ── Top Bar: Harmonization Statement ── */}
                <div className="dna-card-topbar">
                  <div className="dna-harmonization-statement">
                    <Layers size={14} className="dna-statement-icon" />
                    <span>
                      {recordCount} CPSE {recordCount === 1 ? 'RECORD' : 'RECORDS'} → 1 MATERIAL IDENTITY
                    </span>
                  </div>

                  <div className="dna-card-topbar-meta">
                    <span className="dna-identity-id-tag">ID: {identity.identity_id}</span>
                    <button
                      type="button"
                      className="dna-expand-btn"
                      onClick={() => toggleExpand(identity.identity_id)}
                      aria-expanded={isExpanded}
                      title={isExpanded ? 'Collapse details' : 'Expand technical details'}
                    >
                      {isExpanded ? (
                        <>
                          Hide Details <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          View Specification <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Main Hero Row: Many CPSE Records → Convergence → Standardized Identity ── */}
                <div className="dna-card-body">
                  {/* Left Column: Fragmented CPSE Records */}
                  <div className="dna-cpse-column">
                    <div className="dna-column-caption">
                      Fragmented CPSE Records ({recordCount})
                    </div>
                    {records.map((rec, idx) => (
                      <div key={`${rec.cpse}-${rec.code}-${idx}`} className="dna-cpse-record-item">
                        <div className="dna-cpse-record-main">
                          <div className="dna-cpse-meta-row">
                            <span className={`dna-cpse-badge ${getCpseBadgeClass(rec.cpse)}`}>
                              {rec.cpse}
                            </span>
                            <span className="dna-cpse-code" title={rec.code}>
                              {rec.code}
                            </span>
                          </div>
                          <div className="dna-cpse-desc" title={rec.description}>
                            {rec.description}
                          </div>
                        </div>
                        <span className="dna-connector-node" />
                      </div>
                    ))}
                  </div>

                  {/* Middle Column: Technical Convergence Diagram */}
                  <ConvergenceDiagram count={recordCount} />

                  {/* Right Column: Standardized Identity Hero Anchor */}
                  <div className="dna-identity-column">
                    <div className="dna-column-caption">Standardized Material Identity</div>
                    <div className="dna-identity-anchor-card">
                      <div className="dna-anchor-eyebrow">
                        <span className="dna-anchor-label">Verified MaterialDNA</span>
                        <span className="dna-anchor-status">
                          <Check size={12} strokeWidth={2.5} />
                          HARMONIZED
                        </span>
                      </div>

                      <div className="dna-anchor-code-row">
                        <div className="dna-anchor-code" title={identity.standardized_code}>
                          {identity.standardized_code}
                        </div>
                        {identity.category && (
                          <span className="dna-anchor-category">
                            <Tag size={11} style={{ marginRight: 4 }} />
                            {identity.category}
                          </span>
                        )}
                      </div>

                      <div className="dna-anchor-footer">
                        <span className="dna-anchor-ratio">
                          {recordCount} CPSE {recordCount === 1 ? 'record' : 'records'} → 1 verified identity
                        </span>
                        <button
                          type="button"
                          className="dna-anchor-toggle"
                          onClick={() => toggleExpand(identity.identity_id)}
                        >
                          {isExpanded ? 'Close' : 'Details'}
                          <ArrowRight size={13} style={{ marginLeft: 2 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Inline Expansion Drawer: Technical Specification & Audit ── */}
                {isExpanded && (
                  <div className="dna-details-drawer">
                    {/* 1. Technical Specification Engineering Table */}
                    <div>
                      <div className="dna-drawer-section-title">
                        <FileCheck size={14} color="#087F68" />
                        TECHNICAL SPECIFICATION
                      </div>

                      {attributesList.length > 0 ? (
                        <table className="dna-spec-table">
                          <thead>
                            <tr>
                              <th>ATTRIBUTE</th>
                              <th>VALUE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attributesList.map(([key, val]) => {
                              const label = key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, c => c.toUpperCase());
                              const displayVal =
                                val !== null && val !== undefined && String(val).trim() !== ''
                                  ? String(val)
                                  : null;

                              return (
                                <tr key={key}>
                                  <td className="dna-attr-name">{label}</td>
                                  <td className="dna-attr-value">
                                    {displayVal ? (
                                      displayVal
                                    ) : (
                                      <span className="dna-spec-empty-val">Not specified</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <table className="dna-spec-table">
                          <thead>
                            <tr>
                              <th>ATTRIBUTE</th>
                              <th>VALUE</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="dna-attr-name">Specification</td>
                              <td className="dna-attr-value">
                                <span className="dna-spec-empty-val">Not specified</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* 2. Full Linked CPSE Source Records */}
                    <div>
                      <div className="dna-drawer-section-title">
                        <Layers size={14} color="#087F68" />
                        LINKED CPSE SOURCE RECORDS
                      </div>
                      <div className="dna-expanded-records-grid">
                        {records.map((rec, i) => (
                          <div key={i} className="dna-source-card">
                            <div className="dna-source-head">
                              <span className={`dna-cpse-badge ${getCpseBadgeClass(rec.cpse)}`}>
                                {rec.cpse}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--mono)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#17201D',
                                }}
                              >
                                {rec.code}
                              </span>
                            </div>
                            <div className="dna-source-desc">{rec.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Harmonization Provenance & Audit Metadata */}
                    <div className="dna-drawer-meta-strip">
                      <div className="dna-meta-col">
                        <span>Harmonization:</span>
                        <strong>
                          {recordCount} CPSE {recordCount === 1 ? 'record' : 'records'} → 1 verified identity
                        </strong>
                      </div>
                      <div className="dna-meta-col">
                        <span>Identity Identifier:</span>
                        <code style={{ fontFamily: 'var(--mono)', color: '#087F68' }}>
                          {identity.identity_id}
                        </code>
                      </div>
                      {identity.created_at && (
                        <div className="dna-meta-col">
                          <Clock size={13} style={{ color: '#7A8580' }} />
                          <span>Created:</span>
                          <strong>{new Date(identity.created_at).toLocaleDateString()}</strong>
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
