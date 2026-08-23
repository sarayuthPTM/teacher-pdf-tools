import React, { useState } from 'react';
import { Type, Download, Loader2, Stamp, Palette } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { renderPdfThumbnails, downloadBlob } from '../../lib/pdf-service';

export const AnnotateTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<{ pageNumber: number; dataUrl: string }[]>([]);
  const [text, setText] = useState('เอกสารตรวจสอบแล้ว');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(16);
  const [pos, setPos] = useState<{ xPercent: number; yPercent: number }>({ xPercent: 50, yPercent: 50 });
  const [colorHex, setColorHex] = useState('#2563eb');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);

    try {
      const thumbs = await renderPdfThumbnails(selected, 50, 0.8);
      setThumbnails(thumbs);
      setSelectedPage(1);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเปิดเอกสารได้');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!file || !text.trim()) return;

    try {
      setIsProcessing(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.getPages()[selectedPage - 1] || pdfDoc.getPages()[0];
      const { width, height } = page.getSize();

      const r = parseInt(colorHex.slice(1, 3), 16) / 255;
      const g = parseInt(colorHex.slice(3, 5), 16) / 255;
      const b = parseInt(colorHex.slice(5, 7), 16) / 255;

      const xPoint = (pos.xPercent / 100) * width;
      const yPoint = height - (pos.yPercent / 100) * height;

      page.drawText(text, {
        x: xPoint,
        y: yPoint,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(blob, `annotated_${file.name}`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเพิ่มข้อมูลลงใน PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageThumbnail = thumbnails.find((t) => t.pageNumber === selectedPage);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-600 text-white shadow-md">
          <Type className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          เพิ่มข้อมูลใน PDF (Annotate PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          เพิ่มข้อความ ตรายาง หรือข้อมูลกำกับลงในเอกสาร คลิกเลือกตำแหน่งได้อย่างอิสระ
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อเพิ่มข้อความ"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Controls */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                1. ข้อความที่ต้องการเพิ่ม
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    ข้อความหรือตรายาง
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['อนุมัติแล้ว', 'ผ่านการตรวจสอบ', 'PAID', 'APPROVED', 'สำเนา'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setText(preset)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    หน้าที่ต้องการเพิ่ม (หน้า {selectedPage} จาก {thumbnails.length})
                  </label>
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {thumbnails.map((t) => (
                      <option key={t.pageNumber} value={t.pageNumber}>
                        หน้า {t.pageNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      ขนาดตัวอักษร: {fontSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-lime-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      สีข้อความ
                    </label>
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing || !text.trim()}
              onClick={handleApply}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-lime-600 to-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังบันทึกข้อมูล...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด PDF ที่แก้ไขแล้ว
                </>
              )}
            </button>
          </div>

          {/* Preview & Position Selector */}
          <div className="lg:col-span-7">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  คลิกบนเอกสารเพื่อกำหนดตำแหน่งข้อความ
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  เปลี่ยนไฟล์
                </button>
              </div>

              {loading ? (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
                </div>
              ) : currentPageThumbnail ? (
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPos({
                      xPercent: ((e.clientX - rect.left) / rect.width) * 100,
                      yPercent: ((e.clientY - rect.top) / rect.height) * 100,
                    });
                  }}
                  className="relative mx-auto cursor-crosshair overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-700"
                  style={{ maxWidth: '420px' }}
                >
                  <img src={currentPageThumbnail.dataUrl} alt="Page preview" className="w-full select-none" />

                  {/* Marker overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${pos.xPercent}%`,
                      top: `${pos.yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      color: colorHex,
                      fontSize: `${fontSize * 0.7}px`,
                    }}
                    className="pointer-events-none whitespace-nowrap rounded border border-dashed border-lime-500 bg-white/70 px-1.5 py-0.5 font-bold shadow-sm"
                  >
                    {text}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
