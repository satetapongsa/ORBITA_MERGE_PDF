import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Sortable from 'sortablejs';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Application State
let currentMode = 'merge'; // 'merge' | 'pdf-to-png'
let loadedFiles = []; // Array of { id, file, name, size, pageCount, pdfDoc, pdfLibDoc, arrayBuffer }
let activePages = []; // Array of { id, fileId, fileName, pageIndex, rotation, thumbnailDataUrl }

// DOM Elements
const toolTabs = document.querySelectorAll('.tool-tab-btn');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const toolbar = document.getElementById('toolbar');
const fileCountLabel = document.getElementById('file-count');
const pageCountLabel = document.getElementById('page-count');
const btnAddMore = document.getElementById('btn-add-more');
const btnRotateAll = document.getElementById('btn-rotate-all');
const btnClearAll = document.getElementById('btn-clear-all');
const fileReorderSection = document.getElementById('file-reorder-section');
const fileList = document.getElementById('file-list');
const pageReorderSection = document.getElementById('page-reorder-section');
const pagesGrid = document.getElementById('pages-grid');
const optionsBar = document.getElementById('options-bar');
const pngScaleGroup = document.getElementById('png-scale-group');
const pngScaleSelect = document.getElementById('png-scale-select');
const exportNameInput = document.getElementById('export-name-input');
const statusPill = document.getElementById('status-pill');
const btnExecute = document.getElementById('btn-execute');
const btnExecuteText = document.getElementById('btn-execute-text');

// Init Sortables
let fileSortableInstance = null;
let pageSortableInstance = null;

function initSortables() {
  if (fileList && !fileSortableInstance) {
    fileSortableInstance = new Sortable(fileList, {
      animation: 180,
      ghostClass: 'sortable-ghost',
      handle: '.file-row-item',
      onEnd: handleFilesReordered
    });
  }

  if (pagesGrid && !pageSortableInstance) {
    pageSortableInstance = new Sortable(pagesGrid, {
      animation: 200,
      ghostClass: 'sortable-ghost',
      handle: '.page-tile-card',
      onEnd: handlePagesReordered
    });
  }
}

// Mode Switcher
toolTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    toolTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    updateModeUI();
  });
});

function updateModeUI() {
  if (currentMode === 'merge') {
    fileReorderSection.classList.remove('hidden');
    pngScaleGroup.classList.add('hidden');
    btnExecuteText.textContent = 'ผสานและสร้างไฟล์ PDF ทันที';
  } else {
    fileReorderSection.classList.add('hidden');
    pngScaleGroup.classList.remove('hidden');
    btnExecuteText.textContent = 'เริ่มแปลงเป็นภาพ PNG (Ultra HD)';
  }
  checkExecuteAvailability();
}

// Drag & Drop & Upload
dropzone.addEventListener('click', () => fileInput.click());
btnAddMore.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleIncomingFiles(Array.from(e.dataTransfer.files));
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleIncomingFiles(Array.from(e.target.files));
  }
  fileInput.value = '';
});

// File Ingestion & PDF Page Extraction
async function handleIncomingFiles(files) {
  const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    showStatus('กรุณาเลือกไฟล์เอกสาร PDF เท่านั้น', 'error');
    return;
  }

  showStatus('กำลังเรนเดอร์พรีวิวหน้าเอกสารด้วยความเร็วสูง...', 'loading');

  for (const file of pdfFiles) {
    const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
    const arrayBuffer = await file.arrayBuffer();

    try {
      const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const numPages = pdfJsDoc.numPages;

      const fileObj = {
        id: fileId,
        file: file,
        name: file.name,
        size: file.size,
        pageCount: numPages,
        arrayBuffer: arrayBuffer,
        pdfJsDoc: pdfJsDoc
      };

      loadedFiles.push(fileObj);

      // Render thumbnail for each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfJsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.38 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);

        activePages.push({
          id: 'page_' + Math.random().toString(36).substr(2, 9),
          fileId: fileId,
          fileName: file.name,
          pageIndex: i - 1, // 0-indexed for pdf-lib
          displayNumber: i,
          rotation: 0,
          thumbnailDataUrl: thumbUrl
        });
      }
    } catch (err) {
      console.error('Error reading PDF:', err);
      showStatus(`ไม่สามารถอ่านไฟล์ ${file.name} ได้: ${err.message}`, 'error');
    }
  }

  renderAll();
  showStatus(`โหลดเอกสารและพรีวิวหน้าสำเร็จ (${activePages.length} หน้า)`, 'success');
}

