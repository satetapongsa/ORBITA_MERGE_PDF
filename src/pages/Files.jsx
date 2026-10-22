import { useEffect, useState } from 'react';
import { Download, FileArchive, FileText, FolderOpen, Loader2, Trash2, Upload } from 'lucide-react';
import { api, downloadFile, fileUrl, formatBytes, uploadFiles } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'output', label: 'Exports' },
  { id: 'upload', label: 'Uploads' },
];

export default function Files() {
  const [files, setFiles] = useState(null);
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = () => api('/files').then((d) => setFiles(d.files)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(f) {
    if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    try {
      await api(`/files/${f.id}`, { method: 'DELETE' });
      setFiles((cur) => cur.filter((x) => x.id !== f.id));
      toast('File deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function upload(e) {
    if (!e.target.files.length) return;
    setUploading(true);
    try {
      const res = await uploadFiles(e.target.files);
      res.rejected?.forEach((r) => toast(`${r.name}: ${r.error}`, 'error'));
      if (res.files.length) toast(`Uploaded ${res.files.length} file${res.files.length > 1 ? 's' : ''}`);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const shown = files?.filter((f) => filter === 'all' || f.kind === filter) ?? [];
  const totalSize = files?.reduce((n, f) => n + f.size, 0) ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><FolderOpen size={12} /> storage</div>
          <h1>My files</h1>
          <p>Your uploads and exports, visible only to you. <span className="mono small muted">{files?.length ?? 0} files · {formatBytes(totalSize)}</span></p>
        </div>
        <label className="btn btn-primary">
          {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} อัปโหลดไฟล์
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,.pdf,.png,.jpg,.jpeg,.webp,.docx,.txt"
            multiple
            hidden
            onChange={upload}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="segmented">
            {FILTERS.map((f) => (
              <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
        {!files ? (
          <div className="empty"><Loader2 className="spin" /></div>
        ) : shown.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><FileText size={22} /></div>
            Nothing here yet.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-sm">Type</th>
                <th className="hide-sm">Pages</th>
                <th className="hide-sm">Size</th>
                <th className="hide-sm">Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="name-cell">
                      {f.mime === 'application/zip' ? <FileArchive size={16} color="var(--accent)" /> : <FileText size={16} color="var(--muted)" />}
                      {f.mime === 'application/pdf'
                        ? <a href={fileUrl(f.id)} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}><span>{f.name}</span></a>
                        : <span>{f.name}</span>}
                    </div>
                  </td>
                  <td className="hide-sm">
                    <span className={`badge ${f.kind === 'output' ? 'badge-ok' : ''}`}>{f.kind === 'output' ? 'export' : 'upload'}</span>
                  </td>
                  <td className="num hide-sm">{f.pageCount ?? '—'}</td>
                  <td className="num hide-sm">{formatBytes(f.size)}</td>
                  <td className="num hide-sm">{new Date(f.createdAt).toLocaleString()}</td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-icon" onClick={() => downloadFile(f)} title="Download" aria-label="Download"><Download size={16} /></button>
                    <button className="btn btn-ghost btn-icon btn-danger" onClick={() => remove(f)} title="Delete" aria-label="Delete"><Trash2 size={16} /></button>
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
