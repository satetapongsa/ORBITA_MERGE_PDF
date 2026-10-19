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

/** Upload PDFs with progress reporting (0–1). */
export function uploadFiles(fileList, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    [...fileList].forEach((f) => form.append('files', f));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.error || 'Upload failed', xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError('Network error during upload', 0));
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
