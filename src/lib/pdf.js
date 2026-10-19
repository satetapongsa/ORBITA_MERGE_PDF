import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { fileUrl } from '../api.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const docs = new Map();

/** Load (and cache) a stored PDF for preview rendering. */
export function loadDoc(fileId) {
  if (!docs.has(fileId)) {
    const p = fetch(fileUrl(fileId))
      .then((r) => {
        if (!r.ok) throw new Error('Could not load file');
        return r.arrayBuffer();
      })
      .then((data) => pdfjs.getDocument({ data }).promise);
    p.catch(() => docs.delete(fileId));
    docs.set(fileId, p);
  }
  return docs.get(fileId);
}

// Keep a handful of renders in flight so long documents don't freeze the page.
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= 3) await new Promise((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** Render a page (0-based) into the canvas at the given CSS width. */
export function renderPage(fileId, pageIndex, canvas, cssWidth) {
  return withSlot(async () => {
    const doc = await loadDoc(fileId);
    const page = await doc.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
  });
}
