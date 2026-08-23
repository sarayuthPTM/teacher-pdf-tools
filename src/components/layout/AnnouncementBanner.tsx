import React from 'react';
import { Megaphone, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { SiteSettings } from '../../types/admin';

interface AnnouncementBannerProps {
  announcement: SiteSettings['announcement'];
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcement }) => {
  if (!announcement || !announcement.enabled || !announcement.text.trim()) {
    return null;
  }

  const typeConfig = {
    info: {
      bg: 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-200',
      icon: Info,
      iconColor: 'text-sky-600 dark:text-sky-400',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200',
      icon: CheckCircle,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  }[announcement.type || 'info'];

  const Icon = typeConfig.icon;

  return (
    <div className={`border-b px-4 py-2.5 text-center text-xs font-medium transition-all ${typeConfig.bg}`}>
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${typeConfig.iconColor}`} />
        <span>{announcement.text}</span>
      </div>
    </div>
  );
};
