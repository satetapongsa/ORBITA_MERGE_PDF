import { PDFDocument, degrees } from 'pdf-lib';
import sharp from 'sharp';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';

/** Convert Image buffer (JPG, PNG, WebP) into PDF bytes with optional rotation */
export async function imagesToPdf(imageItems) {
  const pdfDoc = await PDFDocument.create();

  for (const item of imageItems) {
    const buf = Buffer.isBuffer(item) ? item : item.buffer;
    const rotate = item?.rotate || 0;

    // Standardize to JPEG or PNG via sharp
    const metadata = await sharp(buf).metadata();
    let img;
    if (metadata.format === 'png') {
      img = await pdfDoc.embedPng(buf);
    } else {
      // Convert to clean JPEG buffer
      const jpegBuf = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
      img = await pdfDoc.embedJpg(jpegBuf);
    }

    const { width, height } = img.scale(1);
    const page = pdfDoc.addPage([width, height]);
    if (rotate) {
      page.setRotation(degrees(rotate % 360));
    }
    page.drawImage(img, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

/** Extract text from PDF using pdfjs-dist */
export async function extractPdfText(pdfBuffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(pdfBuffer), isEvalSupported: false, verbosity: 0 });
  const doc = await task.promise;
  const pagesText = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((it) => (it.str ?? '') + (it.hasEOL ? '\n' : ''))
        .join('')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      pagesText.push({ pageNum: i, text: pageText });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  return pagesText;
}

/** Convert PDF to DOCX buffer */
export async function pdfToDocx(pdfBuffer) {
  const pages = await extractPdfText(pdfBuffer);
  const paragraphs = [];

  for (const p of pages) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `--- Page ${p.pageNum} ---`,
            bold: true,
            color: '666666',
          }),
        ],
      })
    );

    const lines = p.text ? p.text.split('\n') : ['(No selectable text found on this page)'];
    for (const line of lines) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(line)],
        })
      );
    }

    paragraphs.push(new Paragraph({ text: '' }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/** Convert PDF to plain text buffer */
export async function pdfToTxt(pdfBuffer) {
  const pages = await extractPdfText(pdfBuffer);
  let output = '';
  for (const p of pages) {
    output += `--- Page ${p.pageNum} ---\n\n${p.text || '(No text)'}\n\n`;
  }
  return Buffer.from(output, 'utf8');
}

/** Convert plain text file to PDF buffer */
export async function txtToPdf(txtBuffer) {
  const text = txtBuffer.toString('utf8');
  const pdfDoc = await PDFDocument.create();
  
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const linesPerPage = Math.floor((pageHeight - margin * 2) / (fontSize * 1.4));

  const allLines = text.split(/\r?\n/);
  // Simple word wrapping
  const maxChars = 75;
  const wrappedLines = [];
  for (const rawLine of allLines) {
    if (rawLine.length <= maxChars) {
      wrappedLines.push(rawLine);
    } else {
      let cur = rawLine;
      while (cur.length > maxChars) {
        wrappedLines.push(cur.slice(0, maxChars));
        cur = cur.slice(maxChars);
      }
      if (cur) wrappedLines.push(cur);
    }
  }

  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const chunk = wrappedLines.slice(i, i + linesPerPage);
    chunk.forEach((line, idx) => {
      // sanitize line from non-latin / control characters if needed
      const safeLine = line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      try {
        page.drawText(safeLine, {
          x: margin,
          y: pageHeight - margin - idx * (fontSize * 1.4),
          size: fontSize,
        });
      } catch {
        // Fallback for special characters
      }
    });
  }

  if (pdfDoc.getPageCount() === 0) {
    pdfDoc.addPage([pageWidth, pageHeight]);
  }

  return Buffer.from(await pdfDoc.save());
}

/** Optimize / Compress PDF buffer */
export async function compressPdf(pdfBuffer) {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  // PDFDocument re-serialization without unused objects
  const saved = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return Buffer.from(saved);
}

/** Convert PDF to PNG images (returns either a single PNG buffer or a ZIP of PNGs) */
export async function pdfToImages(pdfBuffer, baseName = 'page') {
  const { pdfToPng } = await import('pdf-to-png-converter');
  const pngPages = await pdfToPng(pdfBuffer, {
    viewportScale: 2.0, // High quality 2x scale
  });

  if (!pngPages || !pngPages.length) {
    throw new Error('Could not render pages from PDF.');
  }

  if (pngPages.length === 1) {
    return {
      buffer: pngPages[0].content,
      name: `${baseName}-p1.png`,
      ext: 'png',
      pages: 1,
    };
  }

  const zip = new JSZip();
  pngPages.forEach((p, idx) => {
    zip.file(`${baseName}-p${idx + 1}.png`, p.content);
  });

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return {
    buffer: zipBuffer,
    name: `${baseName}-images.zip`,
    ext: 'zip',
    pages: pngPages.length,
  };
}
