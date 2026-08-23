import React, { useState } from 'react';
import { KeyRound, Download, Upload, Trash2, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SiteSettings } from '../../types/admin';
import { resetAllStats } from '../../lib/analytics-service';

interface AdminSecurityProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [currentPin, setCurrentPin] = useState(settings.adminPin || '1234');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert('รหัส PIN ต้องมีอย่างน้อย 4 หลัก');
      return;
    }
    if (newPin !== confirmPin) {
      alert('รหัส PIN ใหม่และยืนยันรหัส PIN ไม่ตรงกัน');
      return;
    }

    onUpdateSettings({
      ...settings,
      adminPin: newPin,
    });
    setCurrentPin(newPin);
    setNewPin('');
    setConfirmPin('');
    setPinMessage('เปลี่ยนรหัส PIN สำเร็จเรียบร้อยแล้ว!');
    setTimeout(() => setPinMessage(null), 3000);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `teacher_tools_settings_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          onUpdateSettings(imported);
          alert('กู้คืนการตั้งค่าจากไฟล์สำรองสำเร็จแล้ว!');
        } catch (err) {
          alert('ไฟล์สำรองไม่ถูกต้อง');
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleResetStats = () => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตสถิติการใช้งานทั้งหมดเป็น 0? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) {
      resetAllStats();
      alert('รีเซ็ตสถิติการใช้งานเรียบร้อยแล้ว');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          ความปลอดภัย & สำรองข้อมูล (Security & Backup)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          เปลี่ยนรหัสผ่านผู้ดูแลระบบ สำรองไฟล์การตั้งค่า และจัดการล้างข้อมูลสถิติ
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change PIN */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            เปลี่ยนรหัส Admin PIN
          </h3>

          <form onSubmit={handleUpdatePin} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                รหัส PIN ใหม่ (อย่างน้อย 4 หลัก)
              </label>
              <input
                type="password"
                maxLength={10}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="กรอกรหัสใหม่..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                ยืนยันรหัส PIN ใหม่อีกครั้ง
              </label>
              <input
                type="password"
                maxLength={10}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="กรอกรหัสใหม่อีกครั้ง..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            {pinMessage && (
              <p className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <Check className="h-4 w-4" /> {pinMessage}
              </p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              บันทึกรหัส PIN ใหม่
            </button>
          </form>
        </div>

        {/* Backup & Restore */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              สำรองและกู้คืนการตั้งค่า
            </h3>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-4 w-4" /> ดาวน์โหลดไฟล์สำรองการตั้งค่า (.JSON)
              </button>

              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100/50 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
                <Upload className="h-4 w-4" /> อัปโหลดไฟล์เพื่อกู้คืนการตั้งค่า
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset Stats */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-900/40 dark:bg-rose-950/20">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              โซนอันตราย (Danger Zone)
            </h3>
            <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400">
              ล้างประวัติการใช้งานและรีเซ็ตสถิติทุกอย่างกลับเป็นศูนย์
            </p>
            <button
              type="button"
              onClick={handleResetStats}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> ล้างสถิติทั้งหมด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
