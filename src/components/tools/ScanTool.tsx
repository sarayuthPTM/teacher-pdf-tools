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
  ZapOff,
  FileCheck,
  Maximize2,
  Minimize2,
  Undo2,
  FileText,
  Image as ImageIcon,
  Palette,
  Share2,
  FileImage,
  Send,
  Scan,
  RefreshCw,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { downloadBlob } from '../../lib/pdf-service';

export type ScannerFilter = 'original' | 'photo' | 'document' | 'magic' | 'color' | 'bw';
export type ScanMode = 'single' | 'batch' | 'idcard' | 'passport';

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

  // Workflow State: 'gallery' | 'camera' | 'crop' | 'filter'
  const [activeStep, setActiveStep] = useState<'gallery' | 'camera' | 'crop' | 'filter'>('gallery');
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null);

  // Live Camera State (Photo 1)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<ScanMode>('single');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashEffect, setIsFlashEffect] = useState<boolean>(false);

  // Crop / Perspective State (Photo 2)
  const [rawSourceImage, setRawSourceImage] = useState<string>('');
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [isFullCrop, setIsFullCrop] = useState<boolean>(false);
  const [corners, setCorners] = useState<CornerPoints>({
    tl: { x: 10, y: 8 },
    tr: { x: 90, y: 8 },
    br: { x: 88, y: 92 },
    bl: { x: 12, y: 92 },
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
   * Camera Hardware Control
   */
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาเลือกรูปภาพจากเครื่อง');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setHasCameraPermission(false);
      setCameraError(err.message || 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง หรือเลือกรูปภาพจากเครื่อง');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  const handleOpenLiveCamera = (mode: ScanMode = 'single') => {
    setCameraMode(mode);
    setActiveStep('camera');
    startCamera(facingMode);
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch (e) {
        console.warn('Torch not supported:', e);
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsFlashEffect(true);
    setTimeout(() => setIsFlashEffect(false), 200);

    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;

    const canvas = captureCanvasRef.current || document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setRawSourceImage(photoDataUrl);
    setCropRotation(0);
    setIsFullCrop(false);

    if (cameraMode === 'idcard') {
      setCorners({
        tl: { x: 15, y: 30 },
        tr: { x: 85, y: 30 },
        br: { x: 85, y: 70 },
        bl: { x: 15, y: 70 },
      });
    } else if (cameraMode === 'passport') {
      setCorners({
        tl: { x: 20, y: 15 },
        tr: { x: 80, y: 15 },
        br: { x: 80, y: 85 },
        bl: { x: 20, y: 85 },
      });
    } else {
      setCorners({
        tl: { x: 10, y: 8 },
        tr: { x: 90, y: 8 },
        br: { x: 88, y: 92 },
        bl: { x: 12, y: 92 },
      });
    }

    stopCamera();
    setActiveStep('crop');
  };

  const handleExitCamera = () => {
    stopCamera();
    setActiveStep('gallery');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /**
   * Perspective Transform / Homography Warp algorithm
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
            const threshold = Math.max(90, 165 - shadowThreshold * 0.85);
            if (lum > threshold) {
              const boost = (lum - threshold) / (255 - threshold);
              r = Math.min(255, r + (255 - r) * (0.65 + boost * 0.35));
              g = Math.min(255, g + (255 - g) * (0.65 + boost * 0.35));
              b = Math.min(255, b + (255 - b) * (0.65 + boost * 0.35));
            } else {
              r = Math.max(0, r * 0.85);
              g = Math.max(0, g * 0.85);
              b = Math.max(0, b * 0.85);
            }
            r = factor * (r - 128) + 128 + bright;
            g = factor * (g - 128) + 128 + bright;
            b = factor * (b - 128) + 128 + bright;
          } else if (filterMode === 'document') {
            // Clear Scanner "เอกสาร (Document)":
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
            r = factor * (r - 128) + 128 + bright + 5;
            g = factor * (g - 128) + 128 + bright + 5;
            b = factor * (b - 128) + 128 + bright + 5;
          } else if (filterMode === 'color') {
            r = factor * (r - 128) + 128 + bright + 15;
            g = factor * (g - 128) + 128 + bright + 15;
            b = factor * (b - 128) + 128 + bright + 15;
          } else if (filterMode === 'bw') {
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
        setIsFullCrop(false);
        setCorners({
          tl: { x: 10, y: 8 },
          tr: { x: 90, y: 8 },
          br: { x: 88, y: 92 },
          bl: { x: 12, y: 92 },
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
  const handleDragStart = (
    handle: 'tl' | 'tr' | 'br' | 'bl' | 'tm' | 'rm' | 'bm' | 'lm',
    e: React.MouseEvent | React.TouchEvent
  ) => {
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
      let srcToWarp = rawSourceImage;
      if (cropRotation !== 0) {
        srcToWarp = await applyClearScannerFilters(rawSourceImage, 'original', 0, 1.0, 0, cropRotation);
      }

      const warped = await warpPerspective(srcToWarp, corners);
      setWarpedImage(warped);

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
      setActiveStep('gallery');
      setCurrentEditingIndex(null);
    } else {
      setPages((prev) => [...prev, newPage]);
      if (cameraMode === 'batch') {
        setActiveStep('camera');
        startCamera(facingMode);
      } else {
        setActiveStep('gallery');
      }
    }
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

  /**
   * Download as Images (JPG / ZIP)
   */
  const handleDownloadImages = async () => {
    if (pages.length === 0) return;
    try {
      setIsProcessing(true);
      if (pages.length === 1) {
        const blob = await fetch(pages[0].processedDataUrl).then((r) => r.blob());
        saveAs(blob, `scanned_image_${Date.now()}.jpg`);
      } else {
        const zip = new JSZip();
        for (let i = 0; i < pages.length; i++) {
          const blob = await fetch(pages[i].processedDataUrl).then((r) => r.blob());
          zip.file(`scanned_page_${i + 1}.jpg`, blob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `scanned_images_${Date.now()}.zip`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Share Scanned Document
   */
  const handleShare = async () => {
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
      const pdfFile = new File([pdfBytes as any], `scanned_doc_${Date.now()}.pdf`, {
        type: 'application/pdf',
      });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: 'เอกสารสแกน (Clear Scanner)',
          text: `เอกสารสแกน ${pages.length} หน้า จากระบบเครื่องมือครู`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'เอกสารสแกน (Clear Scanner)',
          text: `เอกสารสแกน ${pages.length} หน้า จากระบบเครื่องมือครู`,
          url: window.location.href,
        });
      } else {
        downloadBlob(new Blob([pdfBytes as any], { type: 'application/pdf' }), `scanned_doc_${Date.now()}.pdf`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการแชร์');
      }
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
      {/* STEP 0: LIVE CAMERA SCANNER VIEW (เหมือน Clear Scanner รูปที่ 1) */}
      {/* ------------------------------------------------------------- */}
      {activeStep === 'camera' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
          {/* Top Bar */}
          <div className="flex h-14 items-center justify-between px-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
            <button
              type="button"
              onClick={handleExitCamera}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md hover:bg-black/80 transition"
              title="ปิดกล้อง"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="text-xs font-semibold tracking-wider text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
              {cameraMode === 'single'
                ? 'หน้าเดียว'
                : cameraMode === 'batch'
                ? `หลายหน้า (${pages.length} หน้า)`
                : cameraMode === 'idcard'
                ? 'บัตรประจำตัว'
                : 'หนังสือเดินทาง'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition ${
                  isTorchOn ? 'bg-amber-400 text-slate-900 shadow-md' : 'bg-black/50 text-white/90 hover:bg-black/80'
                }`}
                title="ไฟฉาย"
              >
                {isTorchOn ? <Zap className="h-5 w-5 fill-current" /> : <ZapOff className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md hover:bg-black/80 transition"
                title="สลับกล้องหน้า/หลัง"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Camera Viewfinder & Simulated Cyan Document Detection Overlay */}
          <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black">
            {cameraError ? (
              <div className="max-w-md p-6 text-center text-white/90">
                <Camera className="mx-auto h-12 w-12 text-rose-400 mb-3 opacity-80" />
                <p className="text-sm font-semibold mb-2">ไม่สามารถเข้าถึงกล้องถ่ายรูปได้</p>
                <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                  <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition">
                    เลือกรูปภาพจากเครื่องแทน
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          stopCamera();
                          handleFilesSelected(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <canvas ref={captureCanvasRef} className="hidden" />

                {/* Shutter flash effect */}
                {isFlashEffect && <div className="absolute inset-0 z-30 bg-white animate-out fade-out duration-200" />}

                {/* Simulated Document Cyan Detection Highlight Overlay (Matching Image 1 cyan paper!) */}
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
                  {cameraMode === 'idcard' ? (
                    <div className="relative w-full max-w-[340px] aspect-[8.5/5.4] rounded-2xl border-2 border-cyan-400/90 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.3)] flex flex-col items-center justify-center backdrop-blur-[1px]">
                      <CreditCard className="h-8 w-8 text-cyan-300 opacity-80 mb-1" />
                      <span className="text-[11px] font-bold text-cyan-200 drop-shadow">วางบัตรประชาชน / ใบขับขี่ในกรอบ</span>
                    </div>
                  ) : cameraMode === 'passport' ? (
                    <div className="relative w-full max-w-[320px] aspect-[3/4] rounded-2xl border-2 border-cyan-400/90 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.3)] flex flex-col items-center justify-center backdrop-blur-[1px]">
                      <BookOpen className="h-8 w-8 text-cyan-300 opacity-80 mb-1" />
                      <span className="text-[11px] font-bold text-cyan-200 drop-shadow">วางหนังสือเดินทางในกรอบ</span>
                    </div>
                  ) : (
                    /* Document Cyan Polygon (Matching Image 1 cyan paper!) */
                    <div className="relative w-[78%] max-w-[420px] aspect-[1/1.38] rounded-xl border-2 border-cyan-400/80 bg-cyan-400/20 shadow-[0_0_25px_rgba(34,211,238,0.25)] flex flex-col items-center justify-center backdrop-blur-[1px] animate-pulse">
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
                      <span className="text-[11px] font-bold text-cyan-100 drop-shadow bg-black/40 px-3 py-1 rounded-full">
                        ตรวจพบเอกสารอัตโนมัติ
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom Area: Controls & Mode Switcher (Matching Clear Scanner Photo 1) */}
          <div className="z-20 bg-gradient-to-t from-black via-black/95 to-black/60 pb-6 pt-3 px-4 flex flex-col gap-4">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-around text-xs tracking-wide">
              {[
                { id: 'single' as ScanMode, label: 'หน้าเดียว' },
                { id: 'batch' as ScanMode, label: 'หลายหน้า' },
                { id: 'idcard' as ScanMode, label: 'บัตรประจำตัว' },
                { id: 'passport' as ScanMode, label: 'หนังสือเดินทาง' },
              ].map((m) => {
                const isActive = cameraMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCameraMode(m.id)}
                    className={`relative py-1 font-semibold transition ${
                      isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{m.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Shutter Button and Gallery / Done shortcuts */}
            <div className="flex items-center justify-between px-6">
              {/* Left: Gallery Import */}
              <label
                className="flex flex-col items-center gap-1 cursor-pointer text-slate-300 hover:text-white transition active:scale-95"
                title="เลือกรูปจากคลังภาพ"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/90 border border-slate-700 shadow-md">
                  <ImageIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-[10px]">คลังภาพ</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      stopCamera();
                      handleFilesSelected(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
              </label>

              {/* Center: Big Clear Scanner Shutter Button */}
              <button
                type="button"
                onClick={capturePhoto}
                disabled={Boolean(cameraError)}
                className="group relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 bg-black/40 shadow-2xl transition hover:scale-105 active:scale-95 disabled:opacity-40"
                title="กดถ่ายสแกนเอกสาร"
              >
                <div className="h-16 w-16 rounded-full bg-[#00897b] group-hover:bg-[#00796b] shadow-inner transition flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full border border-white/30" />
                </div>
              </button>

              {/* Right: Done button or thumbnail in batch mode */}
              {cameraMode === 'batch' && pages.length > 0 ? (
                <button
                  type="button"
                  onClick={handleExitCamera}
                  className="flex flex-col items-center gap-1 text-emerald-400 hover:text-emerald-300 transition active:scale-95"
                  title="ดูเอกสารทั้งหมดที่สแกน"
                >
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md font-bold text-xs ring-2 ring-emerald-400">
                    {pages.length}
                  </div>
                  <span className="text-[10px] font-bold">เสร็จสิ้น</span>
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: CROP & PERSPECTIVE ADJUSTMENT ("การปรับขอบเขต" รูปที่ 2) */}
      {/* ------------------------------------------------------------- */}
      {activeStep === 'crop' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#132627] text-white select-none">
          {/* Top Bar (Matching Photo 2) */}
          <div className="flex h-14 items-center justify-between border-b border-slate-700/50 bg-[#162a2b] px-4">
            <button
              type="button"
              onClick={() => {
                if (pages.length > 0) setActiveStep('gallery');
                else handleOpenLiveCamera(cameraMode);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition"
              title="ยกเลิก"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold tracking-wide text-white">
              การปรับขอบเขต
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

              {/* Perspective Polygon, Solid Green Border Lines & 3x3 Alignment Grid */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
              >
                {/* Semi-transparent green highlighted document area */}
                <polygon
                  points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                  fill="rgba(34, 197, 94, 0.12)"
                />

                {/* 3x3 Grid Guidelines (Clear Scanner style) */}
                <line
                  x1={corners.tl.x + (corners.bl.x - corners.tl.x) / 3}
                  y1={corners.tl.y + (corners.bl.y - corners.tl.y) / 3}
                  x2={corners.tr.x + (corners.br.x - corners.tr.x) / 3}
                  y2={corners.tr.y + (corners.br.y - corners.tr.y) / 3}
                  stroke="#22c55e"
                  strokeWidth="0.6"
                  strokeDasharray="1.5,1.5"
                  opacity="0.8"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={corners.tl.x + ((corners.bl.x - corners.tl.x) * 2) / 3}
                  y1={corners.tl.y + ((corners.bl.y - corners.tl.y) * 2) / 3}
                  x2={corners.tr.x + ((corners.br.x - corners.tr.x) * 2) / 3}
                  y2={corners.tr.y + ((corners.br.y - corners.tr.y) * 2) / 3}
                  stroke="#22c55e"
                  strokeWidth="0.6"
                  strokeDasharray="1.5,1.5"
                  opacity="0.8"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={corners.tl.x + (corners.tr.x - corners.tl.x) / 3}
                  y1={corners.tl.y + (corners.tr.y - corners.tl.y) / 3}
                  x2={corners.bl.x + (corners.br.x - corners.bl.x) / 3}
                  y2={corners.bl.y + (corners.br.y - corners.bl.y) / 3}
                  stroke="#22c55e"
                  strokeWidth="0.6"
                  strokeDasharray="1.5,1.5"
                  opacity="0.8"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={corners.tl.x + ((corners.tr.x - corners.tl.x) * 2) / 3}
                  y1={corners.tl.y + ((corners.tr.y - corners.tl.y) * 2) / 3}
                  x2={corners.bl.x + ((corners.br.x - corners.bl.x) * 2) / 3}
                  y2={corners.bl.y + ((corners.br.y - corners.bl.y) * 2) / 3}
                  stroke="#22c55e"
                  strokeWidth="0.6"
                  strokeDasharray="1.5,1.5"
                  opacity="0.8"
                  vectorEffect="non-scaling-stroke"
                />

                {/* 4 Outer Border Lines (Solid Bright Green lines connecting all points) */}
                <line
                  x1={corners.tl.x}
                  y1={corners.tl.y}
                  x2={corners.tr.x}
                  y2={corners.tr.y}
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={corners.tr.x}
                  y1={corners.tr.y}
                  x2={corners.br.x}
                  y2={corners.br.y}
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={corners.br.x}
                  y1={corners.br.y}
                  x2={corners.bl.x}
                  y2={corners.bl.y}
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={corners.bl.x}
                  y1={corners.bl.y}
                  x2={corners.tl.x}
                  y2={corners.tl.y}
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* 4 Corner Handles - Green Circles (Matching Image 2) */}
              {[
                { id: 'tl', pos: corners.tl },
                { id: 'tr', pos: corners.tr },
                { id: 'br', pos: corners.br },
                { id: 'bl', pos: corners.bl },
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
                  className="absolute z-20 flex h-10 w-10 cursor-grab items-center justify-center active:cursor-grabbing"
                >
                  <div className="h-7 w-7 rounded-full border-[2.5px] border-[#22c55e] bg-emerald-500/25 shadow-lg flex items-center justify-center backdrop-blur-xs">
                    <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  </div>
                </div>
              ))}

              {/* 4 Edge Midpoint Handles - Green Squares (Matching Image 2) */}
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
                  className="absolute z-10 flex h-8 w-8 cursor-grab items-center justify-center active:cursor-grabbing"
                >
                  <div className="h-4 w-4 bg-[#22c55e] border border-white shadow-md rounded-[2px]" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Toolbar (Matching Clear Scanner App Photo 2: 4 Buttons) */}
          <div className="flex h-20 items-center justify-around border-t border-slate-700/50 bg-[#0f1f21] px-6">
            {/* 1. Full-frame / Auto Crop */}
            <button
              type="button"
              onClick={() => {
                if (isFullCrop) {
                  setCorners({
                    tl: { x: 10, y: 8 },
                    tr: { x: 90, y: 8 },
                    br: { x: 88, y: 92 },
                    bl: { x: 12, y: 92 },
                  });
                  setIsFullCrop(false);
                } else {
                  setCorners({
                    tl: { x: 0, y: 0 },
                    tr: { x: 100, y: 0 },
                    br: { x: 100, y: 100 },
                    bl: { x: 0, y: 100 },
                  });
                  setIsFullCrop(true);
                }
              }}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white active:scale-95 transition"
              title={isFullCrop ? 'กรอบเอกสาร' : 'เต็มรูป'}
            >
              <Scan className="h-6 w-6 stroke-[2.2]" />
            </button>

            {/* 2. Rotate Left */}
            <button
              type="button"
              onClick={() => rotateSourceImage(-90)}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white active:scale-95 transition"
              title="หมุนซ้าย"
            >
              <RotateCcw className="h-6 w-6 stroke-[2.2]" />
            </button>

            {/* 3. Rotate Right */}
            <button
              type="button"
              onClick={() => rotateSourceImage(90)}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white active:scale-95 transition"
              title="หมุนขวา"
            >
              <RotateCw className="h-6 w-6 stroke-[2.2]" />
            </button>

            {/* 4. Confirm Checkmark */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmCrop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600 active:scale-90 disabled:opacity-50"
              title="ยืนยันการปรับขอบเขต"
            >
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-7 w-7 stroke-[3]" />}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: CLEAR SCANNER FILTER VIEW (ภาพสแกนตรง & ฟิลเตอร์) */}
      {/* ------------------------------------------------------------- */}
      {activeStep === 'filter' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#132627] text-white select-none">
          {/* Top Bar with Clear Scanner Filter Tabs */}
          <div className="flex h-16 items-center justify-between border-b border-slate-700/60 bg-[#162a2b] px-4">
            <button
              type="button"
              onClick={() => setActiveStep('crop')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
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
          <div className="flex h-20 items-center justify-around border-t border-slate-700/60 bg-[#0f1f21] px-4">
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
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
              <Camera className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              สแกนเอกสาร (Clear Scanner Web)
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ถ่ายรูปสดหรือเลือกภาพ ปรับขอบเขต 8 จุด ลบเงาขาวใส และรวมหลายหน้าเป็น PDF
            </p>
          </div>

          {/* Main Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Launch Live Camera Scanner */}
            <button
              type="button"
              onClick={() => handleOpenLiveCamera('single')}
              className="group flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-6 text-center shadow-soft hover:border-emerald-500 hover:shadow-lg transition active:scale-[0.98] dark:border-emerald-500/30 dark:bg-emerald-950/20"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md group-hover:scale-110 transition">
                <Camera className="h-8 w-8" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  📷 เปิดกล้องสแกนเอกสาร (Live Camera)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ถ่ายรูปจากกล้องสด พร้อมตรวจจับขอบเอกสารอัตโนมัติแบบ Clear Scanner
                </p>
              </div>
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                เปิดใช้งานกล้องทันที
              </span>
            </button>

            {/* 2. Upload / Drop existing file */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-center">
              <FileDropzone
                accept="image/*"
                multiple={false}
                onFilesSelected={handleFilesSelected}
                title="เลือกรูปภาพจากเครื่อง"
                subtitle="นำเข้ารูปถ่ายเอกสารที่มีอยู่แล้วมาปรับมุมและลบเงา"
                buttonText="เลือกไฟล์รูปภาพ"
              />
            </div>
          </div>

          {/* Quick Mode Launch Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">โหมดกล้องด่วน:</span>
            {[
              { id: 'single' as ScanMode, label: 'หน้าเดียว', icon: FileText },
              { id: 'batch' as ScanMode, label: 'หลายหน้าต่อเนื่อง', icon: Layers },
              { id: 'idcard' as ScanMode, label: 'บัตรประชาชน/ใบขับขี่', icon: CreditCard },
              { id: 'passport' as ScanMode, label: 'หนังสือเดินทาง', icon: BookOpen },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleOpenLiveCamera(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  <Icon className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Gallery Pages */}
          {pages.length > 0 && (
            <div className="space-y-6 pt-4">
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

              {/* Action Buttons: Multi-export Options */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {/* Add more pages via Camera */}
                  <button
                    type="button"
                    onClick={() => handleOpenLiveCamera('batch')}
                    className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 px-5 py-3.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100/60 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200"
                  >
                    <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> + ถ่ายสแกนหน้าถัดไป
                  </button>

                  {/* 1. Download as PDF */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCreatePdf}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    บันทึกเป็น PDF ({pages.length} หน้า)
                  </button>

                  {/* 2. Download as Images (JPG / ZIP) */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleDownloadImages}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
                  >
                    <FileImage className="h-4 w-4" />
                    {pages.length === 1 ? 'บันทึกเป็นรูปภาพ (JPG)' : `บันทึกรูปทั้งหมด (ZIP ${pages.length} ภาพ)`}
                  </button>

                  {/* 3. Share / Send To */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleShare}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3.5 text-sm font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
                  >
                    <Share2 className="h-4 w-4" />
                    แชร์ / ส่งเข้า LINE, Drive, อีเมล
                  </button>
                </div>

                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    กำลังประมวลผลไฟล์... กรุณารอสักครู่
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
