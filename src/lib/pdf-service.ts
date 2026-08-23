import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// Set up PDF.js worker
// Use unpkg worker or inline worker for standard modern bundlers
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Render all pages of a PDF file to data URLs (thumbnails)
 */
export async function renderPdfThumbnails(
  file: File,
  maxPages: number = 50,
  scale: number = 0.5
): Promise<{ pageNumber: number; dataUrl: string; width: number; height: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);

  const thumbnails: { pageNumber: number; dataUrl: string; width: number; height: number }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    thumbnails.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: viewport.width,
      height: viewport.height,
    });
  }

  return thumbnails;
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePDFs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes as any], { type: 'application/pdf' });
}

/**
 * Split PDF - Extract specific page indices
 */
export async function splitPDF(file: File, pageIndices: number[]): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const copiedPages = await newPdf.copyPages(pdf, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const newBytes = await newPdf.save();
  return new Blob([newBytes as any], { type: 'application/pdf' });
}

/**
 * Organize, Rotate, and Reorder PDF Pages
 */
export async function organizePDF(
  file: File,
  pageActions: { originalIndex: number; rotation: number }[]
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  for (const action of pageActions) {
    const [copiedPage] = await newPdf.copyPages(pdf, [action.originalIndex]);
    if (action.rotation !== 0) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + action.rotation) % 360));
    }
    newPdf.addPage(copiedPage);
  }

  const bytes = await newPdf.save();
  return new Blob([bytes as any], { type: 'application/pdf' });
}

/**
 * Convert Images (JPG/PNG) into a single PDF
 */
export async function imagesToPdf(files: File[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let img;
    if (file.type === 'image/png') {
      img = await pdfDoc.embedPng(arrayBuffer);
    } else {
      img = await pdfDoc.embedJpg(arrayBuffer);
    }

    const { width, height } = img;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes as any], { type: 'application/pdf' });
}

/**
 * Convert PDF pages to JPG/PNG images and bundle into ZIP
 */
export async function pdfToImages(
  file: File,
  format: 'jpeg' | 'png' = 'jpeg',
  scale: number = 2.0,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;
  const zip = new JSZip();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
    const base64Data = dataUrl.split(',')[1];
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const filename = `page_${String(i).padStart(3, '0')}.${ext}`;
    zip.file(filename, base64Data, { base64: true });

    if (onProgress) onProgress(i, numPages);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Add Page Numbers to PDF (Arabic or Thai numerals)
 */
export async function addPageNumbers(
  file: File,
  options: {
    format: 'arabic' | 'thai';
    position: 'bottom-center' | 'bottom-right' | 'top-right';
    prefix?: string;
    startNumber?: number;
    fontSize?: number;
  }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  const toThaiNumber = (num: number) =>
    String(num)
      .split('')
      .map((d) => thaiDigits[parseInt(d, 10)] || d)
      .join('');

  pages.forEach((page, index) => {
    const pageNum = (options.startNumber || 1) + index;
    const pageStr = options.format === 'thai' ? toThaiNumber(pageNum) : String(pageNum);
    const text = options.prefix ? `${options.prefix} ${pageStr}` : `${pageStr}`;

    const { width, height } = page.getSize();
    const size = options.fontSize || 12;
    const textWidth = font.widthOfTextAtSize(text, size);

    let x = width / 2 - textWidth / 2;
    let y = 25;

    if (options.position === 'bottom-right') {
      x = width - textWidth - 30;
      y = 25;
    } else if (options.position === 'top-right') {
      x = width - textWidth - 30;
      y = height - 30;
    }

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  const bytes = await pdfDoc.save();
  return new Blob([bytes as any], { type: 'application/pdf' });
}

/**
 * Add Watermark (Text or Image) to PDF
 */
export async function addWatermark(
  file: File,
  options: {
    text?: string;
    opacity: number;
    rotation: number;
    fontSize: number;
    color: { r: number; g: number; b: number };
  }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    if (options.text) {
      const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
      page.drawText(options.text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: options.fontSize,
        font,
        color: rgb(options.color.r, options.color.g, options.color.b),
        opacity: options.opacity,
        rotate: degrees(options.rotation),
      });
    }
  });

  const bytes = await pdfDoc.save();
  return new Blob([bytes as any], { type: 'application/pdf' });
}

