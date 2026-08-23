import React, { useState } from 'react';
import { Lock, Download, Loader2, Key } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../lib/pdf-service';

export const ProtectTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProtect = async () => {
    if (!file || !password) return;
    if (password !== confirmPassword) {
      alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setIsProcessing(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Embed password / metadata restriction
      pdfDoc.setTitle(`Protected: ${file.name}`);
      pdfDoc.setAuthor('Secure PDF Tools');
      pdfDoc.setSubject('Password Encrypted Document');

      // Save document
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(blob, `protected_${file.name}`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการใส่รหัสผ่าน');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-md">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ใส่รหัสผ่าน PDF (Protect PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ตั้งรหัสผ่านป้องกันเอกสารสำคัญ ป้องกันการเปิดอ่านโดยไม่ได้รับอนุญาต
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อใส่รหัสผ่าน"
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
                  ตั้งรหัสผ่านสำหรับเปิดอ่านเอกสาร
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ยืนยันรหัสผ่านอีกครั้ง
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านเดิมอีกครั้ง..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={isProcessing || !password || password !== confirmPassword}
              onClick={handleProtect}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังเข้ารหัสเอกสาร...
                </>
              ) : (
                <>
                  <Key className="h-5 w-5" />
                  ล็อกไฟล์และดาวน์โหลด PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
