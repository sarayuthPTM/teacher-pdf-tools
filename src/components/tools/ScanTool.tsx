import React, { useState, useRef } from 'react';
import { Camera, Image, Download, Loader2, Sparkles, Sliders, Trash2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../lib/pdf-service';

export const ScanTool: React.FC = () => {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'normal' | 'bw' | 'magic' | 'grayscale'>('magic');
  const [isProcessing, setIsProcessing] = useState(false);

  const applyFilterToImage = (dataUrl: string, filter: 'normal' | 'bw' | 'magic' | 'grayscale'): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0);

        if (filter !== 'normal') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const avg = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === 'grayscale') {
              d[i] = avg;
              d[i + 1] = avg;
              d[i + 2] = avg;
            } else if (filter === 'bw') {
              // High contrast Black & White threshold
              const v = avg > 128 ? 255 : 0;
              d[i] = v;
              d[i + 1] = v;
              d[i + 2] = v;
            } else if (filter === 'magic') {
              // Magic color: increase contrast and brightness (document scanner style)
              const contrast = 1.3;
              const brightness = 15;
              d[i] = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
              d[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
              d[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    });
  };

  const handleFilesSelected = (files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const filtered = await applyFilterToImage(e.target.result as string, activeFilter);
          setCapturedImages((prev) => [...prev, filtered]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreatePdf = async () => {
    if (capturedImages.length === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();

      for (const dataUrl of capturedImages) {
        const imageBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
        const img = await pdfDoc.embedJpg(imageBytes);
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      downloadBlob(blob, `scanned_doc_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF จากภาพสแกน');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-md">
          <Camera className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          สแกนเอกสาร (Doc Scanner)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ถ่ายหรือเลือกรูปเอกสาร ลบเงา ปรับความคมชัด และส่งออกเป็นเอกสาร PDF
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              โหมดฟิลเตอร์ปรับแต่งเอกสาร (สไตล์แอปสแกน):
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'magic', label: '✨ เอกสารคมชัด (Magic Color)' },
                { id: 'bw', label: '📄 ขาว-ดำ ชัดเจน (B&W)' },
                { id: 'grayscale', label: '🔘 เฉดสีเทา (Grayscale)' },
                { id: 'normal', label: '📷 สีภาพเดิม (Normal)' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    activeFilter === f.id
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
            title="ถ่ายรูปจากกล้อง หรือเลือกรูปถ่ายเอกสาร"
            subtitle="ระบบจะปรับภาพให้สว่าง คมชัด และลบเงาให้อัตโนมัติ"
            buttonText="เปิดกล้อง / เลือกรูปถ่าย"
          />
        </div>

        {capturedImages.length > 0 && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  หน้าเอกสารที่สแกนแล้ว ({capturedImages.length} หน้า)
                </span>
                <button
                  type="button"
                  onClick={() => setCapturedImages([])}
                  className="text-xs text-rose-500 hover:underline"
                >
                  ล้างทั้งหมด
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {capturedImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-2xl border border-slate-200 bg-white p-2.5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
                      <img src={img} alt={`Scanned page ${idx + 1}`} className="h-full w-full object-cover" />
                      <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                        หน้า {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCapturedImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute right-2 top-2 rounded-lg bg-rose-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        title="ลบหน้านี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCreatePdf}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังสร้างเอกสาร PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    บันทึกเป็น PDF ({capturedImages.length} หน้า)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
