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
  ShieldCheck, 
  Table, 
  UploadCloud, 
  RotateCw, 
  Trash2, 
  GripVertical, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Zap, 
  Download, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  Cpu, 
  FileCode,
  FileCheck2,
  Lock,
  Crop,
  Hash,
  EyeOff
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Full Professional Suite of 10 Client-Side Conversion Utilities
const CONVERTER_TOOLS = [
  {
    id: 'merge',
    category: 'Organize',
    name: 'Merge & Organize PDF',
    desc: 'Combine multiple PDFs and reorder pages effortlessly with visual drag & drop',
    accept: 'application/pdf',
    icon: FileStack,
    tag: 'Popular'
  },
  {
    id: 'pdf-to-png',
    category: 'Convert from PDF',
    name: 'PDF to PNG (Ultra HD)',
    desc: 'Render PDF pages into crystal clear Ultra HD 300 DPI PNG images',
    accept: 'application/pdf',
    icon: ImageIcon,
    tag: '300 DPI'
  },
  {
    id: 'pdf-to-jpg',
    category: 'Convert from PDF',
    name: 'PDF to JPG',
    desc: 'Extract and convert every PDF page into crisp, compressed JPG image files',
    accept: 'application/pdf',
    icon: ImageIcon,
    tag: 'Fast'
  },
  {
    id: 'image-to-pdf',
    category: 'Convert to PDF',
    name: 'Images to PDF',
    desc: 'Convert JPG, PNG, WEBP images into an organized, single PDF document',
    accept: 'image/png, image/jpeg, image/jpg, image/webp',
    icon: Layers,
    tag: 'Zero Loss'
  },
  {
    id: 'split-pdf',
    category: 'Organize',
    name: 'Split & Extract Pages',
    desc: 'Extract individual pages or selected ranges into separate PDF documents',
    accept: 'application/pdf',
    icon: Split,
    tag: 'Batch'
  },
  {
    id: 'rotate-pdf',
    category: 'Organize',
    name: 'Rotate PDF Document',
    desc: 'Permanently rotate PDF orientation by 90, 180, or 270 degrees',
    accept: 'application/pdf',
    icon: RotateCw,
    tag: 'Orientation'
  },
  {
    id: 'pdf-to-text',
    category: 'Convert from PDF',
    name: 'PDF to Text (TXT)',
    desc: 'Extract all textual content from PDF into structured, editable text',
    accept: 'application/pdf',
    icon: FileText,
    tag: 'Extraction'
  },
  {
    id: 'excel-to-pdf',
    category: 'Convert to PDF',
    name: 'Excel / CSV to PDF',
    desc: 'Convert XLSX spreadsheets or CSV tables directly into clean PDF reports',
    accept: '.xlsx, .xls, .csv',
    icon: Table,
    tag: 'Spreadsheet'
  },
  {
    id: 'page-numbers',
    category: 'Edit PDF',
    name: 'Add Page Numbers',
    desc: 'Stamp clean, professional page numbering (Page X of Y) onto any PDF document',
    accept: 'application/pdf',
    icon: Hash,
    tag: 'Pro'
  },
  {
    id: 'watermark-pdf',
    category: 'Edit PDF',
    name: 'Watermark PDF',
    desc: 'Apply customizable security watermark stamps across all document pages',
    accept: 'application/pdf',
    icon: EyeOff,
    tag: 'Security'
  }
];

const CATEGORIES = ['All Tools', 'Organize', 'Convert from PDF', 'Convert to PDF', 'Edit PDF'];

