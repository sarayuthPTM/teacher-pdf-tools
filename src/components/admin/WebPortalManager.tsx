import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  RotateCcw,
  CloudUpload,
  CheckCircle2,
  Loader2,
  School,
  BookOpen,
  HardDrive,
  BarChart3,
  Palette,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  loadWebsites,
  saveWebsites,
  addWebsite,
  updateWebsite,
  deleteWebsite,
  resetWebsitesToDefault,
  WebPortalItem,
  syncWebsitesToCloud,
} from '../../lib/website-service';

export const WebPortalManager: React.FC = () => {
  const [websites, setWebsites] = useState<WebPortalItem[]>([]);
  const [isEditing, setIsEditing] = useState<WebPortalItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Omit<WebPortalItem, 'id' | 'order'>>({
    title: '',
    url: '',
    description: '',
    category: 'school',
    iconType: 'globe',
    openMode: 'new_tab',
    isActive: true,
  });

  useEffect(() => {
    setWebsites(loadWebsites());
  }, []);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) {
      alert('กรุณากรอกชื่อเว็บไซต์และ URL ให้ครบถ้วน');
      return;
    }

    addWebsite(formData);
    setWebsites(loadWebsites());
    setIsAdding(false);
    resetForm();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    updateWebsite(isEditing.id, formData);
    setWebsites(loadWebsites());
    setIsEditing(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      description: '',
      category: 'school',
      iconType: 'globe',
      openMode: 'new_tab',
      isActive: true,
    });
  };

  const startEdit = (site: WebPortalItem) => {
    setIsEditing(site);
    setIsAdding(false);
    setFormData({
      title: site.title,
      url: site.url,
      description: site.description || '',
      category: site.category,
      iconType: site.iconType,
      openMode: site.openMode,
      isActive: site.isActive,
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`คุณต้องการลบเว็บไซต์ "${title}" ออกจากระบบใช่หรือไม่?`)) {
      deleteWebsite(id);
      setWebsites(loadWebsites());
    }
  };

  const handleToggleActive = (site: WebPortalItem) => {
    updateWebsite(site.id, { isActive: !site.isActive });
    setWebsites(loadWebsites());
  };

  const handleResetDefaults = () => {
    if (confirm('คุณต้องการรีเซ็ตรายการเว็บไซต์กลับเป็นค่าเริ่มต้นใช่หรือไม่?')) {
      const reset = resetWebsitesToDefault();
      setWebsites(reset);
    }
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    const success = await syncWebsitesToCloud(websites);
    setIsSyncing(false);
    if (success) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } else {
      alert('ไม่สามารถเชื่อมต่อ Google Sheets ได้ กรุณาตรวจสอบ URL ในแท็บการตั้งค่า');
    }
  };

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case 'school':
        return <School className="h-4 w-4" />;
      case 'book':
        return <BookOpen className="h-4 w-4" />;
      case 'drive':
        return <HardDrive className="h-4 w-4" />;
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'palette':
        return <Palette className="h-4 w-4" />;
      case 'file':
        return <FileText className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Globe className="h-5 w-5 text-sky-500" />
            จัดการเว็บไซต์และระบบออนไลน์ภายนอก (Web Portal)
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            เพิ่ม แก้ไข และจัดระเบียบลิงก์เว็บสำหรับคุณครูที่จะแสดงในแถบไซด์บาร์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            ) : syncSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <CloudUpload className="h-4 w-4 text-sky-500" />
            )}
            ซิงค์ลง Google Sheets
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            รีเซ็ตค่าเริ่มต้น
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
              resetForm();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            + เพิ่มเว็บไซต์ใหม่
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal or Inline Panel */}
      {(isAdding || isEditing) && (
        <form
          onSubmit={isEditing ? handleSaveEdit : handleSaveAdd}
          className="rounded-3xl border border-sky-200 bg-sky-50/40 p-6 dark:border-sky-900/60 dark:bg-slate-900/90"
        >
          <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
            {isEditing ? `✏️ แก้ไขเว็บไซต์: ${isEditing.title}` : '➕ เพิ่มเว็บไซต์ใหม่ในระบบ'}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                ชื่อเว็บไซต์ / ระบบ *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="เช่น ระบบ SGS (วัดและประเมินผล)"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                URL เว็บไซต์ (ต้องขึ้นต้นด้วย https://) *
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://sgs.bopp-obec.info/"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                คำอธิบายสั้นๆ
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="เช่น บันทึกคะแนนและพิมพ์เอกสาร ปพ. ออนไลน์"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  หมวดหมู่
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="school">งานโรงเรียน</option>
                  <option value="official">งานราชการ</option>
                  <option value="teaching">สื่อการสอน</option>
                  <option value="general">ทั่วไป</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  ไอคอนแสดงผล
                </label>
                <select
                  value={formData.iconType}
                  onChange={(e) => setFormData({ ...formData, iconType: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="globe">🌐 ลูกโลก (Globe)</option>
                  <option value="school">🏫 โรงเรียน (School)</option>
                  <option value="file">📑 เอกสาร/PA (File)</option>
                  <option value="book">📖 หนังสือ/สารบรรณ (Book)</option>
                  <option value="chart">📊 กราฟ/SGS (Chart)</option>
                  <option value="palette">🎨 งานศิลป์/Canva (Palette)</option>
                  <option value="drive">📁 ไดรฟ์/จัดเก็บ (Drive)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setIsEditing(null);
              }}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
            >
              {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกเว็บไซต์'}
            </button>
          </div>
        </form>
      )}

      {/* Website Cards List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h4 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">
          รายการเว็บไซต์ที่เปิดใช้งานอยู่ในขณะนี้ ({websites.length} เว็บไซต์)
        </h4>

        <div className="space-y-3">
          {websites.map((site) => (
            <div
              key={site.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                site.isActive
                  ? 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70'
                  : 'border-slate-200/40 bg-slate-100/40 opacity-60 dark:border-slate-800/40 dark:bg-slate-800/20'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-sky-400 dark:ring-slate-700">
                  {renderIcon(site.iconType)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-slate-800 dark:text-white">{site.title}</h5>
                    <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {site.category === 'school'
                        ? 'งานโรงเรียน'
                        : site.category === 'official'
                        ? 'งานราชการ'
                        : site.category === 'teaching'
                        ? 'สื่อการสอน'
                        : 'ทั่วไป'}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {site.description || site.url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Toggle Active */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(site)}
                  className={`rounded-lg p-2 transition ${
                    site.isActive
                      ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={site.isActive ? 'ซ่อนจากไซด์บาร์' : 'แสดงบนไซด์บาร์'}
                >
                  {site.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => startEdit(site)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  title="แก้ไขข้อมูล"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                {/* Open Test */}
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                  title="ทดสอบเปิดลิงก์"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(site.id, site.title)}
                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                  title="ลบเว็บไซต์นี้"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
