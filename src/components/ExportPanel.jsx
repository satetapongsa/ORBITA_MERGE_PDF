import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, FileArchive, FileText, Loader2, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { api, downloadFile, formatBytes } from '../api.js';
import { useAuth } from '../auth.jsx';

/** Runs an export against the API, keeping the account's quota in sync. */
export function useExport(endpoint) {
  const { setAccount } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function run(body) {
    setBusy(true);
    setError(null);
    try {
      const d = await api(`/tools/${endpoint}`, { method: 'POST', body });
      setAccount(d.account);
      setResult(d.file);
      downloadFile(d.file);
    } catch (err) {
      if (err.data?.account) setAccount(err.data.account);
      setError({ message: err.message, limit: err.data?.code === 'LIMIT_REACHED' });
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, result, reset: () => { setResult(null); setError(null); } };
}

/** Sticky right-hand panel: summary, quota and the export button. */
export default function ExportPanel({ title, children, actionLabel, disabled, onExport, exporter }) {
  const { account } = useAuth();
  const left = account?.remaining ?? 0;
  const { busy, error } = exporter;

  return (
    <aside className="panel card">
      <div className="card-head"><h3>{title}</h3></div>
      <div className="card-pad">
        {children}
        {error && (
          <div className={`alert ${error.limit ? 'alert-warn' : 'alert-error'}`}>
            <AlertTriangle size={16} />
            <div className="stack" style={{ gap: 8 }}>
              <span>{error.message}</span>
              {error.limit && account?.plan === 'free' && (
                <Link to="/account" className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start' }}>
                  <Sparkles size={14} /> Upgrade — 20 THB/mo
                </Link>
              )}
            </div>
          </div>
        )}
        <button className="btn btn-primary btn-lg btn-block" disabled={disabled || busy || left === 0} onClick={onExport}>
          {busy ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
          {busy ? 'Processing…' : actionLabel}
        </button>
        <p className="quota-note">
          {left > 0
            ? <>Uses 1 export · <span className="mono">{left}</span> of <span className="mono">{account?.dailyLimit}</span> left today</>
            : <>No exports left today · resets at midnight</>}
        </p>
      </div>
    </aside>
  );
}

/** Success screen after an export. */
export function ExportResult({ file, onReset, resetLabel = 'Start a new task' }) {
  const isZip = file.mime === 'application/zip';
  return (
    <div className="card result">
      <div className="result-icon"><CheckCircle2 size={28} /></div>
      <div>
        <h2>Your file is ready</h2>
        <p className="muted" style={{ marginTop: 4 }}>The download should start automatically. A copy is saved in My files.</p>
      </div>
      <div className="file-chip">
        {isZip ? <FileArchive size={18} color="var(--accent)" /> : <FileText size={18} color="var(--accent)" />}
        <span>{file.name}</span>
        <span className="mono small muted">{file.pageCount ? `${file.pageCount} pp · ` : ''}{formatBytes(file.size)}</span>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => downloadFile(file)}><Download size={16} /> Download again</button>
        <button className="btn" onClick={onReset}><RotateCcw size={16} /> {resetLabel}</button>
        <Link className="btn btn-ghost" to="/files">Go to My files</Link>
      </div>
    </div>
  );
}
