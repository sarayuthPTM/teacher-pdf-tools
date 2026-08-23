import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Download,
  Loader2,
  Sparkles,
  Sliders,
  Trash2,
  RotateCw,
  RotateCcw,
  Crop,
  Check,
  X,
  Sun,
  Contrast,
  Layers,
  ArrowLeft,
  ArrowRight,
  Eye,
  Plus,
  Zap,
  FileCheck,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../lib/pdf-service';

export type ScannerFilter = 'magic' | 'bw' | 'color' | 'grayscale' | 'original';

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  rotation: number; // 0, 90, 180, 270
  filter: ScannerFilter;
  brightness: number; // -50 to 50
  contrast: number; // 0.5 to 2.0
  shadowClean: number; // 0 to 100
}

export const ScanTool: React.FC = () => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [globalFilter, setGlobalFilter] = useState<ScannerFilter>('magic');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit modal state
  const [editRotation, setEditRotation] = useState<number>(0);
  const [editFilter, setEditFilter] = useState<ScannerFilter>('magic');
  const [editBrightness, setEditBrightness] = useState<number>(0);
  const [editContrast, setEditContrast] = useState<number>(1.1);
  const [editShadowClean, setEditShadowClean] = useState<number>(40);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string>('');

  /**
   * Process image using Clear Scanner algorithms
   */
  const processImage = (
    dataUrl: string,
    rotation: number,
    filter: ScannerFilter,
    brightness: number,
    contrast: number,
    shadowClean: number
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isRotated = rotation === 90 || rotation === 270;
        canvas.width = isRotated ? img.height : img.width;
        canvas.height = isRotated ? img.width : img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        if (filter !== 'original' || brightness !== 0 || contrast !== 1.0 || shadowClean > 0) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

          for (let i = 0; i < d.length; i += 4) {
            let r = d[i];
            let g = d[i + 1];
            let b = d[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === 'magic') {
              // Clear Scanner Magic Color Filter:
              // Whiten page background shadow, boost contrast of text and color seals
              const threshold = Math.max(90, 165 - shadowClean * 0.85);
              if (lum > threshold) {
                const boost = (lum - threshold) / (255 - threshold);
                r = Math.min(255, r + (255 - r) * (0.65 + boost * 0.35));
                g = Math.min(255, g + (255 - g) * (0.65 + boost * 0.35));
                b = Math.min(255, b + (255 - b) * (0.65 + boost * 0.35));
              } else {
                // Darken and sharpen dark ink/text
                r = Math.max(0, r * 0.85);
                g = Math.max(0, g * 0.85);
                b = Math.max(0, b * 0.85);
              }
              r = factor * (r - 128) + 128 + brightness;
              g = factor * (g - 128) + 128 + brightness;
              b = factor * (b - 128) + 128 + brightness;
            } else if (filter === 'bw') {
              // High Contrast B&W Scan
              const threshold = 135 + shadowClean * 0.6;
              const v = lum > threshold ? 255 : 0;
              r = v;
              g = v;
              b = v;
            } else if (filter === 'grayscale') {
              let gVal = lum;
              gVal = factor * (gVal - 128) + 128 + brightness;
              r = gVal;
              g = gVal;
              b = gVal;
            } else if (filter === 'color') {
              r = factor * (r - 128) + 128 + brightness + 10;
              g = factor * (g - 128) + 128 + brightness + 10;
              b = factor * (b - 128) + 128 + brightness + 10;
            }

            d[i] = Math.min(255, Math.max(0, r));
            d[i + 1] = Math.min(255, Math.max(0, g));
            d[i + 2] = Math.min(255, Math.max(0, b));
          }
          ctx.putImageData(imgData, 0, 0);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
    });
  };

  const handleFilesSelected = (files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const orig = e.target.result as string;
          const processed = await processImage(orig, 0, globalFilter, 0, 1.1, 40);
          const newPage: ScannedPage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            originalDataUrl: orig,
            processedDataUrl: processed,
            rotation: 0,
            filter: globalFilter,
            brightness: 0,
            contrast: 1.1,
            shadowClean: 40,
          };
          setPages((prev) => [...prev, newPage]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const openEditor = (idx: number) => {
    const page = pages[idx];
    setEditingIndex(idx);
    setEditRotation(page.rotation);
    setEditFilter(page.filter);
    setEditBrightness(page.brightness);
    setEditContrast(page.contrast);
    setEditShadowClean(page.shadowClean);
    setEditPreviewUrl(page.processedDataUrl);
  };

  // Live preview update in modal
  useEffect(() => {
    if (editingIndex !== null && pages[editingIndex]) {
      const page = pages[editingIndex];
      processImage(
        page.originalDataUrl,
        editRotation,
        editFilter,
        editBrightness,
        editContrast,
        editShadowClean
      ).then(setEditPreviewUrl);
    }
  }, [editingIndex, editRotation, editFilter, editBrightness, editContrast, editShadowClean]);

  const saveEditedPage = () => {
    if (editingIndex === null) return;
    setPages((prev) =>
      prev.map((p, i) =>
        i === editingIndex
          ? {
              ...p,
              rotation: editRotation,
              filter: editFilter,
              brightness: editBrightness,
              contrast: editContrast,
              shadowClean: editShadowClean,
              processedDataUrl: editPreviewUrl,
            }
          : p
      )
    );
    setEditingIndex(null);
  };

  const applyToAllPages = async () => {
    setIsProcessing(true);
    const updated = await Promise.all(
      pages.map(async (p) => {
        const processed = await processImage(
          p.originalDataUrl,
          p.rotation,
          editFilter,
          editBrightness,
          editContrast,
          editShadowClean
        );
        return {
          ...p,
          filter: editFilter,
          brightness: editBrightness,
          contrast: editContrast,
          shadowClean: editShadowClean,
          processedDataUrl: processed,
        };
      })
    );
    setPages(updated);
    setEditingIndex(null);
    setIsProcessing(false);
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const quickRotatePage = async (idx: number) => {
    const page = pages[idx];
    const newRot = (page.rotation + 90) % 360;
    const processed = await processImage(
      page.originalDataUrl,
      newRot,
      page.filter,
      page.brightness,
      page.contrast,
      page.shadowClean
    );
    setPages((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, rotation: newRot, processedDataUrl: processed } : p
      )
    );
  };

  const handleCreatePdf = async () => {
    if (pages.length === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();

      for (const page of pages) {
        const imageBytes = await fetch(page.processedDataUrl).then((r) => r.arrayBuffer());
        const img = await pdfDoc.embedJpg(imageBytes);

        // Calculate standard A4 proportion fit
        const pageDoc = pdfDoc.addPage([img.width, img.height]);
        pageDoc.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(blob, `cleanscan_document_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างเอกสาร PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-md">
          <Camera className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          สแกนเอกสาร (Doc Scanner สไตล์ Clear Scanner)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ถ่ายรูป ลบเงา ปรับพื้นหลังกระดาษขาวใส และรวมหลายหน้าเป็นเล่ม PDF คุณภาพสูง
        </p>
      </div>

      <div className="space-y-6">
        {/* Top Control Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                โหมดสแกนเริ่มต้น (Clear Scan Engine):
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ลบเงาและรอยยับบนกระดาษอัตโนมัติ ให้ตัวหนังสือคมชัดเหมือนเครื่องสแกนเนอร์
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'magic', label: '✨ เอกสารคมชัด (Magic Color)' },
                { id: 'bw', label: '📄 ขาว-ดำ คมกริบ (B&W)' },
                { id: 'color', label: '🎨 สีภาพสด (Color)' },
                { id: 'grayscale', label: '🔘 เฉดสีเทา (Grayscale)' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setGlobalFilter(f.id as ScannerFilter)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    globalFilter === f.id
                      ? 'border-pink-500 bg-pink-50 text-pink-700 dark:border-pink-400 dark:bg-pink-950/40 dark:text-pink-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <FileDropzone
            accept="image/*"
            multiple={true}
            onFilesSelected={handleFilesSelected}
            title="ถ่ายรูปจากกล้อง หรือเลือกรูปถ่ายเอกสาร (เลือกได้หลายใบ)"
            subtitle="ระบบจะปรับภาพให้สว่าง ลบเงาดำ และทำพื้นหลังขาวสะอาดให้อัตโนมัติ"
            buttonText="เปิดกล้อง / เลือกรูปเอกสาร"
          />
        </div>

        {/* Scanned Gallery */}
        {pages.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    หน้าเอกสารที่สแกนแล้ว ({pages.length} หน้า)
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    คลิกที่รูปเพื่อปรับแต่งฟิลเตอร์ ความสว่าง ลบเงา หรือหมุนภาพ
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPages([])}
                  className="text-xs text-rose-500 hover:underline"
                >
                  ล้างทั้งหมด
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div
                      onClick={() => openEditor(idx)}
                      className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-900"
                    >
                      <img
                        src={p.processedDataUrl}
                        alt={`Page ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                        หน้า {idx + 1}
                      </span>
                      <span className="absolute bottom-2 left-2 rounded-md bg-pink-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {p.filter === 'magic'
                          ? '✨ Magic'
                          : p.filter === 'bw'
                          ? '📄 B&W'
                          : p.filter === 'color'
                          ? '🎨 Color'
                          : '🔘 Gray'}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                        <span className="flex items-center gap-1 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm">
                          <Sliders className="h-3.5 w-3.5" /> ปรับแต่ง
                        </span>
                      </div>
                    </div>

                    {/* Quick Page Actions */}
                    <div className="mt-2 flex items-center justify-between gap-1 pt-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePage(idx, idx - 1)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
                          title="ย้ายไปซ้าย"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === pages.length - 1}
                          onClick={() => movePage(idx, idx + 1)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800"
                          title="ย้ายไปขวา"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => quickRotatePage(idx)}
                          className="rounded-lg p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="หมุน 90°"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPages((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="ลบหน้านี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCreatePdf}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 px-9 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังสร้างเอกสาร PDF คมชัดสูง...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    บันทึกเป็น PDF รวมทุกหน้า ({pages.length} หน้า)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Scanner Pro Editor Modal */}
      {editingIndex !== null && pages[editingIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                <span className="font-bold text-slate-900 dark:text-white">
                  ปรับแต่งเอกสารหน้า {editingIndex + 1} (สไตล์ Clear Scanner)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-12">
              {/* Left: Preview Canvas */}
              <div className="flex items-center justify-center rounded-2xl bg-slate-100 p-4 dark:bg-slate-950 md:col-span-7">
                {editPreviewUrl ? (
                  <img
                    src={editPreviewUrl}
                    alt="Preview"
                    className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
                  />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                )}
              </div>

              {/* Right: Controls & Sliders */}
              <div className="space-y-5 md:col-span-5">
                {/* Filter Selector */}
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    เลือกฟิลเตอร์ปรับแต่ง:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'magic', label: '✨ Magic Color', desc: 'พื้นขาว ตัวหนังสือคม' },
                      { id: 'bw', label: '📄 B&W ชัดเจน', desc: 'ขาว-ดำ ไร้รอยยับ' },
                      { id: 'color', label: '🎨 สีภาพสด', desc: 'สีสันสมจริง' },
                      { id: 'grayscale', label: '🔘 เฉดสีเทา', desc: 'โทนขาวเทาเนียน' },
                      { id: 'original', label: '📷 ภาพเดิม', desc: 'ไม่ปรับแต่ง' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setEditFilter(f.id as ScannerFilter)}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          editFilter === f.id
                            ? 'border-pink-500 bg-pink-50 text-pink-700 dark:border-pink-400 dark:bg-pink-950/40 dark:text-pink-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{f.label}</div>
                        <div className="text-[10px] text-slate-400">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    หมุนทิศทางเอกสาร:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRotation((prev) => (prev - 90 + 360) % 360)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <RotateCcw className="h-4 w-4" /> หมุนซ้าย 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRotation((prev) => (prev + 90) % 360)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <RotateCw className="h-4 w-4" /> หมุนขวา 90°
                    </button>
                  </div>
                </div>

                {/* Fine-Tuning Sliders */}
                <div className="space-y-3.5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
                  {/* Shadow Cleaner */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Sparkles className="h-3.5 w-3.5 text-pink-600" /> ลบเงาพื้นหลังกระดาษ
                      </span>
                      <span className="font-bold text-pink-600">{editShadowClean}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editShadowClean}
                      onChange={(e) => setEditShadowClean(Number(e.target.value))}
                      className="mt-1 w-full accent-pink-600"
                    />
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Sun className="h-3.5 w-3.5 text-amber-500" /> ความสว่าง (Brightness)
                      </span>
                      <span className="font-bold text-amber-500">{editBrightness > 0 ? `+${editBrightness}` : editBrightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={editBrightness}
                      onChange={(e) => setEditBrightness(Number(e.target.value))}
                      className="mt-1 w-full accent-amber-500"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Contrast className="h-3.5 w-3.5 text-sky-500" /> ความคมชัด (Contrast)
                      </span>
                      <span className="font-bold text-sky-500">{editContrast.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={editContrast}
                      onChange={(e) => setEditContrast(Number(e.target.value))}
                      className="mt-1 w-full accent-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={applyToAllPages}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 py-2.5 text-xs font-bold text-pink-700 transition hover:bg-pink-100 dark:border-pink-900/50 dark:bg-pink-950/40 dark:text-pink-300"
                  >
                    <Layers className="h-4 w-4" /> ใช้การตั้งค่านี้กับทุกหน้า
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={saveEditedPage}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95"
              >
                <Check className="h-4 w-4" /> บันทึกการปรับแต่งหน้านี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
