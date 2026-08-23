import React, { useState } from 'react';
import { Megaphone, Save, Check, Eye, EyeOff } from 'lucide-react';
import { SiteSettings } from '../../types/admin';

interface AdminAnnouncementProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminAnnouncement: React.FC<AdminAnnouncementProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [enabled, setEnabled] = useState(settings.announcement?.enabled ?? true);
  const [text, setText] = useState(settings.announcement?.text || '');
  const [type, setType] = useState<'info' | 'warning' | 'success'>(
    settings.announcement?.type || 'info'
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      announcement: {
        enabled,
        text,
        type,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            ประกาศและข่าวสารหน้าเว็บ (Announcement Bar)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            เปิดแถบข้อความแจ้งเตือนด้านบนสุดของเว็บไซต์ เพื่อสื่อสารกับคุณครูและผู้ใช้งาน
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'บันทึกเรียบร้อยแล้ว' : 'บันทึกประกาศ'}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                สถานะแถบประกาศ
              </h4>
              <p className="text-xs text-slate-500">
                เปิดหรือปิดการแสดงแถบประกาศด้านบนของเว็บ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                enabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {enabled ? 'กำลังแสดงแถบประกาศ' : 'ซ่อนประกาศ'}
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              ข้อความประกาศ
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการประกาศที่นี่..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
              รูปแบบแถบประกาศ
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  id: 'info',
                  title: '📢 ข่าวสารทั่วไป (สีฟ้า)',
                  desc: 'เหมาะสำหรับข่าวสาร ข้อมูลทั่วไป',
                  style: 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
                },
                {
                  id: 'warning',
                  title: '⚠️ แจ้งเตือนด่วน (สีส้ม/เหลือง)',
                  desc: 'เหมาะสำหรับแจ้งปิดปรับปรุง หรือเรื่องเร่งด่วน',
                  style: 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                },
                {
                  id: 'success',
                  title: '✅ ข่าวดี / ประชาสัมพันธ์ (สีเขียว)',
                  desc: 'เหมาะสำหรับอัปเดตฟีเจอร์ใหม่',
                  style: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id as any)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    type === opt.id
                      ? opt.style + ' border-2 shadow-sm font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{opt.title}</p>
                  <p className="mt-1 text-[11px] opacity-80">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
