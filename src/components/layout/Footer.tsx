import React from 'react';
import { ShieldCheck, Zap, Lock } from 'lucide-react';

interface FooterProps {
  securityText?: string;
  badge1?: string;
  badge2?: string;
  copyright?: string;
}

export const Footer: React.FC<FooterProps> = ({
  securityText = 'ปลอดภัย 100%: ไฟล์ทั้งหมดประมวลผลภายในเบราว์เซอร์ของคุณ ไม่ถูกส่งไปเก็บที่เซิร์ฟเวอร์',
  badge1 = 'ทำงานรวดเร็ว ไม่มีสะดุด',
  badge2 = 'รองรับไฟล์สูงสุด 50MB',
  copyright = 'ระบบเครื่องมือ PDF และงานสำนักงาน สำหรับโรงเรียนและองค์กร · พัฒนาด้วยเทคโนโลยีเว็บมาตรฐาน',
}) => {
  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white/50 py-8 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/50">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
            <span>{securityText}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            {badge1 && (
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> {badge1}
              </span>
            )}
            {badge2 && (
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-sky-500" /> {badge2}
              </span>
            )}
          </div>
        </div>
        {copyright && (
          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {copyright}
          </div>
        )}
      </div>
    </footer>
  );
};

