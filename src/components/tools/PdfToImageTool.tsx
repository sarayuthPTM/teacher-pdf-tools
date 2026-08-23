import React, { useState } from 'react';
import { Images, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { pdfToImages, downloadBlob } from '../../lib/pdf-service';

export const PdfToImageTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [scale, setScale] = useState<number>(2.0); // 2x high resolution
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setIsDone(false);
      const zipBlob = await pdfToImages(file, format, scale, (current, total) => {
        setProgress({ current, total });
      });

      downloadBlob(zipBlob, `${file.name.replace('.pdf', '')}_images.zip`);
      setIsDone(true);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแปลง PDF เป็นรูปภาพ');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-md">
          <Images className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แปลง PDF เป็นรูปภาพ (PDF → JPG / PNG)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          เปลี่ยนทุกหน้าของเอกสาร PDF เป็นรูปภาพความคมชัดสูง บรรจุในไฟล์ .ZIP ดาวน์โหลดง่าย
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อแปลงเป็นรูปภาพ"
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สกุลไฟล์รูปภาพที่ต้องการ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('jpeg')}
                    className={`rounded-xl border p-3 text-center text-sm font-semibold transition ${
                      format === 'jpeg'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    .JPG (ขนาดกะทัดรัด)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('png')}
                    className={`rounded-xl border p-3 text-center text-sm font-semibold transition ${
                      format === 'png'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    .PNG (คมชัดสูงสุด)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ความละเอียดรูปภาพ (DPI)
                </label>
                <select
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={1.5}>มาตรฐาน (Normal - 150 DPI)</option>
                  <option value={2.0}>คมชัดสูง (High Quality - 200 DPI)</option>
                  <option value={3.0}>ความละเอียดสูงสุด (Ultra HD - 300 DPI)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังแปลงหน้า {progress?.current || 0} จาก {progress?.total || '...'} หน้า...
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  แปลงสำเร็จ (ดาวน์โหลดไฟล์ .ZIP แล้ว)
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  เริ่มแปลง PDF เป็นรูปภาพ ({format.toUpperCase()})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
