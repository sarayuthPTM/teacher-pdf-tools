import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle, Share, PlusSquare, Sparkles } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for BeforeInstallPrompt on Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed today
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If on iOS or prompt not available, show guide
      setShowPrompt(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  // If already installed in standalone mode, don't show prompt
  if (isStandalone) return null;

  return (
    <>
      {/* Floating Install Prompt Banner (Bottom Left) */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 w-[calc(100vw-2rem)] sm:max-w-sm rounded-3xl border border-indigo-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 dark:border-indigo-900/60 dark:bg-slate-900/95">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  ติดตั้งแอป "เครื่องมือครู" <Sparkles className="h-3 w-3 text-amber-500" />
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  เข้าใช้งานได้ทันทีจากหน้าจอมือถือ/คอมพิวเตอร์
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isIOS ? (
            /* iOS Safari Instructions */
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-white mb-1">
                วิธีติดตั้งบน iPhone / iPad:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>แตะปุ่ม <strong>แชร์ (Share <Share className="inline h-3 w-3" />)</strong> ที่แถบด้านล่าง</li>
                <li>เลื่อนลงแล้วแตะ <strong>"เพิ่มไปยังหน้าจอโฮม" (<PlusSquare className="inline h-3 w-3" />)</strong></li>
              </ol>
            </div>
          ) : (
            /* Android / Chrome One-Click Install */
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95"
              >
                <Download className="h-3.5 w-3.5" /> กดติดตั้งลงเครื่อง
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                ไว้คราวหลัง
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
