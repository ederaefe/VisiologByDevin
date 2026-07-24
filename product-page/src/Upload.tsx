import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type Mode = 'image' | 'text';
type TemplateKey = 'security_gate' | 'classroom_attendance' | 'hospital_registry';
type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

type ImageItem = {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
};

type TextRow = Record<string, string>;

const templates: Array<{ key: TemplateKey; label: string }> = [
  { key: 'security_gate', label: 'Security Gate / Visitor' },
  { key: 'classroom_attendance', label: 'Classroom Attendance' },
  { key: 'hospital_registry', label: 'Hospital Registry' },
];

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 4v16M15 9v11" />
    </svg>
  );
}

function compressImage(file: File, maxWidth = 1200): Promise<File> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(file), 4000);
    const reader = new FileReader();
    reader.onerror = () => {
      window.clearTimeout(timeout);
      resolve(file);
    };
    reader.onload = (event) => {
      const image = new Image();
      image.onerror = () => {
        window.clearTimeout(timeout);
        resolve(file);
      };
      image.onload = () => {
        try {
          let width = image.width;
          let height = image.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          if (!context) {
            window.clearTimeout(timeout);
            resolve(file);
            return;
          }
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          canvas.toBlob((blob) => {
            window.clearTimeout(timeout);
            if (!blob) {
              resolve(file);
              return;
            }
            const name = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7);
        } catch {
          window.clearTimeout(timeout);
          resolve(file);
        }
      };
      image.src = String(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function parseTextFile(file: File): Promise<TextRow[]> {
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    return file.arrayBuffer().then((buffer) => {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) return [];
      return XLSX.utils.sheet_to_json<TextRow>(firstSheet, { defval: '' });
    });
  }

  return file.text().then((content) => {
    const parsed = Papa.parse<TextRow>(content.trim(), {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
    });
    if (parsed.errors.length) {
      throw new Error(parsed.errors[0]?.message || 'Could not read this file.');
    }
    if (parsed.data.length > 0 && Object.keys(parsed.data[0]).length > 1) {
      return parsed.data;
    }
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ text: line }));
  });
}

import { supabase } from './supabase';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

function Gate({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPasscodeFallback, setShowPasscodeFallback] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        sessionStorage.setItem('visiolog_authenticated', 'true');
        sessionStorage.setItem('visiolog_user_email', session.user.email || '');
        onSuccess();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        sessionStorage.setItem('visiolog_authenticated', 'true');
        sessionStorage.setItem('visiolog_user_email', session.user.email || '');
        onSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [onSuccess]);

  async function handleGoogleSignIn() {
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/upload',
        },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
      }
    } catch {
      setError('Could not connect to Google Authentication.');
      setBusy(false);
    }
  }

  async function handlePasscodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passcode.trim()) {
      setError('Enter your admin passcode.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/validate-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const payload = await response.json();
      if (!response.ok || payload.valid !== true) {
        setError('That passcode was not accepted.');
        return;
      }
      sessionStorage.setItem('visiolog_authenticated', 'true');
      onSuccess();
    } catch {
      setError('Could not verify credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-gate">
      <div className="upload-gate-card">
        <span className="eyebrow">Super Admin Authentication</span>
        <h1>Sign in to VISIOLOG</h1>
        <p>Access your private workspace and extraction analytics using Google Admin Auth.</p>

        <div className="auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0' }}>
          <button
            className="btn google-auth-btn"
            disabled={busy}
            onClick={handleGoogleSignIn}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 18px',
              fontSize: '15px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#1f2937',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.2s ease',
            }}
          >
            <GoogleIcon />
            {busy ? 'Connecting to Google…' : 'Sign in with Admin Gmail'}
          </button>
        </div>

        {error && <p className="upload-error" style={{ margin: '8px 0' }}>{error}</p>}

        {!showPasscodeFallback ? (
          <button
            onClick={() => setShowPasscodeFallback(true)}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #6b7280)',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '8px',
            }}
          >
            Use Admin Passcode Backup
          </button>
        ) : (
          <form onSubmit={handlePasscodeSubmit} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <label htmlFor="upload-passcode" style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Admin Passcode</label>
            <input
              id="upload-passcode"
              type="password"
              autoFocus
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
            />
            <button className="btn btn-primary upload-submit" disabled={busy} type="submit" style={{ marginTop: '10px' }}>
              {busy ? 'Verifying…' : 'Verify Passcode'}
            </button>
          </form>
        )}

        <a className="upload-back-link" href="/" style={{ marginTop: '16px', display: 'block' }}>← Back to VISIOLOG</a>
      </div>
    </div>
  );
}

