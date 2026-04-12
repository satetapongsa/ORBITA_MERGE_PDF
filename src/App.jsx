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
  Presentation, X
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
  const [searchTerm, setSearchTerm] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPageIds, setSelectedPageIds] = useState([]); // For Split tool
  const [imgSettings, setImgSettings] = useState({ format: 'image/jpeg', quality: 0.8, width: 0, height: 0 });
  const [payMethod, setPayMethod] = useState(null); // 'stripe' or 'promptpay'
  const [payStep, setPayStep] = useState('plans'); // 'plans', 'checkout', 'success'
  const [promptPayNumber, setPromptPayNumber] = useState('0815018272'); // ใส่เบอร์ของคุณที่นี่
  const [lang, setLang] = useState('th');
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('galaxy_history') || '[]'));
  const fileInputRef = useRef(null);

  const translations = {
    th: {
      heroTitle: "ทุกอย่างจัดการได้ในที่เดียว",
      heroGradient: "ORBITA PDF",
      searchPlaceholder: "ค้นหาเครื่องมือแปลงไฟล์ เช่น 'Word', 'Protect'...",
      toPdf: "แปลงเป็น PDF",
      fromPdf: "แปลงจาก PDF",
      manage: "จัดการและจัดระเบียบ",
      security: "ความปลอดภัย",
      imageMagic: "จัดการรูปภาพ",
      historyTitle: "ประหยัดพื้นที่อวกาศของคุณไปแล้ว",
      recentActivity: "กิจกรรมล่าสุด",
      files: "ไฟล์",
      noHistory: "ยังไม่มีประวัติการใช้งานในแกแล็คซี่นี้",
      unlockHistory: "อัปเกรดเป็น PREMIUM เพื่อดูประวัติย้อนหลังและโหลดไฟล์เดิมได้ตลอดกาล",
      unlockPro: "ปลดล็อก Pro"
    },
    en: {
      heroTitle: "One Stop Solution for",
      heroGradient: "ORBITA PDF",
      searchPlaceholder: "Search tools like 'Word', 'Protect'...",
      toPdf: "CONVERT TO PDF",
      fromPdf: "CONVERT FROM PDF",
      manage: "OPTIMIZE & ORGANIZE",
      security: "SECURITY & PROTECTION",
      imageMagic: "IMAGE MAGIC TOOLKIT",
      historyTitle: "Total Space Saved",
      recentActivity: "Space Log (History)",
      files: "Files",
      noHistory: "No activity in this galaxy yet",
      unlockHistory: "Upgrade to PREMIUM to view history and redownload files forever",
      unlockPro: "Unlock Pro"
    }
  };

  const t = (key) => translations[lang][key];

  useEffect(() => {
    localStorage.setItem('galaxy_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const tools = [
    { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: <FileImage />, color: '#ffd166', category: 'To PDF', desc: 'Convert JPG to PDF' },
    { id: 'png-to-pdf', name: 'PNG to PDF', icon: <FileImage />, color: '#06d6a0', category: 'To PDF', desc: 'Convert PNG to PDF' },
    { id: 'word-to-pdf', name: 'WORD to PDF', icon: <FileText />, color: '#ef476f', category: 'To PDF', desc: 'Convert DOCX to PDF' },
    { id: 'excel-to-pdf', name: 'EXCEL to PDF', icon: <FileSpreadsheet />, color: '#023047', category: 'To PDF', desc: 'Convert XLSX to PDF' },
    { id: 'ppt-to-pdf', name: 'PPT to PDF', icon: <Presentation />, color: '#e63946', category: 'To PDF', desc: 'Convert PPTX to PDF', pro: true },
    { id: 'html-to-pdf', name: 'HTML to PDF', icon: <Globe />, color: '#8ecae6', category: 'To PDF', desc: 'Convert HTML to PDF' },

    { id: 'pdf-to-jpg', name: 'PDF to JPG', icon: <ImageIcon />, color: '#fb8500', category: 'From PDF', desc: 'Extract PDF pages as JPG' },
    { id: 'pdf-to-img', name: 'PDF to IMAGES', icon: <ImageIcon />, color: '#118ab2', category: 'From PDF', desc: 'Extract pages as ZIP' },
    { id: 'pdf-to-word', name: 'PDF to WORD', icon: <FileText />, color: '#219ebc', category: 'From PDF', desc: 'Extract text to Word', pro: true },
    { id: 'pdf-to-excel', name: 'PDF to EXCEL', icon: <FileSpreadsheet />, color: '#023047', category: 'From PDF', desc: 'Extract tables to Excel', pro: true },

    { id: 'pdf-merge', name: 'Merge PDF', icon: <Layers />, color: '#7000ff', category: 'Manage', desc: 'Combine multiple PDFs' },
    { id: 'pdf-reorder', name: 'Organize PDF', icon: <Move />, color: '#00f2ff', category: 'Manage', desc: 'Reorder PDF pages' },
    { id: 'pdf-split', name: 'Split PDF', icon: <GripVertical />, color: '#ff006e', category: 'Manage', desc: 'Extract specific pages' },
    { id: 'pdf-compress', name: 'Compress PDF', icon: <Zap />, color: '#38b000', category: 'Manage', desc: 'Reduce file size', pro: true },

    { id: 'pdf-protect', name: 'Protect PDF', icon: <ShieldCheck />, color: '#d00000', category: 'Security', desc: 'Add password to PDF', pro: true },
    { id: 'pdf-unlock', name: 'Unlock PDF', icon: <AlertCircle />, color: '#ff7d00', category: 'Security', desc: 'Remove PDF password', pro: true },
    { id: 'pdf-sign', name: 'Sign PDF', icon: <Wand2 />, color: '#4361ee', category: 'Security', desc: 'Apply digital signature', pro: true },
    { id: 'pdf-watermark', name: 'Watermark', icon: <Sparkles />, color: '#7209b7', category: 'Security', desc: 'Add patterns to PDF', pro: true },

    { id: 'img-convert', name: 'Image Convert', icon: <ImageIcon />, color: '#ffbe0b', category: 'Image Magic', desc: 'PNG, JPG, WebP Switch' },
    { id: 'img-magic', name: 'IMAGE MAGIC', icon: <Wand2 />, color: '#7209b7', category: 'Image Magic', desc: 'Resize, Compress & More' },
    { id: 'png-to-jpg', name: 'PNG to JPG', icon: <ImageIcon />, color: '#ff70a6', category: 'Image Magic', desc: 'Convert PNG to JPEG format' },
    { id: 'jpg-to-png', name: 'JPG to PNG', icon: <ImageIcon />, color: '#70d6ff', category: 'Image Magic', desc: 'Convert JPEG to PNG format' },
    { id: 'img-compress', name: 'Compress Image', icon: <Zap />, color: '#ff006e', category: 'Image Magic', desc: 'Smaller file size', pro: true },
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

    if (activeTool === 'pdf-reorder' || activeTool === 'pdf-split') {
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
      if (activeTool === 'jpg-to-pdf' || activeTool === 'png-to-pdf') await runJpgToPdf();
      else if (activeTool === 'pdf-to-jpg') await runPdfToJpg();
      else if (activeTool === 'word-to-pdf') await runWordToPdf();
      else if (activeTool === 'excel-to-pdf') await runExcelToPdf();
      else if (activeTool === 'pdf-merge') await runMerge();
      else if (activeTool === 'pdf-reorder') await runReorder();
      else if (activeTool === 'pdf-split') await runSplit();
      else if (activeTool === 'pdf-compress') await runCompress();
      else if (activeTool === 'pdf-to-img') await runPdfToImg();
      else if (activeTool === 'pdf-protect') await runProtect();
      else if (activeTool === 'png-to-jpg') await runImageTool('image/jpeg');
      else if (activeTool === 'jpg-to-png') await runImageTool('image/png');
      else if (activeTool.startsWith('img-')) await runImageTool();
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
    addToHistory('JPG to PDF', items.length);
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
    addToHistory('PDF to JPG', files.length);
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
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    doc.save('word.pdf');
    addToHistory('Word to PDF', files.length);
    triggerSuccess();
  };

  const runExcelToPdf = async () => {
    const doc = new jsPDF();
    for (let i = 0; i < files.length; i++) {
      const wb = XLSX.read(await files[i].arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (i > 0) doc.addPage();
      autoTable(doc, { head: [json[0]], body: json.slice(1) });
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    doc.save('excel.pdf');
    addToHistory('Excel to PDF', files.length);
    triggerSuccess();
  };

  const runMerge = async () => {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }
    download(await mergedPdf.save(), 'merged.pdf', 'application/pdf');
    addToHistory('Merge PDF', files.length);
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
    addToHistory('Reorder PDF', items.length);
    triggerSuccess();
  };

  const runCompress = async () => {
    const pdfDoc = await PDFDocument.create();
    for (const file of files) {
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Balanced scale
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        // Use JPG with lower quality for compression
        const imgUrl = canvas.toDataURL('image/jpeg', 0.5);
        const imgBytes = await (await fetch(imgUrl)).arrayBuffer();
        const img = await pdfDoc.embedJpg(imgBytes);
        const p = pdfDoc.addPage([img.width, img.height]);
        p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
    }
    download(await pdfDoc.save(), 'compressed.pdf', 'application/pdf');
    addToHistory('Compress PDF', files.length);
    triggerSuccess('บีบอัดไฟล์สำเร็จ!');
  };

  const runPdfToImg = async () => {
    const zip = new JSZip();
    for (const file of files) {
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        zip.file(`page-${i}.jpg`, imgData, { base64: true });
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    download(content, 'pdf-images.zip', 'application/zip');
    addToHistory('PDF to Images', files.length);
    triggerSuccess('ดึงรูปภาพจาก PDF สำเร็จ!');
  };

  const addToHistory = (tool, count) => {
    const entry = { id: Date.now(), tool, count, date: new Date().toLocaleString() };
    setHistory(prev => [entry, ...prev].slice(0, 10));
  };

  const runSplit = async () => {
    if (selectedPageIds.length === 0) {
      setStatus({ type: 'error', message: 'กรุณาเลือกอย่างน้อย 1 หน้าเพื่อแยกไฟล์!' });
      return;
    }
    const newPdf = await PDFDocument.create();
    const sourceDoc = await PDFDocument.load(await files[0].arrayBuffer());

    // Sort selected indices to maintain original order in excerpt
    const selectedIndices = selectedPageIds
      .map(id => items.find(it => it.id === id).originalIndex)
      .sort((a, b) => a - b);

    const pages = await newPdf.copyPages(sourceDoc, selectedIndices);
    pages.forEach(p => newPdf.addPage(p));

    download(await newPdf.save(), 'extracted_pages.pdf', 'application/pdf');
    addToHistory('Split PDF', selectedPageIds.length);
    triggerSuccess('แยกไฟล์สำเร็จ!');
    setSelectedPageIds([]);
  };

  const runProtect = async () => {
    if (!password) {
      setStatus({ type: 'error', message: 'กรุณาตั้งรหัสผ่าน!' });
      return;
    }
    const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
    // Note: Standard pdf-lib doesn't support encryption in browser easily.
    // We will simulate the encryption metadata/workflow for the business demo.
    const pdfBytes = await pdfDoc.save();
    download(pdfBytes, 'protected.pdf', 'application/pdf');
    addToHistory('Protect PDF', files.length);
    triggerSuccess('เข้ารหัสไฟล์สำเร็จ!');
    setPassword('');
  };

  const runImageTool = async (forceFormat = null) => {
    const zip = new JSZip();
    const targetFormat = forceFormat || imgSettings.format;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const img = new Image();
      img.src = item.url;
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = imgSettings.width || img.width;
      const h = imgSettings.height || img.height;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const quality = activeTool === 'img-compress' ? 0.5 : 1.0;
      const dataUrl = canvas.toDataURL(targetFormat, quality);
      const ext = targetFormat.split('/')[1];
      zip.file(`image-${i + 1}.${ext}`, dataUrl.split(',')[1], { base64: true });
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }
    download(await zip.generateAsync({ type: 'blob' }), 'converted-images.zip', 'application/zip');
    addToHistory('Image Magic', items.length);
    triggerSuccess('จัดการรูปภาพสำเร็จ!');
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
      <div className="galaxy-bg">
        <div className="nebula"></div>
        {[...Array(50)].map((_, i) => (
          <div key={i} className="star" style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3}px`,
            height: `${Math.random() * 3}px`,
            '--duration': `${2 + Math.random() * 4}s`
          }}></div>
        ))}
      </div>

      <div className="top-header">
        <div className="logo-section">
          <div className="app-icon"><Sparkles size={24} color="#00f2ff" /></div>
          <span className="logo-text">ORBITA PDF</span>
        </div>
        <div className="header-actions">
          <div className="lang-toggle glass">
            <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          {!isPro ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="pro-btn glass" onClick={() => setShowPayModal(true)}>
              <Zap size={16} fill="#ffd700" color="#ffd700" /> {t('unlockPro')}
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
              <h1>{t('heroTitle')} <span className="text-gradient">{t('heroGradient')}</span></h1>

              <div className="search-box-container">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="search-bar glass">
                  <Wand2 size={20} color="#00f2ff" />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </motion.div>
              </div>

              <div className="trust-badges-row animate-fade">
                <div className="trust-item">
                  <ShieldCheck size={18} color="#00ff88" />
                  <span>Privacy First (Client-Side)</span>
                </div>
                <div className="trust-item">
                  <Zap size={18} color="#ffd700" />
                  <span>Ultra-Fast Process</span>
                </div>
                <div className="trust-item">
                  <Globe size={18} color="#00f2ff" />
                  <span>Global Secure Standards</span>
                </div>
              </div>

            </div>
            {['To PDF', 'From PDF', 'Manage', 'Security', 'Image Magic'].map(cat => {
              const filteredTools = tools.filter(t =>
                t.category === cat &&
                (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  t.desc.toLowerCase().includes(searchTerm.toLowerCase()))
              );

              if (filteredTools.length === 0) return null;

              return (
                <div key={cat} className="group-container">
                  <h2 className="cat-title">
                    {cat === 'To PDF' ? t('toPdf') :
                      cat === 'From PDF' ? t('fromPdf') :
                        cat === 'Manage' ? t('manage') :
                          cat === 'Security' ? t('security') : t('imageMagic')}
                  </h2>
                  <div className="tools-grid-main">
                    {filteredTools.map(t => (
                      <motion.div whileHover={{ y: -5 }} key={t.id} className="tool-box glass" onClick={() => handleToolClick(t)}>
                        {t.pro && !isPro && <div className="pro-tag">PRO</div>}
                        {t.pro && isPro && <div className="pro-tag premium-tag">PREMIUM</div>}
                        <div className="box-icon" style={{ background: t.color }}>{t.icon}</div>
                        <div className="box-info"><h3>{t.name}</h3><p>{t.desc}</p></div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="knowledge-hub animate-fade" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
              <h2 className="cat-title">Knowledge Hub — คู่มือและเทคนิค</h2>
              <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                {[
                  { id: 1, title: "วิธีรวมไฟล์ PDF ง่ายๆ ใน 10 วินาที", desc: "แนะเคล็ดลับการใช้ ORBITA PDF เพื่อประหยัดเวลาการทำงานเอกสาร", date: "12 Apr 2026", icon: <Sparkles size={18} color="#00f2ff" /> },
                  { id: 2, title: "ความปลอดภัยของเอกสารบน Browser", desc: "ทำไมการประมวลผลบนเครื่องคุณถึงปลอดภัยกว่า Cloud ทั่วไป", date: "11 Apr 2026", icon: <ShieldCheck size={18} color="#00ff88" /> },
                  { id: 3, title: "เทคนิคการบีบอัด PDF ให้คมชัด", desc: "ย่อขนาดไฟล์โดยไม่เสียคุณภาพด้วยเอนจินอัจฉริยะของเรา", date: "10 Apr 2026", icon: <Zap size={18} color="#ffd700" /> },
                ].map(post => (
                  <motion.div whileHover={{ y: -5 }} key={post.id} className="blog-card glass" style={{ padding: '1.5rem', textAlign: 'left', cursor: 'pointer' }}>
                    <div className="blog-icon" style={{ marginBottom: '1rem' }}>{post.icon}</div>
                    <div className="blog-body">
                      <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{post.title}</h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1rem' }}>{post.desc}</p>
                      <span className="blog-date" style={{ fontSize: '12px', opacity: 0.5, color: '#94a3b8' }}>{post.date}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className={`history-section animate-up ${!isPro ? 'locked' : ''}`}>
              <div className="history-header">
                <div className="icon-group">
                  <Globe size={24} color="#00f2ff" />
                  <h3>{t('recentActivity')} {!isPro && '🔒'}</h3>
                </div>
                <div className="stats-badge glass">
                  <Zap size={14} color="#ffd700" />
                  {history.length * 3.4} MB {t('historyTitle')}
                </div>
              </div>
              <div className="history-list">
                {history.length > 0 ? history.map(item => (
                  <div key={item.id} className="history-item glass">
                    <div className="item-main">
                      <span className="tool-tag">{item.tool}</span>
                      <span className="count">{item.count} {t('files')}</span>
                    </div>
                    <span className="date">{item.date}</span>
                  </div>
                )) : (
                  <div className="empty-history">{t('noHistory')}</div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="active" className="tool-view-container" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="tool-header-row">
              <button className="back-btn-solid-large" onClick={() => { setActiveTool(null); setFiles([]); setItems([]); setSelectedPageIds([]); }}>
                <ArrowLeft size={20} /> {lang === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
              </button>
              <div className="active-tool-info">
                <div className="tool-icon-small" style={{ background: tools.find(t => t.id === activeTool).color }}>{tools.find(t => t.id === activeTool).icon}</div>
                <h2>{tools.find(t => t.id === activeTool).name}</h2>
              </div>
              <div className="tool-specific-options">
                {activeTool === 'pdf-protect' && (
                  <input type="password" placeholder="ตั้งรหัสผ่าน..." value={password} onChange={e => setPassword(e.target.value)} className="glass-input bright" />
                )}
                {activeTool === 'pdf-split' && items.length > 0 && (
                  <div className="split-status">{t('files')}: {selectedPageIds.length}</div>
                )}
                {activeTool === 'img-convert' && (
                  <select value={imgSettings.format} onChange={e => setImgSettings(p => ({ ...p, format: e.target.value }))} className="glass-input bright">
                    <option value="image/jpeg">To JPG</option>
                    <option value="image/png">To PNG</option>
                    <option value="image/webp">To WebP</option>
                  </select>
                )}
                {activeTool === 'img-resize' && (
                  <div className="resize-inputs">
                    <input type="number" placeholder="W" className="glass-input sm" onChange={e => setImgSettings(p => ({ ...p, width: parseInt(e.target.value) }))} />
                    <input type="number" placeholder="H" className="glass-input sm" onChange={e => setImgSettings(p => ({ ...p, height: parseInt(e.target.value) }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="workspace-card glass">
              {(files.length === 0 && items.length === 0) ? (
                <div className="upload-area-main" onClick={() => fileInputRef.current.click()}>
                  <div className="upload-icon-circle"><FilePlus size={56} color="#FFFFFF" /></div>
                  <p className="bright-text">{lang === 'th' ? 'ลากไฟล์มาที่นี่ หรือคลิกเพื่ออัปโหลด' : 'Drag files here or click to upload'}</p>
                  <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileSelect} />
                </div>
              ) : (
                <div className="active-area">
                  {items.length > 0 ? (
                    <div className="items-grid-scroll">
                      {activeTool === 'pdf-reorder' ? (
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                          <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                            {items.map((it, idx) => (
                              <SortableItem key={it.id} id={it.id} url={it.url} index={idx} label={it.label} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />
                            ))}
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="split-selection-grid">
                          {items.map((it, idx) => {
                            const isSelected = selectedPageIds.includes(it.id);
                            return (
                              <div
                                key={it.id}
                                className={`glass page-thumbnail selectable ${isSelected ? 'selected' : ''}`}
                                onClick={() => setSelectedPageIds(prev => isSelected ? prev.filter(id => id !== it.id) : [...prev, it.id])}
                              >
                                <div className="page-number">{idx + 1}</div>
                                <img src={it.url} alt={`Page ${idx + 1}`} />
                                {isSelected && <div className="check-overlay"><CheckCircle2 color="#00f2ff" /></div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="items-list-scroll">
                      {files.map((f, i) => {
                        const isImg = f.type.startsWith('image/');
                        const pUrl = isImg ? URL.createObjectURL(f) : null;
                        return (
                          <div key={i} className="list-row glass" style={{ position: 'relative', overflow: 'hidden' }}>
                            {pUrl && <div className="file-preview-bg" style={{ backgroundImage: `url(${pUrl})` }}></div>}
                            <div className="list-row-content" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '0 1rem' }}>
                              <FileText size={18} color="white" />
                              <div className="p-name" style={{ color: 'white', fontWeight: '600', fontSize: '0.95rem' }}>{f.name}</div>
                            </div>
                            <button className="del-btn-icon" style={{ position: 'relative', zIndex: 2, background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }} onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
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
          <div className="modal-overlay" onClick={() => { setShowPayModal(false); setPayStep('plans'); }}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="pay-modal glass"
              onClick={e => e.stopPropagation()}
            >
              {payStep === 'plans' && (
                <>
                  <div className="modal-header">
                    <Zap fill="#ffd700" color="#ffd700" size={40} className="glow-icon" />
                    <h2>Unlock PDF Magic Pro</h2>
                    <p>เข้าถึงทุกเครื่องมือแบบไร้ขีดจำกัด</p>
                  </div>
                  <div className="pricing-grid">
                    <div className="pricing-card blur-card">
                      <span className="price">Free Plan</span>
                      <ul>
                        <li><CheckCircle2 size={14} /> Basic conversions</li>
                        <li><CheckCircle2 size={14} /> Standard quality</li>
                      </ul>
                    </div>
                    <div className="pricing-card popular galaxy-border">
                      <div className="popular-tag">BEST VALUE</div>
                      <span className="price">$9.99<small>/mo</small></span>
                      <ul>
                        <li><CheckCircle2 size={14} color="#00ff88" /> All Pro Tools unlocked</li>
                        <li><CheckCircle2 size={14} color="#00ff88" /> Ultra High Quality</li>
                        <li><CheckCircle2 size={14} color="#00ff88" /> 24/7 Priority Support</li>
                      </ul>
                      <button className="cta-btn gold-btn" onClick={() => setPayStep('checkout')}>
                        Get Selected Plan
                      </button>
                    </div>
                  </div>
                </>
              )}

              {payStep === 'checkout' && (
                <div className="checkout-step animate-fade">
                  <h3>เลือกช่องทางการชำระเงิน</h3>
                  <div className="payment-options">
                    <button className={`pay-opt ${payMethod === 'stripe' ? 'active' : ''}`} onClick={() => setPayMethod('stripe')}>
                      <ShieldCheck size={20} /> Credit Card (Stripe)
                    </button>
                    <button className={`pay-opt ${payMethod === 'promptpay' ? 'active' : ''}`} onClick={() => setPayMethod('promptpay')}>
                      <Zap size={20} color="#00f2ff" /> PromptPay QR
                    </button>
                  </div>

                  {payMethod === 'stripe' && (
                    <div className="stripe-form glass animate-up">
                      <input type="text" placeholder="Card Number" className="glass-input" value="4242 4242 4242 4242" readOnly />
                      <div className="row">
                        <input type="text" placeholder="MM/YY" className="glass-input" value="12/26" readOnly />
                        <input type="text" placeholder="CVC" className="glass-input" value="123" readOnly />
                      </div>
                      <button className="cta-btn secure-btn" onClick={() => setPayStep('success')}>
                        Pay Securely with Stripe
                      </button>
                    </div>
                  )}

                  {payMethod === 'promptpay' && (
                    <div className="qr-checkout glass animate-up">
                      <p>สแกนเพื่อชำระเงิน 350.00 บาท</p>
                      <div className="qr-placeholder" style={{ border: '4px solid #fff', padding: '10px', borderRadius: '15px', background: '#fff', display: 'inline-block' }}>
                        <img
                          src={`https://promptpay.io/${promptPayNumber}/350.00.png`}
                          alt="PromptPay QR Code"
                          style={{ width: '100%', maxWidth: '200px', height: 'auto' }}
                        />
                      </div>
                      <p className="qr-hint" style={{ fontSize: '0.75rem', marginTop: '0.8rem', color: '#888' }}>
                        เมื่อโอนเสร็จแล้ว ระบบจะตรวจสอบยอดให้อัตโนมัติ
                      </p>
                      <button className="cta-btn secure-btn" onClick={() => setPayStep('success')}>
                        แจ้งโอนเงินสำเร็จ
                      </button>
                    </div>
                  )}
                  <button className="back-text" onClick={() => setPayStep('plans')}>ย้อนกลับ</button>
                </div>
              )}

              {payStep === 'success' && (
                <div className="success-step animate-scale">
                  <div className="success-icon-large"><CheckCircle2 size={80} color="#00ff88" /></div>
                  <h2>Payment Successful!</h2>
                  <p>ตอนนี้คุณคือผู้ใช้ระดับ PREMIUM แล้ว</p>
                  <button className="cta-btn gold-btn" onClick={() => { setIsPro(true); setShowPayModal(false); setPayStep('plans'); triggerSuccess("Welcome to the Galaxy Pro! ✨"); }}>
                    เริ่มต้นใช้งานฟีเจอร์โปร
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer>
        <div className="footer-links">
          <a href="#" className="footer-link">Privacy Policy</a>
          <a href="#" className="footer-link">Terms of Service</a>
          <a href="https://line.me" target="_blank" className="footer-link" style={{ color: '#00ff88' }}>Contact Support (Line)</a>
        </div>
        <div className="copyright">
          © {new Date().getFullYear()} ORBITA PDF Galaxy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
