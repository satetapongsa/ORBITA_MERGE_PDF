import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { query, one } from '../db.js';
import { requireAuth } from '../auth.js';
import { saveFile, filePath, deleteFile } from '../storage.js';
import { pageCount } from '../pdf.js';
import { indexFile } from '../text.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)),
});

export function cleanName(name, fallback = 'document.pdf') {
  // multer decodes names as latin1; restore UTF-8 (Thai filenames etc.)
  const decoded = Buffer.from(name || '', 'latin1').toString('utf8');
  const cleaned = decoded.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 180);
  return cleaned || fallback;
}

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

router.post('/', upload.array('files', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one PDF file.' });
  const saved = [];
  const rejected = [];
  for (const f of req.files) {
    const name = cleanName(f.originalname);
    if (f.buffer.subarray(0, 1024).indexOf('%PDF') === -1) {
      rejected.push({ name, error: 'Not a PDF file.' });
      continue;
    }
    let pages;
    try {
      pages = await pageCount(f.buffer);
    } catch (err) {
      rejected.push({ name, error: err.message });
      continue;
    }
    const key = await saveFile(req.user.id, f.buffer, 'pdf');
    const row = await one(
      `INSERT INTO files (user_id, kind, name, mime, size_bytes, page_count, storage_key)
       VALUES ($1, 'upload', $2, 'application/pdf', $3, $4, $5) RETURNING *`,
      [req.user.id, name, f.size, pages, key],
    );
    indexFile(row); // background: makes the file searchable by the assistant
    saved.push(toClient(row));
  }
  res.status(saved.length ? 201 : 422).json({ files: saved, rejected, error: saved.length ? undefined : rejected[0]?.error });
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
  const disposition = req.query.download ? 'attachment' : 'inline';
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(filePath(req.user.id, file.storage_key));
});

router.delete('/:id', async (req, res) => {
  const file = await getOwnedFile(req.user.id, req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  await query('DELETE FROM files WHERE id = $1', [file.id]);
  await deleteFile(req.user.id, file.storage_key);
  res.json({ ok: true });
});

export default router;
