import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, FlipVertical2, RotateCcw, RotateCw, Trash2, Undo2 } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Dropzone from '../components/Dropzone.jsx';
import PageThumb from '../components/PageThumb.jsx';
import ExportPanel, { ExportResult, useExport } from '../components/ExportPanel.jsx';

const SOURCE_COLORS = ['--group-1', '--group-2', '--group-3', '--group-4', '--group-5', '--group-6'];
let seq = 0;

function PageTile({ item, index, color, multiSource, onRotate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const stop = (e) => e.stopPropagation();
  return (
    <div
      ref={setNodeRef}
      className={`page-tile ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Page ${index + 1}`}
    >
      <PageThumb fileId={item.fileId} page={item.page} width={120} rotate={item.rotate} />
      <div className="tools" onPointerDown={stop} onKeyDown={stop}>
        <button onClick={() => onRotate(item.key)} title="Rotate 90Â°" aria-label="Rotate page"><RotateCw size={14} /></button>
        <button className="del" onClick={() => onDelete(item.key)} title="Remove page" aria-label="Remove page"><Trash2 size={14} /></button>
      </div>
      <div className="label">
        <span><b>{String(index + 1).padStart(2, '0')}</b></span>
        <span>
          {multiSource && <span className="src-dot" style={{ background: color }} />}
          p.{item.page + 1}{item.rotate ? ` Â· ${item.rotate}Â°` : ''}
        </span>
      </div>
    </div>
  );
}

export default function OrganizeTool() {
  const [sources, setSources] = useState([]);
  const [pages, setPages] = useState([]);
  const [history, setHistory] = useState([]);
  const exporter = useExport('organize');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (fn) => { setHistory((h) => [...h.slice(-30), pages]); setPages(fn(pages)); };

  function add(files) {
    setSources((s) => [...s, ...files.filter((f) => !s.some((x) => x.id === f.id))]);
    const added = files.flatMap((f) =>
      Array.from({ length: f.pageCount }, (_, page) => ({ key: `p${++seq}`, fileId: f.id, page, rotate: 0 })),
    );
    update((cur) => [...cur, ...added]);
  }

  const colorFor = (fileId) => `var(${SOURCE_COLORS[sources.findIndex((s) => s.id === fileId) % SOURCE_COLORS.length]})`;
  const rotate = (key) => update((cur) => cur.map((p) => (p.key === key ? { ...p, rotate: (p.rotate + 90) % 360 } : p)));
  const remove = (key) => update((cur) => cur.filter((p) => p.key !== key));
  const undo = () => { if (!history.length) return; setPages(history.at(-1)); setHistory(history.slice(0, -1)); };

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    update((cur) => arrayMove(cur, cur.findIndex((p) => p.key === active.id), cur.findIndex((p) => p.key === over.id)));
  }

  function startOver() {
    setSources([]);
    setPages([]);
    setHistory([]);
  }

  const header = (
    <div className="page-head">
      <div>
        <Link to="/" className="back-link"><ArrowLeft size={14} /> All tools</Link>
        <div className="eyebrow"><ArrowUpDown size={12} /> organize</div>
        <h1>Reorder pages</h1>
        <p>Drag pages into place. Hover a page to rotate or remove it.</p>
      </div>
    </div>
  );

  if (exporter.result) {
    return <>{header}<ExportResult file={exporter.result} onReset={() => { exporter.reset(); startOver(); }} /></>;
  }

  if (!sources.length) return <>{header}<Dropzone onFiles={add} title="Drop a PDF to reorder its pages" subtitle="Add more than one file to combine pages from several documents" /></>;

  const removed = sources.reduce((n, s) => n + s.pageCount, 0) - pages.length;
  const rotated = pages.filter((p) => p.rotate).length;

  return (
    <>
      {header}
      <div className="workspace">
        <div className="stack">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={undo} disabled={!history.length}><Undo2 size={14} /> Undo</button>
            <button className="btn btn-sm" onClick={() => update((cur) => [...cur].reverse())}><FlipVertical2 size={14} /> Reverse order</button>
            <button className="btn btn-sm" onClick={() => update((cur) => cur.map((p) => ({ ...p, rotate: (p.rotate + 90) % 360 })))}><RotateCw size={14} /> Rotate all</button>
            <span className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={startOver}><RotateCcw size={14} /> Start over</button>
          </div>

          {pages.length === 0 ? (
            <div className="card empty">All pages were removed. Use Undo to bring them back.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pages.map((p) => p.key)} strategy={rectSortingStrategy}>
                <div className="page-grid">
                  {pages.map((p, i) => (
                    <PageTile key={p.key} item={p} index={i} color={colorFor(p.fileId)} multiSource={sources.length > 1}
                      onRotate={rotate} onDelete={remove} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <Dropzone onFiles={add} compact />
        </div>

        <ExportPanel
          title="Document"
          actionLabel="Save & download"
          disabled={!pages.length}
          exporter={exporter}
          onExport={() => exporter.run({ pages: pages.map(({ fileId, page, rotate }) => ({ fileId, page, rotate })) })}
        >
          {sources.length > 1 && (
            <div className="stack" style={{ gap: 6 }}>
              {sources.map((s) => (
                <div key={s.id} className="row small" style={{ minWidth: 0 }}>
                  <span className="src-dot" style={{ background: colorFor(s.id), width: 10, height: 10, borderRadius: 3, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}
          <dl className="summary">
            <dt>Pages in output</dt><dd>{pages.length}</dd>
            <dt>Removed</dt><dd>{removed}</dd>
            <dt>Rotated</dt><dd>{rotated}</dd>
          </dl>
        </ExportPanel>
      </div>
    </>
  );
}
