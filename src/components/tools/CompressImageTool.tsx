import React, { useState } from 'react';
import { ImageIcon, Download, Loader2, Sliders, CheckCircle2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { downloadBlob } from '../../lib/pdf-service';

export const CompressImageTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(75);
  const [maxDimension, setMaxDimension] = useState<number>(1920);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setOriginalSize(selected.size);
    setCompressedBlob(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleCompress = () => {
    if (!preview || !file) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = preview;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down if exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCompressedBlob(blob);
            setCompressedSize(blob.size);
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        quality / 100
      );
    };
  };

  const handleDownload = () => {
    if (!compressedBlob || !file) return;
    downloadBlob(compressedBlob, `compressed_${file.name.replace(/\.[^/.]+$/, '')}.jpg`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md">
          <ImageIcon className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ลดขนาดไฟล์ภาพ (Image Compress)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          บีบอัด JPG, PNG, WEBP ให้เล็กลง ปรับคุณภาพและย่อขนาดได้ ทำในเบราว์เซอร์ 100%
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept="image/*"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากรูปภาพมาวางที่นี่เพื่อลดขนาด"
          buttonText="เลือกรูปภาพ"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Controls */}
            <div className="space-y-4 lg:col-span-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <Sliders className="h-4 w-4 text-amber-500" />
                  ตั้งค่าการบีบอัด
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      คุณภาพของภาพ: {quality}%
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="95"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      ความละเอียดสูงสุด (กว้าง/สูง): {maxDimension}px
                    </label>
                    <select
                      value={maxDimension}
                      onChange={(e) => setMaxDimension(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value={1080}>1080px (Full HD - เหมาะสำหรับแชร์ทางเน็ต)</option>
                      <option value={1920}>1920px (2K - คมชัดกำลังดี)</option>
                      <option value={3840}>3840px (4K - ความละเอียดสูง)</option>
                      <option value={8000}>ขนาดเดิม (ไม่ย่อความกว้าง/สูง)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={isProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-95"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'คำนวณและลดขนาดภาพ'}
                  </button>
                </div>
              </div>

              {compressedBlob && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> ผลการบีบอัด:
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">ขนาดเดิม:</span>{' '}
                      <strong>{(originalSize / 1024).toFixed(1)} KB</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">ขนาดใหม่:</span>{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {(compressedSize / 1024).toFixed(1)} KB
                      </strong>
                    </div>
                    <div className="col-span-2 text-emerald-700 dark:text-emerald-300">
                      ลดขนาดลงได้:{' '}
                      <strong>
                        {(((originalSize - compressedSize) / originalSize) * 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" /> ดาวน์โหลดรูปที่ลดขนาดแล้ว
                  </button>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ตัวอย่างรูปภาพ
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    เปลี่ยนรูป
                  </button>
                </div>
                {preview && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    <img src={preview} alt="Preview" className="max-h-80 w-full object-contain p-2" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
