import { useEffect, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { api, formatBytes } from '../api.js';

/** Modal to reuse PDFs already stored in the user's files. */
export default function FilePicker({ multiple, onPick, onClose }) {
  const [files, setFiles] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    api('/files').then((d) => setFiles(d.files.filter((f) => f.mime === 'application/pdf')), () => setFiles([]));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(f) {
    if (!multiple) return setSelected([f]);
    setSelected((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose from my files">
        <div className="card-head">
          <h2>Choose from my files</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {!files ? (
            <div className="empty"><Loader2 className="spin" /></div>
          ) : files.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><FileText size={22} /></div>
              No PDFs stored yet. Upload one to get started.
            </div>
          ) : (
            files.map((f) => (
              <label key={f.id} className="pick-row">
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name="pick"
                  checked={selected.includes(f)}
                  onChange={() => toggle(f)}
                />
                <FileText size={16} color="var(--muted)" />
                <span className="name">{f.name}</span>
                <span className="mono small muted">{f.pageCount} pp · {formatBytes(f.size)}</span>
              </label>
            ))
          )}
        </div>
        <div className="card-head" style={{ borderTop: '1px solid var(--border)', borderBottom: 0 }}>
          <span className="small muted">{selected.length} selected</span>
          <div className="row">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!selected.length} onClick={() => onPick(selected)}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
