import { useState, useEffect } from 'react';
import { runMatch, getCpses, getIdentities } from '../api/client';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  Minus,
  ShieldCheck,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface PipelineStage {
  num: string;
  name: string;
  label: string;
  desc: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { num: '01', name: 'Input', label: '01 INPUT', desc: 'Read & parse CPSE record' },
  { num: '02', name: 'Normalize', label: '02 NORMALIZE', desc: 'Standardize terminology & units' },
  { num: '03', name: 'Extract', label: '03 EXTRACT', desc: 'Extract technical attributes' },
  { num: '04', name: 'Search', label: '04 SEARCH', desc: 'Cross-CPSE candidate retrieval' },
  { num: '05', name: 'Compare', label: '05 COMPARE', desc: 'Semantic & technical comparison' },
  { num: '06', name: 'Validate', label: '06 VALIDATE', desc: 'Hard engineering constraints' },
  { num: '07', name: 'Decision', label: '07 DECISION', desc: 'Explainable harmonization verdict' },
];

interface ScenarioPreset {
  id: string;
  label: string;
  desc: string;
  cpse: string;
  candidateId: string | null;
  badge: string;
  badgeType: 'match' | 'conflict' | 'missing' | 'complex';
  note: string;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: 'equivalent',
    label: 'Equivalent Fastener',
    desc: 'HEX BOLT M10 X 50 SS304',
    cpse: 'NTPC',
    candidateId: null,
    badge: 'Expected: Match',
    badgeType: 'match',
    note: 'Cross-CPSE equivalent fastener with terminology differences',
  },
  {
    id: 'conflict',
    label: 'Technical Conflict',
    desc: 'HEX BOLT M10 X 50 SS304',
    cpse: 'NTPC',
    candidateId: 'BH-FAST-20457',
    badge: 'Expected: No Match',
    badgeType: 'conflict',
    note: 'High text similarity, but SS304 ≠ SS316 grade conflict',
  },
  {
    id: 'missing',
    label: 'Missing Specification',
    desc: 'HEX BOLT M10 X 50 SS304',
    cpse: 'NTPC',
    candidateId: 'ONGC-BLT-8832',
    badge: 'Expected: Needs Validation',
    badgeType: 'missing',
    note: 'Candidate lacks metallurgical grade; requires validation',
  },
  {
    id: 'complex',
    label: 'Complex Format',
    desc: 'BOLT,HEX: HTS,IS1364-10.9,MC,M20,65MM',
    cpse: 'NTPC',
    candidateId: null,
    badge: 'Expected: Review',
    badgeType: 'complex',
    note: 'Dense standard specification requiring advanced normalization',
  },
];

