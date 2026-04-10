import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { 
  FilePlus, ArrowLeft, Download, Trash2, GripVertical, Image as ImageIcon, 
  Layers, Move, Loader2, CheckCircle2, AlertCircle, FolderArchive, 
  FileImage, FileText, FileSpreadsheet, Globe, Zap, ShieldCheck, Sparkles, Wand2,
  Presentation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';

// PDF.js Worker Configuration
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// --- Sortable Item Component ---
const SortableItem = ({ id, url, index, onDelete, label }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`glass page-thumbnail ${isDragging ? 'dragging' : ''}`}>
      <div className="page-number">{index + 1}</div>
      <img src={url} alt={label || `Page ${index + 1}`} />
      <p className="item-label">{label || `Page ${index + 1}`}</p>
      <div className="page-actions">
        <div className="drag-handle" {...attributes} {...listeners}><GripVertical size={16} /></div>
        <button className="delete-btn" onClick={() => onDelete(id)}><Trash2 size={16} /></button>
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]); 
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const tools = [
    { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: <FileImage />, color: '#ffb703', category: 'To PDF', desc: 'Convert images to PDF' },
    { id: 'word-to-pdf', name: 'WORD to PDF', icon: <FileText />, color: '#219ebc', category: 'To PDF', desc: 'Convert DOCX to PDF' },
    { id: 'excel-to-pdf', name: 'EXCEL to PDF', icon: <FileSpreadsheet />, color: '#023047', category: 'To PDF', desc: 'Convert XLSX to PDF' },
    { id: 'ppt-to-pdf', name: 'PPT to PDF', icon: <Presentation />, color: '#e63946', category: 'To PDF', desc: 'Convert PPTX to PDF', pro: true },
    { id: 'html-to-pdf', name: 'HTML to PDF', icon: <Globe />, color: '#8ecae6', category: 'To PDF', desc: 'Convert HTML to PDF' },
    
    { id: 'pdf-to-jpg', name: 'PDF to JPG', icon: <ImageIcon />, color: '#fb8500', category: 'From PDF', desc: 'Extract PDF pages as JPG' },
    { id: 'pdf-to-word', name: 'PDF to WORD', icon: <FileText />, color: '#219ebc', category: 'From PDF', desc: 'Extract text to Word', pro: true },
    { id: 'pdf-to-excel', name: 'PDF to EXCEL', icon: <FileSpreadsheet />, color: '#023047', category: 'From PDF', desc: 'Extract tables to Excel', pro: true },
    
    { id: 'pdf-merge', name: 'Merge PDF', icon: <Layers />, color: '#7000ff', category: 'Manage', desc: 'Combine multiple PDFs' },
    { id: 'pdf-reorder', name: 'Organize PDF', icon: <Move />, color: '#00f2ff', category: 'Manage', desc: 'Reorder PDF pages' },
    { id: 'pdf-compress', name: 'Compress PDF', icon: <Zap />, color: '#38b000', category: 'Manage', desc: 'Reduce file size', pro: true },
    
    { id: 'pdf-protect', name: 'Protect PDF', icon: <ShieldCheck />, color: '#d00000', category: 'Security', desc: 'Add password to PDF', pro: true },
    { id: 'pdf-unlock', name: 'Unlock PDF', icon: <AlertCircle />, color: '#ff7d00', category: 'Security', desc: 'Remove PDF password', pro: true },
    { id: 'pdf-sign', name: 'Sign PDF', icon: <Wand2 />, color: '#4361ee', category: 'Security', desc: 'Apply digital signature', pro: true },
    { id: 'pdf-watermark', name: 'Watermark', icon: <Sparkles />, color: '#7209b7', category: 'Security', desc: 'Add patterns to PDF', pro: true },
  ];

  const handleFileSelect = async (e) => {

    const currentToolData = tools.find(t => t.id === activeTool);
    if (currentToolData?.pro && !isPro) {
      setShowPayModal(true);
      e.target.value = null;
      return;
    }

    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    if (activeTool === 'pdf-reorder') {
      const pdfFile = selectedFiles.find(f => f.type === 'application/pdf');
      if (!pdfFile) return setStatus({ type: 'error', message: 'กรุณาเลือกไฟล์ PDF' });
      setLoading(true);
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const newItems = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          canvas.height = viewport.height; canvas.width = viewport.width;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          newItems.push({ id: `page-${i}-${Date.now()}`, url: canvas.toDataURL(), originalIndex: i - 1, file: pdfFile });
          setProgress(Math.round((i / pdf.numPages) * 100));
        }
        setItems(newItems);
        setFiles([pdfFile]);
      } catch (err) { setStatus({ type: 'error', message: 'PDF Error' }); }
      setLoading(false);
    } else if (activeTool === 'jpg-to-pdf') {
      const imgFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
      const newItems = await Promise.all(imgFiles.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ id: `${Date.now()}-${Math.random()}`, url: e.target.result, file, label: file.name });
        reader.readAsDataURL(file);
      })));
      setItems(prev => [...prev, ...newItems]);
    } else {
      setFiles(prev => [...prev, ...selectedFiles]);
    }
    e.target.value = null;
  };

  const processRequest = async () => {
    setLoading(true); setProgress(0);
    try {
      if (activeTool === 'jpg-to-pdf') await runJpgToPdf();
      else if (activeTool === 'pdf-to-jpg') await runPdfToJpg();
      else if (activeTool === 'word-to-pdf') await runWordToPdf();
      else if (activeTool === 'excel-to-pdf') await runExcelToPdf();
      else if (activeTool === 'pdf-merge') await runMerge();
      else if (activeTool === 'pdf-reorder') await runReorder();
      else setStatus({ type: 'error', message: 'Coming Soon' });
    } catch (err) { 
        console.error(err);
        setStatus({ type: 'error', message: 'Operation Failed' }); 
    }
    setLoading(false);
  };

  const runJpgToPdf = async () => {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const imgBytes = await item.file.arrayBuffer();
      const img = item.file.type.includes('png') ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }
    download(await pdfDoc.save(), 'images.pdf', 'application/pdf');
    triggerSuccess();
  };

  const runPdfToJpg = async () => {
    const zip = new JSZip();
    for (const file of files) {
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const folder = zip.folder(file.name.replace('.pdf', ''));
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        folder.file(`p${i}.jpg`, canvas.toDataURL('image/jpeg').split(',')[1], { base64: true });
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
    }
    download(await zip.generateAsync({ type: 'blob' }), 'images.zip', 'application/zip');
    triggerSuccess('บันทึกรูปภาพลง ZIP สำเร็จ!');
  };

  const runWordToPdf = async () => {
    const doc = new jsPDF();
    for (let i = 0; i < files.length; i++) {
      const { value } = await mammoth.convertToHtml({ arrayBuffer: await files[i].arrayBuffer() });
      const el = document.createElement('div'); el.innerHTML = value; el.style.width = '600px'; el.style.padding = '40px'; el.style.background = '#fff';
      document.body.appendChild(el);
      const canvas = await html2canvas(el);
      if (i > 0) doc.addPage();
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, (canvas.height * 190) / canvas.width);
      document.body.removeChild(el);
      setProgress(Math.round(((i+1)/files.length)*100));
    }
    doc.save('word.pdf'); triggerSuccess();
  };

  const runExcelToPdf = async () => {
    const doc = new jsPDF();
    for (let i = 0; i < files.length; i++) {
      const wb = XLSX.read(await files[i].arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (i > 0) doc.addPage();
      autoTable(doc, { head: [json[0]], body: json.slice(1) });
      setProgress(Math.round(((i+1)/files.length)*100));
    }
    doc.save('excel.pdf'); triggerSuccess();
  };

  const runMerge = async () => {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }
    download(await mergedPdf.save(), 'merged.pdf', 'application/pdf');
    triggerSuccess();
  };

  const runReorder = async () => {
    const newPdf = await PDFDocument.create();
    const cache = new Map();
    for (const item of items) {
      if (!cache.has(item.file)) cache.set(item.file, await PDFDocument.load(await item.file.arrayBuffer()));
      const [pg] = await newPdf.copyPages(cache.get(item.file), [item.originalIndex]);
      newPdf.addPage(pg);
    }
    download(await newPdf.save(), 'reordered.pdf', 'application/pdf');
    triggerSuccess();
  };

  const download = (data, name, type) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  };
  const triggerSuccess = (msg = 'เสร็จสิ้น!') => { setStatus({ type: 'success', message: msg }); confetti(); };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(i => i.id === active.id);
        const newIndex = prev.findIndex(i => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleToolClick = (t) => {
    if (t.pro && !isPro) {
      setShowPayModal(true);
    } else {
      setActiveTool(t.id);
      setFiles([]);
      setItems([]);
    }
  };

  return (
    <div className="layout-root">
      <div className="top-header">
        <div className="logo-section">
          <div className="app-icon"><Sparkles size={24} color="#00f2ff" /></div>
          <span className="logo-text">PDF MAGIC</span>
        </div>
        <div className="header-actions">
          {!isPro ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pro-btn glass" onClick={() => setShowPayModal(true)}>
              <Zap size={16} fill="#ffd700" color="#ffd700" /> Unlock Pro
            </motion.button>
          ) : (
            <div className="pro-active-badge neon-green">
              <ShieldCheck size={16} /> Premium Active
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeTool ? (
          <motion.div key="dash" className="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="hero-section">
              <div className="badge">Professional PDF Solutions</div>
              <h1>One Stop <span className="text-gradient">PDF Magic</span></h1>
              <p className="subtitle-main">Fast, Secure, and Free. No registrations required.</p>
              <div className="stats-row">
                <div className="stat"><Zap size={16} /> Instant</div>
                <div className="stat"><ShieldCheck size={16} /> Secure</div>
                <div className="stat"><Sparkles size={16} /> High Quality</div>
              </div>
            </div>
            {['To PDF', 'From PDF', 'Manage', 'Security'].map(cat => (
              <div key={cat} className="group-container">
                <h2 className="cat-title">
                  {cat === 'To PDF' ? 'CONVERT TO PDF' : 
                   cat === 'From PDF' ? 'CONVERT FROM PDF' : 
                   cat === 'Manage' ? 'OPTIMIZE & ORGANIZE' : 'SECURITY & PROTECTION'}
                </h2>
                <div className="tools-grid-main">
                  {tools.filter(t => t.category === cat).map(t => (
                    <motion.div whileHover={{ y: -5 }} key={t.id} className="tool-box glass" onClick={() => handleToolClick(t)}>
                      {t.pro && !isPro && <div className="pro-tag">PRO</div>}
                      {t.pro && isPro && <div className="pro-tag unlocked">✅</div>}
                      <div className="box-icon" style={{ background: t.color }}>{t.icon}</div>
                      <div className="box-info"><h3>{t.name}</h3><p>{t.desc}</p></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="active" className="tool-interface" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="nav-bar">
              <button className="back-link" onClick={() => { setActiveTool(null); setFiles([]); setItems([]); }}>
                <ArrowLeft size={16} /> Return to Menu
              </button>
              <div className="tool-identity">
                <div className="small-icon" style={{ background: tools.find(t => t.id === activeTool).color }}>{tools.find(t => t.id === activeTool).icon}</div>
                <h2>{tools.find(t => t.id === activeTool).name}</h2>
              </div>
            </div>
            <div className="workspace-card glass">
              {(files.length === 0 && items.length === 0) ? (
                <div className="upload-container" onClick={() => fileInputRef.current.click()}>
                  <div className="upload-icon-box"><FilePlus size={48} /></div>
                  <p>ลากไฟล์มาที่นี่ หรือคลิกเพื่ออัปโหลด</p>
                  <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileSelect} />
                </div>
              ) : (
                <div className="active-area">
                  {items.length > 0 ? (
                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                      <div className="items-grid-scroll">
                        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                          {items.map((it, idx) => <SortableItem key={it.id} id={it.id} url={it.url} index={idx} label={it.label} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />)}
                        </SortableContext>
                      </div>
                    </DndContext>
                  ) : (
                    <div className="items-list-scroll">
                      {files.map((f, i) => <div key={i} className="list-row glass"><FileText size={18} /> <div className="p-name">{f.name}</div><button onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button></div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            {(files.length > 0 || items.length > 0) && (
              <div className="floating-action-bar glass animate-up">
                <div className="count-chip">{files.length || items.length} ไฟล์</div>
                <button className="cta-btn" onClick={processRequest} disabled={loading}>{loading ? <><Loader2 className="spin" size={20} /> กำลังรัน ({progress}%)</> : <><Wand2 size={20} /> เริ่มต้นเลย</>}</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {status && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: 50 }} className={`notif ${status.type}`}>
            <CheckCircle2 size={18} /> {status.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPayModal && (
          <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="pay-modal glass" 
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <Zap fill="#ffd700" color="#ffd700" size={32} />
                <h2>Unlock PDF Magic Pro</h2>
              </div>
              <div className="pricing-grid">
                <div className="pricing-card">
                  <span className="price">Free</span>
                  <ul>
                    <li><CheckCircle2 size={14} /> Basic conversions</li>
                    <li><CheckCircle2 size={14} /> Standard quality</li>
                  </ul>
                </div>
                <div className="pricing-card popular">
                  <div className="popular-tag">BEST VALUE</div>
                  <span className="price">$9.99/mo</span>
                  <ul>
                    <li><CheckCircle2 size={14} /> All Pro Tools unlocked</li>
                    <li><CheckCircle2 size={14} /> Ultra High Quality</li>
                    <li><CheckCircle2 size={14} /> Priority Support</li>
                  </ul>
                  <button className="cta-btn gold-btn" onClick={() => { setIsPro(true); setShowPayModal(false); triggerSuccess("Upgrade successful! ✨"); }}>
                    Unlock Now (Simulated)
                  </button>
                </div>
              </div>
              <button className="close-modal" onClick={() => setShowPayModal(false)}>Maybe Later</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
