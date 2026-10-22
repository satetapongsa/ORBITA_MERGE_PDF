import { Router } from 'express';
import JSZip from 'jszip';
import { config } from '../config.js';
import { one } from '../db.js';
import { requireAuth } from '../auth.js';
import { readFile, saveFile } from '../storage.js';
import { merge, split, assemble, parseRanges } from '../pdf.js';
import { imagesToPdf, pdfToDocx, pdfToTxt, txtToPdf, compressPdf, pdfToImages } from '../converter.js';
import { getPlan, consumeExport, refundExport, getAccountSummary } from '../plans.js';
import { getOwnedFile, toClient, indexInBackground } from './files.js';

const router = Router();
router.use(requireAuth);

const baseName = (name) => name.replace(/\.[a-z0-9]+$/i, '');

async function loadOwned(userId, ids, allowedMimes = ['application/pdf']) {
  const files = await Promise.all(ids.map((id) => getOwnedFile(userId, id)));
  if (files.some((f) => !f || (allowedMimes.length && !allowedMimes.includes(f.mime)))) {
    throw Object.assign(new Error('One of the selected files is no longer available or format is unsupported.'), { status: 404 });
  }
  return files;
}

/**
 * Wraps an export: reserves one unit of today's quota, runs the job, stores the
 * result in the user's folder and gives the unit back if anything fails.
 */
function exportTask(handler) {
  return async (req, res) => {
    const userId = req.user.id;
    const { plan } = await getPlan(userId);
    const used = await consumeExport(userId, plan.dailyLimit);
    if (used === null) {
      return res.status(429).json({
        code: 'LIMIT_REACHED',
        error: plan.id === 'free'
          ? `You've used all ${plan.dailyLimit} free exports for today. Upgrade to Pro for ${config.plans.pro.dailyLimit} exports a day, or come back after midnight.`
          : `You've used all ${plan.dailyLimit} exports for today. Your allowance resets at midnight.`,
        account: await getAccountSummary(userId),
      });
    }
    try {
      const { buffer, name, ext = 'pdf', pages = null } = await handler(req);
      let mime = 'application/pdf';
      if (ext === 'zip') mime = 'application/zip';
      else if (ext === 'docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === 'txt') mime = 'text/plain';
      else if (ext === 'png') mime = 'image/png';
      else if (ext === 'jpg') mime = 'image/jpeg';

      const key = await saveFile(userId, buffer, { name, contentType: mime });
      const row = await one(
        `INSERT INTO files (user_id, kind, name, mime, size_bytes, page_count, storage_key)
         VALUES ($1, 'output', $2, $3, $4, $5, $6) RETURNING *`,
        [userId, name, mime, buffer.length, pages, key],
      );
      indexInBackground(row);
      res.status(201).json({ file: toClient(row), account: await getAccountSummary(userId) });
    } catch (err) {
      await refundExport(userId);
      throw err;
    }
  };
}

router.post('/merge', exportTask(async (req) => {
  const ids = Array.isArray(req.body.fileIds) ? req.body.fileIds : [];
  if (ids.length < 2) throw Object.assign(new Error('Add at least two PDFs to merge.'), { status: 400 });
  if (ids.length > 50) throw Object.assign(new Error('You can merge up to 50 files at once.'), { status: 400 });
  const files = await loadOwned(req.user.id, ids);
  const buffers = await Promise.all(files.map((f) => readFile(req.user.id, f.storage_key)));
  const out = Buffer.from(await merge(buffers));
  const pages = files.reduce((n, f) => n + (f.page_count || 0), 0);
  return { buffer: out, name: `${baseName(files[0].name)}-merged.pdf`, pages };
}));

router.post('/split', exportTask(async (req) => {
  const [file] = await loadOwned(req.user.id, [req.body.fileId]);
  const total = file.page_count;
  const groups = req.body.mode === 'each'
    ? Array.from({ length: total }, (_, i) => [i])
    : parseRanges(req.body.ranges, total);
  const buffer = await readFile(req.user.id, file.storage_key);
  const parts = await split(buffer, groups);
  const base = baseName(file.name);
  const label = (g) => (g.length === 1 ? `p${g[0] + 1}` : `p${g[0] + 1}-${g.at(-1) + 1}`);

  if (parts.length === 1) {
    return { buffer: Buffer.from(parts[0]), name: `${base}-${label(groups[0])}.pdf`, pages: groups[0].length };
  }
  const zip = new JSZip();
  parts.forEach((bytes, i) => zip.file(`${base}-${label(groups[i])}.pdf`, bytes));
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buffer: out, name: `${base}-split.zip`, ext: 'zip' };
}));