// Render UI Components
function renderAll() {
  renderToolbar();
  renderFileList();
  renderPageGrid();
  checkExecuteAvailability();
}

function renderToolbar() {
  if (loadedFiles.length > 0) {
    toolbar.classList.remove('hidden');
    pageReorderSection.classList.remove('hidden');
    optionsBar.classList.remove('hidden');
    if (currentMode === 'merge') {
      fileReorderSection.classList.remove('hidden');
    }
    fileCountLabel.textContent = `${loadedFiles.length} ไฟล์`;
    pageCountLabel.textContent = `${activePages.length} หน้า`;
  } else {
    toolbar.classList.add('hidden');
    fileReorderSection.classList.add('hidden');
    pageReorderSection.classList.add('hidden');
    optionsBar.classList.add('hidden');
  }
}

function renderFileList() {
  fileList.innerHTML = '';
  loadedFiles.forEach((file, index) => {
    const row = document.createElement('div');
    row.className = 'file-row-item';
    row.dataset.fileId = file.id;
    row.innerHTML = `
      <div class="file-details">
        <span class="handle-icon">☰</span>
        <span class="file-title">${index + 1}. ${file.name}</span>
        <span class="file-badges">(${file.pageCount} หน้า • ${formatBytes(file.size)})</span>
      </div>
      <button class="btn-tile-icon delete" title="ลบไฟล์นี้">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    row.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(file.id);
    });

    fileList.appendChild(row);
  });
}

function renderPageGrid() {
  pagesGrid.innerHTML = '';
  activePages.forEach((page, index) => {
    const card = document.createElement('div');
    card.className = 'page-tile-card';
    card.dataset.pageId = page.id;

    card.innerHTML = `
      <div class="page-preview-box">
        <img src="${page.thumbnailDataUrl}" style="transform: rotate(${page.rotation}deg);" alt="Page ${index + 1}">
      </div>
      <div class="page-footer-info">
        <div>
          <span class="page-num-tag">#${index + 1}</span>
          <span class="page-source-tag" title="${page.fileName}">${page.fileName}</span>
        </div>
        <div class="page-tile-actions">
          <button class="btn-tile-icon rotate" title="หมุนหน้า 90°">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
          </button>
          <button class="btn-tile-icon delete" title="ลบหน้านี้">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    card.querySelector('.rotate').addEventListener('click', (e) => {
      e.stopPropagation();
      page.rotation = (page.rotation + 90) % 360;
      const img = card.querySelector('.page-preview-box img');
      img.style.transform = `rotate(${page.rotation}deg)`;
    });

    card.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      activePages.splice(index, 1);
      renderAll();
    });

    pagesGrid.appendChild(card);
  });
}

// Handlers for Sortable reorder events
function handleFilesReordered() {
  const currentFileRows = Array.from(fileList.children);
  const reorderedFileIds = currentFileRows.map(row => row.dataset.fileId);

  loadedFiles.sort((a, b) => reorderedFileIds.indexOf(a.id) - reorderedFileIds.indexOf(b.id));

  // Also rearrange activePages grouped by file sequence
  const newPages = [];
  loadedFiles.forEach(file => {
    const filePages = activePages.filter(p => p.fileId === file.id);
    newPages.push(...filePages);
  });
  activePages = newPages;

  renderAll();
}

function handlePagesReordered() {
  const currentCards = Array.from(pagesGrid.children);
  const reorderedPageIds = currentCards.map(card => card.dataset.pageId);

  activePages.sort((a, b) => reorderedPageIds.indexOf(a.id) - reorderedPageIds.indexOf(b.id));
  renderAll();
}

// Remove entire file and its pages
function removeFile(fileId) {
  loadedFiles = loadedFiles.filter(f => f.id !== fileId);
  activePages = activePages.filter(p => p.fileId !== fileId);
  renderAll();
}

// Toolbar button listeners
btnRotateAll.addEventListener('click', () => {
  activePages.forEach(p => {
    p.rotation = (p.rotation + 90) % 360;
  });
  renderPageGrid();
});

btnClearAll.addEventListener('click', () => {
  loadedFiles = [];
  activePages = [];
  renderAll();
  showStatus('', 'hidden');
});

