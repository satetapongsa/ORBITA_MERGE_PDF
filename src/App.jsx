import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Sortable from 'sortablejs';
import confetti from 'canvas-confetti';
import { 
  FileStack, 
  Image as ImageIcon, 
  UploadCloud, 
  RotateCw, 
  Trash2, 
  GripVertical, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Zap, 
  Download,
  AlertCircle,
  Plus,
  RefreshCw,
  Cpu
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [currentMode, setCurrentMode] = useState('merge'); // 'merge' | 'pdf-to-png'
  const [loadedFiles, setLoadedFiles] = useState([]); // [{ id, file, name, size, pageCount, pdfJsDoc, arrayBuffer }]
  const [activePages, setActivePages] = useState([]); // [{ id, fileId, fileName, pageIndex, rotation, thumbnailDataUrl }]
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' }); // type: 'loading' | 'success' | 'error' | ''
  const [pngScale, setPngScale] = useState('4.17'); // 300 DPI Ultra HD default
  const [exportName, setExportName] = useState('orbita-export');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const fileListRef = useRef(null);
  const pagesGridRef = useRef(null);
  const fileSortableRef = useRef(null);
  const pageSortableRef = useRef(null);

  // Initialize and update Sortable on file list
  useEffect(() => {
    if (fileListRef.current && loadedFiles.length > 0) {
      if (fileSortableRef.current) fileSortableRef.current.destroy();
      fileSortableRef.current = new Sortable(fileListRef.current, {
        animation: 180,
        handle: '.file-row-item',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex === newIndex) return;
          setLoadedFiles(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(oldIndex, 1);
            updated.splice(newIndex, 0, moved);

            // Reorder activePages to follow new file sequence
            setActivePages(currPages => {
              const reordered = [];
              updated.forEach(f => {
                reordered.push(...currPages.filter(p => p.fileId === f.id));
              });
              return reordered;
            });

            return updated;
          });
        }
      });
    }
    return () => {
      if (fileSortableRef.current) fileSortableRef.current.destroy();
    };
  }, [loadedFiles]);

  // Initialize and update Sortable on page cards grid
  useEffect(() => {
    if (pagesGridRef.current && activePages.length > 0) {
      if (pageSortableRef.current) pageSortableRef.current.destroy();
      pageSortableRef.current = new Sortable(pagesGridRef.current, {
        animation: 200,
        handle: '.page-tile-card',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex === newIndex) return;
          setActivePages(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(oldIndex, 1);
            updated.splice(newIndex, 0, moved);
            return updated;
          });
        }
      });
    }
    return () => {
      if (pageSortableRef.current) pageSortableRef.current.destroy();
    };
  }, [activePages]);

  // Handle incoming files
  const handleFiles = async (files) => {
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setStatus({ text: 'กรุณาเลือกไฟล์ PDF เท่านั้น', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatus({ text: 'กำลังอ่านไฟล์และเรนเดอร์พรีวิวทุกหน้าด้วยความเร็วสูง...', type: 'loading' });

    const newLoadedFiles = [];
    const newActivePages = [];

    for (const file of pdfFiles) {
      const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        const numPages = pdfJsDoc.numPages;

        newLoadedFiles.push({
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          pageCount: numPages,
          arrayBuffer,
          pdfJsDoc
        });

        for (let i = 1; i <= numPages; i++) {
          const page = await pdfJsDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.38 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: ctx, viewport }).promise;
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);

          newActivePages.push({
            id: 'page_' + Math.random().toString(36).substring(2, 9),
            fileId,
            fileName: file.name,
            pageIndex: i - 1,
            rotation: 0,
            thumbnailDataUrl: thumbUrl
          });
        }
      } catch (err) {
        console.error('File parsing error:', err);
        setStatus({ text: `เกิดข้อผิดพลาดในการโหลดไฟล์ ${file.name}: ${err.message}`, type: 'error' });
      }
    }

    setLoadedFiles(prev => [...prev, ...newLoadedFiles]);
    setActivePages(prev => [...prev, ...newActivePages]);
    setIsProcessing(false);
    setStatus({ text: `โหลดเสร็จสมบูรณ์ พร้อมจัดเรียงหน้าและแปลงไฟล์ (${newActivePages.length} หน้า)`, type: 'success' });
  };

  // Rotate single page
  const rotatePage = (pageId) => {
    setActivePages(prev => prev.map(p => {
      if (p.id === pageId) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  };

  // Rotate all pages
  const rotateAllPages = () => {
    setActivePages(prev => prev.map(p => ({
      ...p,
      rotation: (p.rotation + 90) % 360
    })));
  };

  // Remove single page
  const deletePage = (pageId) => {
    setActivePages(prev => prev.filter(p => p.id !== pageId));
  };

  // Remove whole file
  const deleteFile = (fileId) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
    setActivePages(prev => prev.filter(p => p.fileId !== fileId));
  };

  // Clear all
  const clearAll = () => {
    setLoadedFiles([]);
    setActivePages([]);
    setStatus({ text: '', type: '' });
  };

  // Merge PDF Action
  const handleMergePDF = async () => {
    if (activePages.length === 0) return;
    setIsProcessing(true);
    setStatus({ text: 'กำลังผสานและสร้างไฟล์ PDF ตามลำดับหน้าของคุณ...', type: 'loading' });

    try {
      const mergedPdf = await PDFDocument.create();
      const pdfLibCache = new Map();

      for (const f of loadedFiles) {
        const doc = await PDFDocument.load(f.arrayBuffer);
        pdfLibCache.set(f.id, doc);
      }

      for (let i = 0; i < activePages.length; i++) {
        const p = activePages[i];
        const sourceDoc = pdfLibCache.get(p.fileId);
        if (sourceDoc) {
          const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [p.pageIndex]);
          if (p.rotation !== 0) {
            const currAngle = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees((currAngle + p.rotation) % 360));
          }
          mergedPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await mergedPdf.save();
      const filename = (exportName.trim() || 'orbita-document') + '.pdf';
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setStatus({ text: `🎉 ผสานเอกสาร PDF สำเร็จเรียบร้อย (${activePages.length} หน้า)`, type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: 'เกิดข้อผิดพลาดในการผสานไฟล์: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF to PNG Action
  const handlePdfToPng = async () => {
    if (activePages.length === 0) return;
    setIsProcessing(true);
    const scale = parseFloat(pngScale) || 4.17;
    setStatus({ text: `กำลังแปลงภาพ PNG คมชัดสูง (หน้า 1/${activePages.length})...`, type: 'loading' });

    try {
      const zip = new JSZip();
      const folder = zip.folder('png_pages');

      for (let i = 0; i < activePages.length; i++) {
        const p = activePages[i];
        setStatus({ text: `กำลังเรนเดอร์ Ultra HD หน้าที่ ${i + 1}/${activePages.length}...`, type: 'loading' });

        const fileObj = loadedFiles.find(f => f.id === p.fileId);
        if (!fileObj) continue;

        const page = await fileObj.pdfJsDoc.getPage(p.pageIndex + 1);
        const viewport = page.getViewport({ scale, rotation: p.rotation });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const numStr = String(i + 1).padStart(3, '0');
        folder.file(`page_${numStr}.png`, blob);
      }

      setStatus({ text: 'กำลังบีบอัดไฟล์ ZIP...', type: 'loading' });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = (exportName.trim() || 'orbita-export') + '_png.zip';
      saveAs(zipBlob, filename);

      confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
      setStatus({ text: `🎉 แปลงไฟล์เป็นภาพ PNG (${scale >= 4 ? '300 DPI Ultra HD' : 'HD'}) สำเร็จ ${activePages.length} หน้า!`, type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: 'เกิดข้อผิดพลาดในการแปลงไฟล์: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="react-app-root">
      {/* Background Animated Orbs */}
      <div className="bg-mesh">
        <div className="mesh-orb orb-1"></div>
        <div className="mesh-orb orb-2"></div>
        <div className="mesh-orb orb-3"></div>
        <div className="bg-grid-overlay"></div>
      </div>

      {/* Global Navigation Header */}
      <header className="navbar">
        <div className="nav-container">
          <a href="#" className="nav-logo">
            <div className="logo-icon">
              <Zap size={22} color="#fff" />
            </div>
            <span className="logo-text">ORBITA</span>
            <span className="logo-badge">PRO SUITE</span>
          </a>

          <ul className="nav-links">
            <li><a href="#studio">สตูดิโอเครื่องมือ</a></li>
            <li><a href="#features">จุดเด่นระบบ</a></li>
            <li><a href="#security">ความปลอดภัย</a></li>
          </ul>

          <a href="#studio" className="nav-cta">
            <span>เริ่มใช้งานฟรี</span>
            <Sparkles size={16} />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-pill">
          <Cpu size={16} />
          <span>React 18 Architecture • WebAssembly Powered • 100% In-Browser Privacy</span>
        </div>
        <h1 className="hero-title">
          แปลงไฟล์ระดับเวิลด์คลาส <span className="gradient-text">เร็ว คมชัด สั่งการได้ดั่งใจนึก</span>
        </h1>
        <p className="hero-desc">
          สตูดิโอแปลงไฟล์ PDF เป็นภาพ PNG คมชัดสูงสุด Ultra HD 300 DPI หรือรวมไฟล์ PDF หลายฉบับ จัดเรียงไฟล์และสลับหน้ากระดาษได้อิสระตามจินตนาการ ลื่นไหลที่สุด
        </p>

        <div className="trust-badges">
          <div className="trust-item">
            <CheckCircle2 size={16} />
            <span>ประมวลผลบนเครื่อง 100%</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={16} />
            <span>Ultra HD 300 DPI Rendering</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={16} />
            <span>Interactive Drag & Drop Page Reorder</span>
          </div>
        </div>
      </section>

      {/* Main Studio Workstation */}
      <section className="studio-section" id="studio">
        <div className="studio-wrapper">
          {/* Tool Navigation Switcher */}
          <div className="tool-switcher">
            <button 
              className={`tool-tab-btn ${currentMode === 'merge' ? 'active' : ''}`}
              onClick={() => setCurrentMode('merge')}
            >
              <FileStack size={18} />
              <span>รวมไฟล์ PDF & จัดเรียงหน้า</span>
            </button>

            <button 
              className={`tool-tab-btn ${currentMode === 'pdf-to-png' ? 'active' : ''}`}
              onClick={() => setCurrentMode('pdf-to-png')}
            >
              <ImageIcon size={18} />
              <span>แปลง PDF เป็น PNG (Ultra HD)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div 
            className={`dropzone-zone ${isDragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
          >
            <div className="drop-icon-box">
              <UploadCloud size={38} />
            </div>
            <h3 className="drop-title">คลิกเพื่อเลือกไฟล์ หรือลากเอกสาร PDF มาวางที่นี่</h3>
            <p className="drop-sub">รองรับหลายไฟล์พร้อมกัน ไม่จำกัดขนาด ประมวลผลในเครื่องแบบเรียลไทม์</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              accept="application/pdf" 
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Toolbar when files exist */}
          {loadedFiles.length > 0 && (
            <div className="control-toolbar">
              <div className="stat-group">
                <div className="stat-chip">
                  <span>ไฟล์ที่โหลด:</span>
                  <span className="chip-highlight">{loadedFiles.length} ไฟล์</span>
                </div>
                <div className="stat-chip">
                  <span>จำนวนหน้ารวม:</span>
                  <span className="chip-highlight">{activePages.length} หน้า</span>
                </div>
              </div>

              <div className="btn-group">
                <button className="btn-action-sm" onClick={() => fileInputRef.current?.click()}>
                  <Plus size={14} />
                  <span>เพิ่มไฟล์</span>
                </button>
                <button className="btn-action-sm" onClick={rotateAllPages}>
                  <RotateCw size={14} />
                  <span>หมุนทุกหน้า +90°</span>
                </button>
                <button className="btn-action-sm danger" onClick={clearAll}>
                  <Trash2 size={14} />
                  <span>ล้างทั้งหมด</span>
                </button>
              </div>
            </div>
          )}

          {/* File Queue Draggable Section (Shown in Merge Mode) */}
          {loadedFiles.length > 0 && currentMode === 'merge' && (
            <div className="file-reorder-section">
              <div className="section-headline">
                <span>📁 สลับคิวไฟล์ก่อน-หลัง</span>
                <span className="hint-pill">ลากแถวเพื่อสลับลำดับการผสานเอกสาร</span>
              </div>
              <div className="file-draggable-list" ref={fileListRef}>
                {loadedFiles.map((file, idx) => (
                  <div className="file-row-item" key={file.id} data-id={file.id}>
                    <div className="file-details">
                      <GripVertical size={18} className="handle-icon" />
                      <span className="file-title">{idx + 1}. {file.name}</span>
                      <span className="file-badges">({file.pageCount} หน้า • {formatBytes(file.size)})</span>
                    </div>
                    <button 
                      className="btn-tile-icon delete" 
                      title="ลบไฟล์นี้"
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Page Canvas Grid */}
          {activePages.length > 0 && (
            <div className="page-reorder-section">
              <div className="section-headline">
                <span>📑 จัดเรียงลำดับหน้าตามใจนึก (Visual Grid)</span>
                <span className="hint-pill">ลากสลับหน้า • คลิกหมุน หรือลบหน้าที่ไม่ต้องการ</span>
              </div>
              <div className="page-canvas-grid" ref={pagesGridRef}>
                {activePages.map((page, idx) => (
                  <div className="page-tile-card" key={page.id} data-id={page.id}>
                    <div className="page-preview-box">
                      <img 
                        src={page.thumbnailDataUrl} 
                        style={{ transform: `rotate(${page.rotation}deg)` }} 
                        alt={`Page ${idx + 1}`} 
                      />
                    </div>
                    <div className="page-footer-info">
                      <div>
                        <span className="page-num-tag">#{idx + 1}</span>
                        <span className="page-source-tag" title={page.fileName}>{page.fileName}</span>
                      </div>
                      <div className="page-tile-actions">
                        <button 
                          className="btn-tile-icon rotate" 
                          title="หมุน 90°"
                          onClick={(e) => { e.stopPropagation(); rotatePage(page.id); }}
                        >
                          <RotateCw size={12} />
                        </button>
                        <button 
                          className="btn-tile-icon delete" 
                          title="ลบหน้านี้"
                          onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Bar */}
          {loadedFiles.length > 0 && (
            <div className="settings-bar">
              {currentMode === 'pdf-to-png' && (
                <div className="setting-field">
                  <label htmlFor="png-scale">คุณภาพเรนเดอร์ PNG:</label>
                  <select 
                    id="png-scale" 
                    className="custom-select"
                    value={pngScale}
                    onChange={(e) => setPngScale(e.target.value)}
                  >
                    <option value="1.5">Standard HD (150 DPI)</option>
                    <option value="2.0">High Definition (200 DPI)</option>
                    <option value="4.17">Ultra HD 300 DPI Studio Quality</option>
                  </select>
                </div>
              )}

              <div className="setting-field">
                <label htmlFor="export-name">ชื่อไฟล์ผลลัพธ์:</label>
                <input 
                  id="export-name" 
                  type="text" 
                  className="custom-input"
                  style={{ minWidth: 240 }}
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Master Execution Action Panel */}
          <div className="action-panel">
            {status.text && (
              <div className={`notify-pill ${status.type}`}>
                {status.type === 'loading' && <span className="spinner"></span>}
                {status.type === 'success' && <CheckCircle2 size={16} />}
                {status.type === 'error' && <AlertCircle size={16} />}
                <span>{status.text}</span>
              </div>
            )}

            <button 
              className="master-btn"
              disabled={activePages.length === 0 || isProcessing}
              onClick={currentMode === 'merge' ? handleMergePDF : handlePdfToPng}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={20} className="spinner" />
                  <span>กำลังประมวลผล...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>
                    {currentMode === 'merge' ? 'ผสานและสร้างไฟล์ PDF ทันที' : 'แปลงเป็นภาพ PNG (Ultra HD)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Features Highlights */}
      <section className="features-section" id="features">
        <div className="section-tagline">POWERED BY REACT & CLIENT ENGINE</div>
        <h2 className="section-header">ที่สุดแห่งเทคโนโลยีจัดการเอกสารระดับสากล</h2>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <Zap size={26} />
            </div>
            <h3>เรนเดอร์ Ultra HD 300 DPI</h3>
            <p>แปลงหน้ากระดาษ PDF ออกมาเป็นภาพ PNG ระดับคมชัดสูงสุด เก็บทุกรายละเอียด ฟอนต์ ตัวอักษร และตารางไม่มีแตก เหมาะสำหรับงานสิ่งพิมพ์ระดับมืออาชีพ</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <Layers size={26} />
            </div>
            <h3>จัดเรียงหน้าตามใจนึก</h3>
            <p>ระบบ Visual Page Canvas สลับหน้าเอกสาร หมุนองศา ลบหน้าเสีย หรือนำเข้าไฟล์หลายฉบับมาประสานจัดเรียงคิวได้ดั่งใจด้วยอินเตอร์เฟซลากวางที่ลื่นไหล</p>
          </div>

          <div className="feature-box" id="security">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={26} />
            </div>
            <h3>ความปลอดภัยสูงสุด (Zero Data Leak)</h3>
            <p>ไม่มีการอัปโหลดไฟล์ของคุณไปยังเซิร์ฟเวอร์ภายนอก เอกสารถูกประมวลผลบนเครื่องของคุณแบบ 100% ผ่าน WebAssembly & Client Engine ปลอดภัยระดับองค์กร</p>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>© 2026 ORBITA CONVERTER STUDIO. All rights reserved.</div>
          <div>Engineered with React 18, Vite & WebAssembly for Next-Gen Performance.</div>
        </div>
      </footer>
    </div>
  );
}
