# VISIOLOG Functional Logic Extraction

This document extracts all functional/business logic from the VISIOLOG codebase, organized by component/page. This preserves all functional behavior while omitting UI/styling concerns.

## Table of Contents
- [Shared Utilities](#shared-utilities)
- [Landing Page (`App.tsx`)](#landing-page-apptsx)
- [Upload Workspace (`Upload.tsx`)](#upload-workspace-uploadtsx)
  - [Types](#types)
  - [Image Processing](#image-processing)
  - [Text File Parsing](#text-file-parsing)
  - [Authentication Gate](#authentication-gate)
  - [Upload Workflow](#upload-workflow)
- [Data Admin Workspace (`Data.tsx`)](#data-admin-workspace-datatsx)
  - [Types](#types-1)
  - [API Helper](#api-helper)
  - [Status Badge Mapping](#status-badge-mapping)
  - [Data Formatting Utilities](#data-formatting-utilities)
  - [Authentication Gate](#authentication-gate-1)
  - [Dashboard Logic](#dashboard-logic)
  - [Tables Logic](#tables-logic)
  - [Document Library Logic](#document-library-logic)
  - [Navigation State](#navigation-state)

---

## Shared Utilities

### Constants
```typescript
const API = '/api';
```

### Authentication Pattern
All protected routes follow this pattern:
```typescript
const [authenticated, setAuthenticated] = useState(
  () => sessionStorage.getItem('visiolog_authenticated') === 'true'
);

// Render
return authenticated ? <ProtectedComponent /> : <Gate onSuccess={() => setAuthenticated(true)} />;
```

### Session Storage
- `sessionStorage.setItem('visiolog_authenticated', 'true')` - Marks user as authenticated
- `sessionStorage.getItem('visiolog_authenticated')` - Checks authentication status

---

## Landing Page (`App.tsx`)

### Pricing Toggle Logic
```typescript
const [isAnnual, setIsAnnual] = useState(false);

// Price calculation
const tier1Price = isAnnual ? 6.40 : 8.00;
const tier2Price = isAnnual ? 16.00 : 20.00;
```

### Routing
```typescript
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/upload" element={<Upload />} />
</Routes>
```

### Section Content Data
All landing page content (hero, pipeline steps, pricing tiers, security features) is hardcoded in the component with:
- Titles
- Descriptions
- Feature lists
- Pricing details

---

## Upload Workspace (`Upload.tsx`)

### Types
```typescript
type Mode = 'image' | 'text';
type TemplateKey = 'security_gate' | 'classroom_attendance' | 'hospital_registry';

type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'processing' | 'completed' | 'failed';

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  error?: string;
}

interface TextRow {
  [key: string]: string;
}

interface Template {
  key: TemplateKey;
  name: string;
  fields: string[];
}
```

### Templates
```typescript
const templates: Template[] = [
  {
    key: 'security_gate',
    name: 'Security Gate Registry',
    fields: ['name', 'company', 'badge_id', 'timestamp', 'destination']
  },
  {
    key: 'classroom_attendance',
    name: 'Classroom Attendance',
    fields: ['student_id', 'name', 'date', 'status', 'signature']
  },
  {
    key: 'hospital_registry',
    name: 'Hospital Patient Registry',
    fields: ['patient_id', 'name', 'dob', 'admission_date', 'doctor', 'ward']
  }
];
```

### Image Processing
```typescript
async function compressImage(file: File, maxWidth = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        } else {
          reject(new Error('Canvas compression failed'));
        }
      }, 'image/jpeg', 0.7);
    };
    
    reader.onerror = reject;
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Text File Parsing
```typescript
async function parseTextFile(file: File): Promise<TextRow[]> {
  if (file.name.endsWith('.xlsx')) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(firstSheet);
    return json as TextRow[];
  }
  
  if (file.name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => resolve(results.data as TextRow[]),
        error: reject
      });
    });
  }
  
  // Plain text fallback
  const text = await file.text();
  return text.split('\n').map(line => ({
    raw: line
  }));
}
```

### Authentication Gate
```typescript
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
      sessionStorage.setItem('visiolog_authenticated', 'true');
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
```

### Upload Workflow
```typescript
// State
const [mode, setMode] = useState<Mode>('image');
const [template, setTemplate] = useState<TemplateKey>('security_gate');
const [images, setImages] = useState<ImageItem[]>([]);
const [textFile, setTextFile] = useState<File | null>(null);
const [textRows, setTextRows] = useState<TextRow[]>([]);
const [textHeaders, setTextHeaders] = useState<string[]>([]);
const [textError, setTextError] = useState('');

// Image batch management
function addImages(files: File[]) {
  const newImages = files.map(file => ({
    id: Math.random().toString(36).substring(2, 9),
    file,
    preview: URL.createObjectURL(file),
    status: 'idle' as UploadStatus
  }));
  setImages(prev => [...prev, ...newImages]);
}

function removeImage(id: string) {
  setImages(prev => prev.filter(img => img.id !== id));
}

// Image upload
async function submitImages() {
  for (const img of images) {
    if (img.status !== 'idle') continue;
    
    const updatedImages = images.map(i =>
      i.id === img.id ? { ...i, status: 'compressing' } : i
    );
    setImages(updatedImages);
    
    try {
      const compressed = await compressImage(img.file);
      const formData = new FormData();
      formData.append('image', compressed);
      formData.append('template_key', template);
      
      const uploadRes = await fetch(`${API}/upload-scan`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      
      setImages(prev => prev.map(i =>
        i.id === img.id ? { ...i, status: 'completed' } : i
      ));
    } catch (err) {
      setImages(prev => prev.map(i =>
        i.id === img.id ? {
          ...i,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed'
        } : i
      ));
    }
  }
}

// Text file handling
async function chooseTextFile(file: File) {
  setTextError('');
  try {
    const rows = await parseTextFile(file);
    if (rows.length === 0) {
      setTextError('No data found in file.');
      return;
    }
    
    const headers = Object.keys(rows[0]);
    setTextFile(file);
    setTextRows(rows);
    setTextHeaders(headers);
  } catch (err) {
    setTextError(err instanceof Error ? err.message : 'Failed to parse file.');
  }
}
```

---

## Data Admin Workspace (`Data.tsx`)

### Types
```typescript
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
  template?: {
    key: string;
    name: string;
    fields: Array<{ key: string; label: string; type: string }>;
  };
  audits?: Array<{
    id: string;
    action: string;
    changes: unknown;
    actor: string;
    created_at: string;
  }>;
}

interface Template {
  id: string;
  key: string;
  name: string;
  industry: string;
  is_default: boolean;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    identity: boolean;
    dedupe_key: boolean;
  }>;
}

// Navigation
const NAV_ITEMS: Array<{ id: NavSection; label: string; Icon: React.FC }> = [
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'tables', label: 'Tables', Icon: TablesIcon },
  { id: 'documents', label: 'Document Library', Icon: DocIcon },
  { id: 'reports', label: 'Reports', Icon: ReportsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  { id: 'billing', label: 'Billing', Icon: BillingIcon },
];
```

### API Helper
```typescript
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json();
}
```

### Status Badge Mapping
```typescript
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
```

### Data Formatting Utilities
```typescript
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncateFilename(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max - 3) + '…' : name;
}
```

### Authentication Gate
```typescript
// Same pattern as Upload.tsx but with different sessionStorage key
sessionStorage.setItem('visiolog_data_authenticated', 'true');
```

### Dashboard Logic
```typescript
// Data fetching
const [scans, setScans] = useState<ScanRecord[]>([]);
const [worklist, setWorklist] = useState<ScanRecord[]>([]);

const load = useCallback(async () => {
  try {
    const [scansData, worklistData] = await Promise.all([
      fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-scans`),
      fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-records?mode=worklist&all=true`),
    ]);
    setScans(scansData.scans || []);
    setWorklist(worklistData.scans || []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
  }
}, []);

// Stats aggregation
const totalScans = scans.length;
const totalRecords = worklist.reduce((sum, s) => sum + (s.total_count || 0), 0);
const flaggedCount = worklist.reduce((sum, s) => sum + (s.flagged_count || 0), 0);
const completedCount = scans.filter(s => s.status === 'completed').length;
const recentScans = scans.slice(0, 5);
```

### Tables Logic
```typescript
// Data fetching
const loadWorklist = useCallback(async () => {
  try {
    const data = await fetchJSON<{ scans: ScanRecord[] }>(
      `${API}/get-records?mode=worklist&all=true`
    );
    setWorklist(data.scans || []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load scans.');
  }
}, []);

// Record expansion
async function expandScan(scanId: string) {
  if (expandedScan === scanId) {
    setExpandedScan(null);
    setScanRecords([]);
    return;
  }
  
  setExpandedScan(scanId);
  try {
    const data = await fetchJSON<{ records: RecordEntry[] }>(
      `${API}/get-records?scan_id=${scanId}&include_audit=true`
    );
    setScanRecords(data.records || []);
  } catch {
    setScanRecords([]);
  }
}

// Filtering
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
```

### Document Library Logic
```typescript
// Scan selection
async function selectScan(scan: ScanRecord) {
  setSelectedScan(scan);
  try {
    const data = await fetchJSON<{ records: RecordEntry[] }>(
      `${API}/get-records?scan_id=${scan.id}&include_audit=true`
    );
    setRecords(data.records || []);
  } catch {
    setRecords([]);
  }
}

// Data fetching
const loadScans = useCallback(async () => {
  try {
    const data = await fetchJSON<{ scans: ScanRecord[] }>(`${API}/get-scans`);
    setScans(data.scans || []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load scans.');
  }
}, []);
```

### Navigation State
```typescript
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
```