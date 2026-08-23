import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { pdfToDocx, downloadBlob } from '../../lib/pdf-service';

export const PdfToWordTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setIsDone(false);
      const docxBlob = await pdfToDocx(file, (current, total) => {
        setProgress({ current, total });
      });

      downloadBlob(docxBlob, `${file.name.replace('.pdf', '')}.docx`);
      setIsDone(true);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแปลงไฟล์ PDF เป็น Word');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-md">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แปลง PDF เป็น Word (PDF → .docx)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ดึงข้อความและเนื้อหาจาก PDF แปลงเป็นเอกสาร Microsoft Word (.docx) พร้อมนำไปแก้ไขต่อ
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF ที่ต้องการแปลงเป็น Word มาวางที่นี่"
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

            <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold">ข้อมูลการแปลงไฟล์:</p>
                <p className="mt-0.5 leading-relaxed">
                  ระบบจะสกัดข้อความ ย่อหน้า และจัดหน้าจากเอกสาร PDF ส่งออกเป็นไฟล์ Word (.docx) มาตรฐาน สามารถเปิดและแก้ไขต่อได้ใน Microsoft Word หรือ Google Docs
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังแปลงหน้า {progress?.current || 0} จาก {progress?.total || '...'} หน้า...
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  แปลงเป็น Word สำเร็จ (ดาวน์โหลดแล้ว)
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  เริ่มแปลงเป็นเอกสาร Word (.docx)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
