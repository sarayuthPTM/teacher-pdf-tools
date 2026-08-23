import React, { useState, useEffect, useRef } from 'react';
import QRCodeStyling, {
  DotType,
  CornerSquareType,
  CornerDotType,
  TypeNumber,
  ErrorCorrectionLevel,
  Mode,
  Options,
} from 'qr-code-styling';
import {
  QrCode,
  Download,
  Image as ImageIcon,
  Palette,
  Sliders,
  Type,
  Trash2,
  FileDown,
  Sparkles,
  Link,
  Phone,
  Wifi,
} from 'lucide-react';
import { downloadBlob } from '../../lib/pdf-service';
import { PDFDocument } from 'pdf-lib';

export const QRCodeTool: React.FC = () => {
  const [text, setText] = useState('https://www.google.com');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(0.3);
  const [logoMargin, setLogoMargin] = useState<number>(5);

  // Styling state
  const [dotColor, setDotColor] = useState('#0284c7');
  const [dotColor2, setDotColor2] = useState('#6366f1');
  const [useGradient, setUseGradient] = useState(true);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [transparentBg, setTransparentBg] = useState(false);

  const [dotType, setDotType] = useState<DotType>('rounded');
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded');
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot');
  const [cornerColor, setCornerColor] = useState('#0284c7');

  const [qrSize, setQrSize] = useState<number>(320);

  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);

  // Initialize QR instance
  useEffect(() => {
    qrCodeInstance.current = new QRCodeStyling({
      width: qrSize,
      height: qrSize,
      type: 'canvas',
      data: text,
      image: logoImage || undefined,
      margin: 10,
      qrOptions: {
        typeNumber: 0 as TypeNumber,
        mode: 'Byte' as Mode,
        errorCorrectionLevel: 'Q' as ErrorCorrectionLevel,
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: 'anonymous',
      },
      dotsOptions: {
        color: dotColor,
        type: dotType,
        gradient: useGradient
          ? {
              type: 'linear',
              rotation: 45,
              colorStops: [
                { offset: 0, color: dotColor },
                { offset: 1, color: dotColor2 },
              ],
            }
          : undefined,
      },
      backgroundOptions: {
        color: transparentBg ? 'transparent' : bgColor,
      },
      cornersSquareOptions: {
        color: cornerColor,
        type: cornerSquareType,
      },
      cornersDotOptions: {
        color: cornerColor,
        type: cornerDotType,
      },
    });

    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCodeInstance.current.append(qrRef.current);
    }
  }, []);

  // Update QR code on options change
  useEffect(() => {
    if (!qrCodeInstance.current) return;

    qrCodeInstance.current.update({
      data: text || 'https://www.google.com',
      image: logoImage || undefined,
      width: qrSize,
      height: qrSize,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: 'anonymous',
      },
      dotsOptions: {
        color: dotColor,
        type: dotType,
        gradient: useGradient
          ? {
              type: 'linear',
              rotation: 45,
              colorStops: [
                { offset: 0, color: dotColor },
                { offset: 1, color: dotColor2 },
              ],
            }
          : undefined,
      },
      backgroundOptions: {
        color: transparentBg ? 'transparent' : bgColor,
      },
      cornersSquareOptions: {
        color: cornerColor,
        type: cornerSquareType,
      },
      cornersDotOptions: {
        color: cornerColor,
        type: cornerDotType,
      },
    });
  }, [
    text,
    logoImage,
    logoSize,
    logoMargin,
    dotColor,
    dotColor2,
    useGradient,
    bgColor,
    transparentBg,
    dotType,
    cornerSquareType,
    cornerDotType,
    cornerColor,
    qrSize,
  ]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleDownload = (format: 'png' | 'svg') => {
    if (!qrCodeInstance.current) return;
    qrCodeInstance.current.download({
      name: `qrcode_${Date.now()}`,
      extension: format,
    });
  };

  const handleDownloadPdf = async () => {
    if (!qrCodeInstance.current) return;
    const blob = await qrCodeInstance.current.getRawData('png');
    if (!blob) return;

    const arrayBuffer = await (blob as Blob).arrayBuffer();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const pngImage = await pdfDoc.embedPng(arrayBuffer);
    
    // Center QR code on A4 page
    const qrWidth = 320;
    const qrHeight = 320;
    const x = (595.28 - qrWidth) / 2;
    const y = (841.89 - qrHeight) / 2;

    page.drawImage(pngImage, {
      x,
      y,
      width: qrWidth,
      height: qrHeight,
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    downloadBlob(pdfBlob, `qrcode_${Date.now()}.pdf`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
          <QrCode className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          สร้าง QR Code ใส่โลโก้ & ปรับแต่งดีไซน์
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ปรับแต่งรูปทรง สีสัน ไล่เฉดสี และใส่ตราสัญลักษณ์โรงเรียน/หน่วยงานตรงกลางได้อิสระ
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Side: Controls */}
        <div className="space-y-6 lg:col-span-7">
          {/* Content Input */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
              <Type className="h-4 w-4 text-sky-500" />
              1. ข้อมูลใน QR Code (ข้อความ หรือ ลิงก์)
            </h3>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="กรอก URL, ข้อความ, เบอร์โทรศัพท์..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 transition focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-sky-400"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setText('https://')}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Link className="h-3 w-3" /> ลิงก์ URL
              </button>
              <button
                type="button"
                onClick={() => setText('tel:0812345678')}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Phone className="h-3 w-3" /> เบอร์โทรศัพท์
              </button>
              <button
                type="button"
                onClick={() => setText('WIFI:T:WPA;S:School_WiFi;P:12345678;;')}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Wifi className="h-3 w-3" /> รหัส Wi-Fi
              </button>
            </div>
          </div>

          {/* Logo Center */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
              <ImageIcon className="h-4 w-4 text-indigo-500" />
              2. โลโก้ / ตราสัญลักษณ์ตรงกลาง (Logo)
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100/60 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
                <ImageIcon className="h-4 w-4" />
                <span>{logoImage ? 'เปลี่ยนรูปโลโก้' : 'อัปโหลดรูปโลโก้ (PNG/JPG)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {logoImage && (
                <div className="flex items-center gap-3">
                  <img
                    src={logoImage}
                    alt="Logo preview"
                    className="h-10 w-10 rounded-lg border border-slate-200 object-contain p-0.5 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoImage(null)}
                    className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ลบรูปออก
                  </button>
                </div>
              )}
            </div>

            {logoImage && (
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    ขนาดโลโก้: {Math.round(logoSize * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.15"
                    max="0.4"
                    step="0.02"
                    value={logoSize}
                    onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    ระยะขอบรอบโลโก้: {logoMargin}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={logoMargin}
                    onChange={(e) => setLogoMargin(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color & Gradient */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
              <Palette className="h-4 w-4 text-pink-500" />
              3. สีสันและลวดลาย (Colors & Gradient)
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สีหลักของ QR Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={dotColor}
                    onChange={(e) => {
                      setDotColor(e.target.value);
                      setCornerColor(e.target.value);
                    }}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={dotColor}
                    onChange={(e) => {
                      setDotColor(e.target.value);
                      setCornerColor(e.target.value);
                    }}
                    className="flex-1 rounded-lg border border-slate-300 p-1.5 text-xs uppercase dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สีไล่เฉด (Gradient สีที่สอง)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={dotColor2}
                    onChange={(e) => setDotColor2(e.target.value)}
                    disabled={!useGradient}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={useGradient}
                      onChange={(e) => setUseGradient(e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    เปิดใช้ไล่เฉดสี
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สีพื้นหลัง (Background)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    disabled={transparentBg}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    พื้นหลังโปร่งใส (Transparent)
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สีกรอบมุม (Corners)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cornerColor}
                    onChange={(e) => setCornerColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={cornerColor}
                    onChange={(e) => setCornerColor(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 p-1.5 text-xs uppercase dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shapes & Styles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
              <Sliders className="h-4 w-4 text-emerald-500" />
              4. รูปแบบและรูปทรงจุด (Shape Styles)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สไตล์ของจุด (Dots Pattern)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['rounded', 'dots', 'classy', 'classy-rounded', 'square', 'extra-rounded'] as DotType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDotType(type)}
                        className={`rounded-xl border p-2 text-xs font-medium capitalize transition ${
                          dotType === type
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    รูปทรงกรอบมุม (Corner Square)
                  </label>
                  <select
                    value={cornerSquareType}
                    onChange={(e) => setCornerSquareType(e.target.value as CornerSquareType)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="extra-rounded">มุมมนพิเศษ (Extra Rounded)</option>
                    <option value="dot">มุมวงกลม (Dot)</option>
                    <option value="square">มุมเหลี่ยม (Square)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    รูปทรงจุดในมุม (Corner Dot)
                  </label>
                  <select
                    value={cornerDotType}
                    onChange={(e) => setCornerDotType(e.target.value as CornerDotType)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="dot">จุดกลม (Dot)</option>
                    <option value="square">จุดเหลี่ยม (Square)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live Preview & Download */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" /> ตัวอย่างผลลัพธ์แบบสด (Live Preview)
              </span>
            </div>

            {/* QR Code Canvas Box */}
            <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-950/50">
              <div
                ref={qrRef}
                className="overflow-hidden rounded-xl shadow-md transition-transform duration-200 hover:scale-105"
              />
            </div>

            {/* Download Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleDownload('png')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 active:scale-98"
              >
                <Download className="h-4 w-4" /> ดาวน์โหลดรูปภาพ .PNG (ความละเอียดสูง)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload('svg')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileDown className="h-3.5 w-3.5" /> ดาวน์โหลด .SVG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileDown className="h-3.5 w-3.5 text-rose-500" /> ดาวน์โหลด .PDF A4
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
