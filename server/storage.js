import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { put, get, del, issueSignedToken, presignUrl } from '@vercel/blob';
import { config, ConfigError } from './config.js';
import { pool, query, one } from './db.js';

// Two interchangeable backends:
//  - "blob":  Vercel Blob (private access). Used when BLOB_READ_WRITE_TOKEN is set, e.g. on Vercel.
//             Keys look like  users/<userId>/<random>/<file name>
//  - "local": a folder per user on disk (local dev, or hosts with a persistent disk).
//             Keys look like  <random>.<ext>  inside  <STORAGE_DIR>/<userId>/
// Keys are always generated or validated server-side, so a user can never reach another user's files.

export const storageMode = process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local';

// In serverless environments without Blob store, use /tmp for temporary storage
if (process.env.VERCEL && storageMode === 'local' && !process.env.STORAGE_DIR) {
  config.storageDir = '/tmp/storage';
}

// Vercel functions cannot send response bodies larger than ~4.5 MB, so bigger files are
// handed to the browser as a short-lived signed URL instead of being streamed.
const MAX_STREAM_BYTES = 4 * 1024 * 1024;
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

const UUID_RE = /^[0-9a-f-]{36}$/i;

function assertUser(userId) {
  if (!UUID_RE.test(userId)) throw new Error('Invalid user id');
}

/** Keep letters (incl. Thai), digits, dot, dash, underscore — safe as the last path segment. */
export function safeSegment(name, fallback = 'file.pdf') {
  const cleaned = String(name).normalize('NFC').replace(/[^\p{L}\p{M}\p{N}._ -]/gu, '_').replace(/\s+/g, '_').slice(-120);
  return cleaned.replace(/^[._]+/, '') || fallback;
}

/** Blob keys a user may create or read: users/<userId>/<32 hex>/<name> */
export function isUserBlobKey(userId, key) {
  const prefix = `users/${userId}/`;
  return typeof key === 'string' && key.startsWith(prefix) && /^[0-9a-f]{32}\/[^/]{1,128}$/.test(key.slice(prefix.length));
}

export function newBlobKey(userId, name) {
  return `users/${userId}/${crypto.randomBytes(16).toString('hex')}/${safeSegment(name)}`;
}

function localPath(userId, key) {
  assertUser(userId);
  if (!/^[0-9a-f]{32}\.(pdf|zip|docx|txt|png|jpg|jpeg)$/i.test(key)) throw new Error('Invalid storage key');
  return path.join(config.storageDir, userId, key);
}

function checkKey(userId, key) {
  assertUser(userId);
  if (!isUserBlobKey(userId, key)) throw new Error('Invalid storage key');
}

export async function saveFile(userId, buffer, { name, contentType = 'application/pdf' }) {
  assertUser(userId);
  if (storageMode === 'blob') {
    const key = newBlobKey(userId, name);
    await put(key, buffer, {
      access: 'private',
      contentType,
      addRandomSuffix: false,
      multipart: buffer.length > 50 * 1024 * 1024,
    });
    return key;
  }
  const dir = path.join(config.storageDir, userId);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  const extMatch = name?.match(/\.([a-z0-9]+)$/i);
  let ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';
  if (contentType === 'application/zip') ext = 'zip';
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = 'docx';
  if (contentType === 'text/plain') ext = 'txt';
  const key = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  try {
    await fs.writeFile(path.join(dir, key), buffer);
  } catch (err) {
    console.warn('Local fs write warning:', err.message);
  }
  return key;
}

export async function readFile(userId, key) {
  if (storageMode === 'local') {
    try {
      return await fs.readFile(localPath(userId, key));
    } catch {
      // Fallback: load directly from PostgreSQL database bytea
      const row = await one('SELECT data FROM files WHERE user_id = $1 AND storage_key = $2', [userId, key]);
      if (row?.data) return Buffer.from(row.data);
      throw Object.assign(new Error('File content is missing.'), { status: 404 });
    }
  }
  checkKey(userId, key);
  const result = await get(key, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) throw Object.assign(new Error('File content is missing.'), { status: 404 });
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function deleteFile(userId, key) {
  if (storageMode === 'local') {
    await fs.rm(localPath(userId, key), { force: true }).catch(() => {});
    return;
  }
  checkKey(userId, key);
  await del(key);
}

/** Send a stored file to the browser (inline or as a download). */
export async function sendStoredFile(res, file, { download = false } = {}) {
  const disposition = `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', file.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', disposition);

  if (storageMode === 'local') {
    try {
      const buffer = await readFile(file.user_id, file.storage_key);
      res.setHeader('Content-Length', String(buffer.length));
      return res.end(buffer);
    } catch {
      return res.status(404).json({ error: 'File content not found.' });
    }
  }

  checkKey(file.user_id, file.storage_key);
  if (Number(file.size_bytes) <= MAX_STREAM_BYTES) {
    const buffer = await readFile(file.user_id, file.storage_key);
    res.setHeader('Content-Length', String(buffer.length));
    return res.end(buffer);
  }
  // Large file: redirect to a signed URL that only works for this one file, for 10 minutes.
  const validUntil = Date.now() + SIGNED_URL_TTL_MS;
  const token = await issueSignedToken({ pathname: file.storage_key, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname: file.storage_key, access: 'private', validUntil });
  const url = new URL(presignedUrl);
  if (download) url.searchParams.set('download', '1');
  res.redirect(302, url.toString());
}
