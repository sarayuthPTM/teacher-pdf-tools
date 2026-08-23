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

/**
 * Map Thai Private Use Area (PUA) codepoints to standard Thai Unicode
 * Fixes missing / boxed characters in PDFs created with custom font engines (Canva, MacThai, DSN, etc.)
 */
export function normalizeThaiPua(text: string): string {
  if (!text) return '';
  return text
    // Windows-874 / MacThai / Adobe Thai PUA character mappings (F700-F71A)
    .replace(/\uF700/g, '\u0E1E') // พ
    .replace(/\uF701/g, '\u0E35') // สระอี (บน ป, ฝ, ฟ)
    .replace(/\uF702/g, '\u0E36') // สระอึ (บน ป, ฝ, ฟ)
    .replace(/\uF703/g, '\u0E37') // สระอือ (บน ป, ฝ, ฟ)
    .replace(/\uF704/g, '\u0E4D') // นิคหิต
    .replace(/\uF705/g, '\u0E48') // ไม้เอก (บน สระบน)
    .replace(/\uF706/g, '\u0E49') // ไม้โท (บน สระบน)
    .replace(/\uF707/g, '\u0E4A') // ไม้ตรี (บน สระบน)
    .replace(/\uF708/g, '\u0E4B') // ไม้จัตวา (บน สระบน)
    .replace(/\uF709/g, '\u0E4C') // การันต์ (บน สระบน)
    .replace(/\uF70A/g, '\u0E48') // ไม้เอก (บน ป, ฝ, ฟ)
    .replace(/\uF70B/g, '\u0E49') // ไม้โท (บน ป, ฝ, ฟ)
    .replace(/\uF70C/g, '\u0E4A') // ไม้ตรี (บน ป, ฝ, ฟ)
    .replace(/\uF70D/g, '\u0E4B') // ไม้จัตวา (บน ป, ฝ, ฟ)
    .replace(/\uF70E/g, '\u0E4C') // การันต์ (บน ป, ฝ, ฟ)
    .replace(/\uF70F/g, '\u0E31') // ไม้หันอากาศ (บน ป, ฝ, ฟ)
    .replace(/\uF710/g, '\u0E31') // ไม้หันอากาศ
    .replace(/\uF711/g, '\u0E33') // สระอำ
    .replace(/\uF712/g, '\u0E4D') // นิคหิต
    .replace(/\uF713/g, '\u0E48') // ไม้เอก
    .replace(/\uF714/g, '\u0E49') // ไม้โท
    .replace(/\uF715/g, '\u0E4A') // ไม้ตรี
    .replace(/\uF716/g, '\u0E4B') // ไม้จัตวา
    .replace(/\uF717/g, '\u0E4C') // การันต์
    .replace(/\uF718/g, '\u0E38') // สระอุ (ล่าง ฎ, ฏ)
    .replace(/\uF719/g, '\u0E39') // สระอู (ล่าง ฎ, ฏ)
    .replace(/\uF71A/g, '\u0E3A') // พินทุ
    // Additional PUA mappings for Thai fonts (F880-F89E)
    .replace(/\uF884/g, '\u0E34') // สระอิ
    .replace(/\uF885/g, '\u0E35') // สระอี
    .replace(/\uF886/g, '\u0E36') // สระอึ
    .replace(/\uF887/g, '\u0E37') // สระอือ
    .replace(/\uF888/g, '\u0E48') // ไม้เอก
    .replace(/\uF889/g, '\u0E49') // ไม้โท
    .replace(/\uF88A/g, '\u0E4A') // ไม้ตรี
    .replace(/\uF88B/g, '\u0E4B') // ไม้จัตวา
    .replace(/\uF88C/g, '\u0E4C') // การันต์
    .replace(/\uF88E/g, '\u0E48') // ไม้เอก
    .replace(/\uF88F/g, '\u0E49') // ไม้โท
    .replace(/\uF890/g, '\u0E4A') // ไม้ตรี
    .replace(/\uF891/g, '\u0E4B') // ไม้จัตวา
    .replace(/\uF892/g, '\u0E4C') // การันต์
    .replace(/\uF893/g, '\u0E31') // ไม้หันอากาศ
    .replace(/\uF894/g, '\u0E47') // ไม้ไต่คู้ (เช่น เป็น, เป็ด)
    .replace(/\uF895/g, '\u0E47') // ไม้ไต่คู้
    .replace(/\uF896/g, '\u0E38') // สระอุ
    .replace(/\uF897/g, '\u0E39') // สระอู
    .replace(/\uF898/g, '\u0E3A') // พินทุ
    .replace(/\uF899/g, '\u0E48') // ไม้เอก
    .replace(/\uF89A/g, '\u0E49') // ไม้โท
    .replace(/\uF89B/g, '\u0E4A') // ไม้ตรี
    .replace(/\uF89C/g, '\u0E4B') // ไม้จัตวา
    .replace(/\uF89D/g, '\u0E4C') // การันต์
    // Remove zero-width formatting characters
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
}

