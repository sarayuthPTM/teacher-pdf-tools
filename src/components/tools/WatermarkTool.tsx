import React, { useState } from 'react';
import { Droplet, Download, Loader2, Palette } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { addWatermark, downloadBlob } from '../../lib/pdf-service';

export const WatermarkTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('สำเนาถูกต้อง');
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [fontSize, setFontSize] = useState(48);
  const [colorHex, setColorHex] = useState('#ff0000');
  const [isProcessing, setIsProcessing] = useState(false);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const handleApply = async () => {
    if (!file || !text.trim()) return;

    try {
      setIsProcessing(true);
      const color = hexToRgb(colorHex);
      const watermarkedBlob = await addWatermark(file, {
        text,
        opacity,
        rotation,
        fontSize,
        color,
      });
      downloadBlob(watermarkedBlob, `watermarked_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการใส่ลายน้ำ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-pink-600 text-white shadow-md">
          <Droplet className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          ใส่ลายน้ำ PDF (Watermark PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          แปะข้อความจางๆ ทับทุกหน้า เช่น สำเนาถูกต้อง, ด่วนที่สุด, ลับเฉพาะ ป้องกันการคัดลอก
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={(files) => files[0] && setFile(files[0])}
          title="ลากไฟล์ PDF มาวางที่นี่เพื่อใส่ลายน้ำ"
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
                  ข้อความลายน้ำ
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="พิมพ์ข้อความลายน้ำ..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {['สำเนาถูกต้อง', 'CONFIDENTIAL', 'DRAFT', 'ด่วนที่สุด', 'เอกสารลับ'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setText(preset)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    ความจาง/โปร่งใส: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    มุมเอียง: {rotation}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="15"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                    className="w-full accent-fuchsia-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    ขนาดตัวอักษร: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    step="4"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-fuchsia-600"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สีของลายน้ำ
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <span className="text-xs font-mono uppercase text-slate-600 dark:text-slate-300">
                    {colorHex}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={isProcessing || !text.trim()}
              onClick={handleApply}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังใส่ลายน้ำลงในเอกสาร...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด PDF พร้อมลายน้ำ
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
