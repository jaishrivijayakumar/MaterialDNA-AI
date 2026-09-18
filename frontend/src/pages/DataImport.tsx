import { useState, useRef } from 'react';
import { uploadPreview, uploadMaterials } from '../api/client';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  ArrowRight,
  Database,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface PreviewData {
  filename: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  columns_detected: string[];
  preview_rows: Record<string, any>[];
  validation_errors: string[];
}

interface UploadResultData {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<UploadResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // File selection and preview validation
  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError('');
    setLoading(true);
    setLoadingMessage('Validating material records and analyzing schema...');

    try {
      const res = await uploadPreview(selectedFile);
      setPreview(res);
    } catch (err: any) {
      setError(err.message || 'Failed to read and validate the uploaded file.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Execution of import
  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setLoadingMessage('Importing materials and indexing technical attributes...');

    try {
      const res = await uploadMaterials(file);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to import material dataset into database.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Reset to initial state
  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setLoading(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file extension
  const getFileExtension = (name: string) => {
    const ext = name.split('.').pop() || '';
    return ext.toUpperCase();
  };

  // Current step calculation: 0 = Upload, 1 = Validate & Preview, 2 = Import Complete
  const currentStep = result ? 2 : preview ? 1 : 0;

  // Expected columns reference
  const expectedColumns = [
    { name: 'original_description', required: true, desc: 'Full description of the material' },
    { name: 'cpse', required: false, desc: 'Originating enterprise (e.g. NTPC, BHEL, ONGC)' },
    { name: 'original_code', required: false, desc: 'Local CPSE part or item code' },
    { name: 'category', required: false, desc: 'Material category (e.g. Fasteners, Valves)' },
    { name: 'material_id', required: false, desc: 'Optional unique identifier' },
  ];

  return (
    <div className="di-page">
      {/* ── Page Header (Left-aligned) ── */}
      <header className="di-header">
        <div className="di-eyebrow">
          <span className="di-eyebrow-dot" />
          DATA INGESTION WORKSPACE
        </div>
        <h1 className="di-title">DATA IMPORT</h1>
        <p className="di-subtitle">Upload CPSE material master files for harmonization.</p>
      </header>

      {/* ── Workflow Steps Indicator ── */}
      <nav className="di-workflow-bar" aria-label="Import Progress">
        <div
          className={`di-step-item di-step-item--1 ${currentStep === 0 ? 'di-step-item--active' : ''} ${
            currentStep > 0 ? 'di-step-item--completed' : ''
          }`}
        >
          <span className="di-step-num">{currentStep > 0 ? '✓' : '01'}</span>
          <span className="di-step-title">Upload</span>
        </div>

        <span className="di-step-arrow di-step-arrow--1">→</span>

        <div
          className={`di-step-item di-step-item--2 ${currentStep === 1 ? 'di-step-item--active' : ''} ${
            currentStep > 1 ? 'di-step-item--completed' : ''
          }`}
        >
          <span className="di-step-num">{currentStep > 1 ? '✓' : '02'}</span>
          <span className="di-step-title">Validate &amp; Preview</span>
        </div>

        <span className="di-step-arrow di-step-arrow--2">→</span>

        <div
          className={`di-step-item di-step-item--3 ${currentStep === 2 ? 'di-step-item--active di-step-item--completed' : ''}`}
        >
          <span className="di-step-num">03</span>
          <span className="di-step-title">Import</span>
        </div>
      </nav>

      {/* ── Error Notification ── */}
      {error && (
        <div className="di-alert-error" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="di-alert-error-title">FILE OPERATION FAILED</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* ── Loading Notification Strip ── */}
      {loading && (
        <div className="di-loading-strip">
          <span className="di-spinner" />
          <span>{loadingMessage || 'Processing data...'}</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          STEP 1: UPLOAD AREA
          ═════════════════════════════════════════════════════════════════════════ */}
      {!preview && !result && (
        <div className="di-upload-card">
          <div
            className={`di-upload-zone ${dragging ? 'di-upload-zone--dragging' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) handleFile(dropped);
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload material master file"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
          >
            <div className="di-upload-icon-wrap">
              <Upload size={22} />
            </div>
            <h3 className="di-upload-title">Upload Material Master</h3>
            <p className="di-upload-prompt">
              <strong>Click to browse</strong> or drag and drop
            </p>
            <span className="di-upload-formats">CSV, Excel (.xlsx, .xls)</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />

          {/* Expected Columns Reference Block */}
          <div className="di-expected-box">
            <div className="di-expected-label">EXPECTED COLUMNS &amp; SCHEMA</div>
            <div className="di-expected-list">
              {expectedColumns.map(col => (
                <span key={col.name} className="di-col-chip" title={col.desc}>
                  <span>{col.name}</span>
                  <span
                    className={`di-col-tag ${
                      col.required ? 'di-col-tag--required' : 'di-col-tag--optional'
                    }`}
                  >
                    {col.required ? 'Required' : 'Optional'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          STEP 2: VALIDATE & PREVIEW WORKSPACE
          ═════════════════════════════════════════════════════════════════════════ */}
      {preview && !result && (
        <>
          {/* Selected File Summary Card */}
          {file && (
            <div className="di-selected-file-card">
              <div className="di-file-info">
                <span className="di-file-ext-badge">{getFileExtension(file.name)}</span>
                <div className="di-file-meta">
                  <span className="di-file-name">{file.name}</span>
                  <span className="di-file-size">{formatFileSize(file.size)}</span>
                </div>
              </div>

              <div className="di-file-actions">
                <span className="di-file-ready-tag">
                  <CheckCircle2 size={13} />
                  Ready for validation
                </span>
                <button
                  type="button"
                  className="di-file-remove-btn"
                  onClick={resetAll}
                  disabled={loading}
                >
                  <X size={13} />
                  Change File
                </button>
              </div>
            </div>
          )}

          <div className="di-preview-card">
            <div className="di-preview-header">
              <span className="di-preview-title">
                <FileSpreadsheet size={16} color="#087F68" />
                Validation Summary &amp; Preview
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', color: '#56615C' }}>
                {preview.columns_detected?.length || 0} COLUMNS DETECTED
              </span>
            </div>

            <div className="di-preview-body">
              {/* Validation Summary Metrics */}
              <div className="di-metrics-grid">
                <div className="di-metric-box">
                  <span className="di-metric-val">{preview.total_records}</span>
                  <span className="di-metric-label">Total Rows</span>
                </div>
                <div className="di-metric-box">
                  <span className="di-metric-val di-metric-val--valid">
                    {preview.valid_records}
                  </span>
                  <span className="di-metric-label">Valid Rows</span>
                </div>
                <div className="di-metric-box">
                  <span
                    className={`di-metric-val ${
                      preview.invalid_records > 0 ? 'di-metric-val--warning' : ''
                    }`}
                  >
                    {preview.invalid_records}
                  </span>
                  <span className="di-metric-label">Warnings / Skipped</span>
                </div>
                <div className="di-metric-box">
                  <span
                    className={`di-metric-val ${
                      preview.validation_errors?.length > 0 ? 'di-metric-val--error' : ''
                    }`}
                  >
                    {preview.validation_errors?.length || 0}
                  </span>
                  <span className="di-metric-label">Errors</span>
                </div>
              </div>

              {/* Validation Problem Alert (if any) */}
              {preview.validation_errors && preview.validation_errors.length > 0 && (
                <div className="di-alert-error" style={{ marginBottom: 16 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div className="di-alert-error-title">VALIDATION REQUIRES ATTENTION</div>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {preview.validation_errors.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Column Mapping Section */}
              <div className="di-mapping-box">
                <div className="di-mapping-head">
                  <span>FILE COLUMN</span>
                  <span></span>
                  <span>MATERIALDNA FIELD</span>
                </div>
                {preview.columns_detected?.map(col => {
                  const norm = col.toLowerCase().trim();
                  let targetField = col;
                  let isRequired = false;

                  if (norm === 'description' || norm === 'original_description') {
                    targetField = 'original_description';
                    isRequired = true;
                  } else if (norm === 'code' || norm === 'original_code') {
                    targetField = 'original_code';
                  } else if (norm === 'company' || norm === 'cpse') {
                    targetField = 'cpse';
                  } else if (norm === 'category') {
                    targetField = 'category';
                  } else if (norm === 'material_id') {
                    targetField = 'material_id';
                  } else {
                    targetField = `technical_attributes.${col}`;
                  }

                  return (
                    <div key={col} className="di-mapping-row">
                      <span className="di-mapping-source">{col}</span>
                      <span style={{ color: '#BAC2BD', textAlign: 'center' }}>→</span>
                      <span className="di-mapping-target">
                        {targetField}
                        {isRequired && (
                          <span style={{ color: '#B83232', marginLeft: 4 }}>*</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Preview Table */}
              {preview.preview_rows && preview.preview_rows.length > 0 && (
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#56615C',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    FIRST {preview.preview_rows.length} ROWS PREVIEW
                  </div>
                  <div className="di-table-wrap">
                    <table className="di-table">
                      <thead>
                        <tr>
                          {preview.columns_detected?.map(col => (
                            <th key={col}>{col.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview_rows.map((row, idx) => (
                          <tr key={idx}>
                            {preview.columns_detected?.map(col => (
                              <td key={col} title={String(row[col] ?? '')}>
                                {row[col] !== undefined && row[col] !== null && String(row[col]) !== ''
                                  ? String(row[col])
                                  : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="di-action-bar">
                <button
                  type="button"
                  className="di-btn-secondary"
                  onClick={resetAll}
                  disabled={loading}
                >
                  Choose Different File
                </button>

                <button
                  type="button"
                  className="di-btn-primary"
                  onClick={handleImport}
                  disabled={
                    loading ||
                    preview.valid_records === 0 ||
                    (preview.validation_errors && preview.validation_errors.length > 0)
                  }
                >
                  {loading ? (
                    <>
                      <span className="di-spinner" />
                      Importing...
                    </>
                  ) : (
                    <>
                      IMPORT {preview.valid_records} MATERIALS
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          STEP 3: IMPORT SUCCESS WORKSPACE
          ═════════════════════════════════════════════════════════════════════════ */}
      {result && (
        <div className="di-success-card">
          <div className="di-success-icon">
            <CheckCircle2 size={30} strokeWidth={2.4} />
          </div>

          <h2 className="di-success-title">MATERIAL DATA IMPORTED</h2>
          <p className="di-success-desc">
            The material records have been successfully validated and imported into the
            MaterialDNA material master database.
          </p>

          <div className="di-success-metrics">
            <span>
              <strong>{result.imported}</strong> MATERIALS IMPORTED
            </span>
            {result.skipped > 0 && (
              <span>
                <strong>{result.skipped}</strong> SKIPPED (DUPLICATE/EMPTY)
              </span>
            )}
          </div>

          <div className="di-success-actions">
            <button
              type="button"
              className="di-btn-primary"
              onClick={() => (window.location.href = '/materials')}
            >
              <Database size={15} />
              VIEW MATERIAL MASTER
            </button>

            <button
              type="button"
              className="di-btn-secondary"
              onClick={() => (window.location.href = '/matching')}
            >
              <Cpu size={15} />
              START AI ANALYSIS
            </button>

            <button
              type="button"
              className="di-btn-secondary"
              onClick={resetAll}
            >
              <RefreshCw size={14} />
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

