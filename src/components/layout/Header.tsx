import React from 'react';
import { FileText, Sparkles, Moon, Sun, ArrowLeft, ShieldCheck } from 'lucide-react';
import { ToolId } from '../../types';

interface HeaderProps {
  currentTool: ToolId | null;
  onBackToHome: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
  siteTitle?: string;
  siteSubtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onBackToHome,
  isDark,
  onToggleTheme,
  onOpenAdmin,
  siteTitle = 'เครื่องมือสำหรับครู (PDF & Office Tools)',
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500" />
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          {currentTool ? (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">กลับหน้าแรก</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-pink-500 text-white shadow-md">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                  {siteTitle}
                </h1>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  ระบบออนไลน์ จัดการเอกสารและงานสำนักงาน
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            ประมวลผลบนเครื่อง ปลอดภัย 100%
          </div>

          {/* Admin Access Button */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
            title="เข้าสู่ระบบผู้ดูแล (Admin)"
          >
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">ผู้ดูแล (Admin)</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="สลับโหมดมืด/สว่าง"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

