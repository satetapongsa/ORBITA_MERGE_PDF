import { useState } from 'react';
import { ArrowLeft, FileText, Image as ImageIcon, FileCode, Minimize2, Check, X, Images, RotateCw, Trash2, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Dropzone from '../components/Dropzone.jsx';
import PageThumb from '../components/PageThumb.jsx';
import ExportPanel, { useExport } from '../components/ExportPanel.jsx';
import { fileUrl, formatBytes } from '../api.js';

let seq = 0;

const MODES = [
  {
    id: 'images-to-pdf',
    title: 'รูปภาพ เป็น PDF',
    desc: 'รวมภาพ JPG, PNG, WebP กี่ไฟล์ก็ได้ ลากเรียงหน้า หมุนรูปภาพ แล้วรวมเป็น PDF ฉบับเดียว',
    accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp',
    label: 'ไฟล์รูปภาพ (JPG, PNG, WebP)',
    multiple: true,
    canReorder: true,
    action: 'รวมและแปลงเป็น PDF',
    endpoint: 'convert/images-to-pdf',
    icon: ImageIcon,
  },
  {
    id: 'pdf-to-images',
    title: 'PDF เป็น ภาพ PNG',
    desc: 'แยกหน้าของเอกสาร PDF แต่ละหน้าออกมาเป็นไฟล์ภาพ PNG คมชัดสูง (หรือ ZIP รวม)',
    accept: 'application/pdf,.pdf',
    label: 'เอกสาร PDF',
    multiple: false,
    canReorder: false,
    action: 'แปลงเป็นภาพ PNG',
    endpoint: 'convert/pdf-to-images',
    icon: Images,
  },
  {
    id: 'pdf-to-docx',
    title: 'PDF เป็น Word (.docx)',
    desc: 'สกัดเนื้อหาเอกสารและข้อความออกมาเป็นไฟล์ Word ที่แก้ไขได้',
    accept: 'application/pdf,.pdf',
    label: 'เอกสาร PDF',
    multiple: false,
    canReorder: false,
    action: 'แปลงเป็นไฟล์ Word (.docx)',
    endpoint: 'convert/pdf-to-docx',
    icon: FileText,
  },
  {
    id: 'pdf-to-txt',
    title: 'PDF เป็น ข้อความ (.txt)',
    desc: 'สกัดข้อความทั้งหมดใน PDF แยกแต่ละหน้าเป็นไฟล์ข้อความธรรมดา',
    accept: 'application/pdf,.pdf',
    label: 'เอกสาร PDF',
    multiple: false,
    canReorder: false,
    action: 'แปลงเป็นข้อความ (.txt)',
    endpoint: 'convert/pdf-to-txt',
    icon: FileCode,
  },
  {
    id: 'txt-to-pdf',
    title: 'ข้อความ (.txt) เป็น PDF',
    desc: 'นำไฟล์ข้อความมาจัดหน้าเป็นเอกสาร PDF พร้อมพิมพ์หรือแชร์',
    accept: 'text/plain,.txt',
    label: 'ไฟล์ข้อความ (.txt)',
    multiple: false,
    canReorder: false,
    action: 'แปลงเป็นเอกสาร PDF',
    endpoint: 'convert/txt-to-pdf',
    icon: FileText,
  },
  {
    id: 'compress',
    title: 'บีบอัดไฟล์ PDF (Compress)',
    desc: 'ย่อขนาดไฟล์ PDF และเพิ่มประสิทธิภาพของเอกสารเพื่อให้ส่งต่อง่าย',
    accept: 'application/pdf,.pdf',
    label: 'เอกสาร PDF',
    multiple: false,
    canReorder: false,
    action: 'บีบอัดลดขนาด PDF',
    endpoint: 'compress',
    icon: Minimize2,
  },
];

function SortableImageTile({ item, index, onRotate, onRemove }) {
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
      <PageThumb fileId={`img:${fileUrl(item.file.id)}`} width={120} rotate={item.rotate} />
      <div className="tools" onPointerDown={stop} onKeyDown={stop}>
        <button onClick={() => onRotate(item.key)} title="หมุนภาพ 90°" aria-label="Rotate"><RotateCw size={14} /></button>
        <button className="del" onClick={() => onRemove(item.key)} title="ลบภาพนี้" aria-label="Remove"><Trash2 size={14} /></button>
      </div>
      <div className="label">
        <span><b>{String(index + 1).padStart(2, '0')}</b></span>
        <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.file.name}>
          {item.file.name}
        </span>
      </div>
    </div>
  );
}

