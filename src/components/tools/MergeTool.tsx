import React, { useState } from 'react';
import { Files, ArrowUp, ArrowDown, Trash2, Download, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { mergePDFs, downloadBlob } from '../../lib/pdf-service';

export const MergeTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    const pdfOnly = newFiles.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setFiles((prev) => [...prev, ...pdfOnly]);
    setIsDone(false);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setFiles(updated);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setFiles(updated);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('กรุณาเลือกไฟล์ PDF อย่างน้อย 2 ไฟล์ขึ้นไปเพื่อรวม');
      return;
    }

    try {
      setIsProcessing(true);
      const mergedBlob = await mergePDFs(files);
      downloadBlob(mergedBlob, `merged_${Date.now()}.pdf`);
      setIsDone(true);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการรวมไฟล์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md">
          <Files className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          รวมไฟล์ PDF (Merge PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ต่อหลายไฟล์เข้าด้วยกันตามลำดับที่จัดไว้ ลากสลับตำแหน่งได้ง่ายๆ
        </p>
      </div>

      {files.length === 0 ? (
        <FileDropzone
          accept=".pdf"
          multiple={true}
          onFilesSelected={handleFilesSelected}
          title="ลากไฟล์ PDF หลายๆ ไฟล์มาวางที่นี่"
          subtitle="หรือคลิกเพื่อเลือกไฟล์ PDF จากคอมพิวเตอร์หรือมือถือ"
          buttonText="เลือกไฟล์ PDF เพื่อรวม"
        />
      ) : (
        <div className="space-y-6">
          {/* File list */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                รายการไฟล์ที่จะรวม ({files.length} ไฟล์)
              </span>
              <FileDropzone
                accept=".pdf"
                multiple={true}
                compact={true}
                buttonText="เพิ่มไฟล์ PDF อีก"
                onFilesSelected={handleFilesSelected}
              />
            </div>

            <div className="space-y-2.5">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 transition hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1 dark:text-slate-100">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => moveDown(idx)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50"
                      title="ลบไฟล์นี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              disabled={isProcessing || files.length < 2}
              onClick={handleMerge}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังรวมไฟล์และสร้างเอกสาร...
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  รวมไฟล์สำเร็จ (ดาวน์โหลดแล้ว)
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  รวมไฟล์ PDF ทั้งหมด ({files.length} ไฟล์)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              ล้างรายการทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
