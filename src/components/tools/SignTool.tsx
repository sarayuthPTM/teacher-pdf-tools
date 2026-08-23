import React, { useState, useRef, useEffect, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import { PenTool, Download, Trash2, Upload, Loader2, Check, RefreshCw, Move, Maximize2 } from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { renderPdfThumbnails, addSignatureToPdf, downloadBlob } from '../../lib/pdf-service';
import { PDFDocument } from 'pdf-lib';

export const SignTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<{ pageNumber: number; dataUrl: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Signature state
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [sigPosition, setSigPosition] = useState<{ xPercent: number; yPercent: number }>({ xPercent: 50, yPercent: 80 });
  const [sigSize, setSigSize] = useState<number>(140);
  const [isDragging, setIsDragging] = useState(false);

  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadInstance = useRef<SignaturePad | null>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startXPercent: number; startYPercent: number } | null>(null);

  useEffect(() => {
    if (sigCanvasRef.current) {
      sigPadInstance.current = new SignaturePad(sigCanvasRef.current, {
        penColor: '#000000',
        backgroundColor: 'rgba(0,0,0,0)',
      });
    }
  }, [file]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);

    try {
      const thumbs = await renderPdfThumbnails(selected, 50, 0.8);
      setThumbnails(thumbs);
      setSelectedPage(1);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเปิดไฟล์ PDF ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSignature = () => {
    sigPadInstance.current?.clear();
    setSignatureImage(null);
  };

  const handleSaveSignature = () => {
    if (sigPadInstance.current && !sigPadInstance.current.isEmpty()) {
      const dataUrl = sigPadInstance.current.toDataURL('image/png');
      setSignatureImage(dataUrl);
    } else {
      alert('กรุณาวาดลายเซ็นก่อน');
    }
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    if (!pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSigPosition({
      xPercent: Math.max(5, Math.min(95, (x / rect.width) * 100)),
      yPercent: Math.max(5, Math.min(95, (y / rect.height) * 100)),
    });
  };

  // Dragging Handlers for Mouse and Touch
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startXPercent: sigPosition.xPercent,
      startYPercent: sigPosition.yPercent,
    };
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStartRef.current || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartRef.current.mouseX;
    const deltaY = clientY - dragStartRef.current.mouseY;

    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    const newXPercent = Math.max(5, Math.min(95, dragStartRef.current.startXPercent + deltaXPercent));
    const newYPercent = Math.max(5, Math.min(95, dragStartRef.current.startYPercent + deltaYPercent));

    setSigPosition({
      xPercent: newXPercent,
      yPercent: newYPercent,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragStartRef.current = null;
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleApplySignature = async () => {
    if (!file || !signatureImage) return;

    try {
      setIsProcessing(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const page = pdfDoc.getPages()[selectedPage - 1];
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      const widthInPoints = sigSize;
      const heightInPoints = sigSize * 0.5; // aspect ratio 2:1

      const xPoint = (sigPosition.xPercent / 100) * pdfWidth - widthInPoints / 2;
      const yPoint = pdfHeight - (sigPosition.yPercent / 100) * pdfHeight - heightInPoints / 2;

      const signedBlob = await addSignatureToPdf(
        file,
        signatureImage,
        selectedPage,
        {
          x: Math.max(0, xPoint),
          y: Math.max(0, yPoint),
          width: widthInPoints,
          height: heightInPoints,
        }
      );

      downloadBlob(signedBlob, `signed_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการใส่ลายเซ็น');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageThumbnail = thumbnails.find((t) => t.pageNumber === selectedPage);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
          <PenTool className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          เซ็นเอกสาร PDF (Sign PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          วาดหรืออัปโหลดลายเซ็น แล้วลากวางปรับตำแหน่งได้อย่างอิสระบนหน้าเอกสาร
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากไฟล์ PDF ที่ต้องการเซ็นมาวางที่นี่"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Signature Pad & Controls */}
          <div className="space-y-6 lg:col-span-5">
            {/* Draw Signature Pad */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                1. วาดลายเซ็นของคุณ (หรืออัปโหลดรูป)
              </h3>

              <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                <canvas
                  ref={sigCanvasRef}
                  width={380}
                  height={160}
                  className="w-full cursor-crosshair touch-none"
                />
                {!signatureImage && (
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-400">
                    วาดลายเซ็นในกรอบนี้
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> ล้าง
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" /> ใช้ลายเซ็นนี้
                  </button>
                </div>

                <label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400">
                  <Upload className="h-3.5 w-3.5" /> อัปโหลดรูป
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Signature Placement Controls */}
            {signatureImage && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                  2. ตั้งค่าตำแหน่งและขนาดลายเซ็น
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      เลือกหน้าที่ต้องการเซ็น (หน้า {selectedPage} จาก {thumbnails.length})
                    </label>
                    <select
                      value={selectedPage}
                      onChange={(e) => setSelectedPage(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      {thumbnails.map((t) => (
                        <option key={t.pageNumber} value={t.pageNumber}>
                          หน้า {t.pageNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span>ขนาดลายเซ็น: {sigSize}px</span>
                      <span className="text-[11px] text-slate-400">พิกัด X: {sigPosition.xPercent.toFixed(0)}%, Y: {sigPosition.yPercent.toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="280"
                      value={sigSize}
                      onChange={(e) => setSigSize(Number(e.target.value))}
                      className="mt-1.5 w-full accent-emerald-600"
                    />
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Move className="h-4 w-4" /> ลากเลื่อนลายเซ็นได้อิสระ
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">
                      กดค้างที่กล่องลายเซ็นบนหน้ากระดาษฝั่งขวา แล้วลากเลื่อนไปยังตำแหน่งที่ต้องการได้ทันที (รองรับทั้งเมาส์และทัชสกรีนมือถือ)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="button"
              disabled={!signatureImage || isProcessing}
              onClick={handleApplySignature}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-40"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังบันทึกลายเซ็นลงใน PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด PDF พร้อมลายเซ็น
                </>
              )}
            </button>
          </div>

          {/* Right: PDF Page Interactive Preview */}
          <div className="lg:col-span-7">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ตัวอย่างหน้า {selectedPage} (คลิกหรือลากกล่องลายเซ็นเพื่อย้ายตำแหน่ง)
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  เปลี่ยนไฟล์
                </button>
              </div>

              {loading ? (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : currentPageThumbnail ? (
                <div
                  ref={pageContainerRef}
                  onClick={handlePageClick}
                  className="relative mx-auto select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-700"
                  style={{ maxWidth: '440px' }}
                >
                  <img
                    src={currentPageThumbnail.dataUrl}
                    alt={`Page ${selectedPage}`}
                    className="pointer-events-none w-full select-none"
                    draggable={false}
                  />

                  {/* Draggable signature overlay */}
                  {signatureImage && (
                    <div
                      onMouseDown={handleDragStart}
                      onTouchStart={handleDragStart}
                      style={{
                        position: 'absolute',
                        left: `${sigPosition.xPercent}%`,
                        top: `${sigPosition.yPercent}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${sigSize}px`,
                      }}
                      className={`group cursor-grab rounded-lg border-2 border-dashed bg-emerald-50/40 p-1.5 shadow-md transition-shadow active:cursor-grabbing ${
                        isDragging
                          ? 'border-emerald-600 ring-2 ring-emerald-400/50 shadow-lg'
                          : 'border-emerald-500 hover:border-emerald-600'
                      }`}
                    >
                      <div className="mb-0.5 flex items-center justify-between rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                        <span className="flex items-center gap-1">
                          <Move className="h-2.5 w-2.5" /> ลายเซ็น (ลากได้)
                        </span>
                      </div>
                      <img
                        src={signatureImage}
                        alt="Signature"
                        className="w-full object-contain"
                        draggable={false}
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