export default function ConvertTool() {
  const [activeMode, setActiveMode] = useState(MODES[0]);
  const [selectedItems, setSelectedItems] = useState([]); // [{ key, file, rotate }]
  const exporter = useExport(activeMode.endpoint);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleModeChange(mode) {
    setActiveMode(mode);
    setSelectedItems([]);
    exporter.reset();
  }

  function handleFiles(files) {
    const newItems = files.map((f) => ({
      key: `img_${++seq}`,
      file: f,
      rotate: 0,
    }));
    if (activeMode.multiple) {
      setSelectedItems((cur) => [...cur, ...newItems]);
    } else {
      setSelectedItems(newItems.slice(0, 1));
    }
  }

  function removeTile(key) {
    setSelectedItems((cur) => cur.filter((it) => it.key !== key));
  }

  function rotateTile(key) {
    setSelectedItems((cur) =>
      cur.map((it) => (it.key === key ? { ...it, rotate: (it.rotate + 90) % 360 } : it))
    );
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setSelectedItems((cur) => {
      const from = cur.findIndex((i) => i.key === active.id);
      const to = cur.findIndex((i) => i.key === over.id);
      return arrayMove(cur, from, to);
    });
  }

  function handleRun() {
    if (activeMode.id === 'images-to-pdf') {
      exporter.run({
        items: selectedItems.map((it) => ({
          fileId: it.file.id,
          rotate: it.rotate,
        })),
      });
    } else if (activeMode.multiple) {
      exporter.run({ fileIds: selectedItems.map((it) => it.file.id) });
    } else {
      exporter.run({ fileId: selectedItems[0]?.file.id });
    }
  }

  const CurrentIcon = activeMode.icon;
  const isSortable = activeMode.canReorder && selectedItems.length > 0;

  return (
    <div className="tool-page">
      <div className="tool-head">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> ย้อนกลับไปหน้าเครื่องมือ</Link>
        <h1>ระบบแปลง เรียงหน้า และย่อขนาดไฟล์อัจฉริยะ</h1>
        <p className="muted">เลือกประเภทต้นฉบับ อัปโหลดกี่ไฟล์ก็ได้ ลากเรียงหน้า หมุนภาพ และส่งออกได้ทันที</p>
      </div>

      {/* Mode selection tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 24 }}>
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = activeMode.id === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode)}
              className="card"
              style={{
                padding: '16px',
                textAlign: 'left',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="tool-icon" style={{ width: 34, height: 34 }}>
                  <Icon size={18} />
                </div>
                {isSelected && <Check size={16} color="var(--accent)" />}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{mode.title}</div>
              <div className="small muted" style={{ lineHeight: 1.3 }}>{mode.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="tool-layout">
        <div className="tool-main">
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <CurrentIcon size={24} color="var(--accent)" />
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{activeMode.title}</h2>
                <div className="small muted">{activeMode.desc}</div>
              </div>
            </div>

            <Dropzone
              onFiles={handleFiles}
              multiple={activeMode.multiple}
              accept={activeMode.accept}
              fileTypeLabel={activeMode.label}
              title={`ลากวาง ${activeMode.label} ที่นี่`}
              subtitle={activeMode.multiple ? 'หรือคลิกเพื่อเลือกไฟล์ (เลือกได้กี่ไฟล์ก็ได้)' : 'หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ'}
            />
          </div>

          {selectedItems.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>ไฟล์ที่เลือกไว้ ({selectedItems.length})</span>
                  {activeMode.canReorder && (
                    <span className="small muted" style={{ marginLeft: 8 }}>(ลากสลับตำแหน่งเพื่อเรียงหน้า หรือกดหมุนภาพได้)</span>
                  )}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedItems([])}>ล้างทั้งหมด</button>
              </div>

              {isSortable ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={selectedItems.map((i) => i.key)} strategy={rectSortingStrategy}>
                    <div className="page-grid">
                      {selectedItems.map((item, idx) => (
                        <SortableImageTile
                          key={item.key}
                          item={item}
                          index={idx}
                          onRotate={rotateTile}
                          onRemove={removeTile}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedItems.map((item, idx) => (
                    <div
                      key={item.key}
                      className="file-row"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span className="mono small muted">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="meta" style={{ minWidth: 0 }}>
                          <div className="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</div>
                          <div className="mono small muted">{formatBytes(item.file.size)}</div>
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-icon" onClick={() => removeTile(item.key)} aria-label="ลบไฟล์นี้">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <ExportPanel
          title="รายละเอียดการส่งออก"
          actionLabel={activeMode.action}
          disabled={selectedItems.length === 0}
          onExport={handleRun}
          exporter={exporter}
        >
          <div className="stack" style={{ gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">ประเภทคำสั่ง:</span>
              <b>{activeMode.title}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">จำนวนไฟล์/หน้า:</span>
              <span className="mono">{selectedItems.length} รายการ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">ขนาดรวม:</span>
              <span className="mono">{formatBytes(selectedItems.reduce((sum, it) => sum + it.file.size, 0))}</span>
            </div>
          </div>
        </ExportPanel>
      </div>
    </div>
  );
}
