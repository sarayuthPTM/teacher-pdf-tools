import React, { useState, useRef, useEffect } from 'react';
import {
  FileEdit,
  Type,
  Square,
  Circle,
  PenTool,
  Highlighter,
  Image as ImageIcon,
  Eraser,
  Undo2,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Loader2,
  Check,
  Move,
  Palette,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { FileDropzone } from '../ui/FileDropzone';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type ToolType = 'select' | 'text' | 'whiteout' | 'pen' | 'highlighter' | 'rect' | 'circle' | 'image';

interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  isBold: boolean;
  bgWhite: boolean;
}

interface ShapeItem {
  id: string;
  type: 'whiteout' | 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
}

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

interface ImageItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imgDataUrl: string;
}

interface PageAnnotations {
  texts: TextItem[];
  shapes: ShapeItem[];
  drawings: DrawingPath[];
  images: ImageItem[];
}

export const EditPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Active Tool State
  const [activeTool, setActiveTool] = useState<ToolType>('text');
  const [currentColor, setCurrentColor] = useState<string>('#1e293b');
  const [currentFontSize, setCurrentFontSize] = useState<number>(18);
  const [currentFontFamily, setCurrentFontFamily] = useState<string>('Sarabun');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [bgWhiteout, setBgWhiteout] = useState<boolean>(false);

  // Annotations map per page number
  const [annotations, setAnnotations] = useState<Record<number, PageAnnotations>>({});

  // Canvas interaction refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [tempShape, setTempShape] = useState<ShapeItem | null>(null);

  // Editing Text State
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');

  const handleFilesSelected = async (files: File[]) => {
    if (!files[0]) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
      setCurrentPage(1);
      setAnnotations({});
    } catch (error) {
      console.error('Failed to load PDF:', error);
      alert('ไม่สามารถเปิดไฟล์ PDF นี้ได้ กรุณาลองไฟล์อื่น');
    } finally {
      setIsLoading(false);
    }
  };

  // Render current PDF page
  useEffect(() => {
    if (!pdfDoc) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!canvas || !overlayCanvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlayCanvas.width = viewport.width;
        overlayCanvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (!isCancelled) {
          redrawOverlay();
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  // Redraw all annotations on overlay canvas
  const redrawOverlay = () => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const pageAnn = annotations[currentPage] || { texts: [], shapes: [], drawings: [], images: [] };

    // 1. Draw Drawings (Pen / Highlighter)
    pageAnn.drawings.forEach((d) => {
      if (d.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.strokeWidth * (scale / 1.0);
      ctx.globalAlpha = d.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(d.points[0].x * scale, d.points[0].y * scale);
      for (let i = 1; i < d.points.length; i++) {
        ctx.lineTo(d.points[i].x * scale, d.points[i].y * scale);
      }
      ctx.stroke();
      ctx.restore();
    });

    // 2. Draw Shapes (Whiteout / Rect / Circle)
    pageAnn.shapes.forEach((s) => {
      ctx.save();
      const x = s.x * scale;
      const y = s.y * scale;
      const w = s.width * scale;
      const h = s.height * scale;

      if (s.type === 'whiteout') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, h);
      } else if (s.type === 'rect') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.strokeWidth * scale;
        if (s.fillColor) {
          ctx.fillStyle = s.fillColor;
          ctx.fillRect(x, y, w, h);
        }
        ctx.strokeRect(x, y, w, h);
      } else if (s.type === 'circle') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.strokeWidth * scale;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
        if (s.fillColor) {
          ctx.fillStyle = s.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      }
      ctx.restore();
    });

    // 3. Draw Images
    pageAnn.images.forEach((imgItem) => {
      const img = new Image();
      img.src = imgItem.imgDataUrl;
      img.onload = () => {
        ctx.drawImage(img, imgItem.x * scale, imgItem.y * scale, imgItem.width * scale, imgItem.height * scale);
      };
    });

    // 4. Draw Text Items
    pageAnn.texts.forEach((t) => {
      if (t.id === editingTextId) return; // Hide when currently typing in DOM input
      ctx.save();
      const fontSize = t.fontSize * scale;
      ctx.font = `${t.isBold ? 'bold' : 'normal'} ${fontSize}px ${t.fontFamily}, Sarabun, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textBaseline = 'top';

      if (t.bgWhite) {
        const metrics = ctx.measureText(t.text);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(t.x * scale - 2, t.y * scale - 2, metrics.width + 4, fontSize + 4);
        ctx.fillStyle = t.color;
      }

      ctx.fillText(t.text, t.x * scale, t.y * scale);
      ctx.restore();
    });
  };

  useEffect(() => {
    redrawOverlay();
  }, [annotations, currentPage, editingTextId]);

  // Pointer Handlers for Drawing & Placing Shapes
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (activeTool === 'text') {
      const newText: TextItem = {
        id: `${Date.now()}`,
        x: coords.x,
        y: coords.y,
        text: 'พิมพ์ข้อความที่นี่',
        fontSize: currentFontSize,
        color: currentColor,
        fontFamily: currentFontFamily,
        isBold,
        bgWhite: bgWhiteout,
      };

      setAnnotations((prev) => {
        const cur = prev[currentPage] || { texts: [], shapes: [], drawings: [], images: [] };
        return {
          ...prev,
          [currentPage]: {
            ...cur,
            texts: [...cur.texts, newText],
          },
        };
      });

      setEditingTextId(newText.id);
      setEditingTextValue(newText.text);
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setIsDrawing(true);
      setCurrentPoints([coords]);
    } else if (activeTool === 'whiteout' || activeTool === 'rect' || activeTool === 'circle') {
      setIsDrawing(true);
      setStartPos(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPoints((prev) => [...prev, coords]);

      // Live draw
      const overlay = overlayCanvasRef.current;
      const ctx = overlay?.getContext('2d');
      if (ctx && currentPoints.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = (activeTool === 'highlighter' ? 18 : strokeWidth) * scale;
        ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const last = currentPoints[currentPoints.length - 1];
        ctx.moveTo(last.x * scale, last.y * scale);
        ctx.lineTo(coords.x * scale, coords.y * scale);
        ctx.stroke();
        ctx.restore();
      }
    } else if (startPos && (activeTool === 'whiteout' || activeTool === 'rect' || activeTool === 'circle')) {
      const w = coords.x - startPos.x;
      const h = coords.y - startPos.y;
      setTempShape({
        id: 'temp',
        type: activeTool,
        x: w < 0 ? coords.x : startPos.x,
        y: h < 0 ? coords.y : startPos.y,
        width: Math.abs(w),
        height: Math.abs(h),
        color: currentColor,
        strokeWidth,
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 1) {
      const newDrawing: DrawingPath = {
        id: `${Date.now()}`,
        points: currentPoints,
        color: currentColor,
        strokeWidth: activeTool === 'highlighter' ? 18 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
      };

      setAnnotations((prev) => {
        const cur = prev[currentPage] || { texts: [], shapes: [], drawings: [], images: [] };
        return {
          ...prev,
          [currentPage]: {
            ...cur,
            drawings: [...cur.drawings, newDrawing],
          },
        };
      });
      setCurrentPoints([]);
    } else if (tempShape && tempShape.width > 3 && tempShape.height > 3) {
      const finalShape: ShapeItem = {
        ...tempShape,
        id: `${Date.now()}`,
      };

      setAnnotations((prev) => {
        const cur = prev[currentPage] || { texts: [], shapes: [], drawings: [], images: [] };
        return {
          ...prev,
          [currentPage]: {
            ...cur,
            shapes: [...cur.shapes, finalShape],
          },
        };
      });
      setTempShape(null);
      setStartPos(null);
    }
    redrawOverlay();
  };

  // Image Upload Stamp
  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgDataUrl = event.target?.result as string;
      const newImg: ImageItem = {
        id: `${Date.now()}`,
        x: 50,
        y: 50,
        width: 140,
        height: 140,
        imgDataUrl,
      };

      setAnnotations((prev) => {
        const cur = prev[currentPage] || { texts: [], shapes: [], drawings: [], images: [] };
        return {
          ...prev,
          [currentPage]: {
            ...cur,
            images: [...cur.images, newImg],
          },
        };
      });
    };
    reader.readAsDataURL(file);
  };

  // Undo last action on current page
  const handleUndo = () => {
    setAnnotations((prev) => {
      const cur = prev[currentPage];
      if (!cur) return prev;

      if (cur.texts.length > 0) {
        return { ...prev, [currentPage]: { ...cur, texts: cur.texts.slice(0, -1) } };
      }
      if (cur.shapes.length > 0) {
        return { ...prev, [currentPage]: { ...cur, shapes: cur.shapes.slice(0, -1) } };
      }
      if (cur.drawings.length > 0) {
        return { ...prev, [currentPage]: { ...cur, drawings: cur.drawings.slice(0, -1) } };
      }
      if (cur.images.length > 0) {
        return { ...prev, [currentPage]: { ...cur, images: cur.images.slice(0, -1) } };
      }
      return prev;
    });
  };

  const handleClearPage = () => {
    if (confirm('คุณต้องการล้างการแก้ไขทั้งหมดในหน้านี้ใช่หรือไม่?')) {
      setAnnotations((prev) => ({
        ...prev,
        [currentPage]: { texts: [], shapes: [], drawings: [], images: [] },
      }));
    }
  };

  // Save text when finished editing
  const saveEditingText = () => {
    if (!editingTextId) return;
    setAnnotations((prev) => {
      const cur = prev[currentPage] || { texts: [], shapes: [], drawings: [], images: [] };
      return {
        ...prev,
        [currentPage]: {
          ...cur,
          texts: cur.texts.map((t) => (t.id === editingTextId ? { ...t, text: editingTextValue } : t)),
        },
      };
    });
    setEditingTextId(null);
  };

  // Export Modified PDF
  const handleExportPdf = async () => {
    if (!file || !pdfDoc) return;
    setIsExporting(true);

    try {
      const originalPdfBytes = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(originalPdfBytes);

      for (let pNum = 1; pNum <= numPages; pNum++) {
        const pageAnn = annotations[pNum];
        if (!pageAnn) continue;

        // Render annotations onto offscreen canvas for crisp embedding
        const page = await pdfDoc.getPage(pNum);
        const viewport = page.getViewport({ scale: 2.0 }); // high res

        const offCanvas = document.createElement('canvas');
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) continue;

        const pScale = 2.0;

        // Draw whiteouts & shapes
        pageAnn.shapes.forEach((s) => {
          ctx.save();
          if (s.type === 'whiteout') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.x * pScale, s.y * pScale, s.width * pScale, s.height * pScale);
          } else if (s.type === 'rect') {
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.strokeWidth * pScale;
            ctx.strokeRect(s.x * pScale, s.y * pScale, s.width * pScale, s.height * pScale);
          } else if (s.type === 'circle') {
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.strokeWidth * pScale;
            ctx.beginPath();
            ctx.ellipse(
              (s.x + s.width / 2) * pScale,
              (s.y + s.height / 2) * pScale,
              Math.abs((s.width / 2) * pScale),
              Math.abs((s.height / 2) * pScale),
              0,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }
          ctx.restore();
        });

        // Draw drawings
        pageAnn.drawings.forEach((d) => {
          if (d.points.length < 2) return;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = d.color;
          ctx.lineWidth = d.strokeWidth * pScale;
          ctx.globalAlpha = d.opacity;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(d.points[0].x * pScale, d.points[0].y * pScale);
          for (let i = 1; i < d.points.length; i++) {
            ctx.lineTo(d.points[i].x * pScale, d.points[i].y * pScale);
          }
          ctx.stroke();
          ctx.restore();
        });

        // Draw texts
        pageAnn.texts.forEach((t) => {
          ctx.save();
          const fontSize = t.fontSize * pScale;
          ctx.font = `${t.isBold ? 'bold' : 'normal'} ${fontSize}px ${t.fontFamily}, Sarabun, sans-serif`;
          ctx.fillStyle = t.color;
          ctx.textBaseline = 'top';

          if (t.bgWhite) {
            const metrics = ctx.measureText(t.text);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(t.x * pScale - 2, t.y * pScale - 2, metrics.width + 4, fontSize + 4);
            ctx.fillStyle = t.color;
          }

          ctx.fillText(t.text, t.x * pScale, t.y * pScale);
          ctx.restore();
        });

        // Embed overlay image onto PDF page
        const pngDataUrl = offCanvas.toDataURL('image/png');
        const pngImageBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());
        const embeddedPng = await pdfLibDoc.embedPng(pngImageBytes);

        const targetPage = pdfLibDoc.getPage(pNum - 1);
        const { width, height } = targetPage.getSize();

        targetPage.drawImage(embeddedPng, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const modifiedPdfBytes = await pdfLibDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${file.name}`;
      link.click();
    } catch (error) {
      console.error('Failed to export edited PDF:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกเอกสาร PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md">
          <FileEdit className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แก้ไขไฟล์ PDF (Edit PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          พิมพ์ข้อความ ลบ/ปิดทับข้อความเดิม ขีดเขียน ไฮไลท์ และแทรกรูปภาพลงบนไฟล์ PDF ได้สะดวก 100%
        </p>
      </div>

      {!file ? (
        <div className="mx-auto max-w-2xl">
          <FileDropzone
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            title="ลากไฟล์ PDF มาวางเพื่อเริ่มแก้ไข"
            buttonText="เลือกไฟล์ PDF"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Editing Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            {/* Tool Selection Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'text' as ToolType, label: 'พิมพ์ข้อความ', icon: Type },
                { id: 'whiteout' as ToolType, label: 'ลบ/ปิดทับ', icon: Eraser },
                { id: 'pen' as ToolType, label: 'ปากกาวาด', icon: PenTool },
                { id: 'highlighter' as ToolType, label: 'ไฮไลท์', icon: Highlighter },
                { id: 'rect' as ToolType, label: 'กรอบสี่เหลี่ยม', icon: Square },
                { id: 'circle' as ToolType, label: 'วงกลม', icon: Circle },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setActiveTool(tool.id);
                      setEditingTextId(null);
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      activeTool === tool.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}

              {/* Insert Image Stamp Button */}
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                <span>แทรกรูป</span>
                <input type="file" accept="image/*" onChange={handleImageInsert} className="hidden" />
              </label>
            </div>

            {/* Customizer Sub-Bar (Font size, Color, Whiteout toggle) */}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 lg:border-t-0 lg:pt-0">
              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">สี:</span>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Font Size (when text tool active) */}
              {activeTool === 'text' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <span>ขนาด:</span>
                  <select
                    value={currentFontSize}
                    onChange={(e) => setCurrentFontSize(parseInt(e.target.value, 10))}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
                      <option key={size} value={size}>
                        {size}pt
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Font Family */}
              {activeTool === 'text' && (
                <select
                  value={currentFontFamily}
                  onChange={(e) => setCurrentFontFamily(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="Sarabun">Sarabun (สารบรรณ)</option>
                  <option value="Prompt">Prompt (พร้อมต์)</option>
                  <option value="Kanit">Kanit (คณิต)</option>
                </select>
              )}

              {/* Undo & Clear buttons */}
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="ย้อนกลับการกระทำล่าสุด"
              >
                <Undo2 className="h-3.5 w-3.5" /> ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={handleClearPage}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="ล้างทั้งหมดในหน้านี้"
              >
                <Trash2 className="h-3.5 w-3.5" /> ล้างหน้านี้
              </button>
            </div>
          </div>

          {/* Page Navigator & Zoom */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                หน้า {currentPage} / {numPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.8, s - 0.2))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="ย่อขนาด"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-mono text-slate-500">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="ขยายขนาด"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Export Button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPdf}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? 'กำลังประมวลผลและสร้าง PDF...' : 'บันทึกและดาวน์โหลด PDF ที่แก้ไข'}
            </button>
          </div>

          {/* Interactive PDF Canvas Workspace */}
          <div
            ref={containerRef}
            className="relative flex justify-center overflow-auto rounded-3xl border border-slate-200/80 bg-slate-100 p-6 shadow-inner dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white">
              {/* Layer 1: PDF Rendered Canvas */}
              <canvas ref={canvasRef} className="block" />

              {/* Layer 2: Overlay Interactive Canvas */}
              <canvas
                ref={overlayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`absolute inset-0 cursor-crosshair ${
                  activeTool === 'text' ? 'cursor-text' : activeTool === 'whiteout' ? 'cursor-cell' : 'cursor-crosshair'
                }`}
              />

              {/* Floating Inline Text Editor (When typing text) */}
              {editingTextId && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(annotations[currentPage]?.texts.find((t) => t.id === editingTextId)?.x || 0) * scale}px`,
                    top: `${(annotations[currentPage]?.texts.find((t) => t.id === editingTextId)?.y || 0) * scale}px`,
                  }}
                  className="z-30 flex items-center gap-1 rounded-lg border-2 border-indigo-600 bg-white p-1 shadow-lg"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingTextValue}
                    onChange={(e) => setEditingTextValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditingText();
                    }}
                    style={{
                      fontSize: `${currentFontSize * scale}px`,
                      color: currentColor,
                      fontFamily: currentFontFamily,
                      fontWeight: isBold ? 'bold' : 'normal',
                    }}
                    className="bg-transparent px-1 outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveEditingText}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
