import { Router } from 'express';
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
  limits: { fileSize: MAX_BYTES, files: 20 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)),
});

/** Strip characters that are unsafe in file names. */
export function cleanName(name, fallback = 'document.pdf') {
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
  waitUntil(indexFile(row));
}

/** Check that a buffer is a readable PDF. Returns its page count or throws a user-facing error. */
async function validatePdf(buffer) {
  if (buffer.subarray(0, 1024).indexOf('%PDF') === -1) throw new Error('Not a PDF file.');
  return pageCount(buffer);
}

async function insertUpload(userId, name, size, pages, key) {
  const row = await one(
    `INSERT INTO files (user_id, kind, name, mime, size_bytes, page_count, storage_key)
     VALUES ($1, 'upload', $2, 'application/pdf', $3, $4, $5) RETURNING *`,
    [userId, name, size, pages, key],
  );
  indexInBackground(row);
  return toClient(row);
}

// Tells the browser how to upload: straight to Vercel Blob, or through this server.
router.get('/config', (req, res) => {
  res.json({ mode: storageMode, maxUploadMb: config.maxUploadMb, userId: req.user.id });
});

// Server upload (local storage, or small files). Vercel limits request bodies to ~4.5 MB.
router.post('/', upload.array('files', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one PDF file.' });
  const saved = [];
  const rejected = [];
  for (const f of req.files) {
    const name = cleanName(fromLatin1(f.originalname));
    let pages;
    try {
      pages = await validatePdf(f.buffer);
    } catch (err) {
      rejected.push({ name, error: err.message });
      continue;
    }
    const key = await saveFile(req.user.id, f.buffer, { name });
    saved.push(await insertUpload(req.user.id, name, f.size, pages, key));
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
      if (!isUserBlobKey(userId, pathname) || !/\.pdf$/i.test(pathname)) {
        throw Object.assign(new Error('Invalid upload path.'), { status: 400 });
      }
      return {
        allowedContentTypes: ['application/pdf'],
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

  let buffer;
  try {
    buffer = await readFile(userId, key);
  } catch {
    return res.status(404).json({ error: 'Upload not found. Please try again.' });
  }
  let pages;
  try {
    pages = await validatePdf(buffer);
  } catch (err) {
    await deleteFile(userId, key).catch(() => {});
    return res.status(422).json({ error: err.message });
  }
  res.status(201).json({ file: await insertUpload(userId, name, buffer.length, pages, key) });
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
