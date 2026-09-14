import React, { useState } from 'react';
import {
  BarChart3,
  Sliders,
  Palette,
  Megaphone,
  ShieldCheck,
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Bot,
  Mail,
  Menu,
  X,
} from 'lucide-react';
import { AdminTab, SiteSettings } from '../../types/admin';
import { ToolDefinition } from '../../types';
import { AdminDashboard } from './AdminDashboard';
import { AdminToolsManager } from './AdminToolsManager';
import { AdminAiSettings } from './AdminAiSettings';
import { AdminThemeSettings } from './AdminThemeSettings';
import { AdminAnnouncement } from './AdminAnnouncement';
import { AdminMessages } from './AdminMessages';
import { AdminSecurity } from './AdminSecurity';
import { getUnreadFeedbackCount } from '../../lib/feedback-service';

interface AdminLayoutProps {
  onExitAdmin: () => void;
  allTools: ToolDefinition[];
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onExitAdmin,
  allTools,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const unreadCount = getUnreadFeedbackCount();

  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'ภาพรวม & สถิติ',
      icon: BarChart3,
      desc: 'สถิติการใช้งานเครื่องมือและผู้เข้าชม',
    },
    {
      id: 'tools' as AdminTab,
      label: 'จัดการเครื่องมือ',
      icon: Sliders,
      desc: 'เปิด-ปิดเมนู และปักหมุดแนะนำ',
    },
    {
      id: 'ai' as AdminTab,
      label: 'ตั้งค่าปัญญาประดิษฐ์ AI',
      icon: Bot,
      desc: 'Gemini API Key และเลือกโมเดล AI',
    },
    {
      id: 'messages' as AdminTab,
      label: 'กล่องข้อความติดต่อ',
      icon: Mail,
      desc: 'คำถามและข้อความจากกล่องแชทล่างขวา',
      badge: unreadCount > 0 ? `${unreadCount} ใหม่` : undefined,
    },
    {
      id: 'theme' as AdminTab,
      label: 'ตกแต่ง & ธีม',
      icon: Palette,
      desc: 'ปรับสี ฟอนต์ และภาพพื้นหลัง',
    },
    {
      id: 'announcement' as AdminTab,
      label: 'ประกาศ & ข่าวสาร',
      icon: Megaphone,
      desc: 'แถบข้อความแจ้งเตือนด้านบนเว็บ',
    },
    {
      id: 'security' as AdminTab,
      label: 'ความปลอดภัย & สำรอง',
      icon: ShieldCheck,
      desc: 'เปลี่ยนรหัส PIN และสำรองข้อมูล',
    },
  ];

  const currentTabObj = navItems.find((n) => n.id === activeTab) || navItems[0];
  const CurrentIcon = currentTabObj.icon;

  const handleSelectTab = (tabId: AdminTab) => {
    setActiveTab(tabId);
    setIsMobileDrawerOpen(false); // Auto close mobile drawer on selection
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-6">
      <div>
        {/* Logo & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ระบบจัดการผู้ดูแล
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Sparkles className="h-2.5 w-2.5" /> Admin Panel
              </span>
            </div>
          </div>

          {/* Close button inside mobile drawer */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 lg:hidden"
            title="ปิดเมนู"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-8 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex w-full items-center justify-between rounded-2xl p-3 text-left transition ${
                  isActive
                    ? 'bg-indigo-50 font-bold text-indigo-700 shadow-sm dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-sm leading-tight">{item.label}</span>
                    <span className="block text-[11px] font-normal opacity-70">
                      {item.desc}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Exit / Return to Main Website button */}
      <div className="mt-8 border-t border-slate-100 pt-5 dark:border-slate-800">
        <button
          onClick={onExitAdmin}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LogOut className="h-4 w-4" />
          กลับหน้าเว็บหลัก
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950 lg:flex-row">
      {/* Mobile Top Navigation Bar (Shown only on < lg screens) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu 3 Lines Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-xs transition hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            title="เปิดเมนูนำทาง (3 ขีด)"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                {currentTabObj.label}
              </span>
              <span className="text-[10px] text-slate-400">Admin Panel</span>
            </div>
          </div>
        </div>

        <button
          onClick={onExitAdmin}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <LogOut className="h-3.5 w-3.5" /> ออก
        </button>
      </header>

      {/* Mobile Off-Canvas Drawer (Slide-in Sidebar Overlay) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative z-10 w-4/5 max-w-xs bg-white shadow-2xl animate-in slide-in-from-left duration-200 dark:bg-slate-900">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation (Permanent on lg: screens) */}
      <aside className="hidden shrink-0 border-r border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block lg:min-h-screen lg:w-72">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-5xl">
          {activeTab === 'dashboard' && <AdminDashboard allTools={allTools} />}
          {activeTab === 'tools' && (
            <AdminToolsManager
              allTools={allTools}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}
          {activeTab === 'ai' && (
            <AdminAiSettings
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}
          {activeTab === 'messages' && <AdminMessages />}
          {activeTab === 'theme' && (
            <AdminThemeSettings
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}
          {activeTab === 'announcement' && (
            <AdminAnnouncement
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}
          {activeTab === 'security' && (
            <AdminSecurity
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
};
