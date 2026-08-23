import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, AlertCircle, Sparkles, Zap, Key } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { pdfToDocx, downloadBlob } from '../../lib/pdf-service';
import { pdfToDocxWithAi } from '../../lib/ai-service';
import { loadSettings } from '../../lib/settings-service';

export const PdfToWordTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [convertMode, setConvertMode] = useState<'smart' | 'ai'>('smart');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const settings = loadSettings();
  const hasAiKey = !!(settings.geminiApiKey && settings.geminiApiKey.trim());

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setIsDone(false);

      let docxBlob: Blob;

      if (convertMode === 'ai') {
        if (!hasAiKey) {
          alert('กรุณาระบุ Gemini API Key ในเมนู "ตั้งค่าผู้ดูแล (Admin)" เพื่อเปิดใช้การแปลงด้วย AI');
          setIsProcessing(false);
          return;
        }
        docxBlob = await pdfToDocxWithAi(
          file,
          settings.geminiApiKey,
          settings.geminiModel || 'gemini-1.5-flash',
          (current, total) => setProgress({ current, total })
        );
      } else {
        docxBlob = await pdfToDocx(file, (current, total) => {
          setProgress({ current, total });
        });
      }

      downloadBlob(docxBlob, `${file.name.replace('.pdf', '')}.docx`);
      setIsDone(true);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแปลงไฟล์ PDF เป็น Word: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
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
          ดึงข้อความและเนื้อหาจาก PDF แปลงเป็นเอกสาร Microsoft Word (.docx) พร้อมภาษาไทยสมบูรณ์ 100%
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

            {/* Mode Selection */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                เลือกรูปแบบการแปลง:
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setConvertMode('smart')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    convertMode === 'smart'
                      ? 'border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div className={`rounded-xl p-2 ${convertMode === 'smart' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      ⚡ แปลงด่วนมาตรฐาน (Smart Engine)
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      ทำงานบนเครื่องทันที แก้สระลอยและซ้อนทับภาษาไทยจาก Canva อัตโนมัติ
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConvertMode('ai')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    convertMode === 'ai'
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div className={`rounded-xl p-2 ${convertMode === 'ai' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                      <span>✨ แปลงด้วย AI OCR อัจฉริยะ</span>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                        แม่นยำ 100%
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      ใช้ Gemini Vision อ่านภาพเอกสาร สระ วรรณยุกต์ ตาราง ครบเป๊ะทุกตัวอักษร
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {convertMode === 'ai' && !hasAiKey && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <Key className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">ต้องการ API Key:</span> เข้าสู่ระบบผู้ดูแล (Admin) ด้านขวาบน แล้วใส่ Google Gemini API Key เพื่อเริ่มใช้งานโหมด AI OCR
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold">ข้อมูลการแปลงไฟล์:</p>
                <p className="mt-0.5 leading-relaxed">
                  ระบบรองรับการแปลงไฟล์ PDF ทุกประเภท รวมถึงไฟล์ที่ส่งออกจาก Canva, Adobe InDesign และ Microsoft Word โดยจะจัดโครงสร้างหัวข้อ ย่อหน้า และตัวอักษรภาษาไทยให้อ่านง่าย
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
                  {convertMode === 'ai' ? 'เริ่มแปลงด้วย AI OCR (.docx)' : 'เริ่มแปลงเป็นเอกสาร Word (.docx)'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