function UploadWorkspace() {
  const [mode, setMode] = useState<Mode>('image');
  const [template, setTemplate] = useState<TemplateKey>('security_gate');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [textFile, setTextFile] = useState<File | null>(null);
  const [textRows, setTextRows] = useState<TextRow[]>([]);
  const [textError, setTextError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const imagePreviews = useMemo(
    () => images.map((item) => ({ ...item, url: URL.createObjectURL(item.file) })),
    [images],
  );

  useEffect(() => {
    return () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [imagePreviews]);

  function addImages(fileList: FileList | null) {
    const selected = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (!selected.length) {
      setImageError('Choose an image file to continue.');
      return;
    }
    setImageError('');
    setUploadComplete(false);
    setImages((current) => [
      ...current,
      ...selected.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        status: 'queued' as UploadStatus,
      })),
    ]);
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((item) => item.id !== id));
    setUploadComplete(false);
  }

  async function submitImages() {
    if (!images.length || isUploading) return;
    setIsUploading(true);
    setImageError('');
    setUploadComplete(false);
    for (const item of images) {
      setImages((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'uploading' } : entry));
      try {
        const compressed = await compressImage(item.file);
        const body = new FormData();
        body.append('file', compressed);
        body.append('template', template);
        const response = await fetch('/api/upload-scan', {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) throw new Error('Upload failed.');
        await response.json();
        setImages((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'uploaded' } : entry));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.';
        setImages((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'failed', error: message } : entry));
        setImageError('One or more images could not be uploaded. You can retry them.');
        break;
      }
    }
    setIsUploading(false);
    setUploadComplete(true);
  }

  async function chooseTextFile(file: File | undefined) {
    if (!file) return;
    setTextFile(file);
    setTextError('');
    try {
      const rows = await parseTextFile(file);
      if (!rows.length) throw new Error('No rows found in this file.');
      setTextRows(rows);
    } catch (error) {
      setTextRows([]);
      setTextError(error instanceof Error ? error.message : 'Could not read this file.');
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setImageError('');
    setTextError('');
    setUploadComplete(false);
  }

  const textHeaders = textRows.length ? Object.keys(textRows[0]) : [];
  const uploadedCount = images.filter((item) => item.status === 'uploaded').length;

  return (
    <main className="upload-page">
      <nav className="upload-nav">
        <a className="logo-text" href="/">VISIOLOG</a>
        <div className="upload-nav-links">
          <a className="upload-nav-link" href="/data">Data</a>
          <a className="upload-nav-link" href="/review">Review</a>
          <a className="upload-nav-link" href="/">Exit workspace</a>
        </div>
      </nav>
      <section className="upload-shell">
        <div className="upload-heading">
          <span className="eyebrow">Capture workspace</span>
          <h1>Turn operational records into usable data.</h1>
          <p>Choose an image capture for visual extraction, or prepare a structured file for the next ingestion step.</p>
        </div>

        <div className="upload-mode-switch" role="tablist" aria-label="Input mode">
          <button className={mode === 'image' ? 'active' : ''} onClick={() => switchMode('image')} role="tab" type="button">
            <CameraIcon /> Image
            <span>Upload → extract → table + image archive</span>
          </button>
          <button className={mode === 'text' ? 'active' : ''} onClick={() => switchMode('text')} role="tab" type="button">
            <TableIcon /> Text
            <span>Upload → extract → append → sync</span>
          </button>
        </div>

        {mode === 'image' ? (
          <section className="upload-card">
            <div className="upload-card-header">
              <div>
                <span className="step-label">01 · Image capture</span>
                <h2>Upload a page or batch</h2>
                <p>Images are compressed in your browser, uploaded securely, and queued for extraction.</p>
              </div>
              <label className="template-field">
                <span>Record template</span>
                <select value={template} onChange={(event) => setTemplate(event.target.value as TemplateKey)}>
                  {templates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {!images.length ? (
              <div className="image-dropzone">
                <div className="dropzone-icon"><UploadIcon /></div>
                <h3>Select your input method</h3>
                <p>Capture a fresh page or choose multiple images from your gallery.</p>
                <div className="dropzone-actions">
                  <button className="btn btn-primary" onClick={() => cameraInputRef.current?.click()} type="button"><CameraIcon /> Camera</button>
                  <button className="btn btn-secondary" onClick={() => imageInputRef.current?.click()} type="button"><UploadIcon /> Gallery</button>
                </div>
                <input ref={cameraInputRef} accept="image/*" capture="environment" onChange={(event) => addImages(event.target.files)} type="file" hidden />
                <input ref={imageInputRef} accept="image/*" multiple onChange={(event) => addImages(event.target.files)} type="file" hidden />
              </div>
            ) : (
              <div className="image-batch">
                <div className="batch-toolbar">
                  <strong>{images.length} {images.length === 1 ? 'page' : 'pages'} selected</strong>
                  <button className="text-button" onClick={() => imageInputRef.current?.click()} type="button">+ Add images</button>
                  <input ref={imageInputRef} accept="image/*" multiple onChange={(event) => addImages(event.target.files)} type="file" hidden />
                </div>
                <div className="thumbnail-grid">
                  {imagePreviews.map((item) => (
                    <article className={`thumbnail-card ${item.status}`} key={item.id}>
                      <img src={item.url} alt={item.file.name} />
                      <button aria-label={`Remove ${item.file.name}`} className="thumbnail-remove" onClick={() => removeImage(item.id)} type="button">×</button>
                      <div className="thumbnail-meta">
                        <span title={item.file.name}>{item.file.name}</span>
                        <small>{item.status === 'uploading' ? 'Uploading…' : item.status === 'uploaded' ? 'Uploaded' : item.status === 'failed' ? 'Failed' : 'Ready'}</small>
                      </div>
                    </article>
                  ))}
                </div>
                <button className="btn btn-primary upload-submit" disabled={isUploading || uploadedCount === images.length} onClick={submitImages} type="button">
                  {isUploading ? `Uploading ${uploadedCount + 1} of ${images.length}…` : uploadedCount === images.length ? 'All images uploaded' : 'Upload and queue extraction'}
                </button>
              </div>
            )}
            {imageError && <p className="upload-error">{imageError}</p>}
            {uploadComplete && !imageError && <div className="upload-success"><strong>Upload complete.</strong> Your images are queued and will appear with extracted table data in the data workspace.</div>}
          </section>
        ) : (
          <section className="upload-card">
            <div className="upload-card-header">
              <div>
                <span className="step-label">01 · Text intake</span>
                <h2>Prepare a structured file</h2>
                <p>Preview CSV, TXT, or XLSX rows locally before the text ingestion service is connected.</p>
              </div>
              <div className="text-flow-note">Upload → extract → append → sync</div>
            </div>
            {!textFile ? (
              <button className="text-dropzone" onClick={() => textInputRef.current?.click()} type="button">
                <div className="dropzone-icon"><TableIcon /></div>
                <strong>Choose a CSV, TXT, or XLSX file</strong>
                <span>Parsing stays in your browser in this phase.</span>
                <input ref={textInputRef} accept=".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => chooseTextFile(event.target.files?.[0])} type="file" hidden />
              </button>
            ) : (
              <div className="text-preview">
                <div className="batch-toolbar">
                  <strong>{textFile.name}</strong>
                  <button className="text-button" onClick={() => { setTextFile(null); setTextRows([]); }} type="button">Choose another</button>
                </div>
                {textRows.length > 0 && (
                  <div className="preview-table-wrap">
                    <table className="preview-table">
                      <thead><tr>{textHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead>
                      <tbody>{textRows.slice(0, 8).map((row, index) => <tr key={index}>{textHeaders.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                <p className="text-preview-count">Showing {Math.min(textRows.length, 8)} of {textRows.length} parsed rows.</p>
                <button className="btn btn-primary upload-submit" disabled title="Text ingestion backend — coming in next phase" type="button">Text ingestion backend — coming next phase</button>
              </div>
            )}
            {textError && <p className="upload-error">{textError}</p>}
          </section>
        )}
      </section>
    </main>
  );
}

export default function Upload() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('visiolog_authenticated') === 'true');
  return authenticated ? <UploadWorkspace /> : <Gate onSuccess={() => setAuthenticated(true)} />;
}
