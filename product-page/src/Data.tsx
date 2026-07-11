import { useState, useEffect, useMemo, useCallback } from 'react';

// ── SVG icons (consistent with landing page) ──────────────────────────────
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const TablesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
);
const DocIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const ReportsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const BillingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────
type NavSection = 'dashboard' | 'tables' | 'documents' | 'reports' | 'settings' | 'profile' | 'billing';

interface ScanRecord {
  id: string;
  filename: string;
  status: string;
  template_id: string | null;
  created_at: string;
  url: string | null;
  total_count?: number;
  flagged_count?: number;
  counts?: Record<string, number>;
}

interface RecordEntry {
  id: string;
  scan_id: string;
  template_id: string | null;
  data: Record<string, unknown>;
  confidence: Record<string, number>;
  overall_confidence: number;
  validation_status: string;
  validation_errors: Array<{ field: string; code: string; message: string }>;
  review_status: string;
  row_index: number;
  created_at: string;
  updated_at: string;
  template?: { key: string; name: string; fields: Array<{ key: string; label: string; type: string }> };
  audits?: Array<{ id: string; action: string; changes: unknown; actor: string; created_at: string }>;
}

interface Template {
  id: string;
  key: string;
  name: string;
  industry: string;
  is_default: boolean;
  fields: Array<{ key: string; label: string; type: string; required: boolean; identity: boolean; dedupe_key: boolean }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────
const API = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json();
}

function statusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'badge-muted' },
    processing: { label: 'Processing', className: 'badge-info' },
    validating: { label: 'Validating', className: 'badge-info' },
    completed: { label: 'Completed', className: 'badge-success' },
    needs_review: { label: 'Needs Review', className: 'badge-warning' },
    failed: { label: 'Failed', className: 'badge-danger' },
    approved: { label: 'Approved', className: 'badge-success' },
    rejected: { label: 'Rejected', className: 'badge-danger' },
    valid: { label: 'Valid', className: 'badge-success' },
    invalid: { label: 'Invalid', className: 'badge-danger' },
  };
  return map[status] || { label: status, className: 'badge-muted' };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function truncateFilename(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max - 3) + '…' : name;
}

// ── Gate (passcode protection, same pattern as Upload.tsx) ────────────────
function Gate({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/validate-passcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('visiolog_data_authenticated', 'true');
        onSuccess();
      } else {
        setError('Invalid passcode.');
      }
    } catch {
      setError('Could not verify passcode. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="data-gate">
      <div className="data-gate-card">
        <a className="logo-text" href="/">VISIOLOG</a>
        <h1>Admin Workspace</h1>
        <p>Enter your workspace passcode to access records, tables, and the document library.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            placeholder="········"
            autoFocus
          />
          <button className="btn btn-primary upload-submit" disabled={loading} type="submit">
            {loading ? 'Verifying…' : 'Access workspace'}
          </button>
        </form>
        {error && <p className="upload-error">{error}</p>}
        <a className="upload-back-link" href="/">← Back to home</a>
      </div>
    </main>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────
const NAV_ITEMS: Array<{ id: NavSection; label: string; Icon: React.FC }> = [
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'tables', label: 'Tables', Icon: TablesIcon },
  { id: 'documents', label: 'Document Library', Icon: DocIcon },
  { id: 'reports', label: 'Reports', Icon: ReportsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  { id: 'billing', label: 'Billing', Icon: BillingIcon },
];

function Sidebar({ active, onNavigate }: { active: NavSection; onNavigate: (s: NavSection) => void }) {
  return (
    <aside className="data-sidebar">
      <a className="data-sidebar-brand" href="/">
        <span className="logo-text">VISIOLOG</span>
      </a>
      <nav className="data-sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`data-sidebar-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <item.Icon />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="data-sidebar-footer">
        <a href="/upload" className="data-sidebar-item">
          <ExternalIcon />
          <span>Upload Workspace</span>
        </a>
        <a href="/" className="data-sidebar-item">
          <ExternalIcon />
          <span>Exit to Home</span>
        </a>
      </div>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [worklist, setWorklist] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [scansData, worklistData] = await Promise.all([
        fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-scans`),
        fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-records?mode=worklist&all=true`),
      ]);
      setScans(scansData.scans || []);
      setWorklist(worklistData.scans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalScans = scans.length;
  const totalRecords = worklist.reduce((sum, s) => sum + (s.total_count || 0), 0);
  const flaggedCount = worklist.reduce((sum, s) => sum + (s.flagged_count || 0), 0);
  const completedCount = scans.filter(s => s.status === 'completed').length;
  const recentScans = scans.slice(0, 5);

  if (loading) return <div className="data-loading"><Spinner /><span>Loading dashboard…</span></div>;
  if (error) return <div className="data-error"><AlertIcon /> {error} <button className="text-button" onClick={load} type="button">Retry</button></div>;

  return (
    <div className="data-panel">
      <div className="data-panel-header">
        <h2>Dashboard</h2>
        <button className="btn btn-secondary btn-sm" onClick={load} type="button"><RefreshIcon /> Refresh</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{totalScans}</span>
          <span className="stat-label">Total Scans</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalRecords}</span>
          <span className="stat-label">Extracted Records</span>
        </div>
        <div className="stat-card stat-warning">
          <span className="stat-value">{flaggedCount}</span>
          <span className="stat-label">Flagged for Review</span>
        </div>
        <div className="stat-card stat-success">
          <span className="stat-value">{completedCount}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <div className="data-section">
        <h3 className="data-section-title">Recent Scans</h3>
        {recentScans.length === 0 ? (
          <p className="data-empty">No scans yet. Upload images from the <a href="/upload">Upload Workspace</a>.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Image</th><th>Filename</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map(scan => {
                  const badge = statusBadge(scan.status);
                  return (
                    <tr key={scan.id}>
                      <td>{scan.url ? <img src={scan.url} alt="" className="table-thumb" /> : <span className="table-no-img">—</span>}</td>
                      <td className="cell-filename" title={scan.filename}>{truncateFilename(scan.filename)}</td>
                      <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                      <td className="cell-date">{formatDate(scan.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tables ────────────────────────────────────────────────────────────────
function Tables() {
  const [worklist, setWorklist] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedScan, setExpandedScan] = useState<string | null>(null);
  const [scanRecords, setScanRecords] = useState<RecordEntry[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadWorklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-records?mode=worklist&all=true`);
      setWorklist(data.scans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorklist(); }, [loadWorklist]);

  async function expandScan(scanId: string) {
    if (expandedScan === scanId) {
      setExpandedScan(null);
      setScanRecords([]);
      return;
    }
    setExpandedScan(scanId);
    setRecordsLoading(true);
    try {
      const data = await fetchJSON<{ records: RecordEntry[] }>(
        `${API}/get-records?scan_id=${scanId}&include_audit=true`
      );
      setScanRecords(data.records || []);
    } catch {
      setScanRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = worklist;
    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.filename.toLowerCase().includes(q));
    }
    return list;
  }, [worklist, statusFilter, search]);

  if (loading) return <div className="data-loading"><Spinner /><span>Loading tables…</span></div>;
  if (error) return <div className="data-error"><AlertIcon /> {error} <button className="text-button" onClick={loadWorklist} type="button">Retry</button></div>;

  return (
    <div className="data-panel">
      <div className="data-panel-header">
        <h2>Tables</h2>
        <button className="btn btn-secondary btn-sm" onClick={loadWorklist} type="button"><RefreshIcon /> Refresh</button>
      </div>

      <div className="data-toolbar">
        <div className="search-box">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by filename…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="needs_review">Needs Review</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="data-empty">No scans match your filters.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Image</th>
                <th>Filename</th>
                <th>Status</th>
                <th>Records</th>
                <th>Flagged</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(scan => {
                const badge = statusBadge(scan.status);
                const isExpanded = expandedScan === scan.id;
                return (
                  <>
                    <tr key={scan.id} className={`scan-row ${isExpanded ? 'expanded' : ''}`}>
                      <td>
                        <button className="expand-btn" onClick={() => expandScan(scan.id)} type="button">
                          {isExpanded ? <ChevronDown /> : <ChevronRight />}
                        </button>
                      </td>
                      <td>{scan.url ? <img src={scan.url} alt="" className="table-thumb" /> : <span className="table-no-img">—</span>}</td>
                      <td className="cell-filename" title={scan.filename}>{truncateFilename(scan.filename)}</td>
                      <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                      <td>{scan.total_count ?? '—'}</td>
                      <td>{scan.flagged_count ? <span className="badge badge-warning">{scan.flagged_count}</span> : '0'}</td>
                      <td className="cell-date">{formatDate(scan.created_at)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="record-expand-row" key={`${scan.id}-records`}>
                        <td colSpan={7}>
                          {recordsLoading ? (
                            <div className="data-loading"><Spinner /><span>Loading records…</span></div>
                          ) : scanRecords.length === 0 ? (
                            <p className="data-empty">No records extracted for this scan.</p>
                          ) : (
                            <RecordTable records={scanRecords} />
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Record Table (reusable sub-table) ─────────────────────────────────────
function RecordTable({ records }: { records: RecordEntry[] }) {
  const template = records[0]?.template;
  const fields = template?.fields || [];
  const fieldKeys = fields.length > 0
    ? fields.map(f => f.key)
    : Object.keys(records[0]?.data || {});

  return (
    <div className="record-subtable-wrap">
      <table className="data-table record-subtable">
        <thead>
          <tr>
            <th>#</th>
            {fieldKeys.map(key => (
              <th key={key}>{fields.find(f => f.key === key)?.label || key}</th>
            ))}
            <th>Confidence</th>
            <th>Review</th>
            <th>Validation</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => {
            const rBadge = statusBadge(rec.review_status);
            const vBadge = statusBadge(rec.validation_status);
            return (
              <tr key={rec.id}>
                <td className="cell-muted">{rec.row_index ?? i + 1}</td>
                {fieldKeys.map(key => (
                  <td key={key}>{String(rec.data?.[key] ?? '—')}</td>
                ))}
                <td>{(rec.overall_confidence * 100).toFixed(0)}%</td>
                <td><span className={`badge ${rBadge.className}`}>{rBadge.label}</span></td>
                <td><span className={`badge ${vBadge.className}`}>{vBadge.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Document Library ──────────────────────────────────────────────────────
function DocumentLibrary() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const loadScans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-scans`);
      setScans(data.scans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadScans(); }, [loadScans]);

  async function selectScan(scan: ScanRecord) {
    setSelectedScan(scan);
    setRecordsLoading(true);
    try {
      const data = await fetchJSON<{ records: RecordEntry[] }>(
        `${API}/get-records?scan_id=${scan.id}&include_audit=true`
      );
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }

  if (loading) return <div className="data-loading"><Spinner /><span>Loading library…</span></div>;
  if (error) return <div className="data-error"><AlertIcon /> {error} <button className="text-button" onClick={loadScans} type="button">Retry</button></div>;

  return (
    <div className="data-panel">
      <div className="data-panel-header">
        <h2>Document Library</h2>
        <button className="btn btn-secondary btn-sm" onClick={loadScans} type="button"><RefreshIcon /> Refresh</button>
      </div>

      <div className="doc-layout">
        <div className="doc-list">
          <h3 className="data-section-title">Scans</h3>
          {scans.length === 0 ? (
            <p className="data-empty">No scans available.</p>
          ) : (
            <div className="doc-list-items">
              {scans.map(scan => (
                <button
                  key={scan.id}
                  className={`doc-list-item ${selectedScan?.id === scan.id ? 'active' : ''}`}
                  onClick={() => selectScan(scan)}
                  type="button"
                >
                  {scan.url ? <img src={scan.url} alt="" className="doc-list-thumb" /> : <div className="doc-list-thumb-placeholder"><ImageIcon /></div>}
                  <div className="doc-list-meta">
                    <span className="doc-list-name" title={scan.filename}>{truncateFilename(scan.filename)}</span>
                    <span className={`badge ${statusBadge(scan.status).className}`}>{statusBadge(scan.status).label}</span>
                    <span className="doc-list-date">{formatDate(scan.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="doc-viewer">
          {!selectedScan ? (
            <div className="doc-viewer-empty">
              <ImageIcon />
              <p>Select a scan from the list to view its image and extracted records.</p>
            </div>
          ) : (
            <>
              <div className="doc-viewer-image">
                {selectedScan.url ? (
                  <img src={selectedScan.url} alt={selectedScan.filename} />
                ) : (
                  <div className="doc-viewer-noimg">No image available</div>
                )}
              </div>
              <div className="doc-viewer-info">
                <h3>{selectedScan.filename}</h3>
                <span className={`badge ${statusBadge(selectedScan.status).className}`}>{statusBadge(selectedScan.status).label}</span>
                <span className="doc-viewer-date"><ClockIcon /> {formatDate(selectedScan.created_at)}</span>
              </div>
              <div className="doc-viewer-records">
                <h4>Extracted Records</h4>
                {recordsLoading ? (
                  <div className="data-loading"><Spinner /><span>Loading records…</span></div>
                ) : records.length === 0 ? (
                  <p className="data-empty">No records extracted.</p>
                ) : (
                  <RecordTable records={records} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Placeholder panels ────────────────────────────────────────────────────
function PlaceholderPanel({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="data-panel">
      <div className="data-panel-header"><h2>{title}</h2></div>
      <div className="data-placeholder">
        <div className="data-placeholder-icon">{icon}</div>
        <h3>{title}</h3>
        <p>This section is coming soon. The full admin workspace is being built incrementally.</p>
      </div>
    </div>
  );
}

// ── Main Admin Workspace ──────────────────────────────────────────────────
function AdminWorkspace() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');

  const renderPanel = () => {
    switch (activeNav) {
      case 'dashboard': return <Dashboard />;
      case 'tables': return <Tables />;
      case 'documents': return <DocumentLibrary />;
      case 'reports': return <PlaceholderPanel title="Reports" icon={<ReportsIcon />} />;
      case 'settings': return <PlaceholderPanel title="Settings" icon={<SettingsIcon />} />;
      case 'profile': return <PlaceholderPanel title="Profile" icon={<ProfileIcon />} />;
      case 'billing': return <PlaceholderPanel title="Billing" icon={<BillingIcon />} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="data-workspace">
      <Sidebar active={activeNav} onNavigate={setActiveNav} />
      <div className="data-main">
        {renderPanel()}
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────
export default function Data() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('visiolog_data_authenticated') === 'true'
  );
  return authenticated ? <AdminWorkspace /> : <Gate onSuccess={() => setAuthenticated(true)} />;
}