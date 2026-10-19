import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Combine, GripVertical, X } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatBytes } from '../api.js';
import Dropzone from '../components/Dropzone.jsx';
import PageThumb from '../components/PageThumb.jsx';
import ExportPanel, { ExportResult, useExport } from '../components/ExportPanel.jsx';

let seq = 0;
const toItems = (files) => files.map((file) => ({ key: `m${++seq}`, file }));

function FileRow({ item, index, onRemove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const { file } = item;
  return (
    <div
      ref={setNodeRef}
      className={`file-row ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Reorder ${file.name}`}>
        <GripVertical size={16} />
      </button>
      <span className="order">{String(index + 1).padStart(2, '0')}</span>
      <PageThumb fileId={file.id} width={40} className="thumb-sm" />
      <div className="meta">
        <div className="name" title={file.name}>{file.name}</div>
        <div className="mono small muted">{file.pageCount} pages · {formatBytes(file.size)}</div>
      </div>
      <button className="btn btn-ghost btn-icon" onClick={() => onRemove(item.key)} aria-label={`Remove ${file.name}`}>
        <X size={16} />
      </button>
    </div>
  );
}

export default function MergeTool() {
  const [items, setItems] = useState([]);
  const exporter = useExport('merge');
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const add = (files) => setItems((cur) => [...cur, ...toItems(files)]);
  const remove = (key) => setItems((cur) => cur.filter((i) => i.key !== key));
  const totalPages = items.reduce((n, i) => n + (i.file.pageCount || 0), 0);
  const totalSize = items.reduce((n, i) => n + i.file.size, 0);

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setItems((cur) => {
      const from = cur.findIndex((i) => i.key === active.id);
      const to = cur.findIndex((i) => i.key === over.id);
      return arrayMove(cur, from, to);
    });
  }

  const header = (
    <div className="page-head">
      <div>
        <Link to="/" className="back-link"><ArrowLeft size={14} /> All tools</Link>
        <div className="eyebrow"><Combine size={12} /> merge</div>
        <h1>Merge PDFs</h1>
        <p>Add your files, drag them into the right order, then merge.</p>
      </div>
    </div>
  );

  if (exporter.result) {
    return <>{header}<ExportResult file={exporter.result} onReset={() => { exporter.reset(); setItems([]); }} /></>;
  }

  return (
    <>
      {header}
      {items.length === 0 ? (
        <Dropzone onFiles={add} title="Drop the PDFs you want to merge" />
      ) : (
        <div className="workspace">
          <div className="stack">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
                <div className="file-list">
                  {items.map((item, i) => <FileRow key={item.key} item={item} index={i} onRemove={remove} />)}
                </div>
              </SortableContext>
            </DndContext>
            <Dropzone onFiles={add} compact />
          </div>
          <ExportPanel
            title="Merge summary"
            actionLabel="Merge & download"
            disabled={items.length < 2}
            exporter={exporter}
            onExport={() => exporter.run({ fileIds: items.map((i) => i.file.id) })}
          >
            <dl className="summary">
              <dt>Files</dt><dd>{items.length}</dd>
              <dt>Total pages</dt><dd>{totalPages}</dd>
              <dt>Combined size</dt><dd>{formatBytes(totalSize)}</dd>
            </dl>
            {items.length < 2 && <div className="alert alert-info">Add at least one more PDF to merge.</div>}
          </ExportPanel>
        </div>
      )}
    </>
  );
}
