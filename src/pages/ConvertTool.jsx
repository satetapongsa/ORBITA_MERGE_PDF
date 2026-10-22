import { useState } from 'react';
import { ArrowLeft, FileText, Image as ImageIcon, FileCode, Minimize2, Check, RefreshCw, X, Images } from 'lucide-react';
import { Link } from 'react-router-dom';
import Dropzone from '../components/Dropzone.jsx';
import ExportPanel, { useExport } from '../components/ExportPanel.jsx';
import { formatBytes } from '../api.js';

const MODES = [
  {
    id: 'images-to-pdf',
    title: 'รูปภาพ เป็น PDF',
    desc: 'รวมภาพ JPG, PNG หรือ WebP หลายๆ รูปเข้าเป็นเอกสาร PDF ฉบับเดียว',
    accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp',
    label: 'ไฟล์รูปภาพ (JPG, PNG, WebP)',
    multiple: true,
    action: 'แปลงเป็นเอกสาร PDF',
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
    action: 'บีบอัดลดขนาด PDF',
    endpoint: 'compress',
    icon: Minimize2,
  },
];

export default function ConvertTool() {
  const [activeMode, setActiveMode] = useState(MODES[0]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const exporter = useExport(activeMode.endpoint);

  function handleModeChange(mode) {
    setActiveMode(mode);
    setSelectedFiles([]);
    exporter.reset();
  }

  function handleFiles(files) {
    if (activeMode.multiple) {
      setSelectedFiles((cur) => [...cur, ...files]);
    } else {
      setSelectedFiles(files.slice(0, 1));
    }
  }

  function removeFile(index) {
    setSelectedFiles((cur) => cur.filter((_, i) => i !== index));
  }

  function handleRun() {
    if (activeMode.multiple) {
      exporter.run({ fileIds: selectedFiles.map((f) => f.id) });
    } else {
      exporter.run({ fileId: selectedFiles[0]?.id });
    }
  }

  const CurrentIcon = activeMode.icon;

  return (
    <div className="tool-page">
      <div className="tool-head">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> ย้อนกลับไปหน้าเครื่องมือ</Link>
        <h1>ระบบแปลงและย่อขนาดไฟล์อัจฉริยะ (Smart Converter)</h1>
        <p className="muted">แปลงไฟล์รูปภาพ, เอกสาร Word, ข้อความ Text และบีบอัดไฟล์ PDF ได้ง่ายๆ ในที่เดียว</p>
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
              subtitle={activeMode.multiple ? 'หรือคลิกเพื่อเลือกหลายไฟล์จากเครื่องของคุณ' : 'หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ'}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>ไฟล์ที่เลือกไว้ ({selectedFiles.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFiles([])}>ล้างทั้งหมด</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={file.id + idx}
                    className="file-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span className="mono small muted">{String(idx + 1).padStart(2, '0')}</span>
                      <div className="meta" style={{ minWidth: 0 }}>
                        <div className="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                        <div className="mono small muted">{formatBytes(file.size)}</div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => removeFile(idx)} aria-label="ลบไฟล์นี้">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ExportPanel
          title="รายละเอียดการแปลงไฟล์"
          actionLabel={activeMode.action}
          disabled={selectedFiles.length === 0}
          onExport={handleRun}
          exporter={exporter}
        >
          <div className="stack" style={{ gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">ประเภทคำสั่ง:</span>
              <b>{activeMode.title}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">จำนวนไฟล์:</span>
              <span className="mono">{selectedFiles.length} ไฟล์</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">ขนาดรวม:</span>
              <span className="mono">{formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))}</span>
            </div>
          </div>
        </ExportPanel>
      </div>
    </div>
  );
}