export default function AIMatching() {
  const [desc, setDesc] = useState('');
  const [cpse, setCpse] = useState('NTPC');
  const [cpses, setCpses] = useState<string[]>([]);
  const [identities, setIdentities] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [targetCandidateId, setTargetCandidateId] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(-1);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    getCpses().then(setCpses).catch(() => {});
    getIdentities().then(setIdentities).catch(() => {});
  }, []);

  const selectPreset = (preset: ScenarioPreset) => {
    setSelectedPresetId(preset.id);
    setDesc(preset.desc);
    setCpse(preset.cpse);
    setTargetCandidateId(preset.candidateId);
    setResult(null);
    setError('');
  };

  const handleDescChange = (val: string) => {
    setDesc(val);
    setSelectedPresetId(null);
    setTargetCandidateId(null);
  };

  const analyze = async () => {
    if (!desc.trim() || running) return;

    setRunning(true);
    setResult(null);
    setError('');

    // Controlled stage animation for live SIH demonstration
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setActiveStage(i);
      await new Promise(r => setTimeout(r, 260));
    }

    try {
      const payload: any = {
        description: desc.trim(),
        cpse: cpse || undefined,
        top_k: 5,
      };

      if (targetCandidateId) {
        payload.candidate_id = targetCandidateId;
      }

      const res = await runMatch(payload);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please check backend connection.');
    } finally {
      setActiveStage(-1);
      setRunning(false);
    }
  };

  const best = result?.best_match;

  // Resolve standardized identity for a match
  const resolveStandardizedIdentity = () => {
    if (!best || best.decision !== 'match') return null;

    // Check pre-seeded identities from backend
    for (const ident of identities) {
      const linked = Array.isArray(ident.linked_materials) ? ident.linked_materials : [];
      if (
        linked.includes(best.material_id) ||
        linked.includes(best.original_code) ||
        (best.cpse && ident.cpse_codes && ident.cpse_codes[best.cpse] === best.original_code)
      ) {
        return ident.standardized_code;
      }
    }

    // Deterministic fallback based on extracted attributes
    const attrs = best.attributes || {};
    const type = (attrs.material_type || 'BOLT').toUpperCase().replace(/\s+/g, '');
    const grade = (attrs.grade || 'SS304').toUpperCase().replace(/\s+/g, '');
    const dia = (attrs.diameter || 'M10').toUpperCase().replace(/\s+/g, '');
    const len = (attrs.length || '50').replace(/[^\d]/g, '');

    return `${type.slice(0, 4)}-${grade}-${dia}${len ? `-${len}` : ''}`;
  };

  const standardizedCode = resolveStandardizedIdentity();

  return (
    <div className="aim-page">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <header className="aim-header">
        <span className="aim-eyebrow">ENGINEERING AI WORKSPACE</span>
        <h1 className="aim-title">AI MATERIAL MATCHING</h1>
        <p className="aim-desc">
          Determine whether two material records represent the same technical identity through deterministic normalization, specification extraction, and hard engineering constraint checks.
        </p>
      </header>

      {/* ── 2. Analyze Material Input Panel ────────────────────────── */}
      <section className="aim-input-panel" aria-label="Analyze Material Input">
        <h2 className="aim-input-headline">ANALYZE MATERIAL</h2>
        <p className="aim-input-subtext">
          Enter a material description and select the source CPSE to compare it against existing material records.
        </p>

        <div className="aim-input-grid">
          <div className="aim-field">
            <label className="aim-field-label" htmlFor="aim-input-desc">
              Material Description
            </label>
            <input
              id="aim-input-desc"
              className="aim-input"
              type="text"
              placeholder="e.g. HEX BOLT M10 X 50 SS304"
              value={desc}
              onChange={e => handleDescChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              disabled={running}
            />
          </div>

          <div className="aim-field">
            <label className="aim-field-label" htmlFor="aim-select-cpse">
              Source CPSE
            </label>
            <select
              id="aim-select-cpse"
              className="aim-select"
              value={cpse}
              onChange={e => setCpse(e.target.value)}
              disabled={running}
            >
              <option value="">Any</option>
              {cpses.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            id="aim-btn-submit"
            className="aim-btn-primary"
            onClick={analyze}
            disabled={running || !desc.trim()}
          >
            {running ? (
              <>
                <span className="spinner" /> EXECUTING PIPELINE...
              </>
            ) : (
              <>
                START AI ANALYSIS <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* Scenario Presets Strip */}
        <div className="aim-presets-wrap">
          <div className="aim-presets-header">
            <span className="aim-presets-title">ANALYSIS SCENARIOS:</span>
            {selectedPresetId && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSelectedPresetId(null);
                  setTargetCandidateId(null);
                  setDesc('');
                }}
                style={{ fontSize: '11px', color: '#7A8580', padding: '2px 6px' }}
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="aim-presets-grid">
            {PRESETS.map(preset => {
              const isActive = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`aim-preset-${preset.id}`}
                  className={`aim-preset-card ${isActive ? 'aim-preset-card--active' : ''}`}
                  onClick={() => selectPreset(preset)}
                  disabled={running}
                >
                  <div className="aim-preset-top">
                    <span className="aim-preset-name">{preset.label}</span>
                    <span className={`aim-preset-badge aim-preset-badge--${preset.badgeType}`}>
                      {preset.badge}
                    </span>
                  </div>
                  <span className="aim-preset-note">{preset.note}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Matching Engine Pipeline (Preview & Active State) ────── */}
      <section className="aim-engine-panel" aria-label="Matching Engine Pipeline">
        <div className="aim-engine-head">
          <div className="aim-engine-title-wrap">
            <span className="aim-engine-title">MATCHING ENGINE</span>
          </div>
          <div className="aim-engine-status">
            <span
              className={`aim-engine-status-dot ${
                running ? 'aim-engine-status-dot--active' : ''
              }`}
            />
            <span>
              {running
                ? `ACTIVE — STAGE ${activeStage + 1}/7: ${PIPELINE_STAGES[activeStage]?.name?.toUpperCase()}`
                : result
                ? 'PIPELINE RUN COMPLETED'
                : 'IDLE — READY FOR EXECUTION'}
            </span>
          </div>
        </div>

        <div className="aim-engine-track">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive = running && activeStage === idx;
            const isDone = (running && activeStage > idx) || (!running && result !== null);

            return (
              <div key={stage.num} style={{ display: 'contents' }}>
                <div className="aim-engine-step">
                  <div
                    className={`aim-engine-node ${
                      isActive
                        ? 'aim-engine-node--active'
                        : isDone
                        ? 'aim-engine-node--done'
                        : ''
                    }`}
                  >
                    {isDone && !isActive ? <Check size={14} /> : stage.num}
                  </div>
                  <span
                    className={`aim-engine-label ${
                      isActive
                        ? 'aim-engine-label--active'
                        : isDone
                        ? 'aim-engine-label--done'
                        : ''
                    }`}
                  >
                    {stage.name}
                  </span>
                </div>

                {idx < PIPELINE_STAGES.length - 1 && (
                  <div
                    className={`aim-engine-line ${
                      (running && activeStage > idx) || (!running && result !== null)
                        ? 'aim-engine-line--active'
                        : ''
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Error Notification ─────────────────────────────────────── */}
      {error && (
        <div className="aim-alert-box aim-alert-box--fail" role="alert">
          <XCircle size={18} />
          <div className="aim-alert-content">
            <div className="aim-alert-title">Matching Engine Execution Error</div>
            <div className="aim-alert-desc">{error}</div>
          </div>
        </div>
      )}

      {/* ── 4. Results Workspace (Appears after Analysis) ─────────── */}
      {result && best && (
        <div className="aim-results-workspace" id="aim-results">
          {/* A. Final Decision Banner */}
          <div
            className={`aim-decision-banner aim-decision-banner--${
              best.decision === 'match'
                ? 'match'
                : best.decision === 'no_match'
                ? 'nomatch'
                : 'review'
            }`}
          >
            {/* Decision Badge */}
            <div className="aim-decision-main">
              <div
                className={`aim-decision-badge aim-decision-badge--${
                  best.decision === 'match'
                    ? 'match'
                    : best.decision === 'no_match'
                    ? 'nomatch'
                    : 'review'
                }`}
              >
                {best.decision === 'match' ? (
                  <>
                    <CheckCircle2 size={18} /> ✓ MATCH
                  </>
                ) : best.decision === 'no_match' ? (
                  <>
                    <XCircle size={18} /> ✕ NO MATCH
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} /> ⚠ NEEDS VALIDATION
                  </>
                )}
              </div>
              <p className="aim-decision-desc">
                {best.decision === 'match'
                  ? 'Material records represent the same technical identity. Full engineering equivalence confirmed.'
                  : best.decision === 'no_match'
                  ? 'Hard engineering constraint violation. Materials cannot represent the same technical identity regardless of text similarity.'
                  : 'Incomplete technical specification detected. Requires engineering validation prior to harmonization.'}
              </p>
            </div>

            {/* Numerical Evidence Scores */}
            <div className="aim-metrics-group">
              <div className="aim-metric-box">
                <span
                  className={`aim-metric-val ${
                    best.semantic_similarity >= 80
                      ? 'aim-metric-val--high'
                      : best.semantic_similarity >= 50
                      ? 'aim-metric-val--mid'
                      : 'aim-metric-val--low'
                  }`}
                >
                  {best.semantic_similarity?.toFixed(0)}%
                </span>
                <span className="aim-metric-lbl">Semantic Sim</span>
              </div>

              <div className="aim-metric-box">
                <span
                  className={`aim-metric-val ${
                    best.attribute_score >= 80
                      ? 'aim-metric-val--high'
                      : best.attribute_score >= 50
                      ? 'aim-metric-val--mid'
                      : 'aim-metric-val--low'
                  }`}
                >
                  {best.attribute_score?.toFixed(0)}%
                </span>
                <span className="aim-metric-lbl">Attributes</span>
              </div>

              <div className="aim-metric-box">
                <span
                  className={`aim-metric-val ${
                    best.constraints_passed
                      ? 'aim-metric-val--high'
                      : 'aim-metric-val--low'
                  }`}
                >
                  {best.constraints_passed ? 'PASS' : 'FAIL'}
                </span>
                <span className="aim-metric-lbl">Constraints</span>
              </div>
            </div>

            {/* Standardized Identity Code (if match) */}
            {best.decision === 'match' && standardizedCode && (
              <div className="aim-identity-box">
                <span className="aim-identity-lbl">Standardized Material Identity</span>
                <span className="aim-identity-code">{standardizedCode}</span>
                <span className="aim-identity-sub">Harmonized CPSE Identity</span>
              </div>
            )}
          </div>

          {/* B. Source Material vs Best Candidate Layout */}
          <section className="aim-comparison-panel" aria-label="Source vs Candidate Comparison">
            <div className="aim-presets-header">
              <span className="aim-section-title">SOURCE & CANDIDATE COMPARISON</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#7A8580' }}>
                MATCH ID: {result.match_id || 'MR-SESSION'}
              </span>
            </div>

            <div className="aim-comparison-grid">
              {/* Left: Source Material */}
              <div className="aim-entity-card">
                <div className="aim-entity-head">
                  <span className="aim-entity-role">SOURCE MATERIAL</span>
                  <span className="aim-cpse-badge">{result.source?.cpse || cpse || 'CPSE'}</span>
                </div>
                <div className="aim-entity-desc">{result.source?.description || desc}</div>

                {result.source?.normalized && (
                  <div className="aim-entity-norm">
                    <span className="aim-norm-label">NORMALIZED DESCRIPTION</span>
                    <span className="aim-norm-val">{result.source.normalized}</span>
                  </div>
                )}

                {result.source?.attributes_display?.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#7A8580',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Extracted Technical Attributes
                    </span>
                    <table className="aim-entity-attrs-table">
                      <tbody>
                        {result.source.attributes_display.map((a: any) => (
                          <tr key={a.label}>
                            <td className="aim-attr-lbl">{a.label}</td>
                            <td className="aim-attr-val">{a.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Center Divider: VS */}
              <div className="aim-vs-divider" aria-hidden="true">
                <div className="aim-vs-line" />
                <div className="aim-vs-circle">VS</div>
                <div className="aim-vs-line" />
              </div>

              {/* Right: Best Candidate */}
              <div className="aim-entity-card">
                <div className="aim-entity-head">
                  <span className="aim-entity-role">BEST CANDIDATE</span>
                  <span className="aim-cpse-badge">{best.cpse || 'MATCH CANDIDATE'}</span>
                </div>
                {best.original_code && (
                  <div className="aim-entity-code">{best.original_code}</div>
                )}
                <div className="aim-entity-desc">{best.description}</div>

                {best.normalized && (
                  <div className="aim-entity-norm">
                    <span className="aim-norm-label">NORMALIZED DESCRIPTION</span>
                    <span className="aim-norm-val">{best.normalized}</span>
                  </div>
                )}

                {best.attributes_display?.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#7A8580',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Extracted Technical Attributes
                    </span>
                    <table className="aim-entity-attrs-table">
                      <tbody>
                        {best.attributes_display.map((a: any) => (
                          <tr key={a.label}>
                            <td className="aim-attr-lbl">{a.label}</td>
                            <td className="aim-attr-val">{a.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* C. Technical Attribute Comparison Table */}
          {best.attribute_details?.length > 0 && (
            <section className="aim-table-panel" aria-label="Technical Attribute Comparison">
              <div className="aim-table-head">
                <span className="aim-table-title">TECHNICAL ATTRIBUTE COMPARISON</span>
                <span className="aim-table-sub">
                  Side-by-side specification validation across critical dimensions
                </span>
              </div>
              <table className="aim-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>ATTRIBUTE</th>
                    <th style={{ width: '30%' }}>SOURCE VALUE</th>
                    <th style={{ width: '30%' }}>CANDIDATE VALUE</th>
                    <th style={{ width: '15%' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {best.attribute_details.map((d: any, idx: number) => {
                    const isMatch = d.status === 'match';
                    const isMismatch = d.status === 'mismatch';

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#17201D' }}>{d.label}</td>
                        <td className="aim-cell-mono">{d.source_value || '—'}</td>
                        <td className="aim-cell-mono">{d.candidate_value || '—'}</td>
                        <td>
                          {isMatch ? (
                            <span className="aim-status-badge aim-status-badge--match">
                              <Check size={12} /> MATCH
                            </span>
                          ) : isMismatch ? (
                            <span className="aim-status-badge aim-status-badge--conflict">
                              <X size={12} /> MISMATCH
                            </span>
                          ) : (
                            <span className="aim-status-badge aim-status-badge--missing">
                              <Minus size={12} /> MISSING
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* D. Engineering Constraint Validation */}
          <section className="aim-constraints-panel" aria-label="Engineering Constraint Checks">
            <div className="aim-constraints-head">
              <span className="aim-constraints-title">ENGINEERING CONSTRAINT CHECKS</span>
              <span className="aim-constraints-principle">
                SEMANTIC SIMILARITY SUGGESTS A MATCH. TECHNICAL CONSTRAINTS DECIDE THE MATCH.
              </span>
            </div>

            {/* Constraint Alerts */}
            {!best.constraints_passed && best.constraint_conflicts?.length > 0 && (
              <div className="aim-alert-box aim-alert-box--fail">
                <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="aim-alert-content">
                  <div className="aim-alert-title">Critical Technical Constraint Violation</div>
                  <div className="aim-alert-desc">
                    Hard engineering constraint failed. Although textual descriptions show high similarity, the physical materials are incompatible:
                  </div>
                  {best.constraint_conflicts.map((c: any, i: number) => (
                    <div key={i} className="aim-conflict-item">
                      <strong>{c.label || c.attribute}:</strong> {c.source_value} ≠ {c.candidate_value}
                    </div>
                  ))}
                  <div className="aim-conflict-rule">
                    High textual similarity cannot override a technical incompatibility.
                  </div>
                </div>
              </div>
            )}

            {best.constraints_passed && best.decision === 'match' && (
              <div className="aim-alert-box aim-alert-box--pass">
                <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="aim-alert-content">
                  <div className="aim-alert-title">All Engineering Constraints Passed</div>
                  <div className="aim-alert-desc">
                    Materials are technically compatible. Metallurgical grade, thread diameter, nominal length, and physical classifications fully align across records.
                  </div>
                </div>
              </div>
            )}

            {best.decision === 'review' && (
              <div className="aim-alert-box aim-alert-box--warning">
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="aim-alert-content">
                  <div className="aim-alert-title">Technical Validation Required</div>
                  <div className="aim-alert-desc">
                    Critical specifications are incomplete or require expert verification. Automated matching is blocked to prevent false equivalence.
                  </div>
                  {best.constraint_warnings?.map((w: any, i: number) => (
                    <div key={i} className="aim-conflict-item" style={{ background: 'rgba(181, 106, 0, 0.08)' }}>
                      <strong>{w.label || w.attribute}:</strong> {w.message || 'Specification missing in candidate record'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* E. Why This Decision? (Explainability) */}
          <section className="aim-explain-panel" aria-label="Explainability Analysis">
            <span className="aim-explain-title">WHY THIS DECISION?</span>
            {best.explanation?.summary && (
              <div className="aim-explain-summary">{best.explanation.summary}</div>
            )}
            {best.reasoning?.length > 0 && (
              <div className="aim-reasoning-list">
                {best.reasoning.map((reason: string, i: number) => (
                  <div key={i} className="aim-reasoning-item">
                    <span className="aim-reasoning-bullet">›</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* F. Other Candidates Table (if more than 1 candidate) */}
          {result.candidates?.length > 1 && (
            <section className="aim-other-candidates" aria-label="Other Candidates">
              <div className="aim-table-head">
                <span className="aim-table-title">
                  OTHER CANDIDATES ({result.candidates.length - 1})
                </span>
                <span className="aim-table-sub">
                  Alternative matches retrieved during cross-CPSE database scan
                </span>
              </div>
              <table className="aim-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>CPSE</th>
                    <th style={{ width: '18%' }}>CODE</th>
                    <th style={{ width: '45%' }}>DESCRIPTION</th>
                    <th style={{ width: '12%' }}>SIMILARITY</th>
                    <th style={{ width: '13%' }}>DECISION</th>
                  </tr>
                </thead>
                <tbody>
                  {result.candidates.slice(1, 6).map((c: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <span className="aim-cpse-badge">{c.cpse || '—'}</span>
                      </td>
                      <td className="aim-cell-mono">{c.original_code || c.material_id}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontWeight: 700,
                            color:
                              c.semantic_similarity >= 80
                                ? '#087F68'
                                : c.semantic_similarity >= 50
                                ? '#B56A00'
                                : '#7A8580',
                          }}
                        >
                          {c.semantic_similarity?.toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <span
                          className={`aim-preset-badge aim-preset-badge--${
                            c.decision === 'match'
                              ? 'match'
                              : c.decision === 'no_match'
                              ? 'conflict'
                              : 'missing'
                          }`}
                        >
                          {c.decision_label || c.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}

      {/* ── 5. Empty State when No Candidates Found ────────────────── */}
      {result && !best && (
        <div className="aim-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Search size={32} style={{ color: '#7A8580', margin: '0 auto 12px' }} />
          <h3 style={{ fontFamily: 'var(--sans)', fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>
            No Candidates Found
          </h3>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '13.5px', color: '#56615C', margin: 0 }}>
            No similar material records located in the CPSE database for this query.
          </p>
        </div>
      )}
    </div>
  );
}
