import React, { useState } from 'react';
import { Scissors, Download, Loader2, FileText, CheckSquare, Square } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { renderPdfThumbnails, splitPDF, downloadBlob } from '../../lib/pdf-service';

export const SplitTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<
    { pageNumber: number; dataUrl: string; selected: boolean }[]
  >([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rangeInput, setRangeInput] = useState('');

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setLoadingThumbnails(true);

    try {
      const thumbs = await renderPdfThumbnails(selectedFile, 100);
      setThumbnails(thumbs.map((t) => ({ ...t, selected: true })));
      setRangeInput(`1-${thumbs.length}`);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลดเอกสาร PDF ได้');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const togglePage = (index: number) => {
    setThumbnails((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = () => {
    setThumbnails((prev) => prev.map((p) => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setThumbnails((prev) => prev.map((p) => ({ ...p, selected: false })));
  };

  const handleApplyRange = () => {
    if (!rangeInput.trim()) return;
    const selectedIndices = new Set<number>();
    const parts = rangeInput.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= thumbnails.length) selectedIndices.add(i - 1);
          }
        }
      } else {
        const num = Number(trimmed);
        if (!isNaN(num) && num >= 1 && num <= thumbnails.length) {
          selectedIndices.add(num - 1);
        }
      }
    }

    setThumbnails((prev) =>
      prev.map((p, i) => ({ ...p, selected: selectedIndices.has(i) }))
    );
  };

  const handleSplit = async () => {
    if (!file) return;
    const selectedIndices = thumbnails
      .map((p, index) => (p.selected ? index : -1))
      .filter((idx) => idx !== -1);

    if (selectedIndices.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 หน้าเพื่อแยกไฟล์');
      return;
    }

    try {
      setIsProcessing(true);
      const splitBlob = await splitPDF(file, selectedIndices);
      downloadBlob(splitBlob, `extracted_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแยกไฟล์');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white shadow-md">
          <Scissors className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แยกไฟล์ PDF (Split PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ดึงเฉพาะหน้าที่ต้องการออกมาเป็นไฟล์ใหม่ เลือกคลิกทีละหน้าหรือพิมพ์ช่วงหน้าได้
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากไฟล์ PDF ที่ต้องการแยกมาวางที่นี่"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="เช่น 1-3, 5, 8-10"
                className="w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={handleApplyRange}
                className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                เลือกตามช่วง
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                ยกเลิกทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
              >
                เปลี่ยนไฟล์
              </button>
            </div>
          </div>

          {/* Thumbnails grid */}
          {loadingThumbnails ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="mt-3 text-sm">กำลังเรนเดอร์หน้าเอกสารตัวอย่าง...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {thumbnails.map((t, idx) => (
                <div
                  key={t.pageNumber}
                  onClick={() => togglePage(idx)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 p-2 transition-all hover:scale-102 ${
                    t.selected
                      ? 'border-teal-500 bg-teal-50/50 shadow-md dark:border-teal-400 dark:bg-teal-950/30'
                      : 'border-slate-200 bg-white opacity-60 hover:opacity-100 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="absolute right-3 top-3 z-10">
                    {t.selected ? (
                      <CheckSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <img
                    src={t.dataUrl}
                    alt={`Page ${t.pageNumber}`}
                    className="w-full rounded-lg shadow-sm"
                  />
                  <p className="mt-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    หน้า {t.pageNumber}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              disabled={isProcessing || thumbnails.filter((p) => p.selected).length === 0}
              onClick={handleSplit}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังแยกหน้า...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลดหน้าที่เลือก ({thumbnails.filter((p) => p.selected).length} หน้า)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
