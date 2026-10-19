import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Layers, ListOrdered, Scissors, X } from 'lucide-react';
import { formatBytes } from '../api.js';
import Dropzone from '../components/Dropzone.jsx';
import PageThumb from '../components/PageThumb.jsx';
import ExportPanel, { ExportResult, useExport } from '../components/ExportPanel.jsx';

const GROUP_COLORS = ['--group-1', '--group-2', '--group-3', '--group-4', '--group-5', '--group-6'];
const groupColor = (i) => `var(${GROUP_COLORS[i % GROUP_COLORS.length]})`;

/** Client-side mirror of the server's range parser, for live preview. */
function parseRanges(input, total) {
  const groups = [];
  for (const raw of input.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) return { error: `"${part}" isn't a valid range` };
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > total) return { error: `"${part}" must be within 1–${total}` };
    groups.push([a - 1, b - 1]);
  }
  return groups.length ? { groups } : { error: 'Enter at least one range' };
}

export default function SplitTool() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('ranges');
  const [ranges, setRanges] = useState('');
  const exporter = useExport('split');

  const total = file?.pageCount || 0;
  const parsed = useMemo(() => (mode === 'ranges' && file ? parseRanges(ranges, total) : null), [mode, ranges, total, file]);
  const groups = mode === 'each' ? Array.from({ length: total }, (_, i) => [i, i]) : parsed?.groups || [];
  const groupOf = (page) => groups.findIndex(([a, b]) => page >= a && page <= b);

  function choose(files) {
    const f = files[0];
    setFile(f);
    const half = Math.ceil(f.pageCount / 2);
    setRanges(f.pageCount > 1 ? `1-${half}, ${half + 1}-${f.pageCount}` : '1');
  }

  const header = (
    <div className="page-head">
      <div>
        <Link to="/" className="back-link"><ArrowLeft size={14} /> All tools</Link>
        <div className="eyebrow"><Scissors size={12} /> split</div>
        <h1>Split PDF</h1>
        <p>Choose a file, then split every page or pick the ranges you need.</p>
      </div>
    </div>
  );

  if (exporter.result) {
    return <>{header}<ExportResult file={exporter.result} onReset={() => exporter.reset()} resetLabel="Split again" /></>;
  }

  if (!file) return <>{header}<Dropzone onFiles={choose} multiple={false} title="Drop the PDF you want to split" /></>;

  const outputs = groups.length;
  return (
    <>
      {header}
      <div className="workspace">
        <div className="stack">
          <div className="file-row">
            <FileText size={18} color="var(--accent)" style={{ marginLeft: 6 }} />
            <div className="meta">
              <div className="name">{file.name}</div>
              <div className="mono small muted">{total} pages · {formatBytes(file.size)}</div>
            </div>
            <button className="btn btn-sm" onClick={() => setFile(null)}><X size={14} /> Change file</button>
          </div>
          <div className="page-grid">
            {Array.from({ length: total }, (_, i) => {
              const g = groupOf(i);
              return (
                <div
                  key={i}
                  className={`page-tile static-tile ${g >= 0 ? 'grouped' : 'dim'}`}
                  style={g >= 0 ? { borderColor: groupColor(g) } : undefined}
                >
                  <PageThumb fileId={file.id} page={i} width={120} />
                  <div className="label">
                    <span>p.<b>{i + 1}</b></span>
                    {g >= 0 && <span style={{ color: groupColor(g) }}>#{g + 1}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ExportPanel
          title="Split options"
          actionLabel={outputs > 1 ? `Split into ${outputs} files` : 'Extract pages'}
          disabled={!outputs}
          exporter={exporter}
          onExport={() => exporter.run({ fileId: file.id, mode, ranges })}
        >
          <div className="segmented" role="tablist">
            <button className={mode === 'ranges' ? 'on' : ''} onClick={() => setMode('ranges')}><ListOrdered size={14} /> Custom ranges</button>
            <button className={mode === 'each' ? 'on' : ''} onClick={() => setMode('each')}><Layers size={14} /> Every page</button>
          </div>

          {mode === 'ranges' ? (
            <div className="field">
              <label htmlFor="ranges">Page ranges</label>
              <input id="ranges" className="input mono" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="e.g. 1-3, 4, 5-8" />
              <span className="hint">Separate ranges with commas. Each range becomes its own PDF.</span>
              {parsed?.error && ranges && <span className="small" style={{ color: 'var(--danger)' }}>{parsed.error}</span>}
            </div>
          ) : (
            <p className="small muted">Each of the {total} pages will be saved as a separate PDF.</p>
          )}

          {mode === 'ranges' && outputs > 0 && (
            <div className="chip-list">
              {groups.map(([a, b], i) => (
                <span key={i} className="chip" style={{ background: groupColor(i) }}>
                  #{i + 1} · {a === b ? `p${a + 1}` : `p${a + 1}–${b + 1}`}
                </span>
              ))}
            </div>
          )}
          <dl className="summary">
            <dt>Output</dt><dd>{outputs > 1 ? `${outputs} PDFs in a .zip` : outputs === 1 ? '1 PDF' : '—'}</dd>
          </dl>
        </ExportPanel>
      </div>
    </>
  );
}
