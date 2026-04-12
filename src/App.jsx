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

const SortableItem = ({ id, url, index, onDelete, label }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={`glass page-thumbnail ${isDragging ? "dragging" : ""}`}>
      <div className="page-number">{index + 1}</div>
      <img src={url} alt="page" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div className="page-actions">
        <div className="drag-handle" {...attributes} {...listeners}><GripVertical size={16} /></div>
        <button className="del-btn-icon" onClick={() => onDelete(id)}><Trash2 size={16} /></button>
      </div>
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
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lang, setLang] = useState("en"); // Default to English
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  const t = (k) => {
    const dict = {
      th: { 
        heroTitle: "ยกระดับการจัดการ PDF ให้เป็นเรื่อง", 
        heroGradient: "มหัศจรรย์", 
        searchPlaceholder: "ค้นหาเครื่องมือ...", 
        unlockPro: "ปลดล็อก Pro", 
        files: "ไฟล์", 
        noHistory: "ยังไม่มีประวัติการใช้งาน", 
        recentActivity: "ประวัติการใช้งาน",
        landingTitle: "ปลดล็อคพลัง PDF ด้วย",
        landingDesc: "จัดการ แบ่ง รวม และรักษาความปลอดภัยไฟล์ของคุณได้ทันใจ",
        googleLogin: "เข้าสู่ระบบด้วย Google",
        welcomeBack: "ยินดีต้อนรับกลับมา",
        loginSubtitle: "ล็อคอินเพื่อเริ่มใช้งานฟรี",
        convertNow: "แปลงไฟล์ทันที",
        selected: "เลือกแล้ว",
        dropHint: "ลากไฟล์วางที่นี่ หรือ คลิกเพื่อเลือกไฟล์",
        supportFormat: "รองรับ PDF, DOCX, XLSX, รูปภาพ",
        home: "หน้าแรก",
        processing: "กำลังประมวลผล...",
        upgradeTitle: "อัปเกรดเป็น Orbita Pro",
        upgradeDesc: "เข้าถึงทุกเครื่องมือและฟีเจอร์ระดับมืออาชีพ",
        manage: "จัดการไฟล์",
        toPdf: "แปลงเป็น PDF",
        fromPdf: "แปลงจาก PDF",
        security: "ความปลอดภัย",
        utility: "เครื่องมือทั่วไป"
      },
      en: { 
        heroTitle: "Empower Your Workflow with", 
        heroGradient: "PDF Magic", 
        searchPlaceholder: "Search tools...", 
        unlockPro: "Unlock Pro", 
        files: "Files", 
        noHistory: "No history yet", 
        recentActivity: "Recent Activity",
        landingTitle: "Unlock PDF Magic with",
        landingDesc: "Manage, split, merge and secure your files instantly.",
        googleLogin: "Continue with Google",
        welcomeBack: "Welcome Back",
        loginSubtitle: "Sign in to start for free",
        convertNow: "Convert Now",
        selected: "Selected",
        dropHint: "Drop files here or click to browse",
        supportFormat: "Supports PDF, DOCX, XLSX, Images",
        home: "Home",
        processing: "Processing...",
        upgradeTitle: "Upgrade to Orbita Pro",
        upgradeDesc: "Access all pro tools and professional features",
        manage: "Manage Files",
        toPdf: "Convert to PDF",
        fromPdf: "Convert from PDF",
        security: "Security",
        utility: "Utility"
      }
    };
    return dict[lang][k] || k;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (s?.user) checkProStatus(s.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkProStatus = async (uid) => {
    const { data } = await supabase.from("profiles").select("is_pro").eq("id", uid).single();
    if (data) setIsPro(data.is_pro);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsPro(false);
    setUser(null);
  };

  const tools = [
    { id: 'pdf-merge', name: { th: 'รวม PDF', en: 'Merge PDF' }, desc: { th: 'รวมหลายไฟล์เป็นหนึ่งเดียว', en: 'Combine multiple files into one' }, cat: 'manage', color: 'linear-gradient(135deg, #6366f1, #a855f7)', icon: <Layers />, pro: false },
    { id: 'pdf-split', name: { th: 'แยก PDF', en: 'Split PDF' }, desc: { th: 'แยกหน้าไฟล์ PDF ออกมา', en: 'Extract pages from your PDF' }, cat: 'manage', color: 'linear-gradient(135deg, #06b6d4, #3b82f6)', icon: <Move />, pro: false },
    { id: 'pdf-reorder', name: { th: 'สลับหน้า PDF', en: 'Reorder Pages' }, desc: { th: 'สลับลำดับหน้าเอกสาร', en: 'Rearrange PDF page order' }, cat: 'manage', color: 'linear-gradient(135deg, #8b5cf6, #d946ef)', icon: <GripVertical />, pro: true },
    { id: 'img-to-pdf', name: { th: 'รูปภาพเป็น PDF', en: 'Image to PDF' }, desc: { th: 'แปลงรูปภาพเป็นเอกสาร', en: 'Convert images to PDF docs' }, cat: 'toPdf', color: 'linear-gradient(135deg, #f59e0b, #ef4444)', icon: <FileImage />, pro: false },
    { id: 'word-to-pdf', name: { th: 'Word เป็น PDF', en: 'Word to PDF' }, desc: { th: 'แปลงไฟล์ Word เป็น PDF', en: 'Convert Word docs to PDF' }, cat: 'toPdf', color: 'linear-gradient(135deg, #2563eb, #3b82f6)', icon: <FileText />, pro: true },
    { id: 'excel-to-pdf', name: { th: 'Excel เป็น PDF', en: 'Excel to PDF' }, desc: { th: 'แปลงตาราง Excel เป็น PDF', en: 'Convert Excel sheets to PDF' }, cat: 'toPdf', color: 'linear-gradient(135deg, #10b981, #059669)', icon: <FileSpreadsheet />, pro: true },
    { id: 'pdf-to-img', name: { th: 'PDF เป็นรูปภาพ', en: 'PDF to Image' }, desc: { th: 'แปลงเอกสารเป็นรูปภาพ', en: 'Extract pages as images' }, cat: 'fromPdf', color: 'linear-gradient(135deg, #10b981, #3b82f6)', icon: <Presentation />, pro: true },
    { id: 'pdf-to-word', name: { th: 'PDF เป็น Word', en: 'PDF to Word' }, desc: { th: 'แปลงเอกสารกลับสู่ MS Word', en: 'Convert PDF back to Word' }, cat: 'fromPdf', color: 'linear-gradient(135deg, #3b82f6, #6366f1)', icon: <FileType2 />, pro: true },
    { id: 'pdf-protect', name: { th: 'ล็อค PDF', en: 'Protect PDF' }, desc: { th: 'ตั้งรหัสผ่านความปลอดภัย', en: 'Set password protection' }, cat: 'security', color: 'linear-gradient(135deg, #ef4444, #8b5cf6)', icon: <Lock />, pro: true },
    { id: 'pdf-unlock', name: { th: 'ปลดล็อค PDF', en: 'Unlock PDF' }, desc: { th: 'ลบรหัสผ่านออกจากไฟล์', en: 'Remove PDF password' }, cat: 'security', color: 'linear-gradient(135deg, #22c55e, #10b981)', icon: <Unlock />, pro: true },
    { id: 'pdf-compress', name: { th: 'ลดขนาด PDF', en: 'Compress PDF' }, desc: { th: 'ย่อขนาดไฟล์ให้เล็กลง', en: 'Reduce PDF file size' }, cat: 'utility', color: 'linear-gradient(135deg, #f97316, #f59e0b)', icon: <Minimize2 />, pro: true }
  ];

  const handleToolClick = (tool) => {
    if (tool.pro && !isPro) {
      setShowPayModal(true);
      return;
    }
    setActiveTool(tool.id);
    setFiles([]);
    setItems([]);
  };

  const handleFileSelect = async (e) => {
    const selFiles = Array.from(e.target.files);
    setFiles(selFiles);
    if (activeTool === 'pdf-merge' || activeTool === 'pdf-split' || activeTool === 'pdf-reorder') {
        setLoading(true);
        const newItems = [];
        for (const file of selFiles) {
            try {
              const arrayBuffer = await file.arrayBuffer();
              const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
              for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const viewport = page.getViewport({ scale: 0.5 });
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await page.render({ canvasContext: context, viewport }).promise;
                  newItems.push({ id: `${file.name}-${i}-${Date.now()}`, url: canvas.toDataURL(), file, pageNum: i });
              }
            } catch (err) { setStatus({type: 'error', msg: 'Processing failed. Your file is secure but unsupported.'}); setLoading(false); }
        }
        setItems(newItems);
        setLoading(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  return (
    <div className="layout-root">
      {status && (
        <div className={`status-toast ${status.type} animate-fade`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.msg}
        </div>
      )}

      {/* --- HEADER --- */}
      {user && <header className="top-header glass-header">
        <div className="logo-section clickable" onClick={() => {setActiveTool(null); setFiles([]); setItems([]); window.scrollTo({top: 0, behavior: 'smooth'});}}>
          <div className="app-icon-hex shadow-neon">
            <Sparkles size={24} color="#00f2ff" />
          </div>
          <span className="logo-text">ORBITA <span className="text-gradient">PDF</span></span>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="lang-toggle glass-sm">
            <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>

          {user ? (
            <div className="user-profile-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="user-info-chip glass-card" onClick={() => setShowAccountModal(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 15px', borderRadius: '15px' }}>
                <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                <div className="user-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="u-name" style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.user_metadata.full_name}</span>
                  <span className={`u-status ${isPro ? 'pro-glow' : ''}`} style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.8, color: isPro ? 'var(--accent)' : 'var(--text-dim)' }}>{isPro ? 'PREMIUM' : 'FREE PLAN'}</span>
                </div>
              </div>
              <button className="logout-btn-icon" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
            </div>
          ) : (
             <button className="cta-btn-sm shine-effect" onClick={signInWithGoogle}><LogIn size={16} /> {t('googleLogin')}</button>
          )}
        </div>
      </header>}

      <main className="main-viewport">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-landing-split">
              <div className="galaxy-bg-effect"></div>
              
              <div className="landing-text-side animate-fade">
                <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="badge-premium" style={{ marginBottom: '2rem' }}>ORBITA GALAXY V2.0</motion.div>
                <motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="display-title-lux">
                  Unlock PDF <br/> Magic with <br/><span className="text-gradient">ORBITA</span>
                </motion.h1>
                <motion.p initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="hero-desc" style={{ fontSize: '1.4rem', maxWidth: '600px', lineHeight: 1.6, opacity: 0.8 }}>
                  {t('landingDesc')} <br/>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', color: '#00ff88', fontSize: '1rem', fontWeight: '800' }}>
                    <ShieldCheck size={20}/> Privacy First. 100% Local Processing.
                  </span>
                </motion.p>
              </div>

              <div className="landing-auth-side">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="auth-card-luxury">
                   <div className="auth-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
                      <div style={{ background: 'rgba(255,215,0,0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Sparkles size={32} color="#ffd700" />
                      </div>
                      <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('welcomeBack')}</h2>
                      <p style={{ opacity: 0.6 }}>{t('loginSubtitle')}</p>
                   </div>
                   <button className="google-auth-btn sky-glow" onClick={signInWithGoogle}>
                      <img src="https://www.google.com/favicon.ico" width="24" alt="G" />
                      <span>{t('googleLogin')}</span>
                   </button>
                   <div style={{ marginTop: '30px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                      <p>Secure OAuth 2.0 Encryption</p>
                      <p style={{ marginTop: '5px' }}>Trusted by 10,000+ Users</p>
                   </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="app-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-content-container">
              {!activeTool ? (
                <div className="dashboard-view animate-fade">
                  <div className="dashboard-hero" style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3.2rem', marginBottom: '1.5rem', lineHeight: 1.2 }}>{t('heroTitle')} <br/><span className="text-gradient">{t('heroGradient')}</span></h1>
                    <div className="search-container-lux">
                       <Wand2 className="search-icon" size={22} />
                       <input type="text" className="search-input-lux" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                  </div>

                  <div className="tools-sections" style={{ marginTop: '5rem' }}>
                    {['manage', 'toPdf', 'fromPdf', 'security', 'utility'].map(catKey => {
                        const catTools = tools.filter(tx => tx.cat === catKey && (tx.name.en.toLowerCase().includes(searchTerm.toLowerCase()) || tx.name.th.includes(searchTerm)));
                        if (catTools.length === 0) return null;
                        return (
                          <section key={catKey} className="tool-group-section" style={{ marginBottom: '4rem' }}>
                            <h2 className="section-label" style={{ marginBottom: '1.5rem', fontSize: '1.3rem', opacity: 0.8, color: 'var(--primary)' }}>{t(catKey)}</h2>
                            <div className="tools-grid-lux">
                              {catTools.map(tool => (
                                <motion.div whileHover={{ y: -8, scale: 1.02 }} key={tool.id} className="tool-card-lux glass" onClick={() => handleToolClick(tool)}>
                                   <div className="tool-icon-box" style={{ background: tool.color }}>{tool.icon}</div>
                                   <div className="tool-info">
                                      <h3>{tool.name[lang]}</h3>
                                      <p>{tool.desc[lang]}</p>
                                   </div>
                                   {tool.pro && !isPro && <div className="pro-lock-tag"><Zap size={10} /> PRO</div>}
                                   <ChevronRight className="arrow-hint" size={16} />
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        );
                    })}
                  </div>

                  <div className="history-section animate-up" style={{ marginTop: '5rem', background: 'rgba(255,255,255,0.02)', padding: '40px', borderRadius: '35px', border: '1px solid rgba(255,255,255,0.08)' }}>
                     <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Clock size={22} color="#00f2ff" /> <h3 style={{ fontSize: '1.4rem' }}>{t('recentActivity')}</h3></div>
                        {isPro ? <span className="stat-tag glass-sm" style={{ fontSize: '0.8rem', opacity: 0.6 }}>History Sync On</span> : <span className="stat-tag locked" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Pro Feature 🔒</span>}
                     </div>
                     <div className="history-list-compact" style={{ display: 'grid', gap: '12px' }}>
                        {history.length > 0 ? history.map(h => (
                          <div key={h.id} className="history-item-lux glass-sm" style={{ padding: '18px 25px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between' }}>
                             <span className="h-tool" style={{ fontWeight: '700' }}>{h.tool}</span>
                             <span className="h-date" style={{ opacity: 0.5 }}>{h.date}</span>
                          </div>
                        )) : <div className="empty-state-lux" style={{ textAlign: 'center', padding: '3rem', opacity: 0.4 }}>{t('noHistory')}</div>}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="active-tool-workspace animate-scale">
                    <div className="workspace-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                       <button className="back-btn-lux" onClick={() => {setActiveTool(null); setFiles([]); setItems([]);}} ><ArrowLeft size={20} /> {t('home')}</button>
                       <div className="active-tool-badge" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div className="tool-mini-icon" style={{ background: tools.find(tx => tx.id === activeTool).color, width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{tools.find(tx => tx.id === activeTool).icon}</div>
                          <h2 style={{ fontSize: '1.6rem' }}>{tools.find(tx => tx.id === activeTool).name[lang]}</h2>
                       </div>
                    </div>
                       <div className="security-badge glass-sm" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 15px', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.05)' }}>
                          <ShieldCheck size={16} color="#00ff88" />
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#00ff88' }}>SECURE LOCAL PROCESSING</span>
                       </div>

                    <div className="dropzone-area-lux glass-card" onClick={() => fileInputRef.current.click()} style={{ marginTop: '2.5rem', minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileSelect} />
                       {(files.length === 0 && items.length === 0) ? (
                         <div className="drop-content" style={{ textAlign: 'center' }}>
                            <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="icon-pulse" style={{ marginBottom: '20px' }}>
                               <FilePlus size={72} color="#00f2ff" />
                            </motion.div>
                            <p style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '10px' }}>{t('dropHint')}</p>
                            <span className="hint-text" style={{ opacity: 0.5, fontSize: '0.9rem' }}>{t('supportFormat')}</span>
                         </div>
                       ) : (
                         <div className="files-preview-lux" style={{ width: '100%' }}>
                            {(activeTool === 'pdf-merge' || activeTool === 'pdf-split' || activeTool === 'pdf-reorder') ? (
                              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                                if (active && over && active.id !== over.id) {
                                  setItems(itms => {
                                    const oldIdx = itms.findIndex(i => i.id === active.id);
                                    const newIdx = itms.findIndex(i => i.id === over.id);
                                    return arrayMove(itms, oldIdx, newIdx);
                                  });
                                }
                              }}>
                                <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                                  <div className="grid-preview" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px', padding: '30px' }}>
                                    {items.map((it, idx) => (
                                      <SortableItem key={it.id} id={it.id} index={idx} url={it.url} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            ) : (
                              <div className="list-preview" style={{ display: 'grid', gap: '12px', padding: '30px' }}>
                                 {files.map((f, i) => (
                                   <div key={i} className="file-row-lux glass" style={{ padding: '18px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                        <FileText size={22} color="#00f2ff" />
                                        <span style={{ fontWeight: '600' }}>{f.name}</span>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); setFiles(p => p.filter((_, idx) => idx !== i)); }} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                   </div>
                                 ))}
                              </div>
                            )}
                         </div>
                       )}
                    </div>

                    {(files.length > 0 || items.length > 0) && (
                      <div className="action-bar-lux glass animate-up" style={{ marginTop: '3.5rem', padding: '25px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '30px', border: '1px solid var(--primary)', boxShadow: '0 10px 40px rgba(0,242,255,0.1)' }}>
                         <div className="file-summary" style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('selected')}: {files.length || items.length} {t('files')}</div>
                         <button className="cta-btn-lux cyan-glow" disabled={loading} style={{ background: 'var(--primary)', color: '#000', padding: '16px 45px', borderRadius: '18px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                            {loading ? <><Loader2 className="spin" /> {t('processing')}</> : <><Wand2 size={22} /> {t('convertNow')}</>}
                         </button>
                      </div>
                    )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {showPayModal && (
          <div className="modal-overlay blur-overlay" onClick={() => setShowPayModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="pay-modal-lux" onClick={e => e.stopPropagation()} style={{ padding: '60px', borderRadius: '45px', textAlign: 'center' }}>
               <div className="pay-header">
                  <div className="badge-pro-gold" style={{ background: 'var(--accent)', color: '#000', padding: '6px 20px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900', display: 'inline-block', marginBottom: '1.5rem' }}>PREMIUM ACCESS</div>
                  <h2 style={{ fontSize: '2.4rem', marginBottom: '0.5rem', fontWeight: '800' }}>{t('upgradeTitle')}</h2>
                  <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>{t('upgradeDesc')}</p>
               </div>

               {payStep === 'plans' ? (
                 <div className="plans-selection" style={{ marginTop: '30px' }}>
                    <div className="plan-card luxury-border" style={{ background: 'rgba(255,255,255,0.03)', padding: '35px', borderRadius: '30px', border: '1px solid var(--accent)', position: 'relative' }}>
                       <span className="price-tag" style={{ fontSize: '3rem', fontWeight: '900' }}>฿59<small style={{ fontSize: '1.1rem', opacity: 0.5 }}>/month</small></span>
                       <ul className="plan-perks" style={{ listStyle: 'none', margin: '25px 0', display: 'grid', gap: '12px', textAlign: 'left' }}>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="#00ff88" size={18} /> Unlocked All 20+ Pro Tools</li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="#00ff88" size={18} /> High Quality Conversion</li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 color="#00ff88" size={18} /> Priority Processing Speed</li>
                       </ul>
                       <button className="gold-btn-lux" onClick={() => setPayStep('checkout')} style={{ width: '100%', background: 'var(--accent)', color: '#000', padding: '18px', borderRadius: '20px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>Get Pro Now</button>
                    </div>
                    <button className="text-link-lux" onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: '#fff', width: '100%', marginTop: '25px', opacity: 0.5, cursor: 'pointer' }}>Stay on Free Plan</button>
                 </div>
               ) : (
                 <div className="checkout-step animate-fade" style={{ marginTop: '30px' }}>
                    <div className="qr-checkout-card" style={{ background: '#fff', padding: '30px', borderRadius: '30px', display: 'inline-block', marginBottom: '25px' }}>
                       <QrCode size={200} color="#000" />
                       <p className="timer" style={{ color: '#000', marginTop: '15px', fontWeight: '800', fontSize: '1.1rem' }}>Scan within <b style={{ color: '#ff4d4d' }}>01:59</b></p>
                    </div>
                    <div className="checkout-info" style={{ display: 'grid', gap: '12px', maxWidth: '300px', margin: '0 auto 25px' }}>
                       <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Amount:</span> <b style={{ color: 'var(--accent)' }}>59.00 THB</b></div>
                       <div className="row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Method:</span> <b>PromptPay QR</b></div>
                    </div>
                    <button className="cta-btn-lux cyan-glow" onClick={() => { setIsPro(true); setShowPayModal(false); confetti(); }} style={{ width: '100%', background: 'linear-gradient(135deg, #00f2ff, #7000ff)', color: '#fff', padding: '18px', borderRadius: '20px', fontWeight: '900', border: 'none', cursor: 'pointer' }}>Simulate Success ✅</button>
                 </div>
               )}
               <button className="close-btn-round" onClick={() => setShowPayModal(false)}>×</button>
            </motion.div>
          </div>
        )}

        {showAccountModal && user && (
          <div className="modal-overlay" style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }} onClick={() => setShowAccountModal(false)}>
            <motion.div initial={{ y: -20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.95 }} className="profile-dropdown-container" onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
                <img src={user.user_metadata.avatar_url} style={{ width: '85px', height: '85px', borderRadius: '50%', border: '4px solid var(--primary)', objectFit: 'cover', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(0,242,255,0.2)' }} alt="Avatar" />
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{user.user_metadata.full_name}</h2>
                <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{user.email}</p>
                <div style={{ marginTop: '1.2rem', background: isPro ? 'var(--accent)' : 'rgba(255,255,255,0.08)', color: isPro ? '#000' : '#fff', padding: '6px 18px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '900', display: 'inline-block' }}>{isPro ? 'PREMIUM MEMBER' : 'FREE USER'}</div>
              </div>
              {!isPro && (
                <div className='upgrade-banner'>
                  <div style={{ textAlign: 'left' }}>
                    <div className='cta-text' style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '0.95rem' }}>⭐ UPGRADE TO PRO</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t('upgradeDesc')}</p>
                  </div>
                  <button onClick={() => { setShowPayModal(true); setShowAccountModal(false); }} className='gold-btn-lux' style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', border: 'none' }}>Upgrade</button>
                </div>
              )}
              <button className="logout-btn-dropdown" onClick={handleLogout}><LogOut size={16} /> Sign Out</button>
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
