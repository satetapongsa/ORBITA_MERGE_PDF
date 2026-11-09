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
  Eraser,
  Video,
  Music,
  DownloadCloud,
  FileCode,
  FolderArchive,
  Play,
  Sliders,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  FileDown,
  FileUp,
  Sparkles
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Dictionary for EN / TH bilingual support
const TRANSLATIONS = {
  en: {
    tagline: 'All-in-One File & Media Studio',
    subline: 'Instant file conversions, video downloads, and document editing directly in your browser.',
    directRam: 'Direct In-Browser RAM',
    dropTitle: 'Select files or drop them here',
    dropSub: 'Processed instantly on your device • Zero wait • 100% private',
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
    footerTag: 'Direct high-speed execution. Zero cloud leaks, zero logins.',
    allTools: 'All Tools',
    organize: 'Organize',
    convertFrom: 'Convert from PDF',
    convertTo: 'Convert to PDF',
    editPdf: 'Edit PDF',
    mediaVideo: 'Media & Video',
    officeStudio: 'Office & Studio',
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
    noToolsFound: 'No matching tools found for',
    // Video Downloader translations
    videoUrlPlaceholder: 'Paste link from TikTok, YouTube, Instagram Reels, Facebook...',
    inspectVideo: 'Inspect & Fetch',
    videoFormatVideo: 'Full HD Video (MP4)',
    videoFormatAudio: 'Studio Audio Only (MP3 320k)',
    downloadVideoBtn: 'Download Media',
    downloadingPercent: 'Downloading',
    speed: 'Speed',
    eta: 'ETA',
    // Word Studio translations
    docTitlePlaceholder: 'Document Title...',
    exportDocx: 'Export to .DOCX',
    importDocx: 'Open .DOCX',
    wordsCount: 'words',
    charsCount: 'chars',
    // Media tools
    audioBitrate: 'Audio Bitrate',
    convertAudioBtn: 'Extract Audio (MP3)',
    convertVideoBtn: 'Convert Video',
    batchZipBtn: 'Download Batch as ZIP',
    resizeScale: 'Resize Scale'
  },
  th: {
    tagline: 'ระบบจัดการ แปลงไฟล์ และมีเดียสตูดิโออัจฉริยะ',
    subline: 'แปลงไฟล์ทันใจ โหลดคลิปโซเชียล สกัดเสียง MP3 และพิมพ์เอกสาร Word ในเว็บ ไม่ต้องสมัครสมาชิก',
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
    footerTag: 'ประมวลผลบนเครื่องของคุณโดยตรง ไม่มีฐานข้อมูล ไม่ต้องล็อกอิน ปลอดภัยสูงสุด',
    allTools: 'ทั้งหมด',
    organize: 'จัดการ PDF',
    convertFrom: 'แปลงออกจาก PDF',
    convertTo: 'แปลงเป็น PDF',
    editPdf: 'แก้ไข PDF',
    mediaVideo: 'สื่อและวิดีโอ',
    officeStudio: 'ออฟฟิศและเอกสาร',
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
    noToolsFound: 'ไม่พบเครื่องมือที่ตรงกับคำค้นหา',
    // Video Downloader translations
    videoUrlPlaceholder: 'วางลิงก์จาก TikTok, YouTube, Instagram Reels, Facebook...',
    inspectVideo: 'ดึงข้อมูลคลิป',
    videoFormatVideo: 'วิดีโอความชัดสูงสุด (MP4)',
    videoFormatAudio: 'เฉพาะเสียงสตูดิโอ (MP3 320 kbps)',
    downloadVideoBtn: 'เริ่มดาวน์โหลดไฟล์',
    downloadingPercent: 'กำลังดาวน์โหลด',
    speed: 'ความเร็ว',
    eta: 'เวลาที่เหลือ',
    // Word Studio translations
    docTitlePlaceholder: 'ชื่อเอกสาร...',
    exportDocx: 'บันทึกเป็น .DOCX',
    importDocx: 'เปิดไฟล์ .DOCX',
    wordsCount: 'คำ',
    charsCount: 'ตัวอักษร',
    // Media tools
    audioBitrate: 'บิตเรตเสียง',
    convertAudioBtn: 'สกัดเสียงเป็น MP3',
    convertVideoBtn: 'แปลงรูปแบบวิดีโอ',
    batchZipBtn: 'ดาวน์โหลดไฟล์กลุ่มเป็น ZIP',
    resizeScale: 'ปรับขนาดภาพ'
  }
};

