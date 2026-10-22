import { useState } from 'react';
import { ArrowLeft, FileText, Image as ImageIcon, FileCode, Minimize2, Check, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Dropzone from '../components/Dropzone.jsx';
import ExportPanel, { useExport } from '../components/ExportPanel.jsx';
import { formatBytes } from '../api.js';

const MODES = [
  {
    id: 'images-to-pdf',
    title: 'Images to PDF',
    desc: 'Convert JPG, PNG, or WebP images into a single PDF document.',
    accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp',
    label: 'Images (JPG, PNG, WebP)',
    multiple: true,
    action: 'Convert to PDF',
    endpoint: 'convert/images-to-pdf',
    icon: ImageIcon,
  },
  {
    id: 'pdf-to-docx',
    title: 'PDF to Word (.docx)',
    desc: 'Extract formatted document and text into an editable Word file.',
    accept: 'application/pdf,.pdf',
    label: 'PDF Document',
    multiple: false,
    action: 'Convert to Word (.docx)',
    endpoint: 'convert/pdf-to-docx',
    icon: FileText,
  },
  {
    id: 'pdf-to-txt',
    title: 'PDF to Text (.txt)',
    desc: 'Extract clean raw text from your PDF page by page.',
    accept: 'application/pdf,.pdf',
    label: 'PDF Document',
    multiple: false,
    action: 'Convert to Text (.txt)',
    endpoint: 'convert/pdf-to-txt',
    icon: FileCode,
  },
  {
    id: 'txt-to-pdf',
    title: 'Text to PDF',
    desc: 'Create an organized, formatted PDF from a plain text file.',
    accept: 'text/plain,.txt',
    label: 'Text file (.txt)',
    multiple: false,
    action: 'Convert to PDF',
    endpoint: 'convert/txt-to-pdf',
    icon: FileText,
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    desc: 'Reduce file size and optimize PDF streams for fast sharing.',
    accept: 'application/pdf,.pdf',
    label: 'PDF Document',
    multiple: false,
    action: 'Compress PDF',
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
        <Link to="/" className="back-link"><ArrowLeft size={16} /> All tools</Link>
        <h1>Smart File Converter</h1>
        <p className="muted">Convert images, documents, and optimize PDF files seamlessly.</p>
      </div>

      {/* Mode selection tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
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
              title={`Drop ${activeMode.label} here`}
              subtitle={activeMode.multiple ? 'or browse multiple files from your computer' : 'or browse a file from your computer'}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Selected files ({selectedFiles.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFiles([])}>Clear all</button>
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
                    <button className="btn btn-ghost btn-icon" onClick={() => removeFile(idx)} aria-label="Remove">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ExportPanel
          title="Conversion Details"
          actionLabel={activeMode.action}
          disabled={selectedFiles.length === 0}
          onExport={handleRun}
          exporter={exporter}
        >
          <div className="stack" style={{ gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Operation:</span>
              <b>{activeMode.title}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Input files:</span>
              <span className="mono">{selectedFiles.length} file(s)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Total size:</span>
              <span className="mono">{formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))}</span>
            </div>
          </div>
        </ExportPanel>
      </div>
    </div>
  );
}