function sanitizeXmlText(str: string): string {
  if (!str) return '';
  const normalized = normalizeThaiPua(str);
  // Remove control characters illegal in XML 1.0 (OpenXML)
  return normalized
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

    // Collect and sanitize raw items
    type TextItem = { str: string; x: number; y: number; w: number; h: number };
    const rawItems: TextItem[] = [];

    for (const item of textContent.items as any[]) {
      if ('str' in item && typeof item.str === 'string') {
        const cleanStr = sanitizeXmlText(item.str);
        if (!cleanStr) continue;
        rawItems.push({
          str: cleanStr,
          x: item.transform[4],
          y: item.transform[5],
          w: item.width || 0,
          h: Math.abs(item.transform[3]) || 12,
        });
      }
    }

    // Filter out Canva shadow/duplicate layers (items at nearly identical coordinates with same text)
    const allItems: TextItem[] = [];
    for (const item of rawItems) {
      const isDuplicate = allItems.some(
        (existing) =>
          existing.str === item.str &&
          Math.abs(existing.x - item.x) <= Math.max(existing.h * 0.4, 5) &&
          Math.abs(existing.y - item.y) <= Math.max(existing.h * 0.4, 5)
      );
      if (!isDuplicate) {
        allItems.push(item);
      }
    }

    if (allItems.length === 0) {
      hasAnyText = false;
    } else {
      hasAnyText = true;

      // Group items into lines by Y position (within 3pt tolerance)
      const lines: { y: number; items: TextItem[] }[] = [];
      for (const item of allItems) {
        let placed = false;
        for (const line of lines) {
          if (Math.abs(line.y - item.y) <= 3) {
            line.items.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) lines.push({ y: item.y, items: [item] });
      }

      // Sort lines top-to-bottom (PDF Y is bottom-up, so descending Y = top-to-bottom)
      lines.sort((a, b) => b.y - a.y);

      // Helper: does string contain Thai characters?
      const isThai = (s: string) => /[\u0E00-\u0E7F]/.test(s);
      let lastRenderedLine = '';

      for (const lineObj of lines) {
        const line = lineObj.items;
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
            const lineHasThai = isThai(lineText.slice(-3)) || isThai(item.str.slice(0, 3));

            if (lineHasThai) {
              // Thai: join without space unless intentional wide gap (e.g. columns > 2.5x font height)
              lineText += gap > prevH * 2.5 ? ' ' : '';
              lineText += item.str;
            } else {
              // Non-Thai: add space when gap > 35% font height
              lineText += gap > prevH * 0.35 ? ' ' : '';
              lineText += item.str;
            }
          }
          prevEndX = item.x + item.w;
          prevH = item.h;
        }

        const cleanLine = lineText.trim();
        if (cleanLine) {
          // Discard immediate duplicate lines (e.g. whole-line shadows offset on separate Y levels)
          if (cleanLine === lastRenderedLine) {
            continue;
          }
          lastRenderedLine = cleanLine;

          docParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: sanitizeXmlText(cleanLine),
                  size: 24, // 12pt
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
