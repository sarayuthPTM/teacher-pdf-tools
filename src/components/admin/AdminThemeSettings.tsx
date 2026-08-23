import React, { useState } from 'react';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Save,
  Check,
  RefreshCcw,
  Upload,
  Trash2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { SiteSettings } from '../../types/admin';

interface AdminThemeSettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminThemeSettings: React.FC<AdminThemeSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [siteTitle, setSiteTitle] = useState(settings.siteTitle);
  const [heroTitle, setHeroTitle] = useState(
    settings.heroTitle || 'ระบบจัดการเอกสาร PDF ใช้งานง่ายในที่เดียว'
  );
  const [siteSubtitle, setSiteSubtitle] = useState(settings.siteSubtitle);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#0284c7');

  // Background image state
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    settings.backgroundImageUrl || null
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 25
  );
  const [backgroundBlur, setBackgroundBlur] = useState<number>(
    settings.backgroundBlur !== undefined ? settings.backgroundBlur : 0
  );

  // Footer state
  const [footerSecurityText, setFooterSecurityText] = useState(
    settings.footerSecurityText ||
      'ปลอดภัย 100%: ไฟล์ทั้งหมดประมวลผลภายในเบราว์เซอร์ของคุณ ไม่ถูกส่งไปเก็บที่เซิร์ฟเวอร์'
  );
  const [footerBadge1, setFooterBadge1] = useState(
    settings.footerBadge1 || 'ทำงานรวดเร็ว ไม่มีสะดุด'
  );
  const [footerBadge2, setFooterBadge2] = useState(
    settings.footerBadge2 || 'รองรับไฟล์สูงสุด 50MB'
  );
  const [footerCopyright, setFooterCopyright] = useState(
    settings.footerCopyright ||
      'ระบบเครื่องมือ PDF และงานสำนักงาน สำหรับโรงเรียนและองค์กร · พัฒนาด้วยเทคโนโลยีเว็บมาตรฐาน'
  );

  const [saved, setSaved] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพต้องไม่เกิน 5MB ครับ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      siteTitle,
      heroTitle,
      siteSubtitle,
      fontFamily,
      primaryColor,
      backgroundImageUrl,
      backgroundOpacity,
      backgroundBlur,
      footerSecurityText,
      footerBadge1,
      footerBadge2,
      footerCopyright,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            ปรับแต่งหน้าตา & ธีมเว็บไซต์ (Theme & Styling)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ปรับเปลี่ยนชื่อโรงเรียน, อัปโหลดภาพพื้นหลังเว็บพร้อมปรับความเข้ม, โทนสี และฟอนต์
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'บันทึกเรียบร้อยแล้ว' : 'บันทึกการตั้งค่า'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Section 1: Site Identity */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Type className="h-4 w-4 text-indigo-600" />
              1. ชื่อระบบและข้อความหน้าแรก
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ชื่อเว็บไซต์ / ชื่อระบบบนแถบด้านบน (Site Title)
                </label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="เช่น เครื่องมือสำหรับครู (PDF & Office Tools)..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  หัวข้อใหญ่ต้อนรับตรงกลางหน้า (Hero Headline)
                </label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="เช่น ระบบจัดการเอกสาร PDF ใช้งานง่ายในที่เดียว"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  คำอธิบายระบบตรงกลางหน้า (Hero Subtitle)
                </label>
                <textarea
                  rows={3}
                  value={siteSubtitle}
                  onChange={(e) => setSiteSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Background Image Upload & Opacity Control (NEW!) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <ImageIcon className="h-4 w-4 text-sky-600" />
              2. ภาพพื้นหลังเว็บไซต์ & ความเข้ม (Background Image & Opacity)
            </h3>

            <div className="space-y-5">
              {/* Upload Input & Preview */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    อัปโหลดรูปภาพพื้นหลัง (JPG, PNG, WebP สูงสุด 5MB)
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Upload className="h-4 w-4 text-indigo-600" />
                    <span>คลิกเลือกรูปภาพจากเครื่องเพื่อใช้เป็นพื้นหลัง</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {backgroundImageUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="relative h-20 w-32 overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700 bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                    >
                      <div
                        className="absolute inset-0 bg-white dark:bg-slate-900"
                        style={{ opacity: 1 - backgroundOpacity / 100 }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setBackgroundImageUrl(null)}
                      className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3 w-3" /> ลบรูปพื้นหลัง
                    </button>
                  </div>
                )}
              </div>

              {/* Opacity Slider */}
              {backgroundImageUrl && (
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>ความเข้ม / ความชัดของภาพพื้นหลัง (Opacity):</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {backgroundOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="90"
                      step="5"
                      value={backgroundOpacity}
                      onChange={(e) => setBackgroundOpacity(parseInt(e.target.value, 10))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>จางบางเบา (5%)</span>
                      <span>ปานกลาง (25% แนะนำ)</span>
                      <span>ชัดเจนมาก (90%)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>ความเบลอของพื้นหลัง (Blur Effect):</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {backgroundBlur}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="1"
                      value={backgroundBlur}
                      onChange={(e) => setBackgroundBlur(parseInt(e.target.value, 10))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Typography & Colors */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Palette className="h-4 w-4 text-pink-600" />
              3. รูปแบบตัวอักษร & โทนสีระบบ
            </h3>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ฟอนต์ภาษาไทย (Font Family)
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'Prompt', name: 'Prompt (พร้อมต์ - มินิมอล ทันสมัย)' },
                    { id: 'Sarabun', name: 'Sarabun (สารบรรณ - มาตรฐานราชการ)' },
                    { id: 'Kanit', name: 'Kanit (คณิต - คมชัด โดดเด่น)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id as any)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs transition ${
                        fontFamily === f.id
                          ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span>{f.name}</span>
                      {fontFamily === f.id && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  สีธีมหลัก (Primary Brand Color)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 p-2 text-xs uppercase dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  {/* Preset Colors */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: 'ฟ้า-น้ำเงิน', color: '#0284c7' },
                      { name: 'ม่วงราชการ', color: '#7c3aed' },
                      { name: 'เขียวมิ้นต์', color: '#059669' },
                      { name: 'ส้มแสด', color: '#ea580c' },
                      { name: 'ชมพูเข้ม', color: '#db2777' },
                    ].map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => setPrimaryColor(preset.color)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: preset.color }}
                        />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Footer Settings */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <ImageIcon className="h-4 w-4 text-emerald-600" />
              4. ข้อความส่วนท้ายเว็บไซต์ (Footer Settings)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ข้อความความปลอดภัย / คำชี้แจง (Security Note)
                </label>
                <input
                  type="text"
                  value={footerSecurityText}
                  onChange={(e) => setFooterSecurityText(e.target.value)}
                  placeholder="เช่น ปลอดภัย 100%: ไฟล์ทั้งหมดประมวลผลภายในเบราว์เซอร์ของคุณ..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    ป้ายข้อความย่อยที่ 1 (Badge 1)
                  </label>
                  <input
                    type="text"
                    value={footerBadge1}
                    onChange={(e) => setFooterBadge1(e.target.value)}
                    placeholder="เช่น ทำงานรวดเร็ว ไม่มีสะดุด"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    ป้ายข้อความย่อยที่ 2 (Badge 2)
                  </label>
                  <input
                    type="text"
                    value={footerBadge2}
                    onChange={(e) => setFooterBadge2(e.target.value)}
                    placeholder="เช่น รองรับไฟล์สูงสุด 50MB"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  ข้อความลิขสิทธิ์ / หน่วยงานด้านล่างสุด (Copyright / Attribution)
                </label>
                <input
                  type="text"
                  value={footerCopyright}
                  onChange={(e) => setFooterCopyright(e.target.value)}
                  placeholder="เช่น ระบบเครื่องมือ PDF และงานสำนักงาน สำหรับโรงเรียน..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-400">ตัวอย่างการแสดงผล (Preview)</span>

            {/* Header Preview */}
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              {backgroundImageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center pointer-events-none"
                  style={{
                    backgroundImage: `url(${backgroundImageUrl})`,
                    opacity: backgroundOpacity / 100,
                    filter: backgroundBlur ? `blur(${backgroundBlur}px)` : 'none',
                  }}
                />
              )}
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold text-slate-400">ส่วนหัวเว็บ</span>
                <h1
                  style={{ fontFamily: fontFamily }}
                  className="text-base font-bold text-slate-900 line-clamp-2 dark:text-white"
                >
                  {siteTitle || 'เครื่องมือสำหรับครู'}
                </h1>
                <p
                  style={{ fontFamily: fontFamily }}
                  className="text-[11px] leading-relaxed text-slate-600 line-clamp-3 dark:text-slate-300"
                >
                  {siteSubtitle || 'คำอธิบายระบบ...'}
                </p>
              </div>
            </div>

            {/* Footer Preview */}
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-[10px] font-bold text-slate-400">ส่วนท้ายเว็บ (Footer)</span>
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">
                🛡️ {footerSecurityText}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-500">
                <span>⚡ {footerBadge1}</span>
                <span>🔒 {footerBadge2}</span>
              </div>
              <p className="border-t border-slate-200/60 pt-2 text-[10px] text-slate-400 line-clamp-2 dark:border-slate-800">
                {footerCopyright}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
