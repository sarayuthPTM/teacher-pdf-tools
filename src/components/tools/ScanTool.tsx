import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
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
  Maximize2,
  Minimize2,
  Undo2,
  FileText,
  Image as ImageIcon,
  Palette,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../../lib/pdf-service';

export type ScannerFilter = 'original' | 'photo' | 'document' | 'magic' | 'color' | 'bw';

export interface CornerPoints {
  tl: { x: number; y: number }; // Percentage (0 - 100)
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
}

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  warpedDataUrl: string;
  processedDataUrl: string;
  corners: CornerPoints;
  rotation: number; // 0, 90, 180, 270
  filter: ScannerFilter;
  brightness: number; // -50 to 50
  contrast: number; // 0.5 to 2.0
  shadowClean: number; // 0 to 100
}

export const ScanTool: React.FC = () => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Workflow State: 'gallery' | 'crop' | 'filter'
  const [activeStep, setActiveStep] = useState<'gallery' | 'crop' | 'filter'>('gallery');
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null);

  // Crop / Perspective State
  const [rawSourceImage, setRawSourceImage] = useState<string>('');
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [corners, setCorners] = useState<CornerPoints>({
    tl: { x: 8, y: 8 },
    tr: { x: 92, y: 8 },
    br: { x: 92, y: 92 },
    bl: { x: 8, y: 92 },
  });
  const [activeDraggingHandle, setActiveDraggingHandle] = useState<
    'tl' | 'tr' | 'br' | 'bl' | 'tm' | 'rm' | 'bm' | 'lm' | null
  >(null);

  // Filter / Fine-tune State
  const [warpedImage, setWarpedImage] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<ScannerFilter>('magic');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.1);
  const [shadowClean, setShadowClean] = useState<number>(45);
  const [previewResultUrl, setPreviewResultUrl] = useState<string>('');
  const [showSliders, setShowSliders] = useState<boolean>(false);

  const cropContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Perspective Transform / Homography Warp algorithm
   * Warps an arbitrary quadrilateral into a clean flat rectangular document
   */
  const warpPerspective = (sourceDataUrl: string, cornerPts: CornerPoints): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = sourceDataUrl;
      img.onload = () => {
        const srcW = img.width;
        const srcH = img.height;

        const p0 = { x: (cornerPts.tl.x / 100) * srcW, y: (cornerPts.tl.y / 100) * srcH };
        const p1 = { x: (cornerPts.tr.x / 100) * srcW, y: (cornerPts.tr.y / 100) * srcH };
        const p2 = { x: (cornerPts.br.x / 100) * srcW, y: (cornerPts.br.y / 100) * srcH };
        const p3 = { x: (cornerPts.bl.x / 100) * srcW, y: (cornerPts.bl.y / 100) * srcH };

        const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
          Math.hypot(a.x - b.x, a.y - b.y);

        const topW = dist(p0, p1);
        const botW = dist(p3, p2);
        const leftH = dist(p0, p3);
        const rightH = dist(p1, p2);

        const dstW = Math.max(120, Math.round(Math.max(topW, botW)));
        const dstH = Math.max(120, Math.round(Math.max(leftH, rightH)));

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = srcW;
        srcCanvas.height = srcH;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return resolve(sourceDataUrl);
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = dstW;
        dstCanvas.height = dstH;
        const dstCtx = dstCanvas.getContext('2d');
        if (!dstCtx) return resolve(sourceDataUrl);

        const dstImageData = dstCtx.createImageData(dstW, dstH);
        const dstData = dstImageData.data;

        // Bilinear inverse mapping
        for (let y = 0; y < dstH; y++) {
          const v = y / (dstH - 1 || 1);
          const invV = 1 - v;

          for (let x = 0; x < dstW; x++) {
            const u = x / (dstW - 1 || 1);
            const invU = 1 - u;

            const srcX =
              invU * invV * p0.x +
              u * invV * p1.x +
              u * v * p2.x +
              invU * v * p3.x;

            const srcY =
              invU * invV * p0.y +
              u * invV * p1.y +
              u * v * p2.y +
              invU * v * p3.y;

            const sx = Math.max(0, Math.min(srcW - 1, Math.round(srcX)));
            const sy = Math.max(0, Math.min(srcH - 1, Math.round(srcY)));
            const srcIdx = (sy * srcW + sx) * 4;
            const dstIdx = (y * dstW + x) * 4;

            dstData[dstIdx] = srcData[srcIdx];
            dstData[dstIdx + 1] = srcData[srcIdx + 1];
            dstData[dstIdx + 2] = srcData[srcIdx + 2];
            dstData[dstIdx + 3] = 255;
          }
        }

        dstCtx.putImageData(dstImageData, 0, 0);
        resolve(dstCanvas.toDataURL('image/jpeg', 0.95));
      };
    });
  };

  /**
   * Clear Scanner filter processing engine
   */
  const applyClearScannerFilters = (
    dataUrl: string,
    filterMode: ScannerFilter,
    bright: number,
    cont: number,
    shadowThreshold: number,
    rot: number
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const isRotated = rot === 90 || rot === 270;
        canvas.width = isRotated ? img.height : img.width;
        canvas.height = isRotated ? img.width : img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        if (filterMode === 'original' && bright === 0 && cont === 1.0) {
          return resolve(canvas.toDataURL('image/jpeg', 0.92));
        }

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const factor = (259 * (cont * 100 + 255)) / (255 * (259 - cont * 100));

        for (let i = 0; i < d.length; i += 4) {
          let r = d[i];
          let g = d[i + 1];
          let b = d[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (filterMode === 'magic') {
            // Clear Scanner "ชัดเจน (Magic Color)":
            // Whiten page background shadow, boost contrast of text and color seals
            const threshold = Math.max(90, 165 - shadowThreshold * 0.85);
            if (lum > threshold) {
              const boost = (lum - threshold) / (255 - threshold);
              r = Math.min(255, r + (255 - r) * (0.65 + boost * 0.35));
              g = Math.min(255, g + (255 - g) * (0.65 + boost * 0.35));
              b = Math.min(255, b + (255 - b) * (0.65 + boost * 0.35));
            } else {
              // Darken text/ink slightly for crisp reading
              r = Math.max(0, r * 0.85);
              g = Math.max(0, g * 0.85);
              b = Math.max(0, b * 0.85);
            }
            r = factor * (r - 128) + 128 + bright;
            g = factor * (g - 128) + 128 + bright;
            b = factor * (b - 128) + 128 + bright;
          } else if (filterMode === 'document') {
            // Clear Scanner "เอกสาร (Document)":
            // Clean paper with balanced grayscale text
            const threshold = Math.max(80, 155 - shadowThreshold * 0.7);
            if (lum > threshold) {
              const clean = Math.min(255, lum + (255 - lum) * 0.8);
              r = clean;
              g = clean;
              b = clean;
            } else {
              const dark = lum * 0.8;
              r = dark;
              g = dark;
              b = dark;
            }
            r = factor * (r - 128) + 128 + bright;
            g = factor * (g - 128) + 128 + bright;
            b = factor * (b - 128) + 128 + bright;
          } else if (filterMode === 'photo') {
            // Clear Scanner "รูปภาพ (Photo)": Natural colors with balanced lighting
            r = factor * (r - 128) + 128 + bright + 5;
            g = factor * (g - 128) + 128 + bright + 5;
            b = factor * (b - 128) + 128 + bright + 5;
          } else if (filterMode === 'color') {
            // Clear Scanner "สี (Vibrant Color)": Boost saturation and contrast
            r = factor * (r - 128) + 128 + bright + 15;
            g = factor * (g - 128) + 128 + bright + 15;
            b = factor * (b - 128) + 128 + bright + 15;
          } else if (filterMode === 'bw') {
            // High contrast B&W Scan
            const threshold = 135 + shadowThreshold * 0.6;
            const v = lum > threshold ? 255 : 0;
            r = v;
            g = v;
            b = v;
          }

          d[i] = Math.min(255, Math.max(0, r));
          d[i + 1] = Math.min(255, Math.max(0, g));
          d[i + 2] = Math.min(255, Math.max(0, b));
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
    });
  };

  /**
   * Handle initial file drop / camera shot
   */
  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const raw = e.target.result as string;
        setRawSourceImage(raw);
        setCropRotation(0);
        setCorners({
          tl: { x: 10, y: 10 },
          tr: { x: 90, y: 10 },
          br: { x: 90, y: 90 },
          bl: { x: 10, y: 90 },
        });
        setCurrentEditingIndex(null);
        setActiveStep('crop');
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Rotate source image before cropping
   */
  const rotateSourceImage = (deltaDeg: number) => {
    const newRot = (cropRotation + deltaDeg + 360) % 360;
    setCropRotation(newRot);
  };

  /**
   * Drag handle interaction for Corner & Edge adjustment
   */
  const handleDragStart = (handle: 'tl' | 'tr' | 'br' | 'bl' | 'tm' | 'rm' | 'bm' | 'lm', e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setActiveDraggingHandle(handle);
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!activeDraggingHandle || !cropContainerRef.current) return;
      const rect = cropContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      setCorners((prev) => {
        if (activeDraggingHandle === 'tl') return { ...prev, tl: { x: xPct, y: yPct } };
        if (activeDraggingHandle === 'tr') return { ...prev, tr: { x: xPct, y: yPct } };
        if (activeDraggingHandle === 'br') return { ...prev, br: { x: xPct, y: yPct } };
        if (activeDraggingHandle === 'bl') return { ...prev, bl: { x: xPct, y: yPct } };

        // Edge midpoints
        if (activeDraggingHandle === 'tm') {
          const deltaY = yPct - (prev.tl.y + prev.tr.y) / 2;
          return {
            ...prev,
            tl: { x: prev.tl.x, y: Math.max(0, Math.min(100, prev.tl.y + deltaY)) },
            tr: { x: prev.tr.x, y: Math.max(0, Math.min(100, prev.tr.y + deltaY)) },
          };
        }
        if (activeDraggingHandle === 'bm') {
          const deltaY = yPct - (prev.bl.y + prev.br.y) / 2;
          return {
            ...prev,
            bl: { x: prev.bl.x, y: Math.max(0, Math.min(100, prev.bl.y + deltaY)) },
            br: { x: prev.br.x, y: Math.max(0, Math.min(100, prev.br.y + deltaY)) },
          };
        }
        if (activeDraggingHandle === 'lm') {
          const deltaX = xPct - (prev.tl.x + prev.bl.x) / 2;
          return {
            ...prev,
            tl: { x: Math.max(0, Math.min(100, prev.tl.x + deltaX)), y: prev.tl.y },
            bl: { x: Math.max(0, Math.min(100, prev.bl.x + deltaX)), y: prev.bl.y },
          };
        }
        if (activeDraggingHandle === 'rm') {
          const deltaX = xPct - (prev.tr.x + prev.br.x) / 2;
          return {
            ...prev,
            tr: { x: Math.max(0, Math.min(100, prev.tr.x + deltaX)), y: prev.tr.y },
            br: { x: Math.max(0, Math.min(100, prev.br.x + deltaX)), y: prev.br.y },
          };
        }
        return prev;
      });
    },
    [activeDraggingHandle]
  );

  const handleDragEnd = useCallback(() => {
    setActiveDraggingHandle(null);
  }, []);

  useEffect(() => {
    if (activeDraggingHandle) {
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
  }, [activeDraggingHandle, handleDragMove, handleDragEnd]);

  /**
   * Confirm Crop & Perform Perspective Warp
   */
  const handleConfirmCrop = async () => {
    try {
      setIsProcessing(true);
      // First, rotate raw source if needed
      let srcToWarp = rawSourceImage;
      if (cropRotation !== 0) {
        srcToWarp = await applyClearScannerFilters(rawSourceImage, 'original', 0, 1.0, 0, cropRotation);
      }

      // Warp quadrilateral to flat rectangle
      const warped = await warpPerspective(srcToWarp, corners);
      setWarpedImage(warped);

      // Apply initial filter
      const processed = await applyClearScannerFilters(warped, activeFilter, brightness, contrast, shadowClean, 0);
      setPreviewResultUrl(processed);
      setActiveStep('filter');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดึงมุมมองภาพ');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Live filter update in Step 2
   */
  useEffect(() => {
    if (activeStep === 'filter' && warpedImage) {
      applyClearScannerFilters(warpedImage, activeFilter, brightness, contrast, shadowClean, 0).then(
        setPreviewResultUrl
      );
    }
  }, [activeStep, warpedImage, activeFilter, brightness, contrast, shadowClean]);

  /**
   * Save Page into Gallery
   */
  const handleSavePage = () => {
    const newPage: ScannedPage = {
      id: currentEditingIndex !== null ? pages[currentEditingIndex].id : `${Date.now()}`,
      originalDataUrl: rawSourceImage,
      warpedDataUrl: warpedImage,
      processedDataUrl: previewResultUrl,
      corners,
      rotation: cropRotation,
      filter: activeFilter,
      brightness,
      contrast,
      shadowClean,
    };

    if (currentEditingIndex !== null) {
      setPages((prev) => prev.map((p, i) => (i === currentEditingIndex ? newPage : p)));
    } else {
      setPages((prev) => [...prev, newPage]);
    }

    setActiveStep('gallery');
    setCurrentEditingIndex(null);
  };

  /**
   * Open page for re-cropping or re-editing
   */
  const handleEditPage = (idx: number) => {
    const page = pages[idx];
    setCurrentEditingIndex(idx);
    setRawSourceImage(page.originalDataUrl);
    setCropRotation(page.rotation);
    setCorners(page.corners);
    setWarpedImage(page.warpedDataUrl);
    setActiveFilter(page.filter);
    setBrightness(page.brightness);
    setContrast(page.contrast);
    setShadowClean(page.shadowClean);
    setPreviewResultUrl(page.processedDataUrl);
    setActiveStep('crop');
  };

  /**
   * Generate Combined Multi-Page PDF
   */
  const handleCreatePdf = async () => {
    if (pages.length === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();

      for (const p of pages) {
        const imageBytes = await fetch(p.processedDataUrl).then((r) => r.arrayBuffer());
        const img = await pdfDoc.embedJpg(imageBytes);
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
      downloadBlob(blob, `clear_scanned_document_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Midpoints calculation for edge handles
  const midpoints = {
    tm: { x: (corners.tl.x + corners.tr.x) / 2, y: (corners.tl.y + corners.tr.y) / 2 },
    rm: { x: (corners.tr.x + corners.br.x) / 2, y: (corners.tr.y + corners.br.y) / 2 },
    bm: { x: (corners.bl.x + corners.br.x) / 2, y: (corners.bl.y + corners.br.y) / 2 },
    lm: { x: (corners.tl.x + corners.bl.x) / 2, y: (corners.tl.y + corners.bl.y) / 2 },
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ------------------------------------------------------------- */}
      {/* STEP 1: CROP & PERSPECTIVE ADJUSTMENT ("การปรับขอบเขต") */}
      {/* ------------------------------------------------------------- */}
      {activeStep === 'crop' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1c292f] text-white">
          {/* Top Bar */}
          <div className="flex h-14 items-center justify-between border-b border-slate-700/60 px-4">
            <button
              type="button"
              onClick={() => setActiveStep(pages.length > 0 ? 'gallery' : 'gallery')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-wide text-slate-100">
              การปรับขอบเขต (ดึงมุม 4 จุดได้อย่างอิสระ)
            </span>
            <div className="w-9" />
          </div>

          {/* Canvas / Image Crop Workspace */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            <div
              ref={cropContainerRef}
              className="relative select-none overflow-hidden rounded-lg shadow-2xl"
              style={{
                maxHeight: '75vh',
                maxWidth: '90vw',
                touchAction: 'none',
              }}
            >
              <img
                src={rawSourceImage}
                alt="Crop Target"
                style={{
                  transform: `rotate(${cropRotation}deg)`,
                  maxHeight: '75vh',
                  maxWidth: '90vw',
                }}
                className="pointer-events-none block select-none object-contain"
                draggable={false}
              />

              {/* Perspective Polygon & Dark Mask Overlay */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {/* Connecting border polygon */}
                <polygon
                  points={`${corners.tl.x}%,${corners.tl.y}% ${corners.tr.x}%,${corners.tr.y}% ${corners.br.x}%,${corners.br.y}% ${corners.bl.x}%,${corners.bl.y}%`}
                  fill="rgba(34, 197, 94, 0.12)"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                />
              </svg>

              {/* 4 Corner Handles (Draggable) */}
              {[
                { id: 'tl', pos: corners.tl, label: 'มุมบนซ้าย' },
                { id: 'tr', pos: corners.tr, label: 'มุมบนขวา' },
                { id: 'br', pos: corners.br, label: 'มุมล่างขวา' },
                { id: 'bl', pos: corners.bl, label: 'มุมล่างซ้าย' },
              ].map((h) => (
                <div
                  key={h.id}
                  onMouseDown={(e) => handleDragStart(h.id as any, e)}
                  onTouchStart={(e) => handleDragStart(h.id as any, e)}
                  style={{
                    left: `${h.pos.x}%`,
                    top: `${h.pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-20 flex h-9 w-9 cursor-grab items-center justify-center active:cursor-grabbing"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md ring-4 ring-emerald-500/40">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                </div>
              ))}

              {/* 4 Edge Midpoint Handles (Draggable) */}
              {[
                { id: 'tm', pos: midpoints.tm },
                { id: 'rm', pos: midpoints.rm },
                { id: 'bm', pos: midpoints.bm },
                { id: 'lm', pos: midpoints.lm },
              ].map((m) => (
                <div
                  key={m.id}
                  onMouseDown={(e) => handleDragStart(m.id as any, e)}
                  onTouchStart={(e) => handleDragStart(m.id as any, e)}
                  style={{
                    left: `${m.pos.x}%`,
                    top: `${m.pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-10 flex h-7 w-7 cursor-grab items-center justify-center active:cursor-grabbing"
                >
                  <div className="h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Toolbar (Matching Clear Scanner App) */}
          <div className="flex h-20 items-center justify-around border-t border-slate-700/60 bg-[#162126] px-4">
            <button
              type="button"
              onClick={() =>
                setCorners({
                  tl: { x: 0, y: 0 },
                  tr: { x: 100, y: 0 },
                  br: { x: 100, y: 100 },
                  bl: { x: 0, y: 100 },
                })
              }
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="เต็มรูป"
            >
              <Maximize2 className="h-5 w-5" />
              <span className="text-[10px]">เต็มรูป</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setCorners({
                  tl: { x: 8, y: 8 },
                  tr: { x: 92, y: 8 },
                  br: { x: 92, y: 92 },
                  bl: { x: 8, y: 92 },
                })
              }
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="รีเซ็ตกรอบ"
            >
              <Minimize2 className="h-5 w-5" />
              <span className="text-[10px]">รีเซ็ตกรอบ</span>
            </button>

            <button
              type="button"
              onClick={() => rotateSourceImage(-90)}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="หมุนซ้าย"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="text-[10px]">หมุนซ้าย</span>
            </button>

            <button
              type="button"
              onClick={() => rotateSourceImage(90)}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="หมุนขวา"
            >
              <RotateCw className="h-5 w-5" />
              <span className="text-[10px]">หมุนขวา</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmCrop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6 stroke-[3]" />}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: CLEAR SCANNER FILTER VIEW (ภาพสแกนตรง & ฟิลเตอร์) */}
      {/* ------------------------------------------------------------- */}
      {activeStep === 'filter' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1c292f] text-white">
          {/* Top Bar with Clear Scanner Filter Tabs */}
          <div className="flex h-16 items-center justify-between border-b border-slate-700/60 bg-[#162126] px-4">
            <button
              type="button"
              onClick={() => setActiveStep('crop')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
              title="ย้อนกลับไปปรับมุม"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {[
                { id: 'original', label: 'ภาพเดิม', icon: ImageIcon },
                { id: 'photo', label: 'รูปภาพ', icon: Camera },
                { id: 'document', label: 'เอกสาร', icon: FileText },
                { id: 'magic', label: 'ชัดเจน', icon: Sparkles },
                { id: 'color', label: 'สี', icon: Palette },
                { id: 'bw', label: 'ขาว-ดำ', icon: Contrast },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id as ScannerFilter)}
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition ${
                      isActive
                        ? 'bg-slate-700 text-emerald-400 font-bold shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px]">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-9" />
          </div>

          {/* Preview Image Workspace */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
            {previewResultUrl ? (
              <img
                src={previewResultUrl}
                alt="Processed Scan"
                style={{ maxHeight: '72vh', maxWidth: '90vw' }}
                className="rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            )}

            {/* Floating Sliders Panel (When toggled) */}
            {showSliders && (
              <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">ปรับความสว่าง & ลบเงาละเอียด</span>
                  <button type="button" onClick={() => setShowSliders(false)} className="text-slate-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>ลบเงาพื้นหลังกระดาษ</span>
                      <span className="font-bold text-emerald-400">{shadowClean}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={shadowClean}
                      onChange={(e) => setShadowClean(Number(e.target.value))}
                      className="mt-1 w-full accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>ความสว่าง (Brightness)</span>
                      <span className="font-bold text-amber-400">{brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="mt-1 w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>ความคมชัด (Contrast)</span>
                      <span className="font-bold text-sky-400">{contrast.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="mt-1 w-full accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar (Matching Clear Scanner Action Bar) */}
          <div className="flex h-20 items-center justify-around border-t border-slate-700/60 bg-[#162126] px-4">
            <button
              type="button"
              onClick={() => setActiveStep('crop')}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="ปรับขอบเขตใหม่"
            >
              <Crop className="h-5 w-5" />
              <span className="text-[10px]">ปรับมุมใหม่</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const rot = await applyClearScannerFilters(warpedImage, 'original', 0, 1.0, 0, 270);
                setWarpedImage(rot);
              }}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="หมุนซ้าย"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="text-[10px]">หมุนซ้าย</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const rot = await applyClearScannerFilters(warpedImage, 'original', 0, 1.0, 0, 90);
                setWarpedImage(rot);
              }}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white"
              title="หมุนขวา"
            >
              <RotateCw className="h-5 w-5" />
              <span className="text-[10px]">หมุนขวา</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSliders(!showSliders)}
              className={`flex flex-col items-center gap-1 transition ${
                showSliders ? 'text-emerald-400' : 'text-slate-300 hover:text-white'
              }`}
              title="ปรับแต่งละเอียด"
            >
              <Sliders className="h-5 w-5" />
              <span className="text-[10px]">ปรับแสง</span>
            </button>

            <button
              type="button"
              onClick={handleSavePage}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600 active:scale-95"
              title="บันทึกหน้านี้"
            >
              <Check className="h-6 w-6 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: GALLERY / MAIN DASHBOARD (สแกนหลายหน้า + ส่งออก PDF) */}
      {/* ------------------------------------------------------------- */}
      {activeStep === 'gallery' && (
        <div className="space-y-6">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
              <Camera className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              สแกนเอกสาร (Doc Scanner สไตล์ Clear Scanner)
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ถ่ายรูป ปรับมุม 4 จุดได้อย่างอิสระ ลบเงา ทำพื้นหลังขาวใส และรวมหลายหน้าเป็น PDF
            </p>
          </div>

          {/* Upload Dropzone */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <FileDropzone
              accept="image/*"
              multiple={false}
              onFilesSelected={handleFilesSelected}
              title="ถ่ายรูปจากกล้อง หรือเลือกรูปถ่ายเอกสาร"
              subtitle="ระบบจะเปิดหน้าต่างดึงมุมมอง 4 จุด (Perspective Crop) ให้ปรับได้อย่างอิสระ"
              buttonText="เปิดกล้อง / เลือกรูปถ่าย"
            />
          </div>

          {/* Gallery Pages */}
          {pages.length > 0 && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      เอกสารที่สแกนแล้ว ({pages.length} หน้า)
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      คลิกที่รูปเพื่อดึงมุมใหม่ หรือเปลี่ยนฟิลเตอร์
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
                        onClick={() => handleEditPage(idx)}
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                          <span className="flex items-center gap-1 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm">
                            <Crop className="h-3.5 w-3.5" /> ปรับมุม / ฟิลเตอร์
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleEditPage(idx)}
                          className="text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          แก้ไขมุม
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
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/50 px-6 py-3.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <Plus className="h-4 w-4" /> ถ่าย / สแกนหน้าถัดไป
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelected(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCreatePdf}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3.5 text-base font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      กำลังสร้าง PDF รวมทุกหน้า...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      ดาวน์โหลด PDF ({pages.length} หน้า)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
