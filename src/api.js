export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

let storageConfig;
/** Forget per-user upload settings (call on sign-in / sign-out). */
export const resetStorageConfig = () => { storageConfig = undefined; };
const getStorageConfig = () => (storageConfig ??= api('/files/config').catch((err) => { storageConfig = null; throw err; }));

function randomHex(bytes = 16) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getClientMimeType(name, fileType) {
  if (fileType) return fileType;
  const ext = name.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt': return 'text/plain';
    case 'zip': return 'application/zip';
    default: return 'application/octet-stream';
  }
}

function blobFileName(name) {
  const parts = name.split('.');
  const ext = parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
  const rawBase = parts.join('.');
  const safeBase = rawBase.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}._-]/gu, '_').replace(/^[._]+/, '').slice(-90);
  const base = safeBase || 'document';
  return ext ? `${base}${ext}` : `${base}.pdf`;
}

/**
 * Upload files with progress reporting (0–1). On Vercel the files go straight from the
 * browser to private Blob storage (no 4.5 MB request limit); otherwise through the API.
 * Resolves to { files, rejected } either way.
 */
export async function uploadFiles(fileList, onProgress) {
  const files = [...fileList];
  const cfg = await getStorageConfig();
  const maxBytes = (cfg.maxUploadMb || 500) * 1024 * 1024;
  const rejected = files.filter((f) => f.size > maxBytes).map((f) => ({ name: f.name, error: `Larger than ${cfg.maxUploadMb || 500} MB.` }));
  const accepted = files.filter((f) => f.size <= maxBytes);
  if (!accepted.length) throw new ApiError(rejected[0]?.error || 'No files to upload', 413, { rejected });

  if (cfg.mode !== 'blob') {
    const saved = [];
    const rej = [...rejected];
    for (const f of accepted) {
      try {
        const res = await uploadViaServer([f], onProgress);
        if (res.files?.length) saved.push(...res.files);
        if (res.rejected?.length) rej.push(...res.rejected);
      } catch (err) {
        rej.push({ name: f.name, error: err.message || 'ไฟล์มีขนาดใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์' });
      }
    }
    if (!saved.length && rej.length) {
      throw new ApiError(rej.map((r) => `${r.name}: ${r.error}`).join('; '), 413, { rejected: rej });
    }
    return { files: saved, rejected: rej };
  }

  const { upload } = await import('@vercel/blob/client');
  const total = accepted.reduce((n, f) => n + f.size, 0) || 1;
  const loaded = new Map();
  const report = () => onProgress?.([...loaded.values()].reduce((a, b) => a + b, 0) / total);
  const saved = [];

  for (const file of accepted) {
    try {
      const mime = getClientMimeType(file.name, file.type);
      const safeName = blobFileName(file.name);
      const key = `users/${cfg.userId}/${randomHex()}/${safeName}`;
      await upload(key, file, {
        access: 'private',
        contentType: mime,
        handleUploadUrl: '/api/files/upload-token',
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ loaded: n }) => { loaded.set(file, n); report(); },
      });
      const d = await api('/files/register', { method: 'POST', body: { key, name: file.name } });
      saved.push(d.file);
    } catch (err) {
      rejected.push({ name: file.name, error: err.message || 'Upload failed' });
    }
    loaded.set(file, file.size);
    report();
  }
  if (!saved.length) throw new ApiError(rejected[0]?.error || 'Upload failed', 422, { rejected });
  return { files: saved, rejected };
}

function uploadViaServer(fileList, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    [...fileList].forEach((f) => form.append('files', f));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const msg = data.error || (xhr.status === 413 ? 'ไฟล์มีขนาดใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์' : `อัปโหลดไม่สำเร็จ (สถานะ: ${xhr.status})`);
        reject(new ApiError(msg, xhr.status, data));
      }
    };
    xhr.onerror = () => reject(new ApiError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่ายขณะอัปโหลด', 0));
    xhr.send(form);
  });
}

export const fileUrl = (id, download = false) => `/api/files/${id}/content${download ? '?download=1' : ''}`;

export function downloadFile(file) {
  const a = document.createElement('a');
  a.href = fileUrl(file.id, true);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
