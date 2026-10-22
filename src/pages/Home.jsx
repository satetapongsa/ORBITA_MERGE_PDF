import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, Combine, Download, FileArchive, FileText, Scissors, Sparkles, RefreshCw } from 'lucide-react';
import { api, downloadFile, formatBytes } from '../api.js';
import { useAuth } from '../auth.jsx';

const TOOLS = [
  { to: '/merge', icon: Combine, title: 'Merge PDFs', text: 'Combine several PDFs into one document, in the order you set.' },
  { to: '/split', icon: Scissors, title: 'Split PDF', text: 'Break a PDF into single pages or custom page ranges.' },
  { to: '/organize', icon: ArrowUpDown, title: 'Reorder pages', text: 'Drag pages into a new order, rotate them, or remove the ones you don’t need.' },
  { to: '/convert', icon: RefreshCw, title: 'Convert & Compress', text: 'Convert Images to PDF, PDF to Word/Text, Text to PDF, and Compress files.' },
];

export default function Home() {
  const { user, account } = useAuth();
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    api('/files').then((d) => setRecent(d.files.filter((f) => f.kind === 'output').slice(0, 5))).catch(() => setRecent([]));
  }, []);

  return (
    <>
      <div className="hero">
        <div className="eyebrow">// workspace</div>
        <h1>Hi {user.username}, what would you like to do?</h1>
        <p>
          Pick a tool to get started.{' '}
          {account && <>You have <b className="mono">{account.remaining}</b> of {account.dailyLimit} exports left today.</>}
        </p>
      </div>

      <div className="tool-grid">
        {TOOLS.map(({ to, icon: Icon, title, text }, i) => (
          <Link key={to} to={to} className="tool-card">
            <span className="idx">0{i + 1}</span>
            <div className="tool-icon"><Icon size={22} /></div>
            <h2>{title}</h2>
            <p>{text}</p>
            <span className="go">Open tool <ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>

      <Link to="/assistant" className="card assistant-banner">
        <div className="tool-icon"><Sparkles size={20} /></div>
        <div style={{ flex: 1 }}>
          <h3>Ask PageSmith 5.5 Pro about your files <span className="badge badge-pro" style={{ marginLeft: 6 }}>Pro</span></h3>
          <p className="muted small">Find a document or pull answers from inside your PDFs, in Thai or English.</p>
        </div>
        <ArrowRight size={16} color="var(--accent)" />
      </Link>

      <div className="section-title">
        <h2>Recent exports</h2>
        <Link to="/files" className="small">View all files</Link>
      </div>
      <div className="card">
        {recent && recent.length === 0 && <div className="empty">Your exported files will appear here.</div>}
        {recent && recent.length > 0 && (
          <table className="table">
            <tbody>
              {recent.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="name-cell">
                      {f.mime === 'application/zip' ? <FileArchive size={16} color="var(--accent)" /> : <FileText size={16} color="var(--accent)" />}
                      <span>{f.name}</span>
                    </div>
                  </td>
                  <td className="num hide-sm">{formatBytes(f.size)}</td>
                  <td className="num hide-sm">{new Date(f.createdAt).toLocaleString()}</td>
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => downloadFile(f)}><Download size={14} /> Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
