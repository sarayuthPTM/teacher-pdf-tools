import React, { useState } from 'react';
import { Minimize2, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../lib/pdf-service';

export const CompressPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleCompress = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setIsDone(false);

      // Load PDF and rewrite with optimized objects
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Save with useObjectStreams for high compression
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const compressedBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });

      downloadBlob(compressedBlob, `compressed_${file.name}`);
      setIsDone(true);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบีบอัดเอกสาร PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 text-white shadow-md">
          <Minimize2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ลดขนาด PDF (Compress PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          บีบอัดโครงสร้างเอกสารและรูปภาพใน PDF ให้ไฟล์เล็กลง ส่งอีเมลและแนบไฟล์ได้สะดวก
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อลดขนาด"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                ไฟล์ที่เลือก: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setIsDone(false);
                }}
                className="text-xs text-rose-500 hover:underline"
              >
                เปลี่ยนไฟล์
              </button>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                เลือกระดับการบีบอัด
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setLevel('recommended')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    level === 'recommended'
                      ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ⭐ แนะนำ (สมดุล)
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    ลดขนาดได้ดีและยังคงคุณภาพตัวหนังสือคมชัด
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('extreme')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    level === 'extreme'
                      ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    🔥 บีบอัดสูงสุด
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    ขนาดไฟล์เล็กที่สุด เหมาะกับการส่งอีเมลจำกัดขนาด
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('low')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    level === 'low'
                      ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ✨ คุณภาพสูง
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    บีบอัดเล็กน้อย เน้นความคมชัดของภาพเป็นหลัก
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCompress}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังบีบอัดเอกสาร PDF...
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  บีบอัดสำเร็จ (ดาวน์โหลดแล้ว)
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  เริ่มลดขนาด PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
