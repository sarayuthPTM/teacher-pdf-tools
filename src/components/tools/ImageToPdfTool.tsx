import React, { useState } from 'react';
import { Image, Download, Loader2, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { imagesToPdf, downloadBlob } from '../../lib/pdf-service';

export const ImageToPdfTool: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    const validImages = newFiles.filter((f) => f.type.startsWith('image/'));
    setImages((prev) => [...prev, ...validImages]);

    validImages.forEach((img) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(img);
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const newPreviews = [...previews];
    [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
    [newPreviews[index], newPreviews[index - 1]] = [newPreviews[index - 1], newPreviews[index]];
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    const newPreviews = [...previews];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    [newPreviews[index], newPreviews[index + 1]] = [newPreviews[index + 1], newPreviews[index]];
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    try {
      setIsProcessing(true);
      const pdfBlob = await imagesToPdf(images);
      downloadBlob(pdfBlob, `images_converted_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแปลงรูปภาพเป็น PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-600 text-white shadow-md">
          <Image className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แปลงรูปภาพเป็น PDF (JPG / PNG → PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          รวมภาพถ่ายเอกสารหลายๆ ใบ หรือรูปภาพจากกล้อง ให้กลายเป็นไฟล์ PDF เดียว
        </p>
      </div>

      {images.length === 0 ? (
        <FileDropzone
          accept="image/png, image/jpeg, image/jpg, image/webp"
          multiple={true}
          onFilesSelected={handleFilesSelected}
          title="ลากรูปภาพหลายๆ ใบมาวางที่นี่"
          subtitle="รองรับ JPG, PNG, WEBP (เลือกได้หลายรูปพร้อมกัน)"
          buttonText="เลือกรูปภาพจากเครื่อง"
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              รูปภาพทั้งหมด: {images.length} รูป
            </span>
            <div className="flex items-center gap-2">
              <FileDropzone
                accept="image/*"
                multiple={true}
                compact={true}
                buttonText="เพิ่มรูปภาพอีก"
                onFilesSelected={handleFilesSelected}
              />
              <button
                type="button"
                onClick={() => {
                  setImages([]);
                  setPreviews([]);
                }}
                className="text-xs text-rose-500 hover:underline"
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {previews.map((previewUrl, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl border border-slate-200 bg-white p-2.5 shadow-soft transition hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
                  <img
                    src={previewUrl}
                    alt={`Image ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    {idx + 1}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-[11px] text-slate-500 line-clamp-1">
                    {images[idx]?.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveDown(idx)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                      title="ลบรูปนี้"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-600 px-8 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังรวมรูปภาพเป็น PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด PDF จากรูปทั้งหมด ({images.length} หน้า)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
