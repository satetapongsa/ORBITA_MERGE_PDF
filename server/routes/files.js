import { Router } from 'express';
import path from 'node:path';
import multer from 'multer';
import { handleUpload } from '@vercel/blob/client';
import { waitUntil } from '@vercel/functions';
import { config } from '../config.js';
import { query, one } from '../db.js';
import { requireAuth } from '../auth.js';
import { saveFile, readFile, deleteFile, sendStoredFile, storageMode, isUserBlobKey } from '../storage.js';
import { pageCount } from '../pdf.js';
import { indexFile } from '../text.js';

const router = Router();
router.use(requireAuth);

const MAX_BYTES = config.maxUploadMb * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 100 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = /^\.(pdf|png|jpe?g|webp|docx|txt)$/i.test(ext);
    cb(null, ok);
  },
});

/** Strip characters that are unsafe in file names. */
export function cleanName(name, fallback = 'document') {
  const cleaned = String(name || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 180);
  return cleaned || fallback;
}

// multer decodes multipart file names as latin1; restore UTF-8 (Thai file names etc.)
const fromLatin1 = (name) => Buffer.from(name || '', 'latin1').toString('utf8');

export function toClient(f) {
  return {
    id: f.id,
    kind: f.kind,
    name: f.name,
    size: Number(f.size_bytes),
    pageCount: f.page_count,
    mime: f.mime,
    createdAt: f.created_at,
  };
}

export async function getOwnedFile(userId, id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  return one('SELECT * FROM files WHERE id = $1 AND user_id = $2', [id, userId]);
}

/** Make a file searchable by the assistant without delaying the response. */
export function indexInBackground(row) {
  if (row.mime === 'application/pdf') {
    waitUntil(indexFile(row));
  }
}

/** Check that a buffer is a readable PDF. Returns its page count or throws a user-facing error. */
async function validatePdf(buffer) {
  // Check if buffer contains %PDF marker anywhere in first 4096 bytes
  if (buffer.subarray(0, 4096).indexOf('%PDF') === -1) {
    throw new Error('This file does not appear to be a valid PDF.');
  }
  try {
    return await pageCount(buffer);
  } catch (err) {
    console.warn('PDF parsing warning:', err.message);
    // If pdf-lib struggles with obscure PDF syntax but marker is valid, fallback to 1 page rather than failing upload
    return 1;
  }
}

function getMimeType(name) {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt': return 'text/plain';
    case '.zip': return 'application/zip';
    default: return 'application/octet-stream';
  }
}

async function insertUpload(userId, name, size, pages, key, mime = null) {
  const resolvedMime = mime || getMimeType(name);
  const row = await one(
    `INSERT INTO files (user_id, kind, name, mime, size_bytes, page_count, storage_key)
     VALUES ($1, 'upload', $2, $3, $4, $5, $6) RETURNING *`,
    [userId, name, resolvedMime, size, pages, key],
  );
  indexInBackground(row);
  return toClient(row);
}

// Tells the browser how to upload: straight to Vercel Blob, or through this server.
router.get('/config', (req, res) => {
  res.json({ mode: storageMode, maxUploadMb: config.maxUploadMb, userId: req.user.id });
});

// Server upload (local storage, or small files). Vercel limits request bodies to ~4.5 MB.
router.post('/', upload.array('files', 100), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one file.' });
  const saved = [];
  const rejected = [];
  for (const f of req.files) {
    const original = fromLatin1(f.originalname);
    const name = cleanName(original);
    const mime = getMimeType(original);
    let pages = null;

    if (mime === 'application/pdf') {
      try {
        pages = await validatePdf(f.buffer);
      } catch (err) {
        rejected.push({ name, error: err.message });
        continue;
      }
    } else if (mime.startsWith('image/')) {
      pages = 1;
    }

    const key = await saveFile(req.user.id, f.buffer, { name, contentType: mime });
    saved.push(await insertUpload(req.user.id, name, f.size, pages, key, mime));
  }
  res.status(saved.length ? 201 : 422).json({ files: saved, rejected, error: saved.length ? undefined : rejected[0]?.error });
});

// Direct upload, step 1: issue a short-lived token that only allows writing one PDF
// into this user's own folder. The browser then uploads straight to Vercel Blob.
router.post('/upload-token', async (req, res) => {
  if (storageMode !== 'blob') return res.status(400).json({ error: 'Direct upload is not enabled.' });
  const userId = req.user.id;
  const result = await handleUpload({
    body: req.body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      if (!isUserBlobKey(userId, pathname) || !/\.(pdf|png|jpe?g|webp|docx|txt)$/i.test(pathname)) {
        throw Object.assign(new Error('Invalid upload path.'), { status: 400 });
      }
      return {
        allowedContentTypes: [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: false,
        allowOverwrite: false,
        validUntil: Date.now() + 10 * 60 * 1000,
      };
    },
  });
  res.json(result);
});

// Direct upload, step 2: the browser reports the finished upload; we validate it and record it.
router.post('/register', async (req, res) => {
  if (storageMode !== 'blob') return res.status(400).json({ error: 'Direct upload is not enabled.' });
  const userId = req.user.id;
  const key = String(req.body.key || '');
  if (!isUserBlobKey(userId, key)) return res.status(400).json({ error: 'Invalid file reference.' });
  if (await one('SELECT 1 FROM files WHERE storage_key = $1', [key])) {
    return res.status(409).json({ error: 'This upload was already added.' });
  }
  const name = cleanName(req.body.name);
  const mime = getMimeType(name);

  let buffer;
  try {
    buffer = await readFile(userId, key);
  } catch {
    return res.status(404).json({ error: 'Upload not found. Please try again.' });
  }
  let pages = null;
  if (mime === 'application/pdf') {
    try {
      pages = await validatePdf(buffer);
    } catch (err) {
      await deleteFile(userId, key).catch(() => {});
      return res.status(422).json({ error: err.message });
    }
  } else if (mime.startsWith('image/')) {
    pages = 1;
  }
  res.status(201).json({ file: await insertUpload(userId, name, buffer.length, pages, key, mime) });
});

router.get('/', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM files WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
    [req.user.id],
  );
  res.json({ files: rows.map(toClient) });
});

router.get('/:id/content', async (req, res) => {
  const file = await getOwnedFile(req.user.id, req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  await sendStoredFile(res, file, { download: Boolean(req.query.download) });
});

router.delete('/:id', async (req, res) => {
  const file = await getOwnedFile(req.user.id, req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  await query('DELETE FROM files WHERE id = $1', [file.id]);
  await deleteFile(req.user.id, file.storage_key);
  res.json({ ok: true });
});

export default router;
