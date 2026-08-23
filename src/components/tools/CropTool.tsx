import React, { useState } from 'react';
import { Crop, Download, Loader2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../lib/pdf-service';

export const CropTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [margin, setMargin] = useState<number>(20);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCrop = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);
      });

      const pdfBytes = await pdfDoc.save();
      const croppedBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(croppedBlob, `cropped_${file.name}`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการตัดขอบ PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-600 text-white shadow-md">
          <Crop className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ครอบตัดขอบ PDF (Crop PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ตัดขอบกระดาษที่ไม่ต้องการออกทุกหน้าพร้อมกัน เช่น ขอบขาวเกินไป หรือรอยสแกน
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อครอบตัดขอบ"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                ไฟล์ที่เลือก: {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-rose-500 hover:underline"
              >
                เปลี่ยนไฟล์
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ระยะขอบที่ต้องการตัดออกรอบด้าน: {margin} pt
                </label>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="5"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-cyan-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCrop}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังครอบตัดขอบ PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด PDF ที่ตัดขอบแล้ว
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