export default function App() {
  const [currentTool, setCurrentTool] = useState('merge');
  const [selectedCategory, setSelectedCategory] = useState('All Tools');
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [activePages, setActivePages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  const [pngScale, setPngScale] = useState('4.17'); // 300 DPI Ultra HD
  const [jpgQuality, setJpgQuality] = useState('0.92');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [pageNumberFormat, setPageNumberFormat] = useState('page-x-of-y');
  const [exportName, setExportName] = useState('orbita-export');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const fileListRef = useRef(null);
  const pagesGridRef = useRef(null);
  const fileSortableRef = useRef(null);
  const pageSortableRef = useRef(null);

  const activeToolDef = CONVERTER_TOOLS.find(t => t.id === currentTool) || CONVERTER_TOOLS[0];

  const filteredTools = useMemo(() => {
    if (selectedCategory === 'All Tools') return CONVERTER_TOOLS;
    return CONVERTER_TOOLS.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

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

  // Switch tool handler
  const switchTool = (toolId) => {
    setCurrentTool(toolId);
    setLoadedFiles([]);
    setActivePages([]);
    setStatus({ text: '', type: '' });
  };

  // Ingest incoming files based on tool
  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessing(true);
    setStatus({ text: 'Processing files locally at lightning speed...', type: 'loading' });

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

  // Upload handler for PDFs
  const handlePdfUploads = async (pdfFiles) => {
    const validPdfs = pdfFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (validPdfs.length === 0) {
      setStatus({ text: 'Please select valid PDF documents.', type: 'error' });
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
    setStatus({ text: `Loaded ${newPages.length} pages ready for instant conversion.`, type: 'success' });
  };

  // Upload handler for Images
  const handleImageUploads = async (imgFiles) => {
    const validImages = imgFiles.filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) {
      setStatus({ text: 'Please select image files (PNG, JPG, WEBP).', type: 'error' });
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
    setStatus({ text: `Loaded ${validImages.length} images. Drag cards to reorder page flow!`, type: 'success' });
  };

  // Upload handler for Excel / CSV
  const handleExcelUploads = async (excelFiles) => {
    const validSheets = excelFiles.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));
    if (validSheets.length === 0) {
      setStatus({ text: 'Please select Excel (.xlsx, .xls) or CSV files.', type: 'error' });
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
    setStatus({ text: `Workbook parsed successfully (${validSheets.length} file ready to convert).`, type: 'success' });
  };

  // Page Actions
  const rotatePage = (pageId) => {
    setActivePages(prev => prev.map(p => p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const rotateAllPages = () => {
    setActivePages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + 90) % 360 })));
  };

  const deletePage = (pageId) => {
    setActivePages(prev => prev.filter(p => p.id !== pageId));
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

  // Master Conversion Router
  const executeConversion = async () => {
    setIsProcessing(true);
    try {
      switch (currentTool) {
        case 'merge':
        case 'rotate-pdf':
          await runMergePDF();
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

  // 1. Merge & Rotate PDF
  const runMergePDF = async () => {
    setStatus({ text: 'Compiling merged PDF document with custom page sequence...', type: 'loading' });
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
    setStatus({ text: `Merged PDF created successfully (${activePages.length} pages)!`, type: 'success' });
  };

  // 2 & 3. PDF to PNG / JPG (Ultra HD 300 DPI)
  const runPdfToImages = async (format = 'png') => {
    const scale = parseFloat(pngScale) || 4.17;
    const quality = parseFloat(jpgQuality) || 0.92;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    setStatus({ text: `Rendering high-resolution ${ext.toUpperCase()} pages...`, type: 'loading' });

    const zip = new JSZip();
    const folder = zip.folder(`${ext}_pages`);

    for (let i = 0; i < activePages.length; i++) {
      const p = activePages[i];
      setStatus({ text: `Rendering page ${i + 1} of ${activePages.length} (${ext.toUpperCase()})...`, type: 'loading' });

      const fileObj = loadedFiles.find(f => f.id === p.fileId);
      if (!fileObj) continue;

      const page = await fileObj.pdfJsDoc.getPage(p.pageIndex + 1);
      const viewport = page.getViewport({ scale, rotation: p.rotation });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      // Fill white background for JPG
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(res => canvas.toBlob(res, mimeType, quality));
      const numStr = String(i + 1).padStart(3, '0');
      folder.file(`page_${numStr}.${ext}`, blob);
    }

    setStatus({ text: `Compressing ${ext.toUpperCase()} package into ZIP...`, type: 'loading' });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = (exportName.trim() || 'orbita-export') + `_${ext}.zip`;
    saveAs(zipBlob, filename);

    confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
    setStatus({ text: `Converted ${activePages.length} pages to ${ext.toUpperCase()} successfully!`, type: 'success' });
  };

  // 4. Images to PDF
  const runImagesToPdf = async () => {
    setStatus({ text: 'Assembling high-res images into a unified PDF...', type: 'loading' });
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
    setStatus({ text: `Images converted into PDF successfully (${activePages.length} images)!`, type: 'success' });
  };

  // 5. Split PDF
  const runSplitPDF = async () => {
    setStatus({ text: 'Splitting document pages into individual PDFs...', type: 'loading' });
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
    setStatus({ text: `Successfully split document into ${activePages.length} separate PDFs!`, type: 'success' });
  };

  // 6. PDF to Text
  const runPdfToText = async () => {
    setStatus({ text: 'Extracting clean textual content from PDF...', type: 'loading' });
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
    setStatus({ text: `Extracted all text content (${activePages.length} pages) into TXT!`, type: 'success' });
  };

  // 7. Excel to PDF
  const runExcelToPdf = async () => {
    setStatus({ text: 'Formatting spreadsheet into a clean PDF table report...', type: 'loading' });
    const pdfDoc = await PDFDocument.create();

    for (const f of loadedFiles) {
      const sheetName = f.workbook.SheetNames[0];
      const sheet = f.workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const page = pdfDoc.addPage([595, 842]); // A4
      const { height } = page.getSize();
      let y = height - 50;

      page.drawText(`Spreadsheet Report: ${f.name} [${sheetName}]`, {
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
    setStatus({ text: 'Spreadsheet transformed into PDF table document successfully!', type: 'success' });
  };

  // 8. Add Page Numbers
  const runAddPageNumbers = async () => {
    setStatus({ text: 'Stamping professional page numbers onto document...', type: 'loading' });
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

  // 9. Add Watermark
  const runAddWatermark = async () => {
    setStatus({ text: 'Stamping security watermark across all pages...', type: 'loading' });
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
    setStatus({ text: `Security watermark '${stamp}' stamped across ${pages.length} pages!`, type: 'success' });
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
              <Zap size={20} color="#fff" />
            </div>
            <span className="logo-text">ORBITA</span>
            <span className="logo-badge">PRO SUITE</span>
          </a>

          <div className="nav-status-badge">
            <div className="status-dot"></div>
            <span>No Account Needed • 100% In-Browser Privacy</span>
          </div>

          <ul className="nav-links">
            <li><a href="#tools">Tools Hub</a></li>
            <li><a href="#features">Zero-Cloud Engine</a></li>
            <li><a href="#security">Enterprise Security</a></li>
          </ul>

          <a href="#studio" className="nav-cta">
            <span>Instant Convert</span>
            <Sparkles size={14} />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-pill">
          <Cpu size={14} />
          <span>No Sign-up • No Data Uploaded • Zero Server Latency</span>
        </div>
        <h1 className="hero-title">
          World-Class Document & <span className="gradient-text">File Processing Suite</span>
        </h1>
        <p className="hero-desc">
          Instant file conversion that outperforms traditional web converters. Render 300 DPI Ultra HD PNGs, merge & reorder visual PDF pages, extract text, and stamp watermarks—100% executed on your device RAM without cloud uploads.
        </p>

        <div className="trust-badges">
          <div className="trust-item">
            <CheckCircle2 size={14} />
            <span>100% Free Forever</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={14} />
            <span>Zero Data Leakage (No Cloud Upload)</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={14} />
            <span>No Login or Registration Required</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={14} />
            <span>Ultra HD 300 DPI Rendering</span>
          </div>
        </div>
      </section>

      {/* Tools Selection Hub */}
      <section className="tools-hub" id="tools">
        <div className="tools-hub-title">CHOOSE CONVERSION SUITE UTILITY (10 TOOLS)</div>
        
        {/* Category Pills */}
        <div className="category-filter-bar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="tools-grid">
          {filteredTools.map(t => {
            const Icon = t.icon;
            const isActive = t.id === currentTool;
            return (
              <button 
                key={t.id}
                className={`tool-chip ${isActive ? 'active' : ''}`}
                onClick={() => switchTool(t.id)}
              >
                <div className="tool-chip-top">
                  <div className="tool-chip-icon">
                    <Icon size={16} />
                  </div>
                  {t.tag && <span className="tool-chip-tag">{t.tag}</span>}
                </div>
                <div className="tool-chip-name">{t.name}</div>
                <div className="tool-chip-desc">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Studio Workstation */}
      <section className="studio-section" id="studio">
        <div className="studio-wrapper">
          {/* Active Tool Header Badge */}
          <div className="studio-header-bar">
            <div className="active-tool-badge">
              <activeToolDef.icon size={16} />
              <span>{activeToolDef.name}</span>
            </div>
            <div className="tool-tagline">{activeToolDef.desc}</div>
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
              <UploadCloud size={32} />
            </div>
            <h3 className="drop-title">Drop your files here, or click to browse</h3>
            <p className="drop-sub">Zero file upload • Handled directly on your browser RAM • Max speed</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple={currentTool !== 'watermark-pdf' && currentTool !== 'page-numbers'}
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
                  <span>Files:</span>
                  <span className="chip-highlight">{loadedFiles.length}</span>
                </div>
                {activePages.length > 0 && (
                  <div className="stat-chip">
                    <span>Total Pages:</span>
                    <span className="chip-highlight">{activePages.length}</span>
                  </div>
                )}
              </div>

              <div className="btn-group">
                <button className="btn-action-sm" onClick={() => fileInputRef.current?.click()}>
                  <Plus size={14} />
                  <span>Add More</span>
                </button>
                {activePages.length > 0 && (
                  <button className="btn-action-sm" onClick={rotateAllPages}>
                    <RotateCw size={14} />
                    <span>Rotate All +90°</span>
                  </button>
                )}
                <button className="btn-action-sm danger" onClick={clearAll}>
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          )}

          {/* File Queue Draggable Section */}
          {loadedFiles.length > 0 && (currentTool === 'merge' || currentTool === 'rotate-pdf') && (
            <div className="file-reorder-section">
              <div className="section-headline">
                <span>📁 File Sequence Order</span>
                <span className="hint-pill">Drag items to rearrange merge order</span>
              </div>
              <div className="file-draggable-list" ref={fileListRef}>
                {loadedFiles.map((file, idx) => (
                  <div className="file-row-item" key={file.id} data-id={file.id}>
                    <div className="file-details">
                      <GripVertical size={16} className="handle-icon" />
                      <span className="file-title">{idx + 1}. {file.name}</span>
                      <span className="file-badges">({file.pageCount || 1} pages • {formatBytes(file.size)})</span>
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
                <span>📑 Interactive Page Canvas</span>
                <span className="hint-pill">Drag cards to reorder • Rotate • Remove individual pages</span>
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

          {/* Dynamic Settings Bar based on Active Tool */}
          {loadedFiles.length > 0 && (
            <div className="settings-bar">
              {currentTool === 'pdf-to-png' && (
                <div className="setting-field">
                  <label htmlFor="png-scale">Rendering Resolution:</label>
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
                  <label htmlFor="jpg-quality">Compression Quality:</label>
                  <select 
                    id="jpg-quality" 
                    className="custom-select"
                    value={jpgQuality}
                    onChange={(e) => setJpgQuality(e.target.value)}
                  >
                    <option value="0.75">Medium File Size (75%)</option>
                    <option value="0.90">High Quality (90%)</option>
                    <option value="0.98">Maximum Quality (98%)</option>
                  </select>
                </div>
              )}

              {currentTool === 'watermark-pdf' && (
                <div className="setting-field">
                  <label htmlFor="watermark-text">Watermark Stamp Text:</label>
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
                  <label htmlFor="page-format">Number Format:</label>
                  <select 
                    id="page-format" 
                    className="custom-select"
                    value={pageNumberFormat}
                    onChange={(e) => setPageNumberFormat(e.target.value)}
                  >
                    <option value="page-x-of-y">Page X of Y (Footer Center)</option>
                    <option value="simple">1, 2, 3... (Simple)</option>
                  </select>
                </div>
              )}

              <div className="setting-field">
                <label htmlFor="export-name">Export Filename:</label>
                <input 
                  id="export-name" 
                  type="text" 
                  className="custom-input"
                  style={{ minWidth: 200 }}
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
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Execute & Download ({activeToolDef.name})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Features Showcase Highlights */}
      <section className="features-section" id="features">
        <div className="section-tagline">ZERO-CLOUD IN-BROWSER ARCHITECTURE</div>
        <h2 className="section-header">Engineered to Outperform Traditional Cloud Converters</h2>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <Zap size={22} />
            </div>
            <h3>Ultra HD 300 DPI Rendering</h3>
            <p>Export pixel-perfect graphics up to 300 DPI with vector-level line fidelity, sharp typography, and crystal clear tabular data without any artifacting.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <Layers size={22} />
            </div>
            <h3>Interactive Page Canvas</h3>
            <p>Enjoy total freedom with our interactive page grid: drag and drop pages to rearrange, batch-rotate orientations, and trim unnecessary pages effortlessly.</p>
          </div>

          <div className="feature-box" id="security">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={22} />
            </div>
            <h3>Zero Data Leakage Security</h3>
            <p>100% Client-Side Engine: Your sensitive legal documents, contracts, and financial spreadsheets never leave your browser or hit external cloud servers.</p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrapper">
              <Cpu size={22} />
            </div>
            <h3>No Account or Sign-Up Required</h3>
            <p>No subscriptions, no accounts, and no hidden limits. Start processing and converting documents right away with zero onboarding barriers.</p>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>© 2026 ORBITA CONVERTER STUDIO. All rights reserved.</div>
          <div>Powered by React 18 & WebAssembly • 100% Private Client-Side Document Processing.</div>
        </div>
      </footer>
    </div>
  );
}
