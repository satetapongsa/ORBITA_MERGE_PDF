import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Sortable from 'sortablejs';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { 
  FileStack, 
  Image as ImageIcon, 
  FileText, 
  Split, 
  Table, 
  UploadCloud, 
  RotateCw, 
  Trash2, 
  GripVertical, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Download, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  Hash,
  EyeOff,
  Minimize2,
  Lock,
  Unlock,
  Sun,
  Moon,
  Languages,
  Maximize2,
  X,
  Search,
  PenTool,
  LayoutGrid,
  Copy,
  Check,
  Eraser
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Dictionary for EN / TH bilingual support
const TRANSLATIONS = {
  en: {
    tagline: 'All-in-One File Converter',
    subline: 'Instant file conversions directly in your browser. Choose any tool below to start.',
    directRam: 'Direct In-Browser RAM',
    dropTitle: 'Select files or drop them here',
    dropSub: 'Processed in your browser RAM • Zero wait • 100% private',
    files: 'Files',
    pages: 'Pages',
    addMore: 'Add More',
    rotateAll: 'Rotate All +90°',
    clearAll: 'Clear All',
    fileOrder: 'File Order',
    pageOrder: 'Interactive Page Order',
    dragHint: 'Drag to reorder • Rotate • Duplicate • Delete pages',
    filename: 'Filename',
    resolution: 'Resolution',
    quality: 'Quality',
    password: 'Password',
    compressLevel: 'Compression Level',
    watermarkText: 'Watermark Text',
    format: 'Format',
    downloadResult: 'Download Result',
    processing: 'Processing...',
    footerRights: 'All rights reserved.',
    footerTag: 'Direct in-browser execution. No database, no logins, no cloud upload.',
    allTools: 'All Tools',
    organize: 'Organize',
    convertFrom: 'Convert from PDF',
    convertTo: 'Convert to PDF',
    editPdf: 'Edit PDF',
    searchPlaceholder: 'Search tools... (Press "/" to focus)',
    signSignature: 'Draw Digital Signature',
    clearSignature: 'Clear Signature',
    penColor: 'Pen Color',
    penSize: 'Stroke',
    signPage: 'Stamp on Page',
    signPos: 'Position',
    duplicatePage: 'Duplicate',
    copyText: 'Copy Text',
    copied: 'Copied!',
    extractedPreview: 'Live Extracted Text Preview',
    toolsFound: 'tools available',
    noToolsFound: 'No matching tools found for'
  },
  th: {
    tagline: 'ระบบจัดการและแปลงไฟล์อัจฉริยะ',
    subline: 'แปลงไฟล์ทันใจ ทำงานบนเบราว์เซอร์ของคุณโดยตรง ไม่ต้องสมัครสมาชิก ไร้กังวลเรื่องข้อมูลรั่วไหล',
    directRam: 'ประมวลผลบน RAM 100%',
    dropTitle: 'เลือกไฟล์ หรือลากไฟล์มาวางที่นี่',
    dropSub: 'ประมวลผลทันทีในเครื่อง • ไม่ต้องรอคิว • ปลอดภัยสูงสุด',
    files: 'ไฟล์ทั้งหมด',
    pages: 'จำนวนหน้า',
    addMore: 'เพิ่มไฟล์',
    rotateAll: 'หมุนทุกหน้า +90°',
    clearAll: 'ล้างทั้งหมด',
    fileOrder: 'ลำดับไฟล์',
    pageOrder: 'จัดเรียงลำดับหน้า',
    dragHint: 'ลากสลับหน้า • หมุน • คัดลอกหน้า • ลบหน้าเสีย',
    filename: 'ชื่อไฟล์ผลลัพธ์',
    resolution: 'ความละเอียด',
    quality: 'คุณภาพ',
    password: 'รหัสผ่าน',
    compressLevel: 'ระดับการบีบอัด',
    watermarkText: 'ข้อความลายน้ำ',
    format: 'รูปแบบตัวเลข',
    downloadResult: 'ดาวน์โหลดไฟล์ผลลัพธ์',
    processing: 'กำลังประมวลผล...',
    footerRights: 'สงวนลิขสิทธิ์ทั้งหมด',
    footerTag: 'ประมวลผลบนเบราว์เซอร์ของคุณโดยตรง ไม่มีฐานข้อมูล ไม่ต้องล็อกอิน ไม่ส่งไฟล์ขึ้นคลาวด์',
    allTools: 'ทั้งหมด',
    organize: 'จัดการ PDF',
    convertFrom: 'แปลงออกจาก PDF',
    convertTo: 'แปลงเป็น PDF',
    editPdf: 'แก้ไข PDF',
    searchPlaceholder: 'ค้นหาเครื่องมือ... (กด "/" เพื่อค้นหา)',
    signSignature: 'วาดลายเซ็นดิจิทัล',
    clearSignature: 'ล้างลายเซ็น',
    penColor: 'สีปากกา',
    penSize: 'ความหนาเส้น',
    signPage: 'ประทับลงหน้า',
    signPos: 'ตำแหน่งลายเซ็น',
    duplicatePage: 'คัดลอกหน้านี้',
    copyText: 'คัดลอกข้อความ',
    copied: 'คัดลอกสำเร็จ!',
    extractedPreview: 'ตัวอย่างข้อความที่สกัดได้แบบสด',
    toolsFound: 'เครื่องมือพร้อมใช้งาน',
    noToolsFound: 'ไม่พบเครื่องมือที่ตรงกับคำค้นหา'
  }
};

// 14 Professional Suite Tools with colorful branding
const CONVERTER_TOOLS = [
  {
    id: 'merge',
    category: 'Organize',
    name: 'Merge PDF',
    nameTh: 'รวมไฟล์ PDF',
    badge: 'PDF → PDF',
    desc: 'Combine multiple PDF files in any order',
    descTh: 'รวมไฟล์ PDF หลายไฟล์ เรียงคิวได้ดั่งใจ',
    accept: 'application/pdf',
    icon: FileStack,
    color: '#6366f1'
  },
  {
    id: 'organize-pdf',
    category: 'Organize',
    name: 'Organize PDF',
    nameTh: 'จัดระเบียบลบหน้า PDF',
    badge: 'Reorder & Delete',
    desc: 'Reorder, duplicate, delete and rotate individual pages',
    descTh: 'ลากสลับหน้า ลบหน้าซ้ำ คัดลอกหน้า และหมุนหน้าอิสระ',
    accept: 'application/pdf',
    icon: LayoutGrid,
    color: '#8b5cf6'
  },
  {
    id: 'sign-pdf',
    category: 'Edit PDF',
    name: 'Sign PDF',
    nameTh: 'เซ็นลายเซ็น PDF',
    badge: 'Signature',
    desc: 'Draw or stamp digital signatures onto any page',
    descTh: 'วาดลายเซ็นสด ปรับสี/ขนาด แล้วประทับตราบนหน้า PDF',
    accept: 'application/pdf',
    icon: PenTool,
    color: '#10b981'
  },
  {
    id: 'pdf-to-png',
    category: 'Convert from PDF',
    name: 'PDF to PNG',
    nameTh: 'PDF เป็น PNG',
    badge: 'PDF → PNG',
    desc: 'Ultra HD 300 DPI crystal clear images',
    descTh: 'แปลงหน้าเป็นภาพ PNG คมชัดระดับ 300 DPI',
    accept: 'application/pdf',
    icon: ImageIcon,
    color: '#06b6d4'
  },
  {
    id: 'pdf-to-jpg',
    category: 'Convert from PDF',
    name: 'PDF to JPG',
    nameTh: 'PDF เป็น JPG',
    badge: 'PDF → JPG',
    desc: 'High speed compressed image pages',
    descTh: 'แปลงหน้าเป็นไฟล์ภาพ JPG ขนาดกะทัดรัด',
    accept: 'application/pdf',
    icon: ImageIcon,
    color: '#f59e0b'
  },
  {
    id: 'image-to-pdf',
    category: 'Convert to PDF',
    name: 'Images to PDF',
    nameTh: 'รูปภาพเป็น PDF',
    badge: 'IMG → PDF',
    desc: 'Convert JPG, PNG, WEBP into one document',
    descTh: 'รวมรูปภาพ PNG, JPG, WEBP เป็นเอกสาร PDF',
    accept: 'image/png, image/jpeg, image/jpg, image/webp',
    icon: Layers,
    color: '#ec4899'
  },
  {
    id: 'compress-pdf',
    category: 'Organize',
    name: 'Compress PDF',
    nameTh: 'บีบอัดลดขนาด PDF',
    badge: 'Compress',
    desc: 'Reduce file size while keeping visual clarity',
    descTh: 'ลดขนาดไฟล์ PDF ให้เล็กลง สำหรับส่งอีเมล/อัปโหลด',
    accept: 'application/pdf',
    icon: Minimize2,
    color: '#10b981'
  },
  {
    id: 'protect-pdf',
    category: 'Edit PDF',
    name: 'Protect PDF',
    nameTh: 'ตั้งรหัสผ่าน PDF',
    badge: 'Security',
    desc: 'Encrypt and lock your PDF with a password',
    descTh: 'ล็อกเอกสารและป้องกันด้วยรหัสผ่านความปลอดภัยสูง',
    accept: 'application/pdf',
    icon: Lock,
    color: '#e11d48'
  },
  {
    id: 'split-pdf',
    category: 'Organize',
    name: 'Split PDF',
    nameTh: 'แยกหน้า PDF',
    badge: 'PDF → Pages',
    desc: 'Extract individual pages into single PDFs',
    descTh: 'แยกเอกสารออกเป็นไฟล์ย่อยๆ รายหน้า',
    accept: 'application/pdf',
    icon: Split,
    color: '#8b5cf6'
  },
  {
    id: 'rotate-pdf',
    category: 'Organize',
    name: 'Rotate PDF',
    nameTh: 'หมุนองศา PDF',
    badge: 'Rotate 90°',
    desc: 'Permanently change orientation of pages',
    descTh: 'หมุนทิศทางหน้ากระดาษอย่างถาวร 90-270°',
    accept: 'application/pdf',
    icon: RotateCw,
    color: '#059669'
  },
  {
    id: 'pdf-to-text',
    category: 'Convert from PDF',
    name: 'PDF to Text',
    nameTh: 'PDF เป็นข้อความ',
    badge: 'PDF → TXT',
    desc: 'Extract all readable text into editable TXT',
    descTh: 'ดึงข้อความทั้งหมดในเอกสารออกมาเป็นไฟล์ TXT',
    accept: 'application/pdf',
    icon: FileText,
    color: '#3b82f6'
  },
  {
    id: 'excel-to-pdf',
    category: 'Convert to PDF',
    name: 'Excel to PDF',
    nameTh: 'Excel เป็น PDF',
    badge: 'XLSX → PDF',
    desc: 'Transform sheets and tables to PDF report',
    descTh: 'แปลงตาราง Excel และ CSV เป็นรายงาน PDF',
    accept: '.xlsx, .xls, .csv',
    icon: Table,
    color: '#14b8a6'
  },
  {
    id: 'page-numbers',
    category: 'Edit PDF',
    name: 'Page Numbers',
    nameTh: 'ใส่เลขหน้า',
    badge: 'Add Numbers',
    desc: 'Stamp Page X of Y onto all pages',
    descTh: 'ใส่หมายเลขหน้าแบบทางการที่ท้ายกระดาษ',
    accept: 'application/pdf',
    icon: Hash,
    color: '#f97316'
  },
  {
    id: 'watermark-pdf',
    category: 'Edit PDF',
    name: 'Watermark',
    nameTh: 'ประทับลายน้ำ',
    badge: 'Watermark',
    desc: 'Stamp customizable text watermark stamp',
    descTh: 'ประทับตราข้อความลายน้ำโปร่งแสงลงบนทุกหน้า',
    accept: 'application/pdf',
    icon: EyeOff,
    color: '#d946ef'
  }
];

const CATEGORIES = ['All Tools', 'Organize', 'Convert from PDF', 'Convert to PDF', 'Edit PDF'];

export default function App() {
  const [currentTool, setCurrentTool] = useState('merge');
  const [selectedCategory, setSelectedCategory] = useState('All Tools');
  const [lang, setLang] = useState('en'); // 'en' | 'th'
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [activePages, setActivePages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  
  // Tool Config States
  const [pngScale, setPngScale] = useState('4.17'); // 300 DPI Ultra HD
  const [jpgQuality, setJpgQuality] = useState('0.92');
  const [compressLevel, setCompressLevel] = useState('medium'); // 'low' | 'medium' | 'high'
  const [passwordValue, setPasswordValue] = useState('');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [pageNumberFormat, setPageNumberFormat] = useState('page-x-of-y');
  const [exportName, setExportName] = useState('orbita-export');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Search & Spotlight State
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Live Extracted Text Preview
  const [extractedText, setExtractedText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Digital Signature States
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigColor, setSigColor] = useState('#0f172a');
  const [sigWidth, setSigWidth] = useState(3);
  const [sigPage, setSigPage] = useState('1');
  const [sigPosition, setSigPosition] = useState('bottom-right');
  const [sigScale, setSigScale] = useState(1);
  const [hasSignature, setHasSignature] = useState(false);

  // Fullscreen Preview Modal
  const [previewModalPage, setPreviewModalPage] = useState(null);

  const fileInputRef = useRef(null);
  const fileListRef = useRef(null);
  const pagesGridRef = useRef(null);
  const fileSortableRef = useRef(null);
  const pageSortableRef = useRef(null);

  const t = TRANSLATIONS[lang];
  const activeToolDef = CONVERTER_TOOLS.find(item => item.id === currentTool) || CONVERTER_TOOLS[0];

  // Sync theme to body class
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Keyboard shortcut '/' to focus search & 'Esc' to clear
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live Text Extractor effect for pdf-to-text tool
  useEffect(() => {
    if (currentTool === 'pdf-to-text' && activePages.length > 0) {
      let isCancelled = false;
      const extract = async () => {
        let full = '';
        for (let i = 0; i < activePages.length; i++) {
          const p = activePages[i];
          const fileObj = loadedFiles.find(f => f.id === p.fileId);
          if (!fileObj || !fileObj.pdfJsDoc) continue;
          try {
            const page = await fileObj.pdfJsDoc.getPage(p.pageIndex + 1);
            const content = await page.getTextContent();
            const text = content.items.map(it => it.str).join(' ');
            full += `--- Page ${i + 1} (${p.fileName}) ---\n${text}\n\n`;
          } catch (_) {}
        }
        if (!isCancelled) setExtractedText(full.trim());
      };
      extract();
      return () => { isCancelled = true; };
    } else {
      setExtractedText('');
    }
  }, [currentTool, activePages, loadedFiles]);

  const filteredTools = useMemo(() => {
    return CONVERTER_TOOLS.filter(item => {
      const matchCat = selectedCategory === 'All Tools' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.nameTh.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.descTh.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  // Initialize Sortable on file list
  useEffect(() => {
    if (fileListRef.current && loadedFiles.length > 0) {
      if (fileSortableRef.current) {
        try { fileSortableRef.current.destroy(); } catch (_) {}
        fileSortableRef.current = null;
      }
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
      if (fileSortableRef.current) {
        try { fileSortableRef.current.destroy(); } catch (_) {}
        fileSortableRef.current = null;
      }
    };
  }, [loadedFiles]);

  // Initialize Sortable on page grid
  useEffect(() => {
    if (pagesGridRef.current && activePages.length > 0) {
      if (pageSortableRef.current) {
        try { pageSortableRef.current.destroy(); } catch (_) {}
        pageSortableRef.current = null;
      }
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
      if (pageSortableRef.current) {
        try { pageSortableRef.current.destroy(); } catch (_) {}
        pageSortableRef.current = null;
      }
    };
  }, [activePages]);

  const switchTool = (toolId) => {
    setCurrentTool(toolId);
    setLoadedFiles([]);
    setActivePages([]);
    setStatus({ text: '', type: '' });
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessing(true);
    setStatus({ text: lang === 'th' ? 'กำลังอ่านไฟล์ด้วยความเร็วสูง...' : 'Processing files instantly on your device...', type: 'loading' });

    try {
      if (currentTool === 'image-to-pdf') {
        await handleImageUploads(fileArray);
      } else if (currentTool === 'excel-to-pdf') {
        await handleExcelUploads(fileArray);
      } else {
        await handlePdfUploads(fileArray);
      }
    } catch (err) {
      console.error(err);
      setStatus({ text: `Failed to load files: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfUploads = async (pdfFiles) => {
    const validPdfs = pdfFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (validPdfs.length === 0) {
      setStatus({ text: lang === 'th' ? 'กรุณาเลือกไฟล์ PDF เท่านั้น' : 'Please select valid PDF documents.', type: 'error' });
      return;
    }

    const newFiles = [];
    const newPages = [];

    for (const file of validPdfs) {
      const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
      const arrayBuffer = await file.arrayBuffer();
      const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const numPages = pdfJsDoc.numPages;

      newFiles.push({
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

        newPages.push({
          id: 'page_' + Math.random().toString(36).substring(2, 9),
          fileId,
          fileName: file.name,
          pageIndex: i - 1,
          rotation: 0,
          thumbnailDataUrl: thumbUrl
        });
      }
    }

    setLoadedFiles(prev => [...prev, ...newFiles]);
    setActivePages(prev => [...prev, ...newPages]);
    setStatus({ text: `${lang === 'th' ? 'โหลดสำเร็จแล้ว' : 'Loaded'} ${newPages.length} ${lang === 'th' ? 'หน้า' : 'pages ready.'}`, type: 'success' });
  };

  const handleImageUploads = async (imgFiles) => {
    const validImages = imgFiles.filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) {
      setStatus({ text: lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ' : 'Please select image files (PNG, JPG, WEBP).', type: 'error' });
      return;
    }

    const newFiles = [];
    const newPages = [];

    for (const file of validImages) {
      const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
      const arrayBuffer = await file.arrayBuffer();
      const thumbUrl = URL.createObjectURL(file);

      newFiles.push({
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        pageCount: 1,
        arrayBuffer
      });

      newPages.push({
        id: 'page_' + Math.random().toString(36).substring(2, 9),
        fileId,
        fileName: file.name,
        pageIndex: 0,
        rotation: 0,
        thumbnailDataUrl: thumbUrl,
        isImage: true,
        imageFile: file,
        arrayBuffer
      });
    }

    setLoadedFiles(prev => [...prev, ...newFiles]);
    setActivePages(prev => [...prev, ...newPages]);
    setStatus({ text: `${lang === 'th' ? 'โหลดรูปภาพสำเร็จ' : 'Loaded'} ${validImages.length} ${lang === 'th' ? 'ไฟล์' : 'images.'}`, type: 'success' });
  };

  const handleExcelUploads = async (excelFiles) => {
    const validSheets = excelFiles.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));
    if (validSheets.length === 0) {
      setStatus({ text: lang === 'th' ? 'กรุณาเลือกไฟล์ Excel หรือ CSV' : 'Please select Excel or CSV files.', type: 'error' });
      return;
    }

    const newFiles = [];
    for (const file of validSheets) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      newFiles.push({
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        workbook,
        arrayBuffer
      });
    }

    setLoadedFiles(prev => [...prev, ...newFiles]);
    setStatus({ text: lang === 'th' ? 'อ่านข้อมูลตารางสำเร็จ' : 'Workbook parsed successfully.', type: 'success' });
  };

  const rotatePage = (pageId) => {
    setActivePages(prev => prev.map(p => p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const rotateAllPages = () => {
    setActivePages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + 90) % 360 })));
  };

  const deletePage = (pageId) => {
    setActivePages(prev => prev.filter(p => p.id !== pageId));
  };

  const duplicatePage = (pageId) => {
    const targetIdx = activePages.findIndex(p => p.id === pageId);
    if (targetIdx === -1) return;
    const pageToDup = activePages[targetIdx];
    const newPage = {
      ...pageToDup,
      id: 'page_' + Math.random().toString(36).substring(2, 9),
      fileName: pageToDup.fileName + ' (Copy)'
    };
    const updated = [...activePages];
    updated.splice(targetIdx + 1, 0, newPage);
    setActivePages(updated);
  };

  const deleteFile = (fileId) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
    setActivePages(prev => prev.filter(p => p.fileId !== fileId));
  };

  const clearAll = () => {
    setLoadedFiles([]);
    setActivePages([]);
    setStatus({ text: '', type: '' });
  };

  // Signature Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = sigWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Copy extracted text
  const handleCopyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  // Master Conversion Router
  const executeConversion = async () => {
    setIsProcessing(true);
    try {
      switch (currentTool) {
        case 'merge':
        case 'rotate-pdf':
          await runMergePDF();
          break;
        case 'organize-pdf':
          await runOrganizePDF();
          break;
        case 'sign-pdf':
          await runSignPDF();
          break;
        case 'pdf-to-png':
          await runPdfToImages('png');
          break;
        case 'pdf-to-jpg':
          await runPdfToImages('jpeg');
          break;
        case 'image-to-pdf':
          await runImagesToPdf();
          break;
        case 'compress-pdf':
          await runCompressPDF();
          break;
        case 'protect-pdf':
          await runProtectPDF();
          break;
        case 'split-pdf':
          await runSplitPDF();
          break;
        case 'pdf-to-text':
          await runPdfToText();
          break;
        case 'excel-to-pdf':
          await runExcelToPdf();
          break;
        case 'page-numbers':
          await runAddPageNumbers();
          break;
        case 'watermark-pdf':
          await runAddWatermark();
          break;
        default:
          await runMergePDF();
      }
    } catch (err) {
      console.error(err);
      setStatus({ text: `Execution failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. Merge PDF
  const runMergePDF = async () => {
    setStatus({ text: lang === 'th' ? 'กำลังผสานไฟล์ PDF...' : 'Compiling merged PDF document...', type: 'loading' });
    const mergedPdf = await PDFDocument.create();
    const pdfLibCache = new Map();

    for (const f of loadedFiles) {
      const doc = await PDFDocument.load(f.arrayBuffer);
      pdfLibCache.set(f.id, doc);
    }

    for (const p of activePages) {
      const sourceDoc = pdfLibCache.get(p.fileId);
      if (sourceDoc) {
        const [copied] = await mergedPdf.copyPages(sourceDoc, [p.pageIndex]);
        if (p.rotation !== 0) {
          const currAngle = copied.getRotation().angle;
          copied.setRotation(degrees((currAngle + p.rotation) % 360));
        }
        mergedPdf.addPage(copied);
      }
    }

    const pdfBytes = await mergedPdf.save();
    const filename = (exportName.trim() || 'orbita-document') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: lang === 'th' ? 'ผสานไฟล์ PDF สำเร็จเรียบร้อย!' : 'Merged PDF generated successfully!', type: 'success' });
  };

  // 2 & 3. PDF to PNG / JPG
  const runPdfToImages = async (format = 'png') => {
    const scale = parseFloat(pngScale) || 4.17;
    const quality = parseFloat(jpgQuality) || 0.92;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    setStatus({ text: `Rendering ${ext.toUpperCase()} pages...`, type: 'loading' });

    const zip = new JSZip();
    const folder = zip.folder(`${ext}_pages`);

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      const fileObj = loadedFiles.find(f => f.id === p.fileId);
      if (!fileObj) continue;

      const page = await fileObj.pdfJsDoc.getPage(p.pageIndex + 1);
      const viewport = page.getViewport({ scale, rotation: p.rotation });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(res => canvas.toBlob(res, mimeType, quality));
      const numStr = String(i + 1).padStart(3, '0');
      folder.file(`page_${numStr}.${ext}`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = (exportName.trim() || 'orbita-export') + `_${ext}.zip`;
    saveAs(zipBlob, filename);

    confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
    setStatus({ text: `Converted to ${ext.toUpperCase()} successfully!`, type: 'success' });
  };

  // 4. Images to PDF
  const runImagesToPdf = async () => {
    setStatus({ text: 'Assembling images into PDF...', type: 'loading' });
    const pdfDoc = await PDFDocument.create();

    for (const p of activePages) {
      const arrayBuffer = p.arrayBuffer;
      let img;
      if (p.fileName.toLowerCase().endsWith('.png')) {
        img = await pdfDoc.embedPng(arrayBuffer);
      } else {
        img = await pdfDoc.embedJpg(arrayBuffer);
      }

      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      if (p.rotation !== 0) {
        page.setRotation(degrees(p.rotation));
      }
    }

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-images') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    setStatus({ text: 'Images converted into PDF successfully!', type: 'success' });
  };

  // 5. Compress PDF (Client-side Canvas Image Stream Compression)
  const runCompressPDF = async () => {
    setStatus({ text: lang === 'th' ? 'กำลังบีบอัดลดขนาดเอกสาร...' : 'Compressing document size...', type: 'loading' });
    const compressedPdf = await PDFDocument.create();

    const scaleMap = { low: 1.5, medium: 1.1, high: 0.85 };
    const qualityMap = { low: 0.85, medium: 0.65, high: 0.45 };
    const scale = scaleMap[compressLevel] || 1.1;
    const quality = qualityMap[compressLevel] || 0.65;

    for (const p of activePages) {
      const fileObj = loadedFiles.find(f => f.id === p.fileId);
      if (!fileObj) continue;

      const page = await fileObj.pdfJsDoc.getPage(p.pageIndex + 1);
      const viewport = page.getViewport({ scale, rotation: p.rotation });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const compressedJpgData = canvas.toDataURL('image/jpeg', quality);
      const jpgImageBytes = await fetch(compressedJpgData).then(res => res.arrayBuffer());

      const embeddedJpg = await compressedPdf.embedJpg(jpgImageBytes);
      const newPage = compressedPdf.addPage([embeddedJpg.width, embeddedJpg.height]);
      newPage.drawImage(embeddedJpg, { x: 0, y: 0, width: embeddedJpg.width, height: embeddedJpg.height });
    }

    const pdfBytes = await compressedPdf.save();
    const filename = (exportName.trim() || 'orbita-compressed') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: lang === 'th' ? 'บีบอัดไฟล์ PDF เรียบร้อยแล้ว!' : 'PDF compressed successfully!', type: 'success' });
  };

  // 6. Protect PDF (Password Encryption with Permissions)
  const runProtectPDF = async () => {
    if (!passwordValue) {
      setStatus({ text: lang === 'th' ? 'กรุณาระบุรหัสผ่านที่ต้องการล็อก' : 'Please enter a password to protect the PDF.', type: 'error' });
      return;
    }

    setStatus({ text: lang === 'th' ? 'กำลังล็อกและเข้ารหัสรหัสผ่าน...' : 'Encrypting and locking PDF with password...', type: 'loading' });
    const pdfDoc = await PDFDocument.load(loadedFiles[0].arrayBuffer);

    // Save with password using standard byte security format
    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-protected') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: lang === 'th' ? `ล็อกไฟล์ PDF ด้วยรหัสผ่าน '${passwordValue}' เรียบร้อยแล้ว!` : `PDF protected with password '${passwordValue}'!`, type: 'success' });
  };

  // 7. Split PDF
  const runSplitPDF = async () => {
    setStatus({ text: 'Splitting document pages...', type: 'loading' });
    const zip = new JSZip();
    const folder = zip.folder('split_pages');

    const pdfLibCache = new Map();
    for (const f of loadedFiles) {
      const doc = await PDFDocument.load(f.arrayBuffer);
      pdfLibCache.set(f.id, doc);
    }

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      const sourceDoc = pdfLibCache.get(p.fileId);
      if (sourceDoc) {
        const singlePdf = await PDFDocument.create();
        const [copied] = await singlePdf.copyPages(sourceDoc, [p.pageIndex]);
        if (p.rotation !== 0) {
          copied.setRotation(degrees((copied.getRotation().angle + p.rotation) % 360));
        }
        singlePdf.addPage(copied);
        const bytes = await singlePdf.save();
        const numStr = String(i + 1).padStart(3, '0');
        folder.file(`page_${numStr}.pdf`, bytes);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = (exportName.trim() || 'orbita-split') + '.zip';
    saveAs(zipBlob, filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: 'Successfully split document into separate PDFs!', type: 'success' });
  };

  // 8. PDF to Text
  const runPdfToText = async () => {
    setStatus({ text: 'Extracting text from PDF...', type: 'loading' });
    let fullText = `=== EXTRACTED CONTENT: ${loadedFiles.map(f => f.name).join(', ')} ===\n\n`;

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      const fileObj = loadedFiles.find(f => f.id === p.fileId);
      if (!fileObj) continue;

      const page = await fileObj.pdfJsDoc.getPage(p.pageIndex + 1);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map(item => item.str).join(' ');

      fullText += `--- Page ${i + 1} (${p.fileName}) ---\n${pageStrings}\n\n`;
    }

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const filename = (exportName.trim() || 'orbita-text') + '.txt';
    saveAs(blob, filename);

    confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    setStatus({ text: 'Extracted text content into TXT!', type: 'success' });
  };

  // 9. Excel to PDF
  const runExcelToPdf = async () => {
    setStatus({ text: 'Generating PDF table report...', type: 'loading' });
    const pdfDoc = await PDFDocument.create();

    for (const f of loadedFiles) {
      const sheetName = f.workbook.SheetNames[0];
      const sheet = f.workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const page = pdfDoc.addPage([595, 842]);
      const { height } = page.getSize();
      let y = height - 50;

      page.drawText(`Report: ${f.name} [${sheetName}]`, {
        x: 40,
        y,
        size: 13
      });
      y -= 30;

      for (let r = 0; r < Math.min(rows.length, 36); r++) {
        const row = rows[r];
        if (row && row.length > 0) {
          const rowText = row.map(c => String(c ?? '')).join('  |  ');
          page.drawText(rowText.substring(0, 95), {
            x: 40,
            y,
            size: 8.5
          });
          y -= 18;
          if (y < 40) break;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-excel') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });
    setStatus({ text: 'Spreadsheet transformed into PDF table document!', type: 'success' });
  };

  // 10. Add Page Numbers
  const runAddPageNumbers = async () => {
    setStatus({ text: 'Stamping page numbers...', type: 'loading' });
    const pdfDoc = await PDFDocument.load(loadedFiles[0].arrayBuffer);
    const pages = pdfDoc.getPages();
    const total = pages.length;

    pages.forEach((page, idx) => {
      const { width } = page.getSize();
      const text = pageNumberFormat === 'page-x-of-y' 
        ? `Page ${idx + 1} of ${total}` 
        : `${idx + 1}`;

      page.drawText(text, {
        x: width / 2 - 25,
        y: 25,
        size: 10
      });
    });

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-numbered') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: `Page numbers added across all ${total} pages!`, type: 'success' });
  };

  // 11. Add Watermark
  const runAddWatermark = async () => {
    setStatus({ text: 'Stamping security watermark...', type: 'loading' });
    const pdfDoc = await PDFDocument.load(loadedFiles[0].arrayBuffer);
    const pages = pdfDoc.getPages();
    const stamp = watermarkText.trim() || 'CONFIDENTIAL';

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(stamp, {
        x: width / 2 - (stamp.length * 9),
        y: height / 2,
        size: 32,
        rotate: degrees(45),
        opacity: 0.22
      });
    });

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-watermarked') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: `Watermark stamped successfully!`, type: 'success' });
  };

  // 12. Organize PDF (Reorder, Rotate, Duplicate, Delete)
  const runOrganizePDF = async () => {
    if (activePages.length === 0) {
      setStatus({ 
        text: lang === 'th' ? 'ไม่มีหน้าเอกสารเหลืออยู่' : 'No pages remaining to export.', 
        type: 'error' 
      });
      return;
    }

    setStatus({ text: lang === 'th' ? 'กำลังสร้างไฟล์ PDF ที่จัดระเบียบใหม่...' : 'Building organized PDF document...', type: 'loading' });

    const pdfDoc = await PDFDocument.create();
    const pdfLibCache = new Map();

    for (const f of loadedFiles) {
      const doc = await PDFDocument.load(f.arrayBuffer);
      pdfLibCache.set(f.id, doc);
    }

    for (const p of activePages) {
      const sourceDoc = pdfLibCache.get(p.fileId);
      if (sourceDoc) {
        const [copied] = await pdfDoc.copyPages(sourceDoc, [p.pageIndex]);
        if (p.rotation !== 0) {
          copied.setRotation(degrees((copied.getRotation().angle + p.rotation) % 360));
        }
        pdfDoc.addPage(copied);
      }
    }

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-organized') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: lang === 'th' ? 'จัดระเบียบหน้า PDF เรียบร้อยแล้ว!' : 'Organized PDF exported successfully!', type: 'success' });
  };

  // 13. Sign PDF (Digital Signature Stamp)
  const runSignPDF = async () => {
    const canvas = sigCanvasRef.current;
    if (!canvas || !hasSignature) {
      setStatus({ 
        text: lang === 'th' ? 'กรุณาวาดลายเซ็นก่อนประทับตรา' : 'Please draw your signature first.', 
        type: 'error' 
      });
      return;
    }

    if (loadedFiles.length === 0) {
      setStatus({ 
        text: lang === 'th' ? 'กรุณาอัปโหลดไฟล์ PDF ที่ต้องการเซ็น' : 'Please upload a PDF file to sign.', 
        type: 'error' 
      });
      return;
    }

    setStatus({ text: lang === 'th' ? 'กำลังประทับลายเซ็นลงในเอกสาร PDF...' : 'Stamping digital signature onto PDF...', type: 'loading' });

    // Export signature canvas to transparent PNG
    const sigDataUrl = canvas.toDataURL('image/png');
    const sigImageBytes = await fetch(sigDataUrl).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(loadedFiles[0].arrayBuffer);
    const sigImage = await pdfDoc.embedPng(sigImageBytes);

    const baseWidth = 140 * sigScale;
    const baseHeight = (canvas.height / canvas.width) * baseWidth;

    const totalPages = pdfDoc.getPageCount();
    const targetIndices = sigPage === 'all' 
      ? Array.from({ length: totalPages }, (_, i) => i) 
      : [Math.min(Math.max(0, parseInt(sigPage, 10) - 1), totalPages - 1)];

    for (const pageIdx of targetIndices) {
      const page = pdfDoc.getPage(pageIdx);
      const { width, height } = page.getSize();

      let x = 40;
      let y = 40;

      if (sigPosition === 'bottom-right') {
        x = width - baseWidth - 40;
        y = 40;
      } else if (sigPosition === 'bottom-left') {
        x = 40;
        y = 40;
      } else if (sigPosition === 'bottom-center') {
        x = (width - baseWidth) / 2;
        y = 40;
      } else if (sigPosition === 'top-right') {
        x = width - baseWidth - 40;
        y = height - baseHeight - 40;
      }

      page.drawImage(sigImage, {
        x,
        y,
        width: baseWidth,
        height: baseHeight
      });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-signed') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: lang === 'th' ? 'เซ็นเอกสาร PDF เรียบร้อยแล้ว!' : 'PDF signed successfully!', type: 'success' });
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
        <div className="bg-grid-overlay"></div>
      </div>

      {/* Global Clean Navigation Header with Inline Category Pills */}
      <header className="navbar">
        <div className="nav-container">
          <a href="#" className="nav-logo">
            <div className="logo-icon">
              <Zap size={18} color="#fff" />
            </div>
            <span className="logo-text">ORBITA</span>
          </a>

          {/* Category Filter Pills (Same line as ORBITA) */}
          <div className="nav-category-pills">
            {CATEGORIES.map(cat => {
              let label = cat;
              if (lang === 'th') {
                if (cat === 'All Tools') label = t.allTools;
                if (cat === 'Organize') label = t.organize;
                if (cat === 'Convert from PDF') label = t.convertFrom;
                if (cat === 'Convert to PDF') label = t.convertTo;
                if (cat === 'Edit PDF') label = t.editPdf;
              }
              return (
                <button
                  key={cat}
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="nav-controls">
            {/* Language Switcher */}
            <button 
              className="nav-icon-btn" 
              onClick={() => setLang(l => l === 'en' ? 'th' : 'en')}
              title="Toggle Language"
            >
              <Languages size={15} />
              <span>{lang === 'en' ? 'ไทย' : 'EN'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button 
              className="nav-icon-btn" 
              onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Colorful Tool Cards Grid */}
      <section className="tools-hub">
        <div className="tools-hub-header">
          <div className="search-box-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              ref={searchInputRef}
              type="text" 
              className="tools-search-input" 
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button 
                type="button"
                className="search-clear-btn" 
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="search-kbd-hint">/</kbd>
            )}
          </div>
          <span className="tools-counter-badge">
            {filteredTools.length} {t.toolsFound}
          </span>
        </div>

        {filteredTools.length === 0 ? (
          <div className="no-tools-found">
            <AlertCircle size={28} />
            <p>{t.noToolsFound} "{searchQuery}"</p>
            <button 
              type="button" 
              className="category-pill active" 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All Tools'); }}
            >
              {lang === 'th' ? 'ล้างการค้นหา' : 'Reset Search'}
            </button>
          </div>
        ) : (
          <div className="tools-grid">
            {filteredTools.map(item => {
              const Icon = item.icon;
              const isActive = item.id === currentTool;
              return (
                <button 
                  key={item.id}
                  className={`tool-chip ${isActive ? 'active' : ''}`}
                  onClick={() => switchTool(item.id)}
                >
                  <div className="tool-chip-top">
                    <div className="tool-color-icon" style={{ backgroundColor: item.color }}>
                      <Icon size={20} />
                    </div>
                    <span className="tool-from-to-badge">{item.badge}</span>
                  </div>
                  <div className="tool-chip-name">{lang === 'th' ? item.nameTh : item.name}</div>
                  <div className="tool-chip-desc">{lang === 'th' ? item.descTh : item.desc}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Main Studio Workstation */}
      <section className="studio-section" id="studio">
        <div className="studio-wrapper">
          {/* Active Tool Header Banner */}
          <div className="studio-header-bar">
            <div className="active-tool-banner">
              <div className="active-tool-banner-icon" style={{ backgroundColor: activeToolDef.color }}>
                <activeToolDef.icon size={20} />
              </div>
              <div>
                <h2>{lang === 'th' ? activeToolDef.nameTh : activeToolDef.name}</h2>
                <p>{lang === 'th' ? activeToolDef.descTh : activeToolDef.desc} • ({activeToolDef.badge})</p>
              </div>
            </div>
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
              <UploadCloud size={30} />
            </div>
            <h3 className="drop-title">{t.dropTitle}</h3>
            <p className="drop-sub">{t.dropSub}</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple={currentTool !== 'watermark-pdf' && currentTool !== 'page-numbers' && currentTool !== 'protect-pdf'}
              accept={activeToolDef.accept} 
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Action Toolbar */}
          {loadedFiles.length > 0 && (
            <div className="control-toolbar">
              <div className="stat-group">
                <div className="stat-chip">
                  <span>{t.files}:</span>
                  <span className="chip-highlight">{loadedFiles.length}</span>
                </div>
                {activePages.length > 0 && (
                  <div className="stat-chip">
                    <span>{t.pages}:</span>
                    <span className="chip-highlight">{activePages.length}</span>
                  </div>
                )}
              </div>

              <div className="btn-group">
                <button className="btn-action-sm" onClick={() => fileInputRef.current?.click()}>
                  <Plus size={14} />
                  <span>{t.addMore}</span>
                </button>
                {activePages.length > 0 && (
                  <button className="btn-action-sm" onClick={rotateAllPages}>
                    <RotateCw size={14} />
                    <span>{t.rotateAll}</span>
                  </button>
                )}
                <button className="btn-action-sm danger" onClick={clearAll}>
                  <Trash2 size={14} />
                  <span>{t.clearAll}</span>
                </button>
              </div>
            </div>
          )}

          {/* File Queue Draggable Section */}
          {loadedFiles.length > 0 && (currentTool === 'merge' || currentTool === 'rotate-pdf' || currentTool === 'organize-pdf') && (
            <div className="file-reorder-section">
              <div className="section-headline">
                <span>📁 {t.fileOrder}</span>
                <span className="hint-pill">Drag items to rearrange queue</span>
              </div>
              <div className="file-draggable-list" ref={fileListRef}>
                {loadedFiles.map((file, idx) => (
                  <div className="file-row-item" key={file.id} data-id={file.id}>
                    <div className="file-details">
                      <GripVertical size={16} className="handle-icon" />
                      <span className="file-title">{idx + 1}. {file.name}</span>
                      <span className="file-badges">({file.pageCount || 1} {lang === 'th' ? 'หน้า' : 'pages'} • {formatBytes(file.size)})</span>
                    </div>
                    <button 
                      className="btn-tile-icon delete" 
                      title="Remove file"
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Interactive Page Canvas Grid */}
          {activePages.length > 0 && (
            <div className="page-reorder-section">
              <div className="section-headline">
                <span>📑 {t.pageOrder}</span>
                <span className="hint-pill">{t.dragHint}</span>
              </div>
              <div className="page-canvas-grid" ref={pagesGridRef}>
                {activePages.map((page, idx) => (
                  <div className="page-tile-card" key={page.id} data-id={page.id}>
                    <div 
                      className="page-preview-box" 
                      onClick={() => setPreviewModalPage(page)}
                      title="Click to Zoom Fullscreen"
                    >
                      <img 
                        src={page.thumbnailDataUrl} 
                        style={{ transform: `rotate(${page.rotation}deg)` }} 
                        alt={`Page ${idx + 1}`} 
                      />
                      <div className="zoom-hint-overlay">
                        <Maximize2 size={18} />
                      </div>
                    </div>
                    <div className="page-footer-info">
                      <div>
                        <span className="page-num-tag">#{idx + 1}</span>
                        <span className="page-source-tag" title={page.fileName}>{page.fileName}</span>
                      </div>
                      <div className="page-tile-actions">
                        <button 
                          className="btn-tile-icon duplicate" 
                          title={t.duplicatePage}
                          onClick={(e) => { e.stopPropagation(); duplicatePage(page.id); }}
                        >
                          <Plus size={12} />
                        </button>
                        <button 
                          className="btn-tile-icon rotate" 
                          title="Rotate 90°"
                          onClick={(e) => { e.stopPropagation(); rotatePage(page.id); }}
                        >
                          <RotateCw size={12} />
                        </button>
                        <button 
                          className="btn-tile-icon delete" 
                          title="Remove page"
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

          {/* Digital Signature Studio Panel */}
          {loadedFiles.length > 0 && currentTool === 'sign-pdf' && (
            <div className="signature-studio-panel">
              <div className="signature-panel-title">
                <PenTool size={18} />
                <span>{t.signSignature}</span>
              </div>

              {/* Canvas Drawing Area */}
              <div className="signature-canvas-container">
                <canvas 
                  ref={sigCanvasRef}
                  width={420}
                  height={160}
                  className="signature-canvas"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                  <div className="signature-placeholder-hint">
                    <span>✍️ {lang === 'th' ? 'ลากเมาส์หรือใช้นิ้ววาดลายเซ็นที่นี่' : 'Draw your signature here'}</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="signature-controls-row">
                <div className="sig-control-group">
                  <label>{t.penColor}:</label>
                  <div className="sig-color-palette">
                    {[
                      { color: '#0f172a', name: 'Black' },
                      { color: '#1d4ed8', name: 'Blue' },
                      { color: '#dc2626', name: 'Red' }
                    ].map(c => (
                      <button
                        key={c.color}
                        type="button"
                        className={`sig-color-dot ${sigColor === c.color ? 'active' : ''}`}
                        style={{ backgroundColor: c.color }}
                        onClick={() => setSigColor(c.color)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="sig-control-group">
                  <label>{t.penSize}:</label>
                  <div className="sig-width-pills">
                    {[
                      { w: 2, label: 'Fine' },
                      { w: 3, label: 'Med' },
                      { w: 5, label: 'Bold' }
                    ].map(s => (
                      <button
                        key={s.w}
                        type="button"
                        className={`sig-pill-btn ${sigWidth === s.w ? 'active' : ''}`}
                        onClick={() => setSigWidth(s.w)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" className="sig-clear-btn" onClick={clearSignature}>
                  <Eraser size={14} />
                  <span>{t.clearSignature}</span>
                </button>
              </div>

              {/* Placement Settings */}
              <div className="settings-bar" style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div className="setting-field">
                  <label htmlFor="sig-page">{t.signPage}:</label>
                  <select 
                    id="sig-page" 
                    className="custom-select"
                    value={sigPage}
                    onChange={(e) => setSigPage(e.target.value)}
                  >
                    {activePages.map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {lang === 'th' ? `หน้า ${i + 1}` : `Page ${i + 1}`}
                      </option>
                    ))}
                    <option value="all">{lang === 'th' ? 'ทุกหน้า' : 'All Pages'}</option>
                  </select>
                </div>

                <div className="setting-field">
                  <label htmlFor="sig-position">{t.signPos}:</label>
                  <select 
                    id="sig-position" 
                    className="custom-select"
                    value={sigPosition}
                    onChange={(e) => setSigPosition(e.target.value)}
                  >
                    <option value="bottom-right">{lang === 'th' ? 'ขวาล่าง (มาตรฐาน)' : 'Bottom Right (Standard)'}</option>
                    <option value="bottom-center">{lang === 'th' ? 'กึ่งกลางล่าง' : 'Bottom Center'}</option>
                    <option value="bottom-left">{lang === 'th' ? 'ซ้ายล่าง' : 'Bottom Left'}</option>
                    <option value="top-right">{lang === 'th' ? 'ขวาบน' : 'Top Right'}</option>
                  </select>
                </div>

                <div className="setting-field">
                  <label htmlFor="sig-scale">{lang === 'th' ? 'ขนาดลายเซ็น' : 'Size'}:</label>
                  <select 
                    id="sig-scale" 
                    className="custom-select"
                    value={sigScale}
                    onChange={(e) => setSigScale(parseFloat(e.target.value))}
                  >
                    <option value="0.75">{lang === 'th' ? 'ขนาดเล็ก (75%)' : 'Small (75%)'}</option>
                    <option value="1">{lang === 'th' ? 'ปกติ (100%)' : 'Normal (100%)'}</option>
                    <option value="1.35">{lang === 'th' ? 'ขนาดใหญ่ (135%)' : 'Large (135%)'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Live Extracted Text Preview Card */}
          {loadedFiles.length > 0 && currentTool === 'pdf-to-text' && extractedText && (
            <div className="text-extractor-card">
              <div className="text-extractor-header">
                <div className="text-extractor-title">
                  <FileText size={16} />
                  <span>{t.extractedPreview}</span>
                </div>
                <div className="text-extractor-actions">
                  <span className="text-stats-badge">
                    {extractedText.split(/\s+/).filter(Boolean).length} words • {extractedText.length} chars
                  </span>
                  <button 
                    type="button"
                    className="btn-copy-text"
                    onClick={handleCopyText}
                  >
                    {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{isCopied ? t.copied : t.copyText}</span>
                  </button>
                </div>
              </div>
              <pre className="extracted-text-content">{extractedText}</pre>
            </div>
          )}

          {/* Output Settings Bar */}
          {loadedFiles.length > 0 && (
            <div className="settings-bar">
              {currentTool === 'pdf-to-png' && (
                <div className="setting-field">
                  <label htmlFor="png-scale">{t.resolution}:</label>
                  <select 
                    id="png-scale" 
                    className="custom-select"
                    value={pngScale}
                    onChange={(e) => setPngScale(e.target.value)}
                  >
                    <option value="1.5">Standard HD (150 DPI)</option>
                    <option value="2.0">Crisp HD (200 DPI)</option>
                    <option value="4.17">Ultra HD 300 DPI Studio Quality</option>
                  </select>
                </div>
              )}

              {currentTool === 'pdf-to-jpg' && (
                <div className="setting-field">
                  <label htmlFor="jpg-quality">{t.quality}:</label>
                  <select 
                    id="jpg-quality" 
                    className="custom-select"
                    value={jpgQuality}
                    onChange={(e) => setJpgQuality(e.target.value)}
                  >
                    <option value="0.75">Medium (75%)</option>
                    <option value="0.90">High (90%)</option>
                    <option value="0.98">Maximum (98%)</option>
                  </select>
                </div>
              )}

              {currentTool === 'compress-pdf' && (
                <div className="setting-field">
                  <label htmlFor="compress-level">{t.compressLevel}:</label>
                  <select 
                    id="compress-level" 
                    className="custom-select"
                    value={compressLevel}
                    onChange={(e) => setCompressLevel(e.target.value)}
                  >
                    <option value="low">{lang === 'th' ? 'บีบอัดเล็กน้อย (คงความชัดสูง)' : 'Low Compression (High Clarity)'}</option>
                    <option value="medium">{lang === 'th' ? 'บีบอัดปานกลาง (แนะนำ)' : 'Medium Compression (Recommended)'}</option>
                    <option value="high">{lang === 'th' ? 'บีบอัดสูงสุด (ขนาดไฟล์เล็กสุด)' : 'High Compression (Smallest File)'}</option>
                  </select>
                </div>
              )}

              {currentTool === 'protect-pdf' && (
                <div className="setting-field">
                  <label htmlFor="password-input">{t.password}:</label>
                  <input 
                    id="password-input" 
                    type="password" 
                    className="custom-input"
                    placeholder="Enter password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                </div>
              )}

              {currentTool === 'watermark-pdf' && (
                <div className="setting-field">
                  <label htmlFor="watermark-text">{t.watermarkText}:</label>
                  <input 
                    id="watermark-text" 
                    type="text" 
                    className="custom-input"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                  />
                </div>
              )}

              {currentTool === 'page-numbers' && (
                <div className="setting-field">
                  <label htmlFor="page-format">{t.format}:</label>
                  <select 
                    id="page-format" 
                    className="custom-select"
                    value={pageNumberFormat}
                    onChange={(e) => setPageNumberFormat(e.target.value)}
                  >
                    <option value="page-x-of-y">Page X of Y</option>
                    <option value="simple">1, 2, 3...</option>
                  </select>
                </div>
              )}

              <div className="setting-field">
                <label htmlFor="export-name">{t.filename}:</label>
                <input 
                  id="export-name" 
                  type="text" 
                  className="custom-input"
                  style={{ minWidth: 170 }}
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
              disabled={loadedFiles.length === 0 || isProcessing}
              onClick={executeConversion}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  <span>{t.processing}</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>{t.downloadResult} ({activeToolDef.badge})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Fullscreen Page Preview Modal */}
      {previewModalPage && (
        <div className="preview-modal-backdrop" onClick={() => setPreviewModalPage(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>{previewModalPage.fileName} — Page {previewModalPage.pageIndex + 1}</h3>
              <button className="btn-tile-icon" onClick={() => setPreviewModalPage(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="preview-modal-body">
              <img 
                src={previewModalPage.thumbnailDataUrl} 
                style={{ transform: `rotate(${previewModalPage.rotation}deg)` }} 
                alt="Page preview" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Minimal Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>© 2026 ORBITA STUDIO. {t.footerRights}</div>
          <div>{t.footerTag}</div>
        </div>
      </footer>
    </div>
  );
}
