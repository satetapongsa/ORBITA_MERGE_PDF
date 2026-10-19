import { useRef, useState } from 'react';
import { FolderOpen, Loader2, Upload } from 'lucide-react';
import { uploadFiles } from '../api.js';
import { useToast } from './Toast.jsx';
import FilePicker from './FilePicker.jsx';

/**
 * Drop or browse PDFs. Files are uploaded to the user's private storage and
 * returned as stored-file records via onFiles.
 */
export default function Dropzone({ onFiles, multiple = true, compact = false, title, subtitle }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [picking, setPicking] = useState(false);
  const toast = useToast();

  async function handle(list) {
    const files = [...list].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!files.length) return toast('Please choose PDF files.', 'error');
    const batch = multiple ? files : files.slice(0, 1);
    setProgress(0);
    try {
      const res = await uploadFiles(batch, setProgress);
      res.rejected?.forEach((r) => toast(`${r.name}: ${r.error}`, 'error'));
      if (res.files.length) onFiles(res.files);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  }

  const busy = progress !== null;
  return (
    <>
      <div
        className={`dropzone ${over ? 'over' : ''} ${compact ? 'compact' : ''}`}
        onClick={() => !busy && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) handle(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
      >
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          hidden
          onChange={(e) => handle(e.target.files)}
        />
        {busy ? (
          <>
            <Loader2 className="spin" size={compact ? 18 : 28} color="var(--accent)" />
            <div className="progress stack" style={{ gap: 6 }}>
              <span className="small muted">Uploading… {Math.round(progress * 100)}%</span>
              <div className="meter lg"><span style={{ width: `${progress * 100}%` }} /></div>
            </div>
          </>
        ) : compact ? (
          <>
            <Upload size={16} color="var(--accent)" />
            <span><b>Add more PDFs</b> <span className="muted">— drop here or click</span></span>
            <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setPicking(true); }}>
              <FolderOpen size={14} /> My files
            </button>
          </>
        ) : (
          <>
            <div className="dropzone-icon"><Upload size={24} /></div>
            <h3>{title || (multiple ? 'Drop PDF files here' : 'Drop a PDF file here')}</h3>
            <p className="muted">{subtitle || 'or click to browse from your computer'}</p>
            <div className="actions">
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); input.current.click(); }}>
                <Upload size={16} /> Choose {multiple ? 'files' : 'file'}
              </button>
              <button className="btn" onClick={(e) => { e.stopPropagation(); setPicking(true); }}>
                <FolderOpen size={16} /> From my files
              </button>
            </div>
          </>
        )}
      </div>
      {picking && (
        <FilePicker
          multiple={multiple}
          onClose={() => setPicking(false)}
          onPick={(files) => { setPicking(false); onFiles(files); }}
        />
      )}
    </>
  );
}
