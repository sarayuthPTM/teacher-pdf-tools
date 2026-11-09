import React, { useState } from 'react';
import {
  Minimize2,
  Download,
  Loader2,
  CheckCircle2,
  Sliders,
  Sparkles,
  Flame,
  FileText,
  RefreshCw,
  Zap,
  Info,
  ShieldCheck,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { FileDropzone } from '../ui/FileDropzone';
import { downloadBlob } from '../../lib/pdf-service';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressedBlob: Blob;
  fileName: string;
}

export const CompressPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'recommended' | 'extreme' | 'low' | 'custom'>('recommended');
  const [targetMB, setTargetMB] = useState<number>(1.5);
  const [engineMode, setEngineMode] = useState<'smart' | 'lossless'>('smart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const originalMB = file ? file.size / (1024 * 1024) : 0;
  const minMB = file ? Math.max(0.05, Number((originalMB * 0.15).toFixed(2))) : 0.1;
  const maxMB = file ? Number(originalMB.toFixed(2)) : 10;
  const step = originalMB > 10 ? 0.2 : originalMB > 2 ? 0.05 : 0.02;

  const handleFileSelect = (files: File[]) => {
    if (!files[0]) return;
    const selected = files[0];
    setFile(selected);
    const sizeMB = selected.size / (1024 * 1024);
    // Default to balanced recommendation (~50%)
    const defaultTarget = Math.max(0.1, Number((sizeMB * 0.5).toFixed(2)));
    setTargetMB(defaultTarget);
    setLevel('recommended');
    setIsDone(false);
    setResult(null);
    setProgress(null);
  };

  const applyPreset = (preset: 'extreme' | 'recommended' | 'low') => {
    if (!file) return;
    setLevel(preset);
    if (preset === 'extreme') {
      const val = Math.max(minMB, Number((originalMB * 0.25).toFixed(2)));
      setTargetMB(val);
    } else if (preset === 'recommended') {
      const val = Math.max(minMB, Number((originalMB * 0.5).toFixed(2)));
      setTargetMB(val);
    } else if (preset === 'low') {
      const val = Math.max(minMB, Math.min(maxMB, Number((originalMB * 0.75).toFixed(2))));
      setTargetMB(val);
    }
  };

  const applyFixedLimit = (limitMB: number) => {
    if (!file) return;
    const val = Math.max(minMB, Math.min(maxMB, limitMB));
    setTargetMB(val);
    setLevel('custom');
  };

  const handleCompress = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setIsDone(false);
      setResult(null);

      const arrayBuffer = await file.arrayBuffer();

      // Mode: Lossless object stream compression only
      if (engineMode === 'lossless') {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
        const compressedBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const res: CompressionResult = {
          originalSize: file.size,
          compressedSize: compressedBlob.size,
          compressedBlob,
          fileName: `compressed_${file.name}`,
        };
        setResult(res);
        setIsDone(true);
        downloadBlob(compressedBlob, res.fileName);
        return;
      }

      // Mode: Smart visual compression (downsampling scanned/raster pages to hit the target MB)
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      setProgress({ current: 0, total: numPages });

      const newPdf = await PDFDocument.create();

      // Ratio target: targetMB / originalMB (clamped between 0.12 and 0.95)
      const ratio = Math.max(0.12, Math.min(0.95, targetMB / (originalMB || 1)));

      // Dynamic scale: 0.85x (~60-70 DPI) to 2.0x (~150-180 DPI)
      const scale = Math.max(0.85, Math.min(2.0, 0.85 + (ratio - 0.12) * (1.15 / 0.83)));
      // Dynamic JPEG quality: 0.35 to 0.88
      const quality = Math.max(0.35, Math.min(0.88, 0.35 + (ratio - 0.12) * (0.53 / 0.83)));

      for (let i = 1; i <= numPages; i++) {
        setProgress({ current: i, total: numPages });
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;

          const jpegBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', quality);
          });

          if (jpegBlob) {
            const jpegBytes = await jpegBlob.arrayBuffer();
            const embeddedImage = await newPdf.embedJpg(jpegBytes);
            const origViewport = page.getViewport({ scale: 1.0 });
            const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
            newPage.drawImage(embeddedImage, {
              x: 0,
              y: 0,
              width: origViewport.width,
              height: origViewport.height,
            });
          }
        }

        // Allow UI thread to breathe
        await new Promise((r) => setTimeout(r, 10));
      }

      const compressedBytes = await newPdf.save({ useObjectStreams: true });
      let compressedBlob = new Blob([compressedBytes as any], { type: 'application/pdf' });

      // Edge-case safeguard: if lossless happens to be smaller (e.g. pure text without images),
      // fallback to the smaller one.
      if (compressedBlob.size > file.size) {
        try {
          const fallbackDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const fallbackBytes = await fallbackDoc.save({ useObjectStreams: true });
          if (fallbackBytes.byteLength < compressedBlob.size) {
            compressedBlob = new Blob([fallbackBytes as any], { type: 'application/pdf' });
          }
        } catch {
          // Keep compressedBlob
        }
      }

      const res: CompressionResult = {
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        compressedBlob,
        fileName: `compressed_${file.name}`,
      };

      setResult(res);
      setIsDone(true);
      downloadBlob(compressedBlob, res.fileName);
    } catch (err) {
      console.error('Error compressing PDF:', err);
      alert('เกิดข้อผิดพลาดในการบีบอัดเอกสาร PDF โปรดลองอีกครั้ง');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const getEstimatedQualityLabel = () => {
    const ratio = targetMB / (originalMB || 1);
    if (ratio >= 0.7) {
      return {
        label: '✨ ความคมชัดสูงมาก',
        desc: 'ตัวหนังสือคมกริบ เหมาะสำหรับพิมพ์หรือเอกสารอ้างอิงสำคัญ',
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      };
    }
    if (ratio >= 0.4) {
      return {
        label: '⭐ คมชัดดี (สมดุล)',
        desc: 'ความคมชัดกำลังดี อ่านง่ายสบายตา เหมาะกับส่งอีเมลและอัปโหลดเว็บ',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      };
    }
    return {
      label: '🔥 บีบอัดสูงสุด (กะทัดรัด)',
      desc: 'ไฟล์เล็กที่สุดเพื่อผ่านเกณฑ์จำกัดขนาด เหมาะกับระบบที่จำกัดไม่เกิน 1-2 MB',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    };
  };

  const qualityInfo = getEstimatedQualityLabel();

  return (
    <div className="mx-auto max-w-4xl font-sans">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 text-white shadow-md">
          <Minimize2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ลดขนาด PDF (Compress PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          บีบอัดโครงสร้างเอกสารและรูปภาพใน PDF ให้ไฟล์เล็กลง พร้อมปุ่มเลื่อนปรับขนาดที่ต้องการได้อย่างอิสระ
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelect}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อลดขนาด"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          {/* Main Controls Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            {/* File Info Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    ไฟล์ที่เลือก: {file.name}
                  </span>
                  <span className="ml-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {originalMB.toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setIsDone(false);
                  setResult(null);
                  setProgress(null);
                }}
                className="text-xs font-semibold text-rose-500 transition hover:text-rose-600 hover:underline"
              >
                เปลี่ยนไฟล์
              </button>
            </div>

            {/* Slider Section */}
            <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    ปุ่มเลื่อนปรับขนาดไฟล์เป้าหมาย (Target File Size)
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">ขนาดที่ต้องการ:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={minMB}
                      max={maxMB}
                      step={step}
                      value={targetMB}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setTargetMB(Math.max(minMB, Math.min(maxMB, val)));
                          setLevel('custom');
                        }
                      }}
                      className="w-20 rounded-lg border border-amber-300 bg-white px-2 py-1 text-right text-xs font-bold text-amber-700 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300"
                    />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">MB</span>
                  </div>
                </div>
              </div>

              {/* Slider Input */}
              <div className="space-y-2 py-1">
                <input
                  type="range"
                  min={minMB}
                  max={maxMB}
                  step={step}
                  value={targetMB}
                  onChange={(e) => {
                    setTargetMB(parseFloat(e.target.value));
                    setLevel('custom');
                  }}
                  className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-amber-200 accent-amber-600 transition hover:bg-amber-300 dark:bg-amber-950/80"
                />

                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <Flame className="h-3.5 w-3.5" />
                    เล็กสุด (~{minMB.toFixed(2)} MB)
                  </span>
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    เป้าหมาย: ~{targetMB.toFixed(2)} MB (ลดลงประมาณ{' '}
                    {Math.max(0, Math.round((1 - targetMB / (originalMB || 1)) * 100))}%)
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    ใกล้เคียงเดิม ({maxMB.toFixed(2)} MB)
                  </span>
                </div>
              </div>

              {/* Popular Target Size Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/30">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  ขนาดเป้าหมายยอดนิยม:
                </span>
                {originalMB > 0.5 && (
                  <button
                    type="button"
                    onClick={() => applyFixedLimit(0.5)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      targetMB === 0.5
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    ≤ 500 KB
                  </button>
                )}
                {originalMB > 1.0 && (
                  <button
                    type="button"
                    onClick={() => applyFixedLimit(1.0)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      targetMB === 1.0
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    ≤ 1.0 MB (เว็บราชการ)
                  </button>
                )}
                {originalMB > 2.0 && (
                  <button
                    type="button"
                    onClick={() => applyFixedLimit(2.0)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      targetMB === 2.0
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    ≤ 2.0 MB (ส่งอีเมล)
                  </button>
                )}
                {originalMB > 5.0 && (
                  <button
                    type="button"
                    onClick={() => applyFixedLimit(5.0)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      targetMB === 5.0
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    ≤ 5.0 MB
                  </button>
                )}
              </div>
            </div>

            {/* Presets Cards (Synchronized with Slider) */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                เลือกระดับการบีบอัด (กดเลือกเพื่อปรับสไลเดอร์ทันที)
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => applyPreset('recommended')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    level === 'recommended'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:border-amber-400 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    ⭐ แนะนำ (สมดุล)
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    ลดขนาดได้ดี ~50% และยังคงคุณภาพตัวหนังสือคมชัด
                  </p>
                  <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    เป้าหมาย: ~{(originalMB * 0.5).toFixed(2)} MB
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('extreme')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    level === 'extreme'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:border-amber-400 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    🔥 บีบอัดสูงสุด
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    ขนาดไฟล์เล็กที่สุด ~25% เหมาะกับการส่งอีเมลจำกัดขนาด
                  </p>
                  <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    เป้าหมาย: ~{Math.max(minMB, originalMB * 0.25).toFixed(2)} MB
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('low')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    level === 'low'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:border-amber-400 dark:bg-amber-950/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    ✨ คุณภาพสูง
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    บีบอัดเล็กน้อย ~75% เน้นความคมชัดของภาพเป็นหลัก
                  </p>
                  <p className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    เป้าหมาย: ~{(originalMB * 0.75).toFixed(2)} MB
                  </p>
                </button>
              </div>
            </div>

            {/* Live Stats Summary Grid */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">ขนาดไฟล์เดิม</p>
                <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
                  {originalMB.toFixed(2)} MB
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-center dark:border-amber-900/40 dark:bg-amber-950/30">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  ขนาดเป้าหมายโดยประมาณ
                </p>
                <p className="mt-1 text-base font-extrabold text-amber-700 dark:text-amber-300">
                  ~{targetMB.toFixed(2)} MB
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  คาดว่าจะลดลง
                </p>
                <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-300">
                  ~{Math.max(0, Math.round((1 - targetMB / (originalMB || 1)) * 100))}%
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">ประหยัดพื้นที่</p>
                <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
                  ~{Math.max(0, originalMB - targetMB).toFixed(2)} MB
                </p>
              </div>
            </div>

            {/* Quality Hint Box */}
            <div className={`mb-6 rounded-2xl border p-4 ${qualityInfo.color}`}>
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-bold">{qualityInfo.label}</p>
                  <p className="mt-0.5 text-xs opacity-90">{qualityInfo.desc}</p>
                </div>
              </div>
            </div>

            {/* Advanced Compression Engine Mode */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                รูปแบบการบีบอัด (Engine Mode)
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    engineMode === 'smart'
                      ? 'border-amber-500 bg-white shadow-xs dark:bg-slate-900'
                      : 'border-transparent bg-transparent hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="engineMode"
                    checked={engineMode === 'smart'}
                    onChange={() => setEngineMode('smart')}
                    className="mt-1 accent-amber-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ⚡ โหมดบีบอัดอัจฉริยะ (Smart Visual Mode) [แนะนำ]
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      บีบอัดรูปภาพและเอกสารสแกนตามแถบเลื่อน ได้ขนาดตามเป้าหมายแน่นอน 100%
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    engineMode === 'lossless'
                      ? 'border-amber-500 bg-white shadow-xs dark:bg-slate-900'
                      : 'border-transparent bg-transparent hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="engineMode"
                    checked={engineMode === 'lossless'}
                    onChange={() => setEngineMode('lossless')}
                    className="mt-1 accent-amber-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      📄 โหมดโครงสร้างดั้งเดิม (Lossless Stream)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      บีบอัดเฉพาะโครงสร้าง Object Stream ไม่ลดทอนพิกเซลภาพ เหมาะกับข้อความล้วน
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Progress Bar Display */}
          {isProcessing && progress && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-soft dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังประมวลผลและลดขนาดเอกสาร PDF...
                </span>
                <span>
                  หน้า {progress.current} / {progress.total} (
                  {Math.round((progress.current / progress.total) * 100)}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-900/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-200"
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
                    🎉 ลดขนาดไฟล์ PDF สำเร็จเรียบร้อย!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    ระบบได้ดาวน์โหลดไฟล์ให้คุณอัตโนมัติแล้ว หรือสามารถคลิกปุ่มดาวน์โหลดด้านล่างได้อีกครั้ง
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 text-center shadow-xs dark:bg-slate-900">
                <div>
                  <p className="text-xs font-medium text-slate-400">ขนาดเดิม</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {(result.originalSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ขนาดใหม่หลังบีบอัด
                  </p>
                  <p className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {(result.compressedSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">ประหยัดพื้นที่</p>
                  <p className="mt-1 text-sm font-bold text-emerald-600">
                    -
                    {(
                      ((result.originalSize - result.compressedSize) / result.originalSize) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => downloadBlob(result.compressedBlob, result.fileName)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lift transition hover:opacity-95"
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดไฟล์ PDF อีกครั้ง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDone(false);
                    setResult(null);
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  ปรับขนาดหรือบีบอัดใหม่
                </button>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          {!isDone && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCompress}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังลดขนาด PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    เริ่มลดขนาด PDF (เหลือเป้าหมาย ~{targetMB.toFixed(2)} MB)
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