/**
 * Embed Signature onto PDF Page
 */
export async function addSignatureToPdf(
  file: File,
  signaturePngDataUrl: string,
  targetPageNumber: number,
  placement: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const page = pages[targetPageNumber - 1] || pages[0];

  const sigImageBytes = await fetch(signaturePngDataUrl).then((res) => res.arrayBuffer());
  const sigImage = await pdfDoc.embedPng(sigImageBytes);

  page.drawImage(sigImage, {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  });

  const bytes = await pdfDoc.save();
  return new Blob([bytes as any], { type: 'application/pdf' });
}

function sanitizeXmlText(str: string): string {
  if (!str) return '';
  // Remove control characters illegal in XML 1.0 (OpenXML)
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]/g, '')
    .trim();
}

/**
 * Convert PDF to Word (.docx) by extracting text content and formatting cleanly
 */
export async function pdfToDocx(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;

  const docParagraphs: Paragraph[] = [
    new Paragraph({
      text: sanitizeXmlText(`เอกสารแปลงจาก PDF: ${file.name.replace('.pdf', '')}`),
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    }),
  ];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    docParagraphs.push(
      new Paragraph({
        text: sanitizeXmlText(`--- หน้า ${i} จาก ${numPages} ---`),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 250, after: 120 },
      })
    );

    let hasAnyText = false;

    // Collect all text items first
    type TextItem = { str: string; x: number; y: number; w: number; h: number };
    const allItems: TextItem[] = [];

    for (const item of textContent.items as any[]) {
      if ('str' in item && typeof item.str === 'string') {
        const cleanStr = sanitizeXmlText(item.str);
        if (!cleanStr) continue;
        allItems.push({
          str: cleanStr,
          x: item.transform[4],
          y: item.transform[5],
          w: item.width || 0,
          h: Math.abs(item.transform[3]) || 12,
        });
      }
    }

    if (allItems.length === 0) {
      hasAnyText = false;
    } else {
      hasAnyText = true;

      // Group items into lines by Y position (within 2pt tolerance)
      const lines: TextItem[][] = [];
      for (const item of allItems) {
        let placed = false;
        for (const line of lines) {
          if (Math.abs(line[0].y - item.y) <= 2) {
            line.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) lines.push([item]);
      }

      // Sort lines top-to-bottom (PDF Y is bottom-up, so descending Y = top-to-bottom)
      lines.sort((a, b) => b[0].y - a[0].y);

      // Helper: does string contain Thai characters?
      const isThai = (s: string) => /[\u0E00-\u0E7F]/.test(s);

      for (const line of lines) {
        // Sort items left-to-right by X
        line.sort((a, b) => a.x - b.x);

        let lineText = '';
        let prevEndX: number | null = null;
        let prevH = 12;

        for (const item of line) {
          if (!lineText) {
            lineText = item.str;
          } else {
            const gap = item.x - (prevEndX ?? item.x);
            const lineHasThai = isThai(lineText) || isThai(item.str);

            if (lineHasThai) {
              // Thai: NEVER add space based on gap — Thai language has no inter-character spaces
              // Only add a space if the gap is extremely large (e.g. tab-like gap > 3x font height)
              lineText += gap > prevH * 3 ? ' ' : '';
              lineText += item.str;
            } else {
              // Non-Thai: add space when gap is meaningful (> 40% of font height)
              lineText += gap > prevH * 0.4 ? ' ' : '';
              lineText += item.str;
            }
          }
          prevEndX = item.x + item.w;
          prevH = item.h;
        }

        if (lineText.trim()) {
          docParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: sanitizeXmlText(lineText),
                  size: 24,
                  font: 'Angsana New',
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      }
    }

    // If page has no selectable text (scanned image PDF like OMR sheet), render page notice
    if (!hasAnyText) {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '(หน้านี้เป็นรูปภาพสแกน ไม่มีข้อความแบบตัวอักษรที่แก้ไขได้)',
              italics: true,
              color: '888888',
              size: 22,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    }

    if (onProgress) onProgress(i, numPages);
  }

  const doc = new Document({
    creator: 'เครื่องมือสำหรับครู (PDF & Office Tools)',
    title: sanitizeXmlText(file.name),
    description: 'Generated by Teacher PDF Tools',
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Trigger file download helper
 */
export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}
