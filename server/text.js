import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { query } from './db.js';
import { readFile } from './storage.js';

const MAX_PAGES = 500;
const MAX_PAGE_CHARS = 20_000;

/** Extract plain text for each page (1-based page numbers). */
async function extractPages(buffer) {
  const task = getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0 });
  const doc = await task.promise;
  try {
    const pages = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => (it.str ?? '') + (it.hasEOL ? '\n' : ''))
        .join('')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, MAX_PAGE_CHARS);
      if (text) pages.push({ n, text });
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

/** Extract and store a file's text so the assistant can search it. Never throws. */
export async function indexFile(file) {
  if (file.mime !== 'application/pdf') {
    await query(`UPDATE files SET text_status = 'skipped' WHERE id = $1`, [file.id]);
    return 'skipped';
  }
  try {
    const pages = await extractPages(await readFile(file.user_id, file.storage_key));
    await query('DELETE FROM file_pages WHERE file_id = $1', [file.id]);
    if (pages.length) {
      await query(
        `INSERT INTO file_pages (file_id, user_id, page_no, content)
         SELECT $1, $2, p.n, p.t FROM unnest($3::int[], $4::text[]) AS p(n, t)`,
        [file.id, file.user_id, pages.map((p) => p.n), pages.map((p) => p.text)],
      );
    }
    const status = pages.length ? 'ready' : 'empty';
    await query('UPDATE files SET text_status = $2 WHERE id = $1', [file.id, status]);
    return status;
  } catch (err) {
    console.warn(`Text extraction failed for file ${file.id}: ${err.message}`);
    await query(`UPDATE files SET text_status = 'failed' WHERE id = $1`, [file.id]).catch(() => {});
    return 'failed';
  }
}

/** Index any of the user's files that haven't been processed yet. */
export async function indexPending(userId, limit = 20) {
  const { rows } = await query(
    'SELECT * FROM files WHERE user_id = $1 AND text_status IS NULL ORDER BY created_at DESC LIMIT $2',
    [userId, limit],
  );
  for (const f of rows) await indexFile(f);
}
