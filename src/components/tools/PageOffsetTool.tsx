import React, { useState, useEffect, useRef } from 'react';
import {
  MoveHorizontal,
  Download,
  Loader2,
  Sliders,
  Maximize2,
  Minimize2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Info,
  Layers,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileDropzone } from '../ui/FileDropzone';
import { adjustPdfMargins, downloadBlob, MarginAdjustmentOptions } from '../../lib/pdf-service';

export const PageOffsetTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [originalPageSize, setOriginalPageSize] = useState<{ width: number; height: number }>({
    width: 595,
    height: 842,
  });

  // Settings
  const [unit, setUnit] = useState<'mm' | 'cm' | 'pt'>('mm');
  const [leftValue, setLeftValue] = useState<number>(15); // Default +15mm for binding
  const [rightValue, setRightValue] = useState<number>(0);
  const [topValue, setTopValue] = useState<number>(0);
  const [bottomValue, setBottomValue] = useState<number>(0);
  const [enableVertical, setEnableVertical] = useState<boolean>(false);
  const [scalePercent, setScalePercent] = useState<number>(100);

  const [mode, setMode] = useState<'shift' | 'fit-margin' | 'expand'>('fit-margin');
  const [isMirrorPages, setIsMirrorPages] = useState<boolean>(false);
  const [pageScope, setPageScope] = useState<'all' | 'odd' | 'even'>('all');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Conversion: 1mm = 2.83465 pt, 1cm = 28.3465 pt
  const toPt = (val: number): number => {
    if (unit === 'mm') return val * 2.834645669;
    if (unit === 'cm') return val * 28.34645669;
    return val;
  };

  const fromPt = (pt: number): number => {
    if (unit === 'mm') return Math.round((pt / 2.834645669) * 10) / 10;
    if (unit === 'cm') return Math.round((pt / 28.34645669) * 100) / 100;
    return Math.round(pt * 10) / 10;
  };

  // Unit step & max
  const getStep = () => (unit === 'cm' ? 0.1 : 1);
  const getMax = () => (unit === 'cm' ? 10 : unit === 'mm' ? 100 : 250);
  const getMin = () => (unit === 'cm' ? -5 : unit === 'mm' ? -50 : -150);

  // Render PDF Preview on file change or page switch
  useEffect(() => {
    if (!file) {
      setPreviewDataUrl(null);
      setNumPages(0);
      return;
    }

    let isMounted = true;
    const loadPdf = async () => {
      try {
        setIsLoadingPreview(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (!isMounted) return;
        setNumPages(pdfDoc.numPages);

        const page = await pdfDoc.getPage(previewPage);
        const viewport = page.getViewport({ scale: 1.5 });

        setOriginalPageSize({
          width: page.view[2] - page.view[0],
          height: page.view[3] - page.view[1],
        });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (isMounted) {
            setPreviewDataUrl(canvas.toDataURL('image/png'));
          }
        }
      } catch (err) {
        console.error('Failed to render PDF preview:', err);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [file, previewPage]);

  // Quick Preset Handlers
  const applyPreset = (preset: 'binding-15' | 'binding-20' | 'binding-25' | 'center-reset') => {
    if (preset === 'binding-15') {
      setUnit('mm');
      setLeftValue(15);
      setRightValue(0);
      setMode('fit-margin');
    } else if (preset === 'binding-20') {
      setUnit('mm');
      setLeftValue(20);
      setRightValue(0);
      setMode('fit-margin');
    } else if (preset === 'binding-25') {
      setUnit('mm');
      setLeftValue(25);
      setRightValue(0);
      setMode('fit-margin');
    } else if (preset === 'center-reset') {
      setLeftValue(0);
      setRightValue(0);
      setTopValue(0);
      setBottomValue(0);
      setScalePercent(100);
    }
  };

  // Process & Download
  const handleProcess = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setProgress({ current: 0, total: numPages });

      const options: MarginAdjustmentOptions = {
        marginLeftPt: toPt(leftValue),
        marginRightPt: toPt(rightValue),
        marginTopPt: enableVertical ? toPt(topValue) : 0,
        marginBottomPt: enableVertical ? toPt(bottomValue) : 0,
        scalePercent,
        mode,
        isMirrorPages,
        pageScope,
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      };

      const resultBlob = await adjustPdfMargins(file, options);
      const outputName = `margin_adjusted_${file.name.replace(/\.pdf$/i, '')}.pdf`;
      downloadBlob(resultBlob, outputName);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการปรับระยะหน้า PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Calculate live preview visual shift
  const isCurrentEven = previewPage % 2 === 0;
  const currentLeftPt = isMirrorPages && isCurrentEven ? toPt(rightValue) : toPt(leftValue);
  const currentRightPt = isMirrorPages && isCurrentEven ? toPt(leftValue) : toPt(rightValue);
  const currentTopPt = enableVertical ? toPt(topValue) : 0;
  const currentBottomPt = enableVertical ? toPt(bottomValue) : 0;

  // Percentage of page width for preview visual markers
  const pageWidthPt = originalPageSize.width || 595;
  const pageHeightPt = originalPageSize.height || 842;
  const leftPercent = Math.max(0, Math.min(40, (currentLeftPt / pageWidthPt) * 100));
  const rightPercent = Math.max(0, Math.min(40, (currentRightPt / pageWidthPt) * 100));

  // Visual CSS transform for the page preview
  const userScaleMult = Math.max(0.2, scalePercent / 100);
  let previewTransform = '';
  if (mode === 'shift') {
    const shiftXPercent = ((currentLeftPt - currentRightPt) / pageWidthPt) * 100;
    const shiftYPercent = ((currentBottomPt - currentTopPt) / pageHeightPt) * 100;
    previewTransform = `translate(${shiftXPercent}%, ${-shiftYPercent}%) scale(${userScaleMult})`;
  } else if (mode === 'fit-margin') {
    const availW = Math.max(20, pageWidthPt - (currentLeftPt + currentRightPt));
    const availH = Math.max(20, pageHeightPt - (currentTopPt + currentBottomPt));
    const scale = Math.min(availW / pageWidthPt, availH / pageHeightPt) * userScaleMult;
    const offsetX = ((currentLeftPt - currentRightPt) / 2 / pageWidthPt) * 100;
    const offsetY = ((currentBottomPt - currentTopPt) / 2 / pageHeightPt) * 100;
    previewTransform = `translate(${offsetX}%, ${-offsetY}%) scale(${Math.max(0.2, scale)})`;
  } else if (mode === 'expand') {
    previewTransform = `scale(${userScaleMult})`;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-600 text-white shadow-md">
          <MoveHorizontal className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ขยับระยะหน้า / ปรับขอบ PDF (Shift & Margin PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ปรับลด-เพิ่มระยะตัวเลขด้านซ้าย (Left) และด้านขวา (Right) ขยับเนื้อหาสำหรับเข้าเล่ม เจาะรู หรือจัดหน้ากระดาษ
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => {
            if (files[0]) {
              setFile(files[0]);
              setPreviewPage(1);
            }
          }}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อเริ่มปรับระยะขอบ"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          {/* File summary banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <MoveHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-slate-200">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  จำนวน {numPages} หน้า • ขนาด {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreviewDataUrl(null);
              }}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline"
            >
              เปลี่ยนไฟล์
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Controls (7 cols) */}
            <div className="space-y-5 lg:col-span-7">
              {/* Presets Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    ⚡ ทางลัดสำหรับงานเอกสารทั่วไป
                  </span>
                  {/* Unit selector */}
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {(['mm', 'cm', 'pt'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          unit === u
                            ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => applyPreset('binding-15')}
                    className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-500"
                  >
                    <span className="text-base">📁</span>
                    <span className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      สันห่วง +15 mm
                    </span>
                    <span className="text-[10px] text-slate-400">เว้นขอบซ้าย</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('binding-20')}
                    className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-500"
                  >
                    <span className="text-base">🗂️</span>
                    <span className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      เจาะรู +20 mm
                    </span>
                    <span className="text-[10px] text-slate-400">แฟ้ม 2-3 รู</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('binding-25')}
                    className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-500"
                  >
                    <span className="text-base">📚</span>
                    <span className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      สันกาว +25 mm
                    </span>
                    <span className="text-[10px] text-slate-400">เย็บเล่มหนา</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('center-reset')}
                    className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition hover:border-rose-300 hover:bg-rose-50/40 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-rose-500"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-500 mt-1" />
                    <span className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      รีเซ็ตเป็น 0
                    </span>
                    <span className="text-[10px] text-slate-400">ระยะเดิม</span>
                  </button>
                </div>
              </div>

              {/* Main Margin/Offset Sliders */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
                  ⚙️ กำหนดระยะตัวเลขด้านซ้ายและด้านขวา
                </h3>

                <div className="space-y-5">
                  {/* Left Margin / Offset */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        ⬅️ ด้านซ้าย (Left Margin)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLeftValue((v) => Math.max(getMin(), v - getStep()))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={getStep()}
                          value={leftValue}
                          onChange={(e) => setLeftValue(Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
                        />
                        <span className="text-xs font-bold text-slate-500">{unit}</span>
                        <button
                          type="button"
                          onClick={() => setLeftValue((v) => Math.min(getMax(), v + getStep()))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={getMin()}
                      max={getMax()}
                      step={getStep()}
                      value={leftValue}
                      onChange={(e) => setLeftValue(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>ลดระยะ ({getMin()} {unit})</span>
                      <span>0</span>
                      <span>เพิ่มระยะ (+{getMax()} {unit})</span>
                    </div>
                  </div>

                  {/* Right Margin / Offset */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 dark:border-sky-950/60 dark:bg-sky-950/20">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold text-sky-950 dark:text-sky-200">
                        ➡️ ด้านขวา (Right Margin)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRightValue((v) => Math.max(getMin(), v - getStep()))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={getStep()}
                          value={rightValue}
                          onChange={(e) => setRightValue(Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300"
                        />
                        <span className="text-xs font-bold text-slate-500">{unit}</span>
                        <button
                          type="button"
                          onClick={() => setRightValue((v) => Math.min(getMax(), v + getStep()))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={getMin()}
                      max={getMax()}
                      step={getStep()}
                      value={rightValue}
                      onChange={(e) => setRightValue(Number(e.target.value))}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>ลดระยะ ({getMin()} {unit})</span>
                      <span>0</span>
                      <span>เพิ่มระยะ (+{getMax()} {unit})</span>
                    </div>
                  </div>

                  {/* Content Zoom / Scaling Slider Card */}
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 dark:border-purple-950/60 dark:bg-purple-950/20">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                        <span>🔍</span>
                        <span>ปรับขนาดเนื้อหา (ขยายให้ใหญ่ขึ้น / ย่อลง)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScalePercent((s) => Math.max(50, s - 5))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={50}
                          max={250}
                          step={5}
                          value={scalePercent}
                          onChange={(e) => setScalePercent(Math.max(50, Math.min(250, Number(e.target.value))))}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-purple-300"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                        <button
                          type="button"
                          onClick={() => setScalePercent((s) => Math.min(250, s + 5))}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={50}
                      max={200}
                      step={5}
                      value={scalePercent}
                      onChange={(e) => setScalePercent(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 mb-3">
                      <span>50% (ย่อเล็ก)</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">100% (ขนาดปกติ)</span>
                      <span>200% (ขยายใหญ่ 2 เท่า)</span>
                    </div>

                    {/* Quick zoom buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[
                        { label: '90%', val: 90 },
                        { label: '100% ปกติ', val: 100 },
                        { label: '110%', val: 110 },
                        { label: '115%', val: 115 },
                        { label: '120%', val: 120 },
                        { label: '125%', val: 125 },
                        { label: '135%', val: 135 },
                        { label: '150% ขยายใหญ่', val: 150 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setScalePercent(item.val)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            scalePercent === item.val
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 dark:bg-slate-800 dark:border-slate-700 dark:text-purple-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Vertical Offset toggle */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setEnableVertical(!enableVertical)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 text-[10px] dark:border-slate-700">
                        {enableVertical ? '✓' : '+'}
                      </span>
                      ปรับระยะ บน-ล่าง (Top & Bottom Offset) เพิ่มเติม
                    </button>

                    {enableVertical && (
                      <div className="mt-3 grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            ⬆️ ด้านบน (Top)
                          </label>
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              type="number"
                              step={getStep()}
                              value={topValue}
                              onChange={(e) => setTopValue(Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                            />
                            <span className="text-[11px] text-slate-400">{unit}</span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            ⬇️ ด้านล่าง (Bottom)
                          </label>
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              type="number"
                              step={getStep()}
                              value={bottomValue}
                              onChange={(e) => setBottomValue(Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                            />
                            <span className="text-[11px] text-slate-400">{unit}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mode & Advanced Settings */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
                  📐 รูปแบบการจัดหน้ากระดาษ
                </h3>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setMode('fit-margin')}
                    className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                      mode === 'fit-margin'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Minimize2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ย่อพอดีหน้า (แนะนำ)
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      ย่อเนื้อหาเล็กน้อยให้พอดีกับขอบใหม่ ข้อความไม่ตกขอบ 100%
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('shift')}
                    className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                      mode === 'shift'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MoveHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ขยับเนื้อหาตรงๆ
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      คงขนาดเนื้อหาเท่าเดิม เลื่อนตำแหน่งไปทางซ้ายหรือขวา
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('expand')}
                    className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                      mode === 'expand'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Maximize2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ขยายแผ่นกระดาษ
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      เพิ่มขนาดความกว้างของแผ่นกระดาษตามระยะขอบที่ระบุ
                    </p>
                  </button>
                </div>

                {/* Mirror margins for double-sided printing */}
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMirrorPages}
                      onChange={(e) => setIsMirrorPages(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        📖 สลับระยะขอบหน้าคู่-หน้าคี่ (Mirror Margins)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        เหมาะสำหรับการพิมพ์ 2 หน้าเพื่อเข้าเล่ม (หน้าคี่เว้นขอบซ้าย / หน้าคู่จะสลับไปเว้นขอบขวาอัตโนมัติ)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Page Scope Selection */}
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ขอบเขตหน้าที่ต้องการปรับ:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all' as const, label: 'ทุกหน้า' },
                      { id: 'odd' as const, label: 'เฉพาะหน้าคี่ (1, 3, 5...)' },
                      { id: 'even' as const, label: 'เฉพาะหน้าคู่ (2, 4, 6...)' },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => setPageScope(scope.id)}
                        className={`rounded-xl border py-2 text-center text-xs font-semibold transition ${
                          pageScope === scope.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview (5 cols) */}
            <div className="space-y-4 lg:col-span-5">
              <div className="sticky top-20 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    👁️ ตัวอย่างการขยับหน้ากระดาษ (Live Preview)
                  </h3>

                  {/* Page switcher */}
                  {numPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
                        title="หน้าก่อนหน้า"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {previewPage} / {numPages}
                        {isMirrorPages && (
                          <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                            ({previewPage % 2 === 0 ? 'หน้าคู่' : 'หน้าคี่'})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={previewPage >= numPages}
                        onClick={() => setPreviewPage((p) => Math.min(numPages, p + 1))}
                        className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
                        title="หน้าถัดไป"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Visual Paper Sheet Mockup */}
                <div className="relative mx-auto flex aspect-[1/1.414] max-h-[460px] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 p-2 shadow-inner dark:border-slate-700 dark:bg-slate-950">
                  {/* Paper sheet */}
                  <div className="relative h-full w-full overflow-hidden rounded-lg bg-white shadow-lift dark:bg-slate-800">
                    {/* Visual left margin zone guideline */}
                    {leftPercent > 0 && (
                      <div
                        style={{ width: `${leftPercent}%` }}
                        className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 border-r-2 border-dashed border-indigo-400 bg-indigo-500/15 transition-all"
                      >
                        <div className="absolute left-1 top-2 rounded bg-indigo-600/90 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          ขอบซ้าย {fromPt(currentLeftPt)} {unit}
                        </div>
                      </div>
                    )}

                    {/* Visual right margin zone guideline */}
                    {rightPercent > 0 && (
                      <div
                        style={{ width: `${rightPercent}%` }}
                        className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 border-l-2 border-dashed border-sky-400 bg-sky-500/15 transition-all"
                      >
                        <div className="absolute right-1 top-2 rounded bg-sky-600/90 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          ขอบขวา {fromPt(currentRightPt)} {unit}
                        </div>
                      </div>
                    )}

                    {/* Rendered PDF Page Image inside the sheet */}
                    {isLoadingPreview ? (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-indigo-600" />
                        กำลังโหลดตัวอย่าง...
                      </div>
                    ) : previewDataUrl ? (
                      <div className="flex h-full w-full items-center justify-center overflow-hidden">
                        <img
                          src={previewDataUrl}
                          alt="PDF Preview"
                          style={{
                            transform: previewTransform,
                            transition: 'transform 0.15s ease-out',
                          }}
                          className="max-h-full max-w-full object-contain pointer-events-none select-none shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        ไม่มีตัวอย่างหน้า
                      </div>
                    )}
                  </div>
                </div>

                {/* Status indicator badge */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-indigo-500" />
                    <span>
                      ขยับสุทธิ:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {fromPt(currentLeftPt - currentRightPt) > 0
                          ? `ไปทางขวา +${fromPt(currentLeftPt - currentRightPt)} ${unit}`
                          : fromPt(currentLeftPt - currentRightPt) < 0
                          ? `ไปทางซ้าย ${fromPt(currentLeftPt - currentRightPt)} ${unit}`
                          : 'อยู่ตรงกลาง (0)'}
                      </strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      ขนาด: <strong className="text-purple-600 dark:text-purple-400">{scalePercent}%</strong>
                    </span>
                    <span>•</span>
                    <span>
                      โหมด:{' '}
                      {mode === 'fit-margin'
                        ? 'ย่อพอดีหน้า'
                        : mode === 'shift'
                        ? 'ขยับเนื้อหา'
                        : 'ขยายกระดาษ'}
                    </span>
                  </span>
                </div>

                {/* Action Button */}
                <div className="mt-5">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleProcess}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-600 py-3.5 text-sm font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>
                          {progress
                            ? `กำลังประมวลผล ${progress.current} / ${progress.total} หน้า...`
                            : 'กำลังปรับระยะหน้า PDF...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        <span>ดาวน์โหลด PDF ที่ปรับระยะแล้ว</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