function checkExecuteAvailability() {
  btnExecute.disabled = activePages.length === 0;
}

// Execute Action (Merge PDF or Convert PDF to PNG)
btnExecute.addEventListener('click', async () => {
  if (activePages.length === 0) return;

  btnExecute.disabled = true;
  const originalText = btnExecuteText.textContent;

  try {
    if (currentMode === 'merge') {
      await executeMergePDF();
    } else {
      await executePdfToPng();
    }
  } catch (err) {
    console.error('Execution error:', err);
    showStatus('เกิดข้อผิดพลาดในการประมวลผล: ' + err.message, 'error');
  } finally {
    btnExecute.disabled = false;
    btnExecuteText.textContent = originalText;
  }
});

// PDF Merging with Custom Page Ordering & Rotations
async function executeMergePDF() {
  showStatus('กำลังสร้างและจัดเรียงไฟล์ PDF ใหม่ตามลำดับที่คุณเลือก...', 'loading');
  btnExecuteText.textContent = 'กำลังประมวลผลเอกสาร...';

  const mergedPdf = await PDFDocument.create();

  // Cache loaded pdf-lib docs to avoid re-parsing same file multiple times
  const pdfLibDocsCache = new Map();

  for (const fileObj of loadedFiles) {
    const doc = await PDFDocument.load(fileObj.arrayBuffer);
    pdfLibDocsCache.set(fileObj.id, doc);
  }

  // Iterate exactly in the custom sorted activePages sequence
  for (let i = 0; i < activePages.length; i++) {
    const pageItem = activePages[i];
    const sourceDoc = pdfLibDocsCache.get(pageItem.fileId);

    if (sourceDoc) {
      const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [pageItem.pageIndex]);

      if (pageItem.rotation !== 0) {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
      }

      mergedPdf.addPage(copiedPage);
    }
  }

  const pdfBytes = await mergedPdf.save();
  const exportName = (exportNameInput.value.trim() || 'orbita-document') + '.pdf';
  saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), exportName);

  showStatus(`ผสานไฟล์ PDF สำเร็จเรียบร้อย (${activePages.length} หน้า)`, 'success');
}

// Convert PDF to PNG (Ultra HD 300 DPI / Scale 4.17) & Bundle as ZIP
async function executePdfToPng() {
  const scale = parseFloat(pngScaleSelect.value) || 4.17;
  showStatus(`กำลังเรนเดอร์ภาพความละเอียดสูง ${activePages.length} หน้า...`, 'loading');
  btnExecuteText.textContent = 'กำลังแปลงรูปภาพ Ultra HD...';

  const zip = new JSZip();
  const folder = zip.folder('png_pages');

  for (let i = 0; i < activePages.length; i++) {
    const pageItem = activePages[i];
    btnExecuteText.textContent = `เรนเดอร์หน้า ${i + 1}/${activePages.length}...`;

    const fileObj = loadedFiles.find(f => f.id === pageItem.fileId);
    if (!fileObj) continue;

    const page = await fileObj.pdfJsDoc.getPage(pageItem.pageIndex + 1);
    const viewport = page.getViewport({ scale: scale, rotation: pageItem.rotation });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const pageNumStr = String(i + 1).padStart(3, '0');
    folder.file(`page_${pageNumStr}.png`, blob);
  }

  btnExecuteText.textContent = 'กำลังสร้างไฟล์ ZIP...';
  const zipContent = await zip.generateAsync({ type: 'blob' });
  const exportName = (exportNameInput.value.trim() || 'orbita-export') + '_png.zip';
  saveAs(zipContent, exportName);

  showStatus(`แปลงไฟล์เป็นภาพ PNG (${scale >= 4 ? '300 DPI Ultra HD' : 'HD'}) ${activePages.length} หน้า สำเร็จเรียบร้อย!`, 'success');
}

// Utility Helpers
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showStatus(message, type) {
  statusPill.className = `notify-pill ${type}`;
  if (type === 'loading') {
    statusPill.innerHTML = `<span class="spinner"></span> <span>${message}</span>`;
  } else {
    statusPill.textContent = message;
  }

  if (type === 'hidden') {
    statusPill.classList.add('hidden');
  } else {
    statusPill.classList.remove('hidden');
  }
}

// Init Sortable lists and UI setup
initSortables();
updateModeUI();