router.post('/organize', exportTask(async (req) => {
  const specs = Array.isArray(req.body.pages) ? req.body.pages : [];
  if (!specs.length) throw Object.assign(new Error('Keep at least one page.'), { status: 400 });
  if (specs.length > 2000) throw Object.assign(new Error('Too many pages.'), { status: 400 });
  const ids = [...new Set(specs.map((p) => p.fileId))];
  const files = await loadOwned(req.user.id, ids);
  const buffers = await Promise.all(files.map((f) => readFile(req.user.id, f.storage_key)));
  const normalized = specs.map((p) => ({
    source: ids.indexOf(p.fileId),
    page: Number(p.page),
    rotate: [0, 90, 180, 270].includes(Number(p.rotate)) ? Number(p.rotate) : 0,
  }));
  const out = Buffer.from(await assemble(buffers, normalized));
  return { buffer: out, name: `${baseName(files[0].name)}-organized.pdf`, pages: specs.length };
}));

// Conversion: Images -> PDF (supports reordered items with rotation)
router.post('/convert/images-to-pdf', exportTask(async (req) => {
  let items = req.body.items; // [{ fileId, rotate }]
  if (!items && Array.isArray(req.body.fileIds)) {
    items = req.body.fileIds.map((id) => ({ fileId: id, rotate: 0 }));
  }
  if (!items || !items.length) throw Object.assign(new Error('Choose at least one image file.'), { status: 400 });

  const uniqueIds = [...new Set(items.map((it) => it.fileId))];
  const files = await loadOwned(req.user.id, uniqueIds, ['image/jpeg', 'image/png', 'image/webp']);
  const fileMap = new Map(files.map((f) => [f.id, f]));

  const imageItems = await Promise.all(
    items.map(async (it) => {
      const f = fileMap.get(it.fileId);
      if (!f) throw Object.assign(new Error('Image file not found.'), { status: 404 });
      const buffer = await readFile(req.user.id, f.storage_key);
      return { buffer, rotate: Number(it.rotate) || 0 };
    })
  );

  const out = await imagesToPdf(imageItems);
  const firstName = fileMap.get(items[0].fileId)?.name || 'document';
  return { buffer: out, name: `${baseName(firstName)}-converted.pdf`, ext: 'pdf', pages: items.length };
}));

// Conversion: PDF -> Word (.docx)
router.post('/convert/pdf-to-docx', exportTask(async (req) => {
  const [file] = await loadOwned(req.user.id, [req.body.fileId], ['application/pdf']);
  const buffer = await readFile(req.user.id, file.storage_key);
  const out = await pdfToDocx(buffer);
  return { buffer: out, name: `${baseName(file.name)}.docx`, ext: 'docx' };
}));

// Conversion: PDF -> Plain Text (.txt)
router.post('/convert/pdf-to-txt', exportTask(async (req) => {
  const [file] = await loadOwned(req.user.id, [req.body.fileId], ['application/pdf']);
  const buffer = await readFile(req.user.id, file.storage_key);
  const out = await pdfToTxt(buffer);
  return { buffer: out, name: `${baseName(file.name)}.txt`, ext: 'txt' };
}));

// Conversion: Text (.txt) -> PDF
router.post('/convert/txt-to-pdf', exportTask(async (req) => {
  const [file] = await loadOwned(req.user.id, [req.body.fileId], ['text/plain']);
  const buffer = await readFile(req.user.id, file.storage_key);
  const out = await txtToPdf(buffer);
  return { buffer: out, name: `${baseName(file.name)}.pdf`, ext: 'pdf' };
}));

// Conversion: PDF -> Images (PNG / ZIP)
router.post('/convert/pdf-to-images', exportTask(async (req) => {
  const [file] = await loadOwned(req.user.id, [req.body.fileId], ['application/pdf']);
  const buffer = await readFile(req.user.id, file.storage_key);
  const res = await pdfToImages(buffer, baseName(file.name));
  return res;
}));

// Compression: Estimate compression size
router.post('/compress/estimate', async (req, res) => {
  try {
    const [file] = await loadOwned(req.user.id, [req.body.fileId], ['application/pdf']);
    const buffer = await readFile(req.user.id, file.storage_key);
    const result = await compressPdf(buffer, req.body.level || 'recommended');
    res.json({
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      savedBytes: result.savedBytes,
      ratio: result.ratio,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Compression: Compress PDF
router.post('/compress', exportTask(async (req) => {
  const [file] = await loadOwned(req.user.id, [req.body.fileId], ['application/pdf']);
  const buffer = await readFile(req.user.id, file.storage_key);
  const result = await compressPdf(buffer, req.body.level || 'recommended');
  return {
    buffer: result.buffer,
    name: `${baseName(file.name)}-compressed.pdf`,
    ext: 'pdf',
    pages: file.page_count,
  };
}));

export default router;
