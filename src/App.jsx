import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import JSZip from "jszip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import { supabase } from "./supabaseClient";
import { 
  FilePlus, ArrowLeft, Download, Trash2, GripVertical, 
  Layers, Move, Loader2, CheckCircle2, AlertCircle, FolderArchive, 
  FileImage, FileText, FileSpreadsheet, Globe, Zap, ShieldCheck, Sparkles, Wand2, 
  Presentation, X, LogIn, LogOut, User as UserIcon, QrCode, CreditCard, ChevronRight,
  ShieldAlert, Settings, Clock, Files, FileType2, Lock, Unlock, Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [status, setStatus] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStep, setPayStep] = useState('plans');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lang, setLang] = useState("en");
  const [history, setHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef(null);

  const t = (k) => {
    const dict = {
      th: { heroTitle: "ยกระดับการจัดการ PDF ให้เป็นเรื่อง", heroGradient: "มหัศจรรย์", searchPlaceholder: "ค้นหาเครื่องมือ...", unlockPro: "ปลดล็อก Pro", files: "ไฟล์", noHistory: "ยังไม่มีประวัติการใช้งาน", recentActivity: "ประวัติการใช้งาน", landingTitle: "ปลดล็อคพลัง PDF ด้วย", landingDesc: "จัดการ แบ่ง รวม และรักษาความปลอดภัยไฟล์ของคุณได้ทันใจ", googleLogin: "เข้าสู่ระบบด้วย Google", welcomeBack: "ยินดีต้อนรับกลับมา", loginSubtitle: "ล็อคอินเพื่อเริ่มใช้งานฟรี", convertNow: "แปลงไฟล์ทันที", selected: "เลือกแล้ว", dropHint: "ลากไฟล์วางที่นี่ หรือ คลิกเพื่อเลือกไฟล์", supportFormat: "รองรับ PDF, DOCX, XLSX, รูปภาพ", home: "หน้าแรก", processing: "กำลังประมวลผล...", upgradeTitle: "อัปเกรดเป็น Orbita Pro", upgradeDesc: "เข้าถึงทุกเครื่องมือและฟีเจอร์ระดับมืออาชีพ", manage: "จัดการไฟล์", toPdf: "แปลงเป็น PDF", fromPdf: "แปลงจาก PDF", security: "ความปลอดภัย", utility: "เครื่องมือทั่วไป" },
      en: { heroTitle: "Empower Your Workflow with", heroGradient: "PDF Magic", searchPlaceholder: "Search tools...", unlockPro: "Unlock Pro", files: "Files", noHistory: "No history yet", recentActivity: "Recent Activity", landingTitle: "Unlock PDF Magic with", landingDesc: "Manage, split, merge and secure your files instantly.", googleLogin: "Continue with Google", welcomeBack: "Welcome Back", loginSubtitle: "Sign in to start for free", convertNow: "Convert Now", selected: "Selected", dropHint: "Drop files here or click to browse", supportFormat: "Supports PDF, DOCX, XLSX, Images", home: "Home", processing: "Processing...", upgradeTitle: "Upgrade to Orbita Pro", upgradeDesc: "Access all pro tools and professional features", manage: "Manage Files", toPdf: "Convert to PDF", fromPdf: "Convert from PDF", security: "Security", utility: "Utility" }
    };
    return dict[lang][k] || k;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id, session.user.user_metadata);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (s?.user) checkProStatus(s.user.id, s.user.user_metadata);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let timer;
    if (showPayModal && payStep === 'checkout' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) { clearInterval(timer); }
    return () => clearInterval(timer);
  }, [showPayModal, payStep, timeLeft]);

  const checkProStatus = async (uid, userMetadata = null) => {
    const { data, error } = await supabase.from("profiles").select("is_pro").eq("id", uid).single();
    if (error && error.code === 'PGRST116') {
      await supabase.from("profiles").insert([{ id: uid, is_pro: false, full_name: userMetadata?.full_name, email: userMetadata?.email }]);
      setIsPro(false);
    } else if (data) { setIsPro(data.is_pro); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsPro(false);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tools = [
    { id: 'pdf-merge', name: { th: 'รวม PDF', en: 'Merge PDF' }, desc: { th: 'รวมหลายไฟล์เป็นหนึ่งเดียว', en: 'Combine multiple files into one' }, cat: 'manage', color: 'linear-gradient(135deg, #6366f1, #a855f7)', icon: <Layers />, pro: false },
    { id: 'pdf-split', name: { th: 'แยก PDF', en: 'Split PDF' }, desc: { th: 'แยกหน้าไฟล์ PDF ออกมา', en: 'Extract pages from your PDF' }, cat: 'manage', color: 'linear-gradient(135deg, #06b6d4, #3b82f6)', icon: <Move />, pro: false },
    { id: 'pdf-reorder', name: { th: 'สลับหน้า PDF', en: 'Reorder Pages' }, desc: { th: 'สลับลำดับหน้าเอกสาร', en: 'Rearrange PDF page order' }, cat: 'manage', color: 'linear-gradient(135deg, #8b5cf6, #d946ef)', icon: <GripVertical />, pro: true },
    { id: 'img-to-pdf', name: { th: 'รูปภาพเป็น PDF', en: 'Image to PDF' }, desc: { th: 'แปลงรูปภาพเป็นเอกสาร', en: 'Convert images to PDF docs' }, cat: 'toPdf', color: 'linear-gradient(135deg, #f59e0b, #ef4444)', icon: <FileImage />, pro: false },
    { id: 'word-to-pdf', name: { th: 'Word เป็น PDF', en: 'Word to PDF' }, desc: { th: 'แปลงไฟล์ Word เป็น PDF', en: 'Convert Word docs to PDF' }, cat: 'toPdf', color: 'linear-gradient(135deg, #2563eb, #3b82f6)', icon: <FileText />, pro: true },
    { id: 'excel-to-pdf', name: { th: 'Excel เป็น PDF', en: 'Excel to PDF' }, desc: { th: 'แปลงตาราง Excel เป็น PDF', en: 'Convert Excel sheets to PDF' }, cat: 'toPdf', color: 'linear-gradient(135deg, #10b981, #059669)', icon: <FileSpreadsheet />, pro: true },
    { id: 'pdf-to-img', name: { th: 'PDF เป็น PNG', en: 'PDF to PNG' }, desc: { th: 'แปลงหน้าเอกสารเป็นไฟล์ PNG', en: 'Extract pages as PNG images' }, cat: 'fromPdf', color: 'linear-gradient(135deg, #10b981, #3b82f6)', icon: <Presentation />, pro: true },
    { id: 'pdf-to-word', name: { th: 'PDF เป็น Word', en: 'PDF to Word' }, desc: { th: 'แปลงเอกสารกลับสู่ MS Word', en: 'Convert PDF back to Word' }, cat: 'fromPdf', color: 'linear-gradient(135deg, #3b82f6, #6366f1)', icon: <FileType2 />, pro: true },
    { id: 'pdf-protect', name: { th: 'ล็อค PDF', en: 'Protect PDF' }, desc: { th: 'ตั้งรหัสผ่านความปลอดภัย', en: 'Set password protection' }, cat: 'security', color: 'linear-gradient(135deg, #ef4444, #8b5cf6)', icon: <Lock />, pro: true },
    { id: 'pdf-unlock', name: { th: 'ปลดล็อค PDF', en: 'Unlock PDF' }, desc: { th: 'ลบรหัสผ่านออกจากไฟล์', en: 'Remove PDF password' }, cat: 'security', color: 'linear-gradient(135deg, #22c55e, #10b981)', icon: <Unlock />, pro: true },
    { id: 'pdf-compress', name: { th: 'ลดขนาด PDF', en: 'Compress PDF' }, desc: { th: 'ย่อขนาดไฟล์ให้เล็กลง', en: 'Reduce PDF file size' }, cat: 'utility', color: 'linear-gradient(135deg, #f97316, #f59e0b)', icon: <Minimize2 />, pro: true }
  ];

  const handleToolClick = (tool) => {
    if (tool.pro && !isPro) { setShowPayModal(true); return; }
    setActiveTool(tool.id); setFiles([]); setItems([]);
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
    
    // Check if security tools need a password
    if ((activeTool === 'pdf-protect' || activeTool === 'pdf-unlock') && !password) {
      setShowPasswordModal(true);
      return;
    }
    
    confetti(); // ยิงพลุนิดหน่อยฉลอง!
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
          const img = f.type === 'image/jpeg' ? await mergedPdf.embedJpg(bytes) : await mergedPdf.embedPng(bytes);
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
        doc.setProperties({ title: 'Protected PDF', author: 'ORBITA PDF' });
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
          console.error(err);
          setStatus({ type: 'error', msg: 'Incorrect password or corrupted file.' });
          setLoading(false); return;
        }
      }
      
      setStatus({ type: 'success', msg: 'Job Done! Click Download Now.' });
      setHistory([{ id: Date.now(), tool: tools.find(t => t.id === activeTool).name[lang], date: new Date().toLocaleTimeString() }, ...history]);
    } catch (err) { 
        console.error(err);
        setStatus({ type: 'error', msg: 'Processing failed. Check file format.' });
    } finally { setLoading(false); }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  return (
    <div className="layout-root">
      {status && <div className={`status-toast ${status.type} animate-fade`}>{status.msg}</div>}

      {user && <header className="top-header glass-header">
        <div className="logo-section clickable" onClick={() => setActiveTool(null)}>
          <div className="app-icon-hex shadow-neon"><Sparkles size={24} color="#00f2ff" /></div>
          <span className="logo-text">ORBITA <span className="text-gradient">PDF</span></span>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="lang-toggle glass-sm">
            <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <div className="user-profile-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="user-info-chip glass-card" onClick={() => setShowAccountModal(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 15px', borderRadius: '15px' }}>
                <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                <div className="user-meta" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.user_metadata.full_name}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: isPro ? 'var(--accent)' : 'var(--text-dim)' }}>{isPro ? 'PREMIUM' : 'FREE'}</span>
                </div>
              </div>
              <button className="logout-btn-icon" onClick={handleLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </header>}

      <main className="main-viewport">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-landing-split">
              <div className="galaxy-bg-effect"></div>
              <div className="landing-text-side animate-fade">
                <div className="badge-premium" style={{ marginBottom: '2rem' }}>ORBITA GALAXY V2.0</div>
                <h1 className="display-title-lux" style={{ fontSize: '5.5rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '30px' }}>
                  Unlock PDF <br/> Magic with <br/><span className="text-gradient">ORBITA</span>
                </h1>
                <p style={{ fontSize: '1.4rem', color: '#fff', opacity: 0.9, marginBottom: '25px', fontWeight: '600' }}>
                  Manage, split, merge and secure your files instantly.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00ff88', fontSize: '1rem', fontWeight: '800' }}>
                  <ShieldCheck size={20}/> Privacy First. 100% Local Processing.
                </div>
              </div>

              <div className="landing-auth-side">
                <div className="auth-card-luxury">
                   <div style={{ textAlign: 'center', marginBottom: '35px' }}>
                      <div style={{ background: 'rgba(255,215,0,0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Sparkles size={32} color="#ffd700" />
                      </div>
                      <h2 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '8px' }}>{t('welcomeBack')}</h2>
                      <p style={{ opacity: 0.5, fontSize: '1rem' }}>Sign in to start for free</p>
                   </div>
                   <button className="google-auth-btn sky-glow" onClick={signInWithGoogle}>
                      <img src="https://www.google.com/favicon.ico" width="24" alt="G" />
                      <span style={{ fontSize: '1.1rem' }}>{t('googleLogin')}</span>
                   </button>
                   <div style={{ marginTop: '30px', textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', lineHeight: '1.6' }}>
                      <p>Secure OAuth 2.0 Encryption</p>
                      <p>Trusted by 10,000+ Users</p>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
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
                        const catTools = tools.filter(tx => tx.cat === cat && (tx.name.en.toLowerCase().includes(searchTerm.toLowerCase()) || tx.name.th.includes(searchTerm)));
                        if (catTools.length === 0) return null;
                        return (
                          <section key={cat} className="tool-group-section" style={{ marginBottom: '3rem' }}>
                            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{t(cat)}</h2>
                            <div className="tools-grid-lux">
                              {catTools.map(tool => (
                                <motion.div whileHover={{ y: -5 }} key={tool.id} className="tool-card-lux glass" onClick={() => handleToolClick(tool)}>
                                   <div className="tool-icon-box" style={{ background: tool.color }}>{tool.icon}</div>
                                   <div className="tool-info"><h3>{tool.name[lang]}</h3><p>{tool.desc[lang]}</p></div>
                                   {tool.pro && !isPro && <div className="pro-lock-tag">PRO</div>}
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
                          <h2>{tools.find(tx => tx.id === activeTool).name[lang]}</h2>
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
                               const extension = activeTool === 'pdf-to-img' ? 'zip' : 'pdf';
                               link.download = `ORBITA_${activeTool}_${Date.now()}.${extension}`;
                               link.click();
                               confetti(); // ยิงพลุตอนออมไฟล์ด้วย!
                               setDownloadUrl(null);
                               setFiles([]);
                               setItems([]);
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
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showPayModal && (
          <div className="modal-overlay blur-overlay" onClick={() => setShowPayModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="pay-modal-lux" onClick={e => e.stopPropagation()} style={{ padding: '40px', borderRadius: '40px' }}>
                <button className="close-btn-round" onClick={() => setShowPayModal(false)}>×</button>
                {payStep === 'plans' ? (
                  <div style={{ textAlign: 'center' }}>
                    <h2>{t('upgradeTitle')}</h2>
                    <div className="plan-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '20px', margin: '20px 0' }}>
                        <h3>฿59 / Month</h3>
                        <button onClick={() => setPayStep('checkout')} className="gold-btn-lux" style={{ width: '100%', padding: '15px', marginTop: '10px' }}>Get Pro Now</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <img src={`https://promptpay.io/0815018272/59.png`} alt="QR" style={{ width: '220px', margin: '0 auto 20px', display: 'block' }} />
                    <p style={{ marginTop: '10px', fontWeight: '900', fontSize: '1.2rem' }}>Scan within <b style={{ color: timeLeft < 30 ? '#ff0000' : '#ff4d4d' }}>{formatTime(timeLeft)}</b></p>
                    <button onClick={async () => {
                        const exp = new Date(); exp.setDate(exp.getDate() + 30);
                        const { error } = await supabase.from('profiles').update({ is_pro: true, pro_expiry: exp.toISOString() }).eq('id', user.id);
                        if (!error) { setIsPro(true); setShowPayModal(false); confetti(); }
                    }} className="cta-btn-lux" style={{ width: '100%', marginTop: '30px', background: 'linear-gradient(135deg, #00f2ff, #006ae6)', border: 'none', padding: '15px', fontWeight: '900' }}>SUBMIT</button>
                  </div>
                )}
            </motion.div>
          </div>
        )}

        {showAccountModal && user && (
          <div className="profile-overlay-clear" onClick={() => setShowAccountModal(false)}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="profile-dropdown-container" onClick={e => e.stopPropagation()} style={{ padding: '40px', borderRadius: '35px', textAlign: 'center', minWidth: '350px' }}>
              <div style={{ marginBottom: '25px' }}>
                <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 20px' }}>
                   <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', border: '4px solid #00f2ff', boxShadow: '0 0 20px rgba(0,242,255,0.5)', objectFit: 'cover' }} alt="Avatar" />
                </div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#fff', marginBottom: '5px' }}>{user.user_metadata.full_name}</h2>
                <p style={{ opacity: 0.6, fontSize: '1.1rem', marginBottom: '25px', color: '#a0a0a0' }}>{user.email}</p>
                <div style={{ background: '#ffcc00', color: '#000', padding: '12px 30px', borderRadius: '100px', fontSize: '1rem', fontWeight: '900', display: 'inline-block', boxShadow: '0 5px 15px rgba(255,204,0,0.3)', textTransform: 'uppercase' }}>
                  {isPro ? 'PREMIUM MEMBER' : 'FREE USER'}
                </div>
              </div>
              {!isPro && (
                <div style={{ background: 'rgba(255,215,0,0.1)', padding: '25px', borderRadius: '25px', border: '1px solid rgba(255,215,0,0.2)', marginTop: '20px' }}>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '15px' }}>{t('upgradeDesc')}</p>
                  <button onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} style={{ width: '100%', background: 'linear-gradient(135deg, #ffd700, #ff8c00)', color: '#000', padding: '16px', borderRadius: '15px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>Upgrade Now</button>
                </div>
              )}
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