// 19 Professional Suite Tools
const CONVERTER_TOOLS = [
  // ── Media & Video Category ──
  {
    id: 'social-video',
    category: 'Media & Video',
    name: 'Social Video & Audio',
    nameTh: 'ดาวน์โหลดคลิปโซเชียล',
    badge: 'TikTok • YT • IG • FB',
    desc: 'Download full-res video or crystal 320k MP3 audio from any link',
    descTh: 'โหลดคลิปคมชัดระดับ HD หรือสกัดเสียง MP3 จาก TikTok, YouTube, IG, Facebook',
    accept: '',
    icon: DownloadCloud,
    color: '#f43f5e'
  },
  {
    id: 'video-to-audio',
    category: 'Media & Video',
    name: 'Video to MP3 (320k)',
    nameTh: 'แปลงวิดีโอเป็น MP3',
    badge: 'Video → MP3',
    desc: 'Extract studio-grade 320 kbps MP3 audio from any video format',
    descTh: 'สกัดไฟล์เสียง MP3 ความคมชัดสูง 320 kbps จากไฟล์วิดีโอทุกสกุล',
    accept: 'video/*',
    icon: Music,
    color: '#8b5cf6'
  },
  {
    id: 'video-converter',
    category: 'Media & Video',
    name: 'Video Converter',
    nameTh: 'แปลงรูปแบบวิดีโอ',
    badge: 'MP4 • WebM • MKV',
    desc: 'Convert, scale to 1080p/720p and compress videos with FFmpeg engine',
    descTh: 'แปลงไฟล์วิดีโอ เลือกความละเอียด 1080p, 720p และปรับคุณภาพบีบอัดได้ตามต้องการ',
    accept: 'video/*',
    icon: Video,
    color: '#06b6d4'
  },
  // ── Office & Studio Category ──
  {
    id: 'word-studio',
    category: 'Office & Studio',
    name: 'Word Document Studio',
    nameTh: 'สร้างและพิมพ์เอกสาร Word',
    badge: 'Online .DOCX',
    desc: 'Full in-browser Word document editor with live stats and instant .docx export',
    descTh: 'พิมพ์ จัดหน้าเอกสารในเว็บแบบสดๆ แล้วดาวน์โหลดเป็นไฟล์ .docx ได้ทันที',
    accept: '.docx',
    icon: FileCode,
    color: '#3b82f6'
  },
  {
    id: 'batch-image',
    category: 'Convert to PDF',
    name: 'Batch Image to ZIP',
    nameTh: 'แปลงรูปภาพกลุ่มเป็น ZIP',
    badge: 'IMG → ZIP',
    desc: 'Convert multiple images to PNG/JPG/WEBP with custom scale & package into ZIP',
    descTh: 'แปลงภาพหลายภาพพร้อมกัน ปรับขนาด บีบอัด แล้วรวมเป็น ZIP โหลดในคลิกเดียว',
    accept: 'image/*',
    icon: FolderArchive,
    color: '#10b981'
  },
  // ── PDF Tools ──
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

const CATEGORIES = ['All Tools', 'Organize', 'Convert from PDF', 'Convert to PDF', 'Edit PDF', 'Media & Video', 'Office & Studio'];

export default function App() {
  const [currentTool, setCurrentTool] = useState('social-video');
  const [selectedCategory, setSelectedCategory] = useState('All Tools');
  const [lang, setLang] = useState('th'); // Default to Thai as requested
  const [theme, setTheme] = useState('dark');
  
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [activePages, setActivePages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  
  // Tool Config States
  const [pngScale, setPngScale] = useState('4.17');
  const [jpgQuality, setJpgQuality] = useState('0.92');
  const [compressLevel, setCompressLevel] = useState('medium');
  const [passwordValue, setPasswordValue] = useState('');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [pageNumberFormat, setPageNumberFormat] = useState('page-x-of-y');
  const [exportName, setExportName] = useState('orbita-export');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Search State
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

  // ── Social Video State ──
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoFormatMode, setVideoFormatMode] = useState('video'); // 'video' | 'audio'
  const [isInspectingVideo, setIsInspectingVideo] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [videoDownloadPercent, setVideoDownloadPercent] = useState(0);
  const [videoSpeed, setVideoSpeed] = useState('');
  const [videoEta, setVideoEta] = useState('');
  const [completedVideoJobId, setCompletedVideoJobId] = useState(null);
  const [completedVideoFilename, setCompletedVideoFilename] = useState('');
  const pollIntervalRef = useRef(null);

  // ── Media Converter State ──
  const [audioBitrate, setAudioBitrate] = useState('320k');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [targetVideoFormat, setTargetVideoFormat] = useState('mp4');
  const [videoResolution, setVideoResolution] = useState('1080p');

  // ── Word Studio State ──
  const [docTitle, setDocTitle] = useState('รายงานเอกสาร ORBITA');
  const [wordWordCount, setWordWordCount] = useState(0);
  const [wordCharCount, setWordCharCount] = useState(0);
  const wordCanvasRef = useRef(null);

  // ── Batch Image State ──
  const [batchTargetFormat, setBatchTargetFormat] = useState('png');
  const [batchResizeFactor, setBatchResizeFactor] = useState('100');
  const [batchQuality, setBatchQuality] = useState('90');

  const fileInputRef = useRef(null);
  const fileListRef = useRef(null);
  const pagesGridRef = useRef(null);
  const fileSortableRef = useRef(null);
  const pageSortableRef = useRef(null);

  const t = TRANSLATIONS[lang];
  const activeToolDef = CONVERTER_TOOLS.find(item => item.id === currentTool) || CONVERTER_TOOLS[0];

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Keyboard shortcut '/'
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

  // Update Word counts
  const updateWordStats = () => {
    if (!wordCanvasRef.current) return;
    const text = wordCanvasRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordWordCount(words);
    setWordCharCount(text.length);
  };

  // Live Text Extractor effect for pdf-to-text
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

  // Sortable on file list
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

  // Sortable on page grid
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
      if (currentTool === 'image-to-pdf' || currentTool === 'batch-image') {
        await handleImageUploads(fileArray);
      } else if (currentTool === 'excel-to-pdf') {
        await handleExcelUploads(fileArray);
      } else if (currentTool === 'video-to-audio' || currentTool === 'video-converter') {
        handleVideoUploads(fileArray);
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

  const handleVideoUploads = (videoFiles) => {
    const file = videoFiles[0];
    if (!file) return;
    const fileId = 'vid_' + Math.random().toString(36).substring(2, 9);
    setLoadedFiles([{
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      pageCount: 1,
      previewUrl: URL.createObjectURL(file)
    }]);
    setStatus({ text: lang === 'th' ? `พร้อมแปลง: ${file.name}` : `Ready: ${file.name}`, type: 'success' });
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
        arrayBuffer
      });
    }

    setLoadedFiles(prev => [...prev, ...newFiles]);
    setActivePages(prev => [...prev, ...newPages]);
    setStatus({ text: `${lang === 'th' ? 'โหลดรูปภาพสำเร็จ' : 'Loaded'} ${newPages.length} ${lang === 'th' ? 'ภาพ' : 'images.'}`, type: 'success' });
  };

  const handleExcelUploads = async (excelFiles) => {
    const valid = excelFiles.filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    if (valid.length === 0) {
      setStatus({ text: 'Please select an Excel or CSV file.', type: 'error' });
      return;
    }

    const file = valid[0];
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
    setLoadedFiles([{
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      pageCount: 1,
      excelData: jsonData
    }]);

    setStatus({ text: `Excel loaded: ${jsonData.length} rows detected.`, type: 'success' });
  };

  const deleteFile = (fileId) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
    setActivePages(prev => prev.filter(p => p.fileId !== fileId));
  };

  const deletePage = (pageId) => {
    setActivePages(prev => prev.filter(p => p.id !== pageId));
  };

  const duplicatePage = (pageId) => {
    const pageIndex = activePages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return;
    const target = activePages[pageIndex];
    const cloned = {
      ...target,
      id: 'page_' + Math.random().toString(36).substring(2, 9)
    };
    const updated = [...activePages];
    updated.splice(pageIndex + 1, 0, cloned);
    setActivePages(updated);
  };

  const rotatePage = (pageId) => {
    setActivePages(prev => prev.map(p => {
      if (p.id === pageId) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  };

  const rotateAllPages = () => {
    setActivePages(prev => prev.map(p => ({
      ...p,
      rotation: (p.rotation + 90) % 360
    })));
  };

  const clearAll = () => {
    setLoadedFiles([]);
    setActivePages([]);
    setStatus({ text: '', type: '' });
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  // ── Signature Canvas ──
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineWidth = sigWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = sigColor;
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

  // ── Social Video Downloader Handlers ──
  const handleInspectVideo = async () => {
    if (!videoUrl.trim()) return;
    setIsInspectingVideo(true);
    setVideoInfo(null);
    setCompletedVideoJobId(null);
    setStatus({ text: lang === 'th' ? 'กำลังดึงข้อมูลและตรวจเช็คความคมชัด...' : 'Inspecting media link...', type: 'loading' });

    try {
      const res = await fetch('/api/video/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to inspect link');
      }

      setVideoInfo(data);
      setStatus({ text: lang === 'th' ? `พบสื่อ: ${data.title}` : `Ready: ${data.title}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setIsInspectingVideo(false);
    }
  };

  const handleStartVideoDownload = async () => {
    if (!videoUrl.trim()) return;
    setIsDownloadingVideo(true);
    setVideoDownloadPercent(5);
    setCompletedVideoJobId(null);
    setStatus({ text: lang === 'th' ? 'กำลังเริ่มดาวน์โหลด...' : 'Starting download engine...', type: 'loading' });

    try {
      const isAudio = videoFormatMode === 'audio';
      const res = await fetch('/api/video/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl.trim(),
          extract_audio: isAudio,
          audio_format: 'mp3'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.job_id) {
        throw new Error(data.error || 'Failed to start download');
      }

      const jobId = data.job_id;
      // Start polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progRes = await fetch(`/api/video/progress/${jobId}`);
          const prog = await progRes.json();
          if (prog.status === 'downloading' || prog.status === 'converting') {
            setVideoDownloadPercent(prog.percent || 10);
            setVideoSpeed(prog.speed || '');
            setVideoEta(prog.eta || '');
            setStatus({ text: `${lang === 'th' ? 'กำลังแปลงและดาวน์โหลด' : 'Downloading'} ${prog.percent}% (${prog.speed || ''})`, type: 'loading' });
          } else if (prog.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            setVideoDownloadPercent(100);
            setIsDownloadingVideo(false);
            setCompletedVideoJobId(jobId);
            setCompletedVideoFilename(prog.filename || 'media_file');
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            setStatus({ text: lang === 'th' ? 'ดาวน์โหลดและประมวลผลสำเร็จ 100%! กดปุ่มบันทึกไฟล์ได้เลย' : 'Ready! 100% processed. Click to save.', type: 'success' });
          } else if (prog.status === 'error') {
            clearInterval(pollIntervalRef.current);
            setIsDownloadingVideo(false);
            setStatus({ text: prog.error || 'Download failed', type: 'error' });
          }
        } catch (_) {}
      }, 700);
    } catch (err) {
      console.error(err);
      setIsDownloadingVideo(false);
      setStatus({ text: err.message, type: 'error' });
    }
  };

  const saveCompletedVideo = () => {
    if (!completedVideoJobId) return;
    const downloadUrl = `/api/video/file/${completedVideoJobId}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = completedVideoFilename || 'downloaded_media';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Video to Audio (FFmpeg) ──
  const runVideoToAudio = async () => {
    if (loadedFiles.length === 0) return;
    const file = loadedFiles[0].file;
    setIsProcessing(true);
    setStatus({ text: lang === 'th' ? 'กำลังสกัดเสียงคุณภาพสตูดิโอ 320 kbps ด้วย FFmpeg...' : 'Extracting studio audio via FFmpeg...', type: 'loading' });

    const formData = new FormData();
    formData.append('video_file', file);
    formData.append('audio_format', audioFormat);
    formData.append('bitrate', audioBitrate);

    try {
      const res = await fetch('/api/media/video-to-audio', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Audio extraction failed on server');
      const blob = await res.blob();
      const filename = (exportName.trim() || file.name.split('.')[0]) + `_audio.${audioFormat}`;
      saveAs(blob, filename);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatus({ text: lang === 'th' ? 'สกัดเสียงสำเร็จเรียบร้อยแล้ว!' : 'Audio extracted successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Video Format Converter (FFmpeg) ──
  const runVideoConverter = async () => {
    if (loadedFiles.length === 0) return;
    const file = loadedFiles[0].file;
    setIsProcessing(true);
    setStatus({ text: lang === 'th' ? `กำลังแปลงไฟล์เป็น ${targetVideoFormat.toUpperCase()} (${videoResolution})...` : 'Converting video format...', type: 'loading' });

    const formData = new FormData();
    formData.append('video_file', file);
    formData.append('target_format', targetVideoFormat);
    formData.append('resolution', videoResolution);
    formData.append('crf', '22');

    try {
      const res = await fetch('/api/media/convert-video', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Video conversion failed on server');
      const blob = await res.blob();
      const filename = (exportName.trim() || file.name.split('.')[0]) + `_converted.${targetVideoFormat}`;
      saveAs(blob, filename);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatus({ text: lang === 'th' ? 'แปลงรูปแบบวิดีโอสำเร็จเรียบร้อย!' : 'Video converted successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Word Studio: Export to Real .docx ──
  const runExportDocx = async () => {
    if (!wordCanvasRef.current) return;
    setIsProcessing(true);
    setStatus({ text: lang === 'th' ? 'กำลังประกอบและจัดรูปแบบเอกสาร Word (.docx)...' : 'Compiling Word (.docx) document...', type: 'loading' });

    const htmlContent = wordCanvasRef.current.innerHTML;
    try {
      const res = await fetch('/api/office/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle.trim() || 'ORBITA Document',
          html_content: htmlContent,
          filename: (exportName.trim() || 'document') + '.docx'
        })
      });
      if (!res.ok) throw new Error('DOCX generation failed');
      const blob = await res.blob();
      saveAs(blob, (exportName.trim() || 'orbita_document') + '.docx');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatus({ text: lang === 'th' ? 'สร้างไฟล์ Word (.docx) สำเร็จเรียบร้อย!' : 'DOCX document created successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Word Studio: Import Existing .docx ──
  const handleImportDocx = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setStatus({ text: 'Reading DOCX file...', type: 'loading' });

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/office/extract-docx', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to parse DOCX');

      if (wordCanvasRef.current) {
        let html = '';
        data.paragraphs.forEach(p => {
          html += `<p>${p.text}</p>`;
        });
        wordCanvasRef.current.innerHTML = html;
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
        updateWordStats();
      }
      setStatus({ text: `Imported ${file.name} successfully!`, type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // ── Batch Image to ZIP ──
  const runBatchImageZip = async () => {
    if (loadedFiles.length === 0) return;
    setIsProcessing(true);
    setStatus({ text: lang === 'th' ? 'กำลังประมวลผลแปลงภาพและสร้างไฟล์ ZIP...' : 'Converting images & packing ZIP...', type: 'loading' });

    const formData = new FormData();
    loadedFiles.forEach(f => formData.append('images', f.file));
    formData.append('target_format', batchTargetFormat);
    formData.append('resize_factor', batchResizeFactor);
    formData.append('quality', batchQuality);

    try {
      const res = await fetch('/api/image/batch-zip', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Batch zip failed');
      const blob = await res.blob();
      saveAs(blob, (exportName.trim() || 'orbita_images') + '.zip');
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
      setStatus({ text: lang === 'th' ? 'สร้างไฟล์ ZIP รูปภาพสำเร็จ!' : 'Batch images converted to ZIP!', type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── PDF Operations ──
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

  const runProtectPDF = async () => {
    if (!passwordValue) {
      setStatus({ text: 'Please enter a password to lock the document.', type: 'error' });
      return;
    }
    setStatus({ text: 'Encrypting and locking PDF with password...', type: 'loading' });
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
        mergedPdf.addPage(copied);
      }
    }

    const pdfBytes = await mergedPdf.save({
      userPassword: passwordValue,
      ownerPassword: passwordValue,
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false
      }
    });

    const filename = (exportName.trim() || 'orbita-protected') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: lang === 'th' ? 'ตั้งรหัสผ่านสำเร็จ!' : 'PDF password locked successfully!', type: 'success' });
  };

  const runSplitPDF = async () => {
    setStatus({ text: 'Extracting individual pages...', type: 'loading' });
    const zip = new JSZip();
    const pdfLibCache = new Map();

    for (const f of loadedFiles) {
      const doc = await PDFDocument.load(f.arrayBuffer);
      pdfLibCache.set(f.id, doc);
    }

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      const sourceDoc = pdfLibCache.get(p.fileId);
      if (!sourceDoc) continue;

      const singleDoc = await PDFDocument.create();
      const [copied] = await singleDoc.copyPages(sourceDoc, [p.pageIndex]);
      if (p.rotation !== 0) {
        const currAngle = copied.getRotation().angle;
        copied.setRotation(degrees((currAngle + p.rotation) % 360));
      }
      singleDoc.addPage(copied);

      const singleBytes = await singleDoc.save();
      const pageNumStr = String(i + 1).padStart(3, '0');
      zip.file(`page_${pageNumStr}.pdf`, singleBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = (exportName.trim() || 'orbita-split') + '.zip';
    saveAs(zipBlob, filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: 'Pages split into ZIP archive successfully!', type: 'success' });
  };

  const runRotatePDF = async () => {
    await runMergePDF();
  };

  const runPdfToText = async () => {
    if (!extractedText) {
      setStatus({ text: 'No readable text could be extracted.', type: 'error' });
      return;
    }
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const filename = (exportName.trim() || 'orbita-extracted') + '.txt';
    saveAs(blob, filename);

    confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
    setStatus({ text: 'Text file exported successfully!', type: 'success' });
  };

  const runExcelToPdf = async () => {
    if (loadedFiles.length === 0 || !loadedFiles[0].excelData) return;
    setStatus({ text: 'Converting Excel data into formatted PDF document...', type: 'loading' });

    const rows = loadedFiles[0].excelData;
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    let y = 800;

    const sanitize = (val) => String(val ?? '').replace(/[^\x20-\x7E]/g, '');

    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i];
      const text = row.map(sanitize).join(' | ');
      page.drawText(text.substring(0, 80), { x: 30, y, size: 9 });
      y -= 14;
      if (y < 40) {
        page = pdfDoc.addPage([595, 842]);
        y = 800;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const filename = (exportName.trim() || 'orbita-report') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    setStatus({ text: 'Excel converted to PDF successfully!', type: 'success' });
  };

  const runPageNumbers = async () => {
    setStatus({ text: 'Applying official page numbers...', type: 'loading' });
    const mergedPdf = await PDFDocument.create();
    const pdfLibCache = new Map();

    for (const f of loadedFiles) {
      const doc = await PDFDocument.load(f.arrayBuffer);
      pdfLibCache.set(f.id, doc);
    }

    const totalPages = activePages.length;
    for (let i = 0; i < totalPages; i++) {
      const p = activePages[i];
      const sourceDoc = pdfLibCache.get(p.fileId);
      if (sourceDoc) {
        const [copied] = await mergedPdf.copyPages(sourceDoc, [p.pageIndex]);
        const { width } = copied.getSize();
        const stampText = pageNumberFormat === 'simple' 
          ? `${i + 1}` 
          : `Page ${i + 1} of ${totalPages}`;

        copied.drawText(stampText, {
          x: width / 2 - 30,
          y: 20,
          size: 9
        });

        mergedPdf.addPage(copied);
      }
    }

    const pdfBytes = await mergedPdf.save();
    const filename = (exportName.trim() || 'orbita-numbered') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: 'Page numbers stamped successfully!', type: 'success' });
  };

  const runWatermarkPDF = async () => {
    setStatus({ text: 'Stamping confidential watermark...', type: 'loading' });
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
        const { width, height } = copied.getSize();

        copied.drawText(watermarkText || 'CONFIDENTIAL', {
          x: width * 0.25,
          y: height * 0.5,
          size: 42,
          opacity: 0.2,
          rotate: degrees(45)
        });

        mergedPdf.addPage(copied);
      }
    }

    const pdfBytes = await mergedPdf.save();
    const filename = (exportName.trim() || 'orbita-watermarked') + '.pdf';
    saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setStatus({ text: 'Watermark stamped successfully!', type: 'success' });
  };

  const runSignPDF = async () => {
    const canvas = sigCanvasRef.current;
    if (!canvas || !hasSignature) {
      setStatus({ text: lang === 'th' ? 'กรุณาวาดลายเซ็นของคุณก่อนทำการประทับตรา' : 'Please draw your signature first.', type: 'error' });
      return;
    }

    setStatus({ text: lang === 'th' ? 'กำลังประทับตราลายเซ็นดิจิทัลลงในเอกสาร...' : 'Embedding signature...', type: 'loading' });

    const sigDataUrl = canvas.toDataURL('image/png');
    const sigImageBytes = await fetch(sigDataUrl).then(res => res.arrayBuffer());

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
        pdfDoc.addPage(copied);
      }
    }

    const sigImage = await pdfDoc.embedPng(sigImageBytes);
    const baseWidth = 140 * sigScale;
    const baseHeight = 65 * sigScale;

    const totalPages = pdfDoc.getPageCount();
    let targetIndices = [];

    if (sigPage === 'all') {
      targetIndices = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      const pageNum = parseInt(sigPage, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        targetIndices = [pageNum - 1];
      } else {
        targetIndices = [0];
      }
    }

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

  // Master Conversion Router
  const executeConversion = async () => {
    setIsProcessing(true);
    try {
      switch (currentTool) {
        case 'social-video':
          await handleStartVideoDownload();
          break;
        case 'video-to-audio':
          await runVideoToAudio();
          break;
        case 'video-converter':
          await runVideoConverter();
          break;
        case 'word-studio':
          await runExportDocx();
          break;
        case 'batch-image':
          await runBatchImageZip();
          break;
        case 'merge':
        case 'organize-pdf':
          await runMergePDF();
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
        case 'rotate-pdf':
          await runRotatePDF();
          break;
        case 'pdf-to-text':
          await runPdfToText();
          break;
        case 'excel-to-pdf':
          await runExcelToPdf();
          break;
        case 'page-numbers':
          await runPageNumbers();
          break;
        case 'watermark-pdf':
          await runWatermarkPDF();
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

          {/* Category Filter Pills */}
          <div className="nav-category-pills">
            {CATEGORIES.map(cat => {
              let label = cat;
              if (lang === 'th') {
                if (cat === 'All Tools') label = t.allTools;
                if (cat === 'Organize') label = t.organize;
                if (cat === 'Convert from PDF') label = t.convertFrom;
                if (cat === 'Convert to PDF') label = t.convertTo;
                if (cat === 'Edit PDF') label = t.editPdf;
                if (cat === 'Media & Video') label = t.mediaVideo;
                if (cat === 'Office & Studio') label = t.officeStudio;
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

          {/* ══════════════════════════════════════════════════════════════════
              TOOL VIEW 1: SOCIAL VIDEO DOWNLOADER (TIKTOK / YT / REELS / FB)
             ══════════════════════════════════════════════════════════════════ */}
          {currentTool === 'social-video' && (
            <div className="media-feature-card">
              <div className="supported-platforms-bar">
                <span className="platform-badge tiktok">TikTok HD</span>
                <span className="platform-badge youtube">YouTube 4K/1080p</span>
                <span className="platform-badge instagram">Instagram Reels</span>
                <span className="platform-badge facebook">Facebook Video</span>
                <span className="platform-badge">MP3 320k Audio</span>
              </div>

              <div className="url-input-wrapper">
                <input 
                  type="text" 
                  placeholder={t.videoUrlPlaceholder}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInspectVideo(); }}
                />
                <button 
                  type="button" 
                  className="btn-fetch-video"
                  disabled={!videoUrl.trim() || isInspectingVideo}
                  onClick={handleInspectVideo}
                >
                  {isInspectingVideo ? <RefreshCw size={16} className="spinner" /> : <Sparkles size={16} />}
                  <span>{t.inspectVideo}</span>
                </button>
              </div>

              {/* Inspect Result & Live Preview */}
              {videoInfo && (
                <div className="video-inspect-result">
                  <div className="video-thumb-preview">
                    {videoInfo.direct_preview_url ? (
                      <video src={videoInfo.direct_preview_url} controls poster={videoInfo.thumbnail}></video>
                    ) : (
                      <img src={videoInfo.thumbnail} alt={videoInfo.title} />
                    )}
                    <span className="video-duration-pill">{videoInfo.duration_str}</span>
                  </div>

                  <div className="video-meta-details">
                    <div>
                      <h3 className="video-meta-title">{videoInfo.title}</h3>
                      <p className="video-meta-author">👤 {videoInfo.uploader}</p>

                      <div className="format-selection-group">
                        <label 
                          className={`format-option-row ${videoFormatMode === 'video' ? 'selected' : ''}`}
                          onClick={() => setVideoFormatMode('video')}
                        >
                          <div className="format-option-left">
                            <input 
                              type="radio" 
                              name="vfmt" 
                              checked={videoFormatMode === 'video'} 
                              onChange={() => setVideoFormatMode('video')} 
                            />
                            <span>{t.videoFormatVideo}</span>
                          </div>
                          <span className="format-tag-badge">MP4 Full HD</span>
                        </label>

                        <label 
                          className={`format-option-row ${videoFormatMode === 'audio' ? 'selected' : ''}`}
                          onClick={() => setVideoFormatMode('audio')}
                        >
                          <div className="format-option-left">
                            <input 
                              type="radio" 
                              name="vfmt" 
                              checked={videoFormatMode === 'audio'} 
                              onChange={() => setVideoFormatMode('audio')} 
                            />
                            <span>{t.videoFormatAudio}</span>
                          </div>
                          <span className="format-tag-badge" style={{ background: '#8b5cf6' }}>MP3 320k</span>
                        </label>
                      </div>
                    </div>

                    {/* Download button / Action */}
                    <div style={{ marginTop: '1.25rem' }}>
                      {completedVideoJobId ? (
                        <button 
                          type="button" 
                          className="master-btn" 
                          style={{ width: '100%' }}
                          onClick={saveCompletedVideo}
                        >
                          <Download size={18} />
                          <span>บันทึกไฟล์ลงเครื่อง: {completedVideoFilename}</span>
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          className="master-btn" 
                          style={{ width: '100%' }}
                          disabled={isDownloadingVideo}
                          onClick={handleStartVideoDownload}
                        >
                          {isDownloadingVideo ? <RefreshCw size={18} className="spinner" /> : <Download size={18} />}
                          <span>{isDownloadingVideo ? t.processing : t.downloadVideoBtn}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar Display */}
              {isDownloadingVideo && (
                <div className="download-progress-box">
                  <div className="progress-info-row">
                    <span>{t.downloadingPercent}... ({videoDownloadPercent}%)</span>
                    <span>{videoSpeed} {videoEta ? `• ${t.eta}: ${videoEta}` : ''}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${videoDownloadPercent}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TOOL VIEW 2: WORD DOCUMENT STUDIO (.DOCX)
             ══════════════════════════════════════════════════════════════════ */}
          {currentTool === 'word-studio' && (
            <div className="word-studio-wrapper">
              <div className="word-toolbar">
                <input 
                  type="text" 
                  value={docTitle} 
                  onChange={(e) => setDocTitle(e.target.value)} 
                  placeholder={t.docTitlePlaceholder}
                  className="custom-input" 
                  style={{ minWidth: 220, padding: '0.35rem 0.75rem' }} 
                />

                <div className="word-divider"></div>

                <button type="button" className="word-btn" title="Bold" onClick={() => document.execCommand('bold')}>
                  <Bold size={15} />
                </button>
                <button type="button" className="word-btn" title="Italic" onClick={() => document.execCommand('italic')}>
                  <Italic size={15} />
                </button>
                <button type="button" className="word-btn" title="Underline" onClick={() => document.execCommand('underline')}>
                  <Underline size={15} />
                </button>

                <div className="word-divider"></div>

                <button type="button" className="word-btn" title="Heading 1" onClick={() => document.execCommand('formatBlock', false, '<h1>')}>
                  <Heading1 size={15} />
                </button>
                <button type="button" className="word-btn" title="Heading 2" onClick={() => document.execCommand('formatBlock', false, '<h2>')}>
                  <Heading2 size={15} />
                </button>

                <div className="word-divider"></div>

                <button type="button" className="word-btn" title="Bullet List" onClick={() => document.execCommand('insertUnorderedList')}>
                  <List size={15} />
                </button>
                <button type="button" className="word-btn" title="Numbered List" onClick={() => document.execCommand('insertOrderedList')}>
                  <ListOrdered size={15} />
                </button>

                <div className="word-divider"></div>

                <label className="word-btn" title={t.importDocx} style={{ cursor: 'pointer', margin: 0 }}>
                  <FileUp size={15} />
                  <span>{t.importDocx}</span>
                  <input type="file" accept=".docx" style={{ display: 'none' }} onChange={handleImportDocx} />
                </label>

                <button type="button" className="word-btn" onClick={() => { if (wordCanvasRef.current) wordCanvasRef.current.innerHTML = '<p>พิมพ์ข้อความที่นี่...</p>'; updateWordStats(); }}>
                  <Eraser size={15} />
                  <span>ล้างเนื้อหา</span>
                </button>

                <div style={{ marginLeft: 'auto' }}>
                  <button type="button" className="btn-fetch-video" style={{ padding: '0.45rem 1rem' }} onClick={runExportDocx}>
                    <FileDown size={15} />
                    <span>{t.exportDocx}</span>
                  </button>
                </div>
              </div>

              {/* Editable Paper Canvas */}
              <div 
                ref={wordCanvasRef}
                className="word-canvas"
                contentEditable
                suppressContentEditableWarning
                onInput={updateWordStats}
                dangerouslySetInnerHTML={{ __html: '<h1>หัวข้อเอกสารทางการ</h1><p>เริ่มต้นพิมพ์เนื้อหาเอกสารของคุณได้ที่นี่ จัดหน้า ใส่หัวข้อ ลิสต์รายการ แล้วกดส่งออกเป็นไฟล์ Word (.docx) ได้จริง 100% สะดวก รวดเร็ว ไม่ต้องติดตั้งโปรแกรมเพิ่มเติม</p>' }}
              >
              </div>

              <div className="word-statusbar">
                <span>ORBITA Native Word Processing Engine</span>
                <span>{wordWordCount} {t.wordsCount} • {wordCharCount} {t.charsCount}</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TOOL VIEW 3: STANDARD FILE DROPZONE (PDF / IMAGES / MEDIA)
             ══════════════════════════════════════════════════════════════════ */}
          {currentTool !== 'social-video' && currentTool !== 'word-studio' && (
            <>
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
                  multiple={currentTool !== 'watermark-pdf' && currentTool !== 'page-numbers' && currentTool !== 'protect-pdf' && currentTool !== 'video-to-audio' && currentTool !== 'video-converter'}
                  accept={activeToolDef.accept} 
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Video Preview Card for Media Tools */}
              {(currentTool === 'video-to-audio' || currentTool === 'video-converter') && loadedFiles.length > 0 && (
                <div className="media-feature-card">
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <video src={loadedFiles[0].previewUrl} controls style={{ maxHeight: 220, borderRadius: 10, background: '#000' }}></video>
                    <div>
                      <h3>{loadedFiles[0].name}</h3>
                      <p style={{ color: 'var(--text-secondary)' }}>ขนาดไฟล์: {formatBytes(loadedFiles[0].size)}</p>
                    </div>
                  </div>
                </div>
              )}

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
              {loadedFiles.length > 0 && (currentTool === 'merge' || currentTool === 'rotate-pdf' || currentTool === 'organize-pdf' || currentTool === 'batch-image') && (
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
                <div className="signature-studio-card">
                  <div className="signature-header">
                    <div className="signature-title">
                      <PenTool size={18} />
                      <span>{t.signSignature}</span>
                    </div>
                  </div>

                  <div className="signature-canvas-wrapper">
                    <canvas 
                      ref={sigCanvasRef}
                      width={560}
                      height={200}
                      className="sig-drawing-canvas"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>

                  <div className="signature-toolbar">
                    <div className="sig-control-group">
                      <label>{t.penColor}:</label>
                      <div className="sig-color-swatches">
                        {['#0f172a', '#1e40af', '#047857', '#b91c1c'].map(c => (
                          <button
                            key={c}
                            type="button"
                            className={`sig-color-dot ${sigColor === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setSigColor(c)}
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
                  {currentTool === 'video-to-audio' && (
                    <>
                      <div className="setting-field">
                        <label>{t.format}:</label>
                        <select className="custom-select" value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)}>
                          <option value="mp3">MP3 Audio</option>
                          <option value="wav">WAV Lossless</option>
                          <option value="aac">AAC</option>
                        </select>
                      </div>
                      <div className="setting-field">
                        <label>{t.audioBitrate}:</label>
                        <select className="custom-select" value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)}>
                          <option value="320k">320 kbps (Studio HQ)</option>
                          <option value="256k">256 kbps (High)</option>
                          <option value="192k">192 kbps (Standard)</option>
                          <option value="128k">128 kbps (Compact)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {currentTool === 'video-converter' && (
                    <>
                      <div className="setting-field">
                        <label>{t.format}:</label>
                        <select className="custom-select" value={targetVideoFormat} onChange={(e) => setTargetVideoFormat(e.target.value)}>
                          <option value="mp4">MP4 (H.264 Universal)</option>
                          <option value="webm">WebM (VP9 Web)</option>
                          <option value="mkv">MKV (Container)</option>
                        </select>
                      </div>
                      <div className="setting-field">
                        <label>{t.resolution}:</label>
                        <select className="custom-select" value={videoResolution} onChange={(e) => setVideoResolution(e.target.value)}>
                          <option value="original">Original Resolution</option>
                          <option value="1080p">Full HD 1080p</option>
                          <option value="720p">HD 720p</option>
                          <option value="480p">SD 480p</option>
                        </select>
                      </div>
                    </>
                  )}

                  {currentTool === 'batch-image' && (
                    <>
                      <div className="setting-field">
                        <label>{t.format}:</label>
                        <select className="custom-select" value={batchTargetFormat} onChange={(e) => setBatchTargetFormat(e.target.value)}>
                          <option value="png">PNG (Lossless)</option>
                          <option value="jpg">JPG (Compressed)</option>
                          <option value="webp">WEBP (Modern Web)</option>
                        </select>
                      </div>
                      <div className="setting-field">
                        <label>{t.resizeScale}:</label>
                        <select className="custom-select" value={batchResizeFactor} onChange={(e) => setBatchResizeFactor(e.target.value)}>
                          <option value="100">100% (Original)</option>
                          <option value="75">75% Scale</option>
                          <option value="50">50% Scale</option>
                          <option value="25">25% Scale</option>
                        </select>
                      </div>
                    </>
                  )}

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
            </>
          )}
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
