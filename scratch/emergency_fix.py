import sys

filepath = 'src/App.jsx'

# โค้ดใหม่ทั้งหมดของ App.jsx ที่สะอาดและถูกต้อง 100%
new_content = """import React, { useState, useRef, useEffect } from "react";
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
  Presentation, X, LogIn, LogOut, User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import confetti from "canvas-confetti";

// PDF.js Worker Configuration
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// --- Sortable Item Component ---
const SortableItem = ({ id, url, index, onDelete, label }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`glass page-thumbnail ${isDragging ? "dragging" : ""}`}>
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
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [status, setStatus] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lang, setLang] = useState("th");
  const fileInputRef = useRef(null);

  const t = (k) => {
    const translations = {
      th: { heroTitle: "ทุกอย่างจัดการได้ในที่เดียว", heroGradient: "ORBITA PDF", searchPlaceholder: "ค้นหาเครื่องมือ...", unlockPro: "ปลดล็อก Pro" },
      en: { heroTitle: "One Stop Solution for", heroGradient: "ORBITA PDF", searchPlaceholder: "Search tools...", unlockPro: "Unlock Pro" }
    };
    return translations[lang][k] || k;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id);
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

  const handleToolClick = (tool) => setActiveTool(tool.id);
  const handleFileSelect = (e) => setFiles(Array.from(e.target.files));

  const tools = [
    { id: "pdf-merge", name: "Merge PDF", cat: "Manage", color: "#4f46e5", icon: <Layers /> },
    { id: "pdf-split", name: "Split PDF", cat: "Manage", color: "#0891b2", icon: <Move /> }
  ];

  return (
    <div className="layout-root">
      {/* Header */}
      <div className="top-header">
        <div className="logo-section">
          <Sparkles size={24} color="#00f2ff" />
          <span className="logo-text">ORBITA PDF</span>
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-info glass" onClick={() => setShowAccountModal(true)} style={{ cursor: "pointer" }}>
              <img src={user.user_metadata.avatar_url} className="user-avatar" alt="avatar" />
              <span>{user.user_metadata.full_name}</span>
            </div>
          )}
          {user && !isPro && <button className="pro-btn glass" onClick={() => setShowPayModal(true)}>{t("unlockPro")}</button>}
          {user && <button className="logout-btn glass" onClick={handleLogout}><LogOut size={16} /></button>}
        </div>
      </div>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-gate">
            <div className="hero-section text-center">
              <h1>Experience PDF Magic with <span className="text-gradient">ORBITA</span></h1>
              <p>ล็อคอินด้วย Google เพื่อเริ่มใช้งาน</p>
              <button className="cta-btn gold-btn" onClick={signInWithGoogle} style={{ padding: "1rem 2rem", marginTop: "2rem" }}>
                Continue with Google
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!activeTool ? (
              <div className="dashboard-content">
                <div className="hero-section">
                  <h1>{t("heroTitle")} <span className="text-gradient">{t("heroGradient")}</span></h1>
                  <input className="search-bar glass" placeholder={t("searchPlaceholder")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="tools-grid-main">
                  {tools.map(t => (
                    <div key={t.id} className="tool-box glass" onClick={() => handleToolClick(t)}>
                      <h3>{t.name}</h3>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tool-view-container">
                <button className="back-btn" onClick={() => setActiveTool(null)}><ArrowLeft /> Back</button>
                <div className="workspace-card glass" style={{ marginTop: "2rem", padding: "4rem" }}>
                   <input type="file" ref={fileInputRef} onChange={handleFileSelect} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showAccountModal && user && (
          <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
            <motion.div className="pay-modal glass animate-up" onClick={e => e.stopPropagation()}>
              <h2>Member Workspace</h2>
              <p>{user.email}</p>
              <button className="close-btn" onClick={() => setShowAccountModal(false)}>×</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer>
        <p>© 2026 ORBITA PDF Galaxy</p>
      </footer>
    </div>
  );
}
"""

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)
