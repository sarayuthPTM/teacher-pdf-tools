import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Download,
  Loader2,
  FileText,
  CheckSquare,
  Square,
  Archive,
  Files,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
  Image as ImageIcon,
  FileType,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import {
  renderPdfThumbnails,
  splitPDF,
  splitPdfToZip,
  splitPdfRangesToZip,
  SplitFormat,
  PageRangeGroup,
  downloadBlob,
} from '../../lib/pdf-service';

interface SplitResult {
  fileName: string;
  blob: Blob;
  downloadUrl: string;
  fileCount: number;
  size: number;
  type: 'zip' | 'pdf';
  formatLabel: string;
}

function parseRangeGroups(rangeStr: string, maxPages: number): PageRangeGroup[] {
  if (!rangeStr.trim()) return [];
  const parts = rangeStr.split(',');
  const groups: PageRangeGroup[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        const pageIndices: number[] = [];
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
          pageIndices.push(i - 1);
        }
        if (pageIndices.length > 0) {
          groups.push({
            name: `ช่วง_หน้า_${start}-${end}`,
            pageIndices,
          });
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        groups.push({
          name: `หน้า_${pageNum}`,
          pageIndices: [pageNum - 1],
        });
      }
    }
  }

  return groups;
}

export const SplitTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<
    { pageNumber: number; dataUrl: string; selected: boolean }[]
  >([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [rangeInput, setRangeInput] = useState('');
  const [splitMode, setSplitMode] = useState<'zip-all' | 'single-pdf' | 'zip-ranges'>('zip-all');
  const [outputFormat, setOutputFormat] = useState<SplitFormat>('pdf');
  const [isDone, setIsDone] = useState(false);
  const [result, setResult] = useState<SplitResult | null>(null);

  // Clean up blob URLs when changing file or unmounting
  useEffect(() => {
    return () => {
      if (result?.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl);
      }
    };
  }, [result]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setLoadingThumbnails(true);
    setIsDone(false);
    setResult(null);
    setProgress(null);

    try {
      const thumbs = await renderPdfThumbnails(selectedFile, 150);
      setThumbnails(thumbs.map((t) => ({ ...t, selected: true })));
      setRangeInput(`1-${thumbs.length}`);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลดเอกสาร PDF ได้ กรุณาตรวจสอบไฟล์');
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

  const selectOddPages = () => {
    setThumbnails((prev) =>
      prev.map((p) => ({ ...p, selected: p.pageNumber % 2 !== 0 }))
    );
  };

  const selectEvenPages = () => {
    setThumbnails((prev) =>
      prev.map((p) => ({ ...p, selected: p.pageNumber % 2 === 0 }))
    );
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
      setIsDone(false);
      setResult(null);
      setProgress({ current: 0, total: selectedIndices.length });

      const baseName = file.name.replace(/\.pdf$/i, '');
      const formatTag = outputFormat === 'pdf' ? '' : `_${outputFormat.toUpperCase()}`;

      if (splitMode === 'zip-all') {
        // Mode 1: Split every page into individual PDF or JPG/PNG files inside a ZIP
        const zipBlob = await splitPdfToZip(file, selectedIndices, outputFormat, (current, total) => {
          setProgress({ current, total });
        });

        const fileName = `${baseName}_แยกหน้า${formatTag}.zip`;
        const downloadUrl = URL.createObjectURL(zipBlob);
        setResult({
          fileName,
          blob: zipBlob,
          downloadUrl,
          fileCount: selectedIndices.length,
          size: zipBlob.size,
          type: 'zip',
          formatLabel: outputFormat.toUpperCase(),
        });
        setIsDone(true);
        downloadBlob(zipBlob, fileName);
      } else if (splitMode === 'zip-ranges') {
        // Mode 2: Split according to defined range groups inside a ZIP
        const groups = parseRangeGroups(rangeInput, thumbnails.length);
        if (groups.length === 0) {
          alert('กรุณาระบุช่วงหน้าให้ถูกต้อง เช่น 1-2, 3-5');
          setIsProcessing(false);
          return;
        }

        setProgress({ current: 0, total: groups.length });
        const zipBlob = await splitPdfRangesToZip(file, groups, outputFormat, (current, total) => {
          setProgress({ current, total });
        });

        const fileName = `${baseName}_แยกตามช่วง${formatTag}.zip`;
        const downloadUrl = URL.createObjectURL(zipBlob);
        setResult({
          fileName,
          blob: zipBlob,
          downloadUrl,
          fileCount: groups.length,
          size: zipBlob.size,
          type: 'zip',
          formatLabel: outputFormat.toUpperCase(),
        });
        setIsDone(true);
        downloadBlob(zipBlob, fileName);
      } else {
        // Mode 3: Merge selected pages into a single new PDF (only for PDF format)
        const splitBlob = await splitPDF(file, selectedIndices);
        const fileName = `${baseName}_หน้าที่เลือก_${selectedIndices.length}หน้า.pdf`;
        const downloadUrl = URL.createObjectURL(splitBlob);
        setResult({
          fileName,
          blob: splitBlob,
          downloadUrl,
          fileCount: 1,
          size: splitBlob.size,
          type: 'pdf',
          formatLabel: 'PDF',
        });
        setIsDone(true);
        downloadBlob(splitBlob, fileName);
      }
    } catch (err) {
      console.error('Error splitting PDF:', err);
      alert('เกิดข้อผิดพลาดในการแยกไฟล์ PDF โปรดลองอีกครั้ง');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const selectedCount = thumbnails.filter((p) => p.selected).length;
  const rangeGroupsCount = parseRangeGroups(rangeInput, thumbnails.length).length;

  return (
    <div className="mx-auto max-w-5xl font-sans">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white shadow-md">
          <Scissors className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แยกไฟล์ PDF (Split PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          แยกทุกหน้าออกเป็นไฟล์ PDF หรือรูปภาพ JPG / PNG เดี่ยวๆ ดาวน์โหลดเป็นไฟล์ .ZIP ได้ทันที
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
          {/* File summary and header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                  {file.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    ขนาด: {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
                    <Layers className="h-3 w-3" />
                    {thumbnails.length} หน้าทั้งหมด
                  </span>
                  <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    เลือกอยู่ {selectedCount} หน้า
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setThumbnails([]);
                setIsDone(false);
                setResult(null);
              }}
              className="text-xs font-semibold text-rose-500 transition hover:text-rose-600 hover:underline"
            >
              เปลี่ยนไฟล์
            </button>
          </div>

          {/* Output Format Selector: PDF vs JPG vs PNG */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              1. เลือกรูปแบบไฟล์ที่ต้องการหลังจากแยกหน้า (Output Format)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Option PDF */}
              <button
                type="button"
                onClick={() => {
                  setOutputFormat('pdf');
                }}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  outputFormat === 'pdf'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                  <FileType className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    📄 ไฟล์ PDF เหมือนเดิม
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    แยกเป็นเอกสาร PDF (.pdf) คมชัด คงรูปแบบเดิม
                  </p>
                </div>
              </button>

              {/* Option JPG */}
              <button
                type="button"
                onClick={() => {
                  setOutputFormat('jpeg');
                  if (splitMode === 'single-pdf') setSplitMode('zip-all');
                }}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  outputFormat === 'jpeg'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      🖼️ รูปภาพ JPG
                    </p>
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      ยอดนิยม
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    แปลงแต่ละหน้าเป็นรูปภาพ JPG ความคมชัดสูง HD
                  </p>
                </div>
              </button>

              {/* Option PNG */}
              <button
                type="button"
                onClick={() => {
                  setOutputFormat('png');
                  if (splitMode === 'single-pdf') setSplitMode('zip-all');
                }}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  outputFormat === 'png'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    🎨 รูปภาพ PNG
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    แปลงแต่ละหน้าเป็นรูปภาพ PNG คมกริบ ไร้การบีบอัด
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Split Mode Selector Cards */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              2. เลือกรูปแบบการจัดกลุ่ม (Split Mode)
            </label>
            <div className={`grid grid-cols-1 gap-3 ${outputFormat === 'pdf' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {/* Option 1: ZIP all individual pages (Recommended by user) */}
              <button
                type="button"
                onClick={() => setSplitMode('zip-all')}
                className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                  splitMode === 'zip-all'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Archive className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        แยก 1 หน้า ต่อ 1 ไฟล์ ({outputFormat.toUpperCase()}) ใน ZIP
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                      แนะนำ
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    แยกทุกหน้าที่เลือกเป็นไฟล์ {outputFormat.toUpperCase()} เดี่ยวๆ 1 หน้า ต่อ 1 ไฟล์ (เช่น หน้า_1.{outputFormat === 'jpeg' ? 'jpg' : outputFormat}) บรรจุในไฟล์ .ZIP
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-teal-200/50 dark:border-teal-900/40 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  📦 จะได้ไฟล์ ZIP บรรจุ {selectedCount} ไฟล์ {outputFormat.toUpperCase()}
                </div>
              </button>

              {/* Option 2: Split by Ranges into ZIP */}
              <button
                type="button"
                onClick={() => setSplitMode('zip-ranges')}
                className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                  splitMode === 'zip-ranges'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      แยกตามช่วงหน้า ({outputFormat.toUpperCase()}) ใน ZIP
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    แยกเป็นกลุ่มช่วงหน้าตามที่พิมพ์ระบุในช่องด้านล่าง (เช่น ช่วง 1-2 และ 3-5) บรรจุในไฟล์ .ZIP
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-teal-200/50 dark:border-teal-900/40 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  ✂️ จะได้ไฟล์ ZIP บรรจุ {rangeGroupsCount || 1} ช่วง {outputFormat.toUpperCase()}
                </div>
              </button>

              {/* Option 3: Merge selected to single PDF (only when format is PDF) */}
              {outputFormat === 'pdf' && (
                <button
                  type="button"
                  onClick={() => setSplitMode('single-pdf')}
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                    splitMode === 'single-pdf'
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/40'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Files className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        รวมหน้าที่เลือกเป็น 1 ไฟล์ PDF
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      ดึงเฉพาะหน้าที่เลือกมารวมเป็นเอกสาร PDF ใหม่เพียงไฟล์เดียว (เช่น ดึงเฉพาะหน้า 1, 3, 5)
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-teal-200/50 dark:border-teal-900/40 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                    📄 รวมหน้าที่เลือก {selectedCount} หน้า เป็น 1 PDF
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                เลือกช่วงหน้า:
              </span>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="เช่น 1-3, 5 หรือ 1-5"
                className="w-44 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleApplyRange}
                className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                เลือกตามช่วง
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                ยกเลิกทั้งหมด
              </button>
              <button
                type="button"
                onClick={selectOddPages}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                หน้าคี่
              </button>
              <button
                type="button"
                onClick={selectEvenPages}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                หน้าคู่
              </button>
            </div>
          </div>

          {/* Thumbnails grid */}
          {loadingThumbnails ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="mt-3 text-sm font-semibold">กำลังสร้างรูปตัวอย่างหน้าเอกสาร...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {thumbnails.map((t, idx) => (
                <div
                  key={t.pageNumber}
                  onClick={() => togglePage(idx)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 p-2 transition-all hover:scale-102 ${
                    t.selected
                      ? 'border-teal-500 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/30'
                      : 'border-slate-200 bg-white opacity-60 hover:opacity-100 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="absolute right-3 top-3 z-10 rounded-md bg-white/90 p-0.5 shadow-xs backdrop-blur-xs dark:bg-slate-900/90">
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
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      หน้า {t.pageNumber}
                    </span>
                    {t.selected && (
                      <span className="rounded-full bg-teal-100 px-1.5 py-0.2 text-[10px] font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                        เลือก
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {isProcessing && progress && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-5 shadow-soft dark:border-teal-900/50 dark:bg-teal-950/30">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-teal-800 dark:text-teal-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  กำลังแยกหน้าเป็น {outputFormat.toUpperCase()} และบรรจุลงในไฟล์ ZIP...
                </span>
                <span>
                  {progress.current} / {progress.total} (
                  {Math.round((progress.current / progress.total) * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-teal-200/60 dark:bg-teal-900/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-200"
                  style={{
                    width: `${Math.round((progress.current / progress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Result Card */}
          {isDone && result && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-soft dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                    🎉 แยกหน้าเป็น {result.formatLabel} สำเร็จเรียบร้อย!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    ระบบได้ดาวน์โหลดไฟล์ให้คุณอัตโนมัติแล้ว หรือสามารถคลิกปุ่มดาวน์โหลดด้านล่างได้ทันที
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 text-center shadow-xs dark:bg-slate-900">
                <div>
                  <p className="text-xs font-medium text-slate-400">ชื่อไฟล์</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300" title={result.fileName}>
                    {result.fileName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    จำนวนไฟล์ที่ได้
                  </p>
                  <p className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {result.fileCount} ไฟล์ ({result.formatLabel})
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">ขนาดรวม</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {(result.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={result.downloadUrl}
                  download={result.fileName}
                  onClick={() => downloadBlob(result.blob, result.fileName)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lift transition hover:opacity-95"
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดไฟล์ {result.type === 'zip' ? '.ZIP' : '.PDF'} อีกครั้ง
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsDone(false);
                    setResult(null);
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  แยกไฟล์อื่นเพิ่มเติม
                </button>
              </div>
            </div>
          )}

          {/* Action button */}
          {!isDone && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={isProcessing || selectedCount === 0}
                onClick={handleSplit}
                className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังแยกไฟล์ PDF เป็น {outputFormat.toUpperCase()}...
                  </>
                ) : splitMode === 'zip-all' ? (
                  <>
                    <Archive className="h-5 w-5" />
                    แยกเป็น {outputFormat.toUpperCase()} ดาวน์โหลดเป็นไฟล์ .ZIP ({selectedCount} ไฟล์)
                  </>
                ) : splitMode === 'zip-ranges' ? (
                  <>
                    <Scissors className="h-5 w-5" />
                    แยกตามช่วงเป็น {outputFormat.toUpperCase()} ดาวน์โหลดเป็นไฟล์ .ZIP ({rangeGroupsCount || 1} ช่วง)
                  </>
                ) : (
                  <>
                    <Files className="h-5 w-5" />
                    รวมและดาวน์โหลดเป็น 1 ไฟล์ PDF ({selectedCount} หน้า)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
