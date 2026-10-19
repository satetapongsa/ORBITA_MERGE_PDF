import { PDFDocument, degrees } from 'pdf-lib';

const LOAD_OPTS = { ignoreEncryption: false, updateMetadata: false };

export async function loadPdf(buffer) {
  try {
    return await PDFDocument.load(buffer, LOAD_OPTS);
  } catch (err) {
    const msg = /encrypt/i.test(err.message)
      ? 'This PDF is password-protected. Please remove the password and try again.'
      : 'This file could not be read as a PDF.';
    throw Object.assign(new Error(msg), { status: 422 });
  }
}

/** Merge whole documents, in order. */
export async function merge(buffers) {
  const out = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await loadPdf(buf);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/**
 * Build a new document from a list of page specs drawn from one or more sources.
 * spec: { source: number, page: number (0-based), rotate?: 0|90|180|270 }
 */
export async function assemble(buffers, specs) {
  const docs = await Promise.all(buffers.map(loadPdf));
  const out = await PDFDocument.create();
  for (const { source, page, rotate = 0 } of specs) {
    const src = docs[source];
    if (!src || page < 0 || page >= src.getPageCount()) {
      throw Object.assign(new Error('A selected page does not exist.'), { status: 400 });
    }
    const [copied] = await out.copyPages(src, [page]);
    if (rotate) copied.setRotation(degrees((copied.getRotation().angle + rotate) % 360));
    out.addPage(copied);
  }
  return out.save();
}

/** Split one document into several, one per group of 0-based page indices. */
export async function split(buffer, groups) {
  const src = await loadPdf(buffer);
  const count = src.getPageCount();
  const results = [];
  for (const group of groups) {
    if (group.some((i) => i < 0 || i >= count)) {
      throw Object.assign(new Error(`Page range is outside this document (it has ${count} pages).`), { status: 400 });
    }
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, group);
    pages.forEach((p) => out.addPage(p));
    results.push(await out.save());
  }
  return results;
}

export async function pageCount(buffer) {
  return (await loadPdf(buffer)).getPageCount();
}

/** Parse "1-3, 5, 8-10" into groups of 0-based indices. */
export function parseRanges(input, total) {
  const groups = [];
  for (const raw of String(input).split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw Object.assign(new Error(`"${part}" is not a valid range. Use e.g. 1-3, 5`), { status: 400 });
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > total) {
      throw Object.assign(new Error(`Range "${part}" must be within 1–${total}.`), { status: 400 });
    }
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i));
  }
  if (!groups.length) throw Object.assign(new Error('Enter at least one page range.'), { status: 400 });
  return groups;
}
