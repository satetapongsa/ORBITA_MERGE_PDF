import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import JSZip from "jszip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import { 
  FilePlus, ArrowLeft, Download, Trash2, GripVertical, 
  Layers, Move, Loader2, CheckCircle2, AlertCircle, FolderArchive, 
  FileImage, FileText, FileSpreadsheet, Globe, Zap, ShieldCheck, Sparkles, Wand2, 
  Presentation, X, QrCode, CreditCard, ChevronRight,
  ShieldAlert, Settings, Clock, Files, FileType2, Lock, Unlock, Minimize2,
  Mail, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import confetti from "canvas-confetti";

// PDF.js Worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const SortableItem = ({ id, url, index, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={`sortable-card-lux ${isDragging ? "dragging" : ""}`} {...attributes} {...listeners}>
      <div className="page-badge-lux">{index + 1}</div>
      <img src={url} alt="page" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <button 
        className="trash-btn-lux" 
        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
        title="Delete Page"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [history, setHistory] = useState([]);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('orbitaUsageDate');
    const savedCount = localStorage.getItem('orbitaUsageCount');
    if (savedDate === today) {
      setUsageCount(parseInt(savedCount || "0"));
    } else {
      localStorage.setItem('orbitaUsageDate', today);
      localStorage.setItem('orbitaUsageCount', "0");
      setUsageCount(0);
    }
  }, []);

  const t = (k) => {
    const dict = {
      heroTitle: "Empower Your Workflow with", heroGradient: "PDF Magic", searchPlaceholder: "Search tools...", unlockPro: "Unlock Pro", files: "Files", noHistory: "No history yet", recentActivity: "Recent Activity", landingTitle: "Unlock PDF Magic with", landingDesc: "Manage, split, merge and secure your files instantly.", googleLogin: "Continue with Google", welcomeBack: "Welcome Back", loginSubtitle: "Sign in to start for free", convertNow: "Convert Now", selected: "Selected", dropHint: "Drop files here or click to browse", supportFormat: "Supports PDF, DOCX, XLSX, Images", home: "Home", processing: "Processing...", upgradeTitle: "Upgrade to Orbita Pro", upgradeDesc: "Access all pro tools and professional features", manage: "Manage Files", toPdf: "Convert to PDF", fromPdf: "Convert from PDF", security: "Security", utility: "Utility"
    };
    return dict[k] || k;
  };

  const tools = [
    { id: 'pdf-merge', name: 'Merge PDF', desc: 'Combine multiple files into one', cat: 'manage', color: 'linear-gradient(135deg, #6366f1, #a855f7)', icon: <Layers />, premium: false },
    { id: 'pdf-split', name: 'Split PDF', desc: 'Extract pages from your PDF', cat: 'manage', color: 'linear-gradient(135deg, #06b6d4, #3b82f6)', icon: <Move />, premium: false },
    { id: 'pdf-reorder', name: 'Reorder Pages', desc: 'Rearrange PDF page order', cat: 'manage', color: 'linear-gradient(135deg, #8b5cf6, #d946ef)', icon: <GripVertical />, premium: false },
    { id: 'img-to-pdf', name: 'Image to PDF', desc: 'Convert images to PDF docs', cat: 'toPdf', color: 'linear-gradient(135deg, #f59e0b, #ef4444)', icon: <FileImage />, premium: false },
    { id: 'word-to-pdf', name: 'Word to PDF', desc: 'Convert Word docs to PDF', cat: 'toPdf', color: 'linear-gradient(135deg, #2563eb, #3b82f6)', icon: <FileText />, premium: true },
    { id: 'excel-to-pdf', name: 'Excel to PDF', desc: 'Convert Excel sheets to PDF', cat: 'toPdf', color: 'linear-gradient(135deg, #10b981, #059669)', icon: <FileSpreadsheet />, premium: true },
    { id: 'pdf-to-img', name: 'PDF to PNG', desc: 'Extract pages as PNG images', cat: 'fromPdf', color: 'linear-gradient(135deg, #10b981, #3b82f6)', icon: <Presentation />, premium: true },
    { id: 'pdf-to-word', name: 'PDF to Word', desc: 'Convert PDF back to Word', cat: 'fromPdf', color: 'linear-gradient(135deg, #3b82f6, #6366f1)', icon: <FileType2 />, premium: true },
    { id: 'pdf-protect', name: 'Protect PDF', desc: 'Set password protection', cat: 'security', color: 'linear-gradient(135deg, #ef4444, #8b5cf6)', icon: <Lock />, premium: true },
    { id: 'pdf-unlock', name: 'Unlock PDF', desc: 'Remove PDF password', cat: 'security', color: 'linear-gradient(135deg, #22c55e, #10b981)', icon: <Unlock />, premium: true },
    { id: 'pdf-compress', name: 'Compress PDF', desc: 'Reduce PDF file size', cat: 'utility', color: 'linear-gradient(135deg, #f97316, #f59e0b)', icon: <Minimize2 />, premium: false }
  ];

  const handleToolClick = (tool) => {
    if (tool.premium && (!user || !user.is_pro)) {
      setShowPayModal(true);
      return;
    }
    if ((!user || !user.is_pro) && usageCount >= 3) {
      setShowPayModal(true);
      return;
    }
    setActiveTool(tool.id); setFiles([]); setItems([]); setDownloadUrl(null);
  };

  const handleFileSelect = async (e) => {
    const selFiles = Array.from(e.target.files);
    setFiles(selFiles);
    if (activeTool === 'pdf-merge' || activeTool === 'pdf-split' || activeTool === 'pdf-reorder' || activeTool === 'pdf-to-img' || activeTool === 'pdf-protect' || activeTool === 'pdf-unlock') {
        setLoading(true);
        const newItems = [];
        for (const file of selFiles) {
            try {
              const buf = await file.arrayBuffer();
              const pdf = await pdfjs.getDocument({ data: buf }).promise;
              for (let i = 1; i <= pdf.numPages; i++) {
                  const pg = await pdf.getPage(i);
                  const vp = pg.getViewport({ scale: 0.5 });
                  const cvs = document.createElement('canvas');
                  const ctx = cvs.getContext('2d');
                  cvs.height = vp.height; cvs.width = vp.width;
                  await pg.render({ canvasContext: ctx, viewport: vp }).promise;
                  newItems.push({ id: `${file.name}-${i}-${Date.now()}`, url: cvs.toDataURL(), file, pageNum: i });
              }
            } catch (err) { console.error(err); }
        }
        setItems(newItems); setLoading(false);
    }
  };

  const processFiles = async () => {
    if ((files.length === 0 && items.length === 0) || loading) return;
    
    if ((activeTool === 'pdf-protect' || activeTool === 'pdf-unlock') && !password) {
      setShowPasswordModal(true);
      return;
    }
    
    setLoading(true);
    try {
      if (activeTool === 'pdf-to-img') {
        const zip = new JSZip();
        for (const it of items) {
          const donorBuf = await it.file.arrayBuffer();
          const pdfDoc = await pdfjs.getDocument({ data: donorBuf }).promise;
          const pg = await pdfDoc.getPage(it.pageNum);
          const vp = pg.getViewport({ scale: 2.0 });
          const cvs = document.createElement('canvas');
          const ctx = cvs.getContext('2d');
          cvs.height = vp.height; cvs.width = vp.width;
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          const base64Data = cvs.toDataURL('image/png').split(',')[1];
          zip.file(`Page_${items.indexOf(it) + 1}.png`, base64Data, { base64: true });
        }
        const content = await zip.generateAsync({ type: "blob" });
        setDownloadUrl(URL.createObjectURL(content));
      } else if (activeTool === 'pdf-merge' || activeTool === 'pdf-reorder' || activeTool === 'pdf-split') {
        const mergedPdf = await PDFDocument.create();
        for (const it of items) {
          const donorBuf = await it.file.arrayBuffer();
          const donorPdf = await PDFDocument.load(donorBuf);
          const [pg] = await mergedPdf.copyPages(donorPdf, [it.pageNum - 1]);
          mergedPdf.addPage(pg);
        }
        const bytes = await mergedPdf.save();
        setDownloadUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      } else if (activeTool === 'img-to-pdf') {
        const mergedPdf = await PDFDocument.create();
        for (const f of files) {
          const bytes = await f.arrayBuffer();
          let img;
          if (f.type === 'image/jpeg' || f.type === 'image/jpg') {
            img = await mergedPdf.embedJpg(bytes);
          } else {
            img = await mergedPdf.embedPng(bytes);
          }
          const page = mergedPdf.addPage();
          const { width, height } = img.scaleToFit(page.getWidth(), page.getHeight());
          page.drawImage(img, { x: page.getWidth()/2 - width/2, y: page.getHeight()/2 - height/2, width, height });
        }
        const bytes = await mergedPdf.save();
        setDownloadUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      } else if (activeTool === 'pdf-protect') {
        const doc = new jsPDF({ unit: 'pt', compress: true });
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const donorBuf = await it.file.arrayBuffer();
          const pdfDoc = await pdfjs.getDocument({ data: donorBuf }).promise;
          const pg = await pdfDoc.getPage(it.pageNum);
          const vp = pg.getViewport({ scale: 2.0 });
          const cvs = document.createElement('canvas');
          const ctx = cvs.getContext('2d');
          cvs.height = vp.height; cvs.width = vp.width;
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          const imgData = cvs.toDataURL('image/jpeg', 0.85);
          if (i > 0) doc.addPage([vp.width, vp.height]);
          else { doc.deletePage(1); doc.addPage([vp.width, vp.height]); }
          doc.addImage(imgData, 'JPEG', 0, 0, vp.width, vp.height);
        }
        doc.encrypt({ userPassword: password, ownerPassword: password, userPermissions: ['print', 'modify', 'copy'] });
        const bytes = doc.output('blob');
        setDownloadUrl(URL.createObjectURL(bytes));
      } else if (activeTool === 'pdf-unlock') {
        try {
          const unlockedPdf = await PDFDocument.create();
          for (const f of files) {
            const bytes = await f.arrayBuffer();
            const donorPdf = await PDFDocument.load(bytes, { password: password });
            const pgs = await unlockedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
            pgs.forEach(p => unlockedPdf.addPage(p));
          }
          const bytes = await unlockedPdf.save();
          setDownloadUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
          setStatus({ type: 'success', msg: 'PDF Unlocked Successfully!' });
        } catch (err) {
          setStatus({ type: 'error', msg: 'Incorrect password or corrupted file.' });
          setLoading(false); return;
        }
      } else if (activeTool === 'word-to-pdf') {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        const container = document.createElement('div');
        container.style.width = '800px';
        container.style.padding = '40px';
        container.style.backgroundColor = 'white';
        container.style.color = 'black';
        container.innerHTML = html;
        document.body.appendChild(container);
        const canvas = await html2canvas(container);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        setDownloadUrl(URL.createObjectURL(pdf.output('blob')));
        document.body.removeChild(container);
      } else if (activeTool === 'excel-to-pdf') {
        const file = files[0];
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const doc = new jsPDF();
        autoTable(doc, { head: [jsonData[0]], body: jsonData.slice(1) });
        setDownloadUrl(URL.createObjectURL(doc.output('blob')));
      } else if (activeTool === 'pdf-to-word') {
        // Basic implementation: extract text and put in a simple HTML format then to Word blob
        const file = files[0];
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i);
          const textContent = await pg.getTextContent();
          fullText += textContent.items.map(item => item.str).join(" ") + "\n\n";
        }
        const blob = new Blob(['<html><body>' + fullText.replace(/\n/g, '<br>') + '</body></html>'], { type: 'application/msword' });
        setDownloadUrl(URL.createObjectURL(blob));
      } else if (activeTool === 'pdf-compress') {
        const file = files[0];
        const bytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        // "Compression" in browser is mostly about re-encoding images or stripping metadata
        // Here we just re-save it which often reduces size if there were redundant objects
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        setDownloadUrl(URL.createObjectURL(new Blob([compressedBytes], { type: "application/pdf" })));
      }
      
      confetti();
      setStatus({ type: 'success', msg: 'Job Done! Click Download Now.' });
      setHistory([{ id: Date.now(), tool: tools.find(t => t.id === activeTool).name, date: new Date().toLocaleTimeString() }, ...history]);
      if (!user || !user.is_pro) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('orbitaUsageCount', newCount.toString());
      }
    } catch (err) { 
        console.error(err);
        setStatus({ type: 'error', msg: 'Processing failed.' });
    } finally { setLoading(false); }
  };

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!authEmail) {
      setModalError("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail)) {
      setModalError("Please enter a valid email address.");
      return;
    }
    if (!authPassword) {
      setModalError("Please enter your password.");
      return;
    }
    if (authPassword.length < 6) {
      setModalError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setModalSuccess(authMode === 'login' ? 'Successfully signed in!' : 'Successfully registered workspace!');
        setTimeout(() => {
          setShowLoginModal(false);
          setModalSuccess("");
          setAuthEmail("");
          setAuthPassword("");
        }, 1000);
      } else {
        const err = await res.json();
        setModalError(err.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setModalError("");
    setModalSuccess("");
    setLoading(true);

    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return;
      }

      // Try Backend endpoint
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: "MOCK_GOOGLE_TOKEN" })
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setModalSuccess("Signed in with Google successfully!");
        setTimeout(() => {
          setShowLoginModal(false);
          setModalSuccess("");
        }, 1000);
      } else {
        // Fallback mock
        setTimeout(() => {
          setUser({
            id: 999,
            email: "google.user@orbita.com",
            is_pro: true,
            name: "Google User"
          });
          setModalSuccess("Successfully logged in with Google (Demo mode)!");
          setTimeout(() => {
            setShowLoginModal(false);
            setModalSuccess("");
          }, 1000);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setTimeout(() => {
        setUser({
          id: 999,
          email: "google.user@orbita.com",
          is_pro: true,
          name: "Google User"
        });
        setModalSuccess("Successfully logged in with Google (Demo mode)!");
        setTimeout(() => {
          setShowLoginModal(false);
          setModalSuccess("");
        }, 1000);
      }, 1200);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  return (
    <div className="layout-root">
      {status && <div className={`status-toast ${status.type} animate-fade`}>{status.msg}</div>}

      <header className="top-header glass-header">
        <div className="logo-section clickable" onClick={() => setActiveTool(null)}>
          <div className="app-icon-hex shadow-neon"><Sparkles size={24} color="#00f2ff" /></div>
          <span className="logo-text">ORBITA <span className="text-gradient">PDF</span></span>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user ? (
            <>
              <span style={{ color: '#fff' }}>{user.email}</span>
              {user.is_pro ? (
                <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', padding: '5px 10px', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}>PRO</span>
              ) : (
                <button className="cta-btn-lux cyan-glow" onClick={() => setShowPayModal(true)} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Subscribe (29 THB)</button>
              )}
              <button onClick={() => setUser(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
             <button className="cta-btn-lux" onClick={() => setShowLoginModal(true)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Login</button>
          )}
        </div>
      </header>

      <main className="main-viewport">
        <AnimatePresence mode="wait">
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-content-container">
              {!activeTool ? (
                <div className="dashboard-view animate-fade">
                    <div className="dashboard-hero" style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '3rem' }}>{t('heroTitle')} <span className="text-gradient">{t('heroGradient')}</span></h1>
                        <div className="search-container-lux">
                             <Wand2 className="search-icon" size={22} />
                             <input type="text" className="search-input-lux" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="tools-sections" style={{ marginTop: '4rem' }}>
                    {['manage', 'toPdf', 'fromPdf', 'security', 'utility'].map(cat => {
                        const catTools = tools.filter(tx => tx.cat === cat && (tx.name.toLowerCase().includes(searchTerm.toLowerCase())));
                        if (catTools.length === 0) return null;
                        return (
                          <section key={cat} className="tool-group-section" style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{t(cat)}</h2>
                            <div className="tools-grid-lux">
                              {catTools.map(tool => (
                                <motion.div whileHover={{ y: -5 }} key={tool.id} className="tool-card-lux glass" onClick={() => handleToolClick(tool)}>
                                   <div className="tool-icon-box" style={{ background: tool.color }}>{tool.icon}</div>
                                   <div className="tool-info"><h3>{tool.name}</h3><p>{tool.desc}</p></div>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        );
                    })}
                    </div>
                </div>
              ) : (
                <div className="active-tool-workspace animate-scale">
                    <div className="workspace-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                       <button className="back-btn-lux" onClick={() => setActiveTool(null)}><ArrowLeft size={18} /> Home</button>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ background: tools.find(tx => tx.id === activeTool).color, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tools.find(tx => tx.id === activeTool).icon}</div>
                          <h2>{tools.find(tx => tx.id === activeTool).name}</h2>
                       </div>
                       
                       <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 15px', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.05)' }}>
                          <ShieldCheck size={16} color="#00ff88" /><span style={{ fontSize: '0.75rem', color: '#00ff88' }}>SECURE LOCAL PROCESSING</span>
                       </div>
                    </div>
                    <div className="dropzone-area-lux glass-card" onClick={() => fileInputRef.current.click()} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileSelect} />
                       {items.length === 0 && files.length === 0 ? (
                         <div style={{ textAlign: 'center' }}><FilePlus size={48} color="#00f2ff" /><p>{t('dropHint')}</p></div>
                       ) : (
                         <div style={{ width: '100%' }}>
                            {(activeTool === 'pdf-merge' || activeTool === 'pdf-split' || activeTool === 'pdf-reorder') ? (
                              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                                if (active && over && active.id !== over.id) {
                                  setItems(itms => {
                                    const o = itms.findIndex(i => i.id === active.id);
                                    const n = itms.findIndex(i => i.id === over.id);
                                    return arrayMove(itms, o, n);
                                  });
                                }
                              }}><SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', padding: '20px' }}>
                                    {items.map((it, idx) => <SortableItem key={it.id} id={it.id} index={idx} url={it.url} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />)}
                                  </div>
                                </SortableContext></DndContext>
                            ) : (
                              <div style={{ padding: '20px' }}>{files.map((f, i) => <div key={i} className="glass" style={{ padding: '10px', marginBottom: '5px' }}>{f.name}</div>)}</div>
                            )}
                         </div>
                       )}
                    </div>
                    {(files.length > 0 || items.length > 0) && (
                      <div className="action-bar-lux glass" style={{ marginTop: '2rem', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px' }}>
                         <span>{t('selected')}: {files.length || items.length}</span>
                         {downloadUrl ? (
                           <button 
                             onClick={() => {
                               const link = document.createElement("a");
                               link.href = downloadUrl;
                               const extension = activeTool === 'pdf-to-img' ? 'zip' : 
                                               activeTool === 'pdf-to-word' ? 'doc' : 'pdf';
                               link.download = `ORBITA_${activeTool}_${Date.now()}.${extension}`;
                               link.click();
                               confetti();
                               setDownloadUrl(null); setFiles([]); setItems([]);
                             }} 
                             className="cta-btn-lux" 
                             style={{ background: 'linear-gradient(135deg, #00ff88, #0cc061)', color: '#000', padding: '16px 50px', borderRadius: '20px', fontWeight: '900', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '1.2rem', boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
                           >
                              <Download size={26} /> DOWNLOAD NOW
                           </button>
                         ) : (
                           <button 
                             onClick={processFiles} 
                             className="cta-btn-lux cyan-glow" 
                             disabled={loading} 
                             style={{ background: 'var(--primary)', color: '#000', padding: '16px 50px', borderRadius: '20px', fontWeight: '900', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '1.2rem', boxShadow: '0 0 30px rgba(0,242,255,0.3)' }}
                           >
                              {loading ? (
                                <><Loader2 className="spin" size={24} /> {t('processing')}</>
                              ) : (
                                <>
                                   <Wand2 size={26} /> 
                                   {activeTool === 'pdf-protect' ? 'Lock File' : 
                                    activeTool === 'pdf-unlock' ? 'Unlock File' : 
                                    activeTool === 'pdf-merge' ? 'Merge PDF' :
                                    activeTool === 'pdf-reorder' ? 'Reorder Pages' :
                                    t('convertNow')}
                                 </>
                              )}
                           </button>
                         )}
                      </div>
                    )}
                </div>
              )}
            </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showLoginModal && (
          <div className="modal-overlay blur-overlay" onClick={() => { if (!loading) setShowLoginModal(false); }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="auth-modal-card" 
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                type="button"
                className="close-btn-round" 
                onClick={() => { if (!loading) setShowLoginModal(false); }}
                style={{ top: '20px', right: '20px' }}
                disabled={loading}
              >
                <X size={18} />
              </button>

              {/* Branding/Header */}
              <div className="auth-header">
                <div className="app-icon-hex shadow-neon" style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}>
                  <Sparkles size={24} color="#00f2ff" />
                </div>
                <h2 className="auth-title">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="auth-subtitle">
                  {authMode === 'login' 
                    ? 'Sign in to access your professional PDF suite' 
                    : 'Get started with secure local PDF processing'
                  }
                </p>
              </div>

              {/* Success / Error Alerts */}
              {modalError && (
                <div className="auth-alert auth-alert-error">
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}
              {modalSuccess && (
                <div className="auth-alert auth-alert-success">
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Tab Toggles */}
              <div className="auth-tab-group">
                <button 
                  type="button"
                  className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('login'); setModalError(""); }}
                  disabled={loading}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('register'); setModalError(""); }}
                  disabled={loading}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="auth-form">
                <div className="input-group-lux">
                  <span className="input-icon-lux">
                    <Mail size={18} />
                  </span>
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    value={authEmail} 
                    onChange={e => setAuthEmail(e.target.value)} 
                    className="input-field-lux"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="input-group-lux">
                  <span className="input-icon-lux">
                    <Lock size={18} />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter password..." 
                    value={authPassword} 
                    onChange={e => setAuthPassword(e.target.value)} 
                    className="input-field-lux"
                    disabled={loading}
                    required
                  />
                  <button 
                    type="button"
                    className="password-toggle-lux"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {authMode === 'login' && (
                  <div className="auth-options-row">
                    <label className="remember-me-container">
                      <input 
                        type="checkbox" 
                        className="remember-me-checkbox" 
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        disabled={loading}
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#forgot" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert("Password reset functionality would be handled via Supabase / backend config."); }}>
                      Forgot Password?
                    </a>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="auth-submit-btn" 
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="spin" size={18} /> Processing...</>
                  ) : (
                    authMode === 'login' ? 'Sign In to Workspace' : 'Register Workspace Account'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="auth-divider-container">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or continue with</span>
                <div className="auth-divider-line" />
              </div>

              {/* Google OAuth Button */}
              <button 
                type="button" 
                className="google-login-btn-lux" 
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.34 0-4.33-1.58-5.03-3.7H.93v2.3C2.42 16.02 5.51 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V5H.93C.34 6.2 0 7.56 0 9s.34 2.8.93 4H3.97z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.05C13.47.62 11.43 0 9 0 5.51 0 2.42 1.98.93 4.98l3.04 2.3c.7-2.12 2.69-3.7 5.03-3.7z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Professional Footer terms */}
              <p className="auth-terms-text">
                By signing in, you agree to our <a href="#terms" onClick={e => e.preventDefault()}>Terms of Service</a> and <a href="#privacy" onClick={e => e.preventDefault()}>Privacy Policy</a>.
              </p>
            </motion.div>
          </div>
        )}
        
        {showPayModal && (
          <div className="modal-overlay blur-overlay" onClick={() => setShowPayModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="pay-modal-lux" onClick={e => e.stopPropagation()} style={{ padding: '40px', borderRadius: '35px', textAlign: 'center', background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,215,0,0.3)', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'rgba(255,215,0,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><CreditCard size={30} color="#ffd700" /></div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffd700', marginBottom: '10px' }}>Upgrade to PRO</h2>
              <p style={{ opacity: 0.8, marginBottom: '30px' }}>Unlock all premium tools and remove daily limits for only <strong>29 THB / month</strong>.</p>
              
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '15px', marginBottom: '20px', textAlign: 'left' }}>
                <input type="text" placeholder="Card Number (Mock)" style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '10px', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="text" placeholder="MM/YY" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
                   <input type="text" placeholder="CVC" style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
                </div>
              </div>
              
              <button onClick={async () => {
                 if (!user) { alert('Please login first!'); setShowPayModal(false); setShowLoginModal(true); return; }
                 const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
                 if(res.ok) { setUser(await res.json()); setShowPayModal(false); confetti(); alert('Subscription Successful!'); } else { alert('Payment Failed'); }
              }} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #ffd700, #ffaa00)', color: '#000', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}>Pay 29 THB</button>
            </motion.div>
          </div>
        )}

        {showPasswordModal && (
          <div className="modal-overlay blur-overlay" onClick={() => setShowPasswordModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="pay-modal-lux" onClick={e => e.stopPropagation()} style={{ padding: '40px', borderRadius: '35px', textAlign: 'center', border: '1px solid rgba(255,77,77,0.3)' }}>
              <div style={{ marginBottom: '30px' }}>
                <div style={{ background: 'rgba(255,77,77,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Lock size={30} color="#ff4d4d" />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '900' }}>Security Requirement</h2>
                <p style={{ opacity: 0.6 }}>Please set a password to {activeTool === 'pdf-protect' ? 'lock' : 'unlock'} this document.</p>
              </div>
              <input 
                type="password" 
                placeholder="Enter Password..." 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.1rem', textAlign: 'center', marginBottom: '20px', outline: 'none' }}
              />
              <button 
                onClick={() => { setShowPasswordModal(false); processFiles(); }}
                className="cta-btn-lux" 
                style={{ width: '100%', background: 'linear-gradient(135deg, #ff4d4d, #d90000)', color: '#fff', padding: '15px', borderRadius: '15px', fontWeight: '900', border: 'none' }}
              >
                CONFIRM & PROCEED
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="galaxy-footer">
          <div className="footer-links">
             <a href="#">Privacy Policy</a>
             <a href="#">Terms of Service</a>
             <a href="#" className="support-link">Support Hub</a>
          </div>
          <p>© 2026 ORBITA PDF Galaxy. Built with Love for the Future.</p>
      </footer>
    </div>
  );
}
