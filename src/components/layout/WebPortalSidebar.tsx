import React, { useState, useEffect } from 'react';
import {
  Globe,
  School,
  BookOpen,
  HardDrive,
  BarChart3,
  Palette,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Maximize2,
  X,
  RotateCw,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { loadWebsites, WebPortalItem, syncWebsitesFromCloud } from '../../lib/website-service';
import { trackToolUsage } from '../../lib/analytics-service';

interface WebPortalSidebarProps {
  onOpenAdmin?: () => void;
}

export const WebPortalSidebar: React.FC<WebPortalSidebarProps> = ({ onOpenAdmin }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('teacher_tools_sidebar_expanded');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [websites, setWebsites] = useState<WebPortalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [iframeModalUrl, setIframeModalUrl] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    setWebsites(loadWebsites());
    // Background cloud sync
    syncWebsitesFromCloud().then((cloudItems) => {
      if (cloudItems && cloudItems.length > 0) {
        setWebsites(cloudItems);
      }
    });
  }, []);

  const toggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('teacher_tools_sidebar_expanded', JSON.stringify(next));
      return next;
    });
  };

  const handleOpenSite = (site: WebPortalItem) => {
    trackToolUsage('portal', `เข้าชมเว็บ: ${site.title}`, site.url);

    if (site.openMode === 'iframe') {
      setIframeModalUrl({ url: site.url, title: site.title });
    } else {
      window.open(site.url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderIcon = (iconType: string, className = 'h-4 w-4') => {
    switch (iconType) {
      case 'school':
        return <School className={className} />;
      case 'book':
        return <BookOpen className={className} />;
      case 'drive':
        return <HardDrive className={className} />;
      case 'chart':
        return <BarChart3 className={className} />;
      case 'palette':
        return <Palette className={className} />;
      case 'file':
        return <FileText className={className} />;
      default:
        return <Globe className={className} />;
    }
  };

  const filteredWebsites = websites
    .filter((w) => w.isActive)
    .filter((w) => {
      if (selectedCategory !== 'all' && w.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        w.url.toLowerCase().includes(q)
      );
    });

  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'school', label: 'งานโรงเรียน' },
    { id: 'official', label: 'งานราชการ' },
    { id: 'teaching', label: 'สื่อการสอน' },
    { id: 'general', label: 'ทั่วไป' },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sm">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">ระบบออนไลน์ & ลิงก์ด่วน</h3>
            <p className="text-[11px] text-slate-400">เว็บภายนอก & ระบบการศึกษา</p>
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleExpand}
          className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:flex dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="พับเก็บแถบด้านข้าง"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(false)}
          className="flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเว็บไซต์ หรือระบบ..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:focus:border-sky-400"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              selectedCategory === cat.id
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Website Cards List */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filteredWebsites.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            ไม่พบเว็บไซต์ที่ตรงกับคำค้นหา
          </div>
        ) : (
          filteredWebsites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => handleOpenSite(site)}
              className="group flex w-full items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-left transition hover:border-sky-200 hover:bg-sky-50/50 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-800/50 dark:hover:border-sky-800 dark:hover:bg-slate-800"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm ring-1 ring-slate-200 group-hover:bg-sky-500 group-hover:text-white dark:bg-slate-700 dark:text-sky-300 dark:ring-slate-600">
                {renderIcon(site.iconType)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="truncate text-xs font-semibold text-slate-800 group-hover:text-sky-600 dark:text-slate-200 dark:group-hover:text-sky-400">
                    {site.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
                </div>
                {site.description && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {site.description}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer Info / Admin Hint */}
      <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
        <p className="text-[10px] text-slate-400">
          ปรับแต่งรายชื่อเว็บได้ที่ระบบผู้ดูแล (Admin)
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Floating Quick Launcher Button */}
      <button
        type="button"
        onClick={() => setMobileDrawerOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:scale-105 md:hidden"
      >
        <Globe className="h-4 w-4 animate-pulse" />
        เว็บด่วน
      </button>

      {/* 2. Mobile Slide-out Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-4/5 max-w-xs shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 3. Desktop Collapsible Sidebar */}
      <div className="hidden shrink-0 transition-all duration-300 md:block">
        {isExpanded ? (
          <aside className="sticky top-0 h-screen w-72 border-r border-slate-200/80 shadow-soft dark:border-slate-800">
            {sidebarContent}
          </aside>
        ) : (
          /* Mini Dock when collapsed */
          <aside className="sticky top-0 flex h-screen w-14 flex-col items-center border-r border-slate-200/80 bg-white py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={toggleExpand}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-500 hover:text-white dark:bg-slate-800 dark:text-sky-400"
              title="ขยายแถบเว็บไซต์ภายนอก"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="my-3 h-px w-8 bg-slate-200 dark:bg-slate-800" />

            {/* Quick Mini Icons */}
            <div className="flex flex-1 flex-col items-center gap-2.5 overflow-y-auto py-1 scrollbar-none">
              {websites
                .filter((w) => w.isActive)
                .slice(0, 8)
                .map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => handleOpenSite(site)}
                    className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-sky-500 hover:text-white dark:text-slate-400"
                    title={site.title}
                  >
                    {renderIcon(site.iconType)}
                  </button>
                ))}
            </div>

            <button
              type="button"
              onClick={toggleExpand}
              className="mt-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="ขยายแถบเว็บด่วน"
            >
              <Globe className="h-4 w-4" />
            </button>
          </aside>
        )}
      </div>

      {/* 4. Embedded In-App Modal Viewer (if iframe supported) */}
      {iframeModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {iframeModalUrl.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={iframeModalUrl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  เปิดในแท็บใหม่
                </a>
                <button
                  type="button"
                  onClick={() => setIframeModalUrl(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-slate-50 dark:bg-slate-950">
              <iframe
                src={iframeModalUrl.url}
                title={iframeModalUrl.title}
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
