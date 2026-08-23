import React, { useState } from 'react';
import { LayoutGrid, RotateCw, Trash2, ArrowLeft, ArrowRight, Download, Loader2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { renderPdfThumbnails, organizePDF, downloadBlob } from '../../lib/pdf-service';

interface PageItem {
  originalIndex: number;
  dataUrl: string;
  rotation: number;
}

export const OrganizeTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);

    try {
      const thumbs = await renderPdfThumbnails(selected, 100);
      setPages(
        thumbs.map((t, idx) => ({
          originalIndex: idx,
          dataUrl: t.dataUrl,
          rotation: 0,
        }))
      );
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเปิดไฟล์ PDF ได้');
    } finally {
      setLoading(false);
    }
  };

  const rotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      alert('ต้องมีเอกสารเหลืออย่างน้อย 1 หน้า');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setPages(updated);
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setPages(updated);
  };

  const handleSave = async () => {
    if (!file || pages.length === 0) return;
    try {
      setIsProcessing(true);
      const organizedBlob = await organizePDF(
        file,
        pages.map((p) => ({
          originalIndex: p.originalIndex,
          rotation: p.rotation,
        }))
      );
      downloadBlob(organizedBlob, `organized_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกเอกสาร');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 text-white shadow-md">
          <LayoutGrid className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          จัดหน้า PDF (Organize & Rotate)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ลากสลับลำดับ หมุนหน้าที่วางผิดด้าน และตัดหน้าที่ไม่ต้องการทิ้ง
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อจัดหน้า"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              จำนวนหน้าคงเหลือ: {pages.length} หน้า
            </span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              เปลี่ยนไฟล์
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="mt-3 text-sm">กำลังเรนเดอร์หน้าเอกสาร...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {pages.map((p, idx) => (
                <div
                  key={`${p.originalIndex}-${idx}`}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-soft transition-all hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
                    <img
                      src={p.dataUrl}
                      alt={`Page ${idx + 1}`}
                      style={{
                        transform: `rotate(${p.rotation}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="w-full object-contain"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      หน้า {idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveLeft(idx)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 dark:hover:bg-slate-800"
                        title="เลื่อนไปซ้าย"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === pages.length - 1}
                        onClick={() => moveRight(idx)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 dark:hover:bg-slate-800"
                        title="เลื่อนไปขวา"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(idx)}
                        className="rounded-lg p-1 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/50"
                        title="หมุน 90 องศา"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePage(idx)}
                        className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="ลบหน้านี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              type="button"
              disabled={isProcessing || pages.length === 0}
              onClick={handleSave}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังจัดระเบียบเอกสาร...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  บันทึกและดาวน์โหลด PDF ใหม่
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
