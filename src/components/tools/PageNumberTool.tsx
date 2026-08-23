import React, { useState } from 'react';
import { Hash, Download, Loader2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { addPageNumbers, downloadBlob } from '../../lib/pdf-service';

export const PageNumberTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'arabic' | 'thai'>('thai');
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-right');
  const [prefix, setPrefix] = useState('หน้า');
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApply = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      const numberedBlob = await addPageNumbers(file, {
        format,
        position,
        prefix,
        startNumber,
        fontSize,
      });
      downloadBlob(numberedBlob, `numbered_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการใส่เลขหน้า');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-md">
          <Hash className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ใส่เลขหน้า PDF (Page Numbering)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ใส่เลขกำกับทุกหน้า เลือกได้ทั้งเลขอารบิก (1, 2, 3) และเลขไทย (๑, ๒, ๓) พร้อมคำนำหน้า
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อใส่เลขหน้า"
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  รูปแบบตัวเลข
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('thai')}
                    className={`rounded-xl border p-3 text-center text-sm font-semibold transition ${
                      format === 'thai'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    เลขไทย (๑, ๒, ๓)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('arabic')}
                    className={`rounded-xl border p-3 text-center text-sm font-semibold transition ${
                      format === 'arabic'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    เลขอารบิก (1, 2, 3)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ตำแหน่งเลขหน้า
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="bottom-right">มุมล่างขวา (มาตรฐานหนังสือราชการ)</option>
                  <option value="bottom-center">ตรงกลางด้านล่าง</option>
                  <option value="top-right">มุมบนขวา</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  คำนำหน้าเลข
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="เช่น หน้า, Page หรือเว้นว่าง"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  เริ่มนับจากหน้าที่
                </label>
                <input
                  type="number"
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApply}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังใส่เลขหน้า...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด PDF พร้อมเลขหน้า
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
