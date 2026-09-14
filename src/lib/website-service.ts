import { loadSettings } from './settings-service';

export interface WebPortalItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: 'school' | 'official' | 'teaching' | 'general';
  iconType: 'globe' | 'school' | 'book' | 'drive' | 'chart' | 'palette' | 'file' | 'link';
  openMode: 'new_tab' | 'iframe';
  isActive: boolean;
  order: number;
}

const WEBSITES_STORAGE_KEY = 'teacher_tools_web_portal_sites';

export const DEFAULT_WEBSITES: WebPortalItem[] = [
  {
    id: 'sgs',
    title: 'ระบบ SGS (วัดและประเมินผล)',
    url: 'https://sgs.bopp-obec.info/',
    description: 'ระบบบันทึกคะแนน ผลการเรียน และเอกสาร ปพ. ออนไลน์',
    category: 'school',
    iconType: 'chart',
    openMode: 'new_tab',
    isActive: true,
    order: 1,
  },
  {
    id: 'dpa',
    title: 'ระบบ DPA (วิทยฐานะดิจิทัล)',
    url: 'https://dpa-obec.com/',
    description: 'ระบบประเมินวิทยฐานะข้าราชการครูและบุคลากรทางการศึกษา (PA)',
    category: 'official',
    iconType: 'file',
    openMode: 'new_tab',
    isActive: true,
    order: 2,
  },
  {
    id: 'esaraban',
    title: 'ระบบสารบรรณอิเล็กทรอนิกส์ (e-Saraban)',
    url: 'https://edoc.obec.go.th/',
    description: 'รับ-ส่งหนังสือราชการ บันทึกข้อความและคำสั่งออนไลน์',
    category: 'official',
    iconType: 'book',
    openMode: 'new_tab',
    isActive: true,
    order: 3,
  },
  {
    id: 'gdrive',
    title: 'Google Drive คลาวด์เอกสาร',
    url: 'https://drive.google.com/',
    description: 'พื้นที่จัดเก็บและแบ่งปันไฟล์เอกสาร แผนการสอนของโรงเรียน',
    category: 'general',
    iconType: 'drive',
    openMode: 'new_tab',
    isActive: true,
    order: 4,
  },
  {
    id: 'canva',
    title: 'Canva for Education',
    url: 'https://www.canva.com/',
    description: 'ออกแบบใบงาน สื่อการสอน พรีเซนเทชัน และอินโฟกราฟิก',
    category: 'teaching',
    iconType: 'palette',
    openMode: 'new_tab',
    isActive: true,
    order: 5,
  },
  {
    id: 'kpk',
    title: 'เว็บไซต์โรงเรียนกาญจนาภิเษกวิทยาลัย กระบี่',
    url: 'https://www.kpk.ac.th/',
    description: 'ข่าวสาร ประกาศ และระบบสารสนเทศภายในสถานศึกษา',
    category: 'school',
    iconType: 'school',
    openMode: 'new_tab',
    isActive: true,
    order: 6,
  },
];

export function loadWebsites(): WebPortalItem[] {
  try {
    const raw = localStorage.getItem(WEBSITES_STORAGE_KEY);
    if (!raw) {
      saveWebsites(DEFAULT_WEBSITES);
      return DEFAULT_WEBSITES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => a.order - b.order);
    }
    return DEFAULT_WEBSITES;
  } catch (e) {
    console.error('Failed to load websites:', e);
    return DEFAULT_WEBSITES;
  }
}

export function saveWebsites(items: WebPortalItem[]): void {
  try {
    localStorage.setItem(WEBSITES_STORAGE_KEY, JSON.stringify(items));
    syncWebsitesToCloud(items);
  } catch (e) {
    console.error('Failed to save websites:', e);
  }
}

export function addWebsite(item: Omit<WebPortalItem, 'id' | 'order'>): WebPortalItem {
  const current = loadWebsites();
  const newItem: WebPortalItem = {
    ...item,
    id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    order: current.length + 1,
  };
  const updated = [...current, newItem];
  saveWebsites(updated);
  return newItem;
}

export function updateWebsite(id: string, updates: Partial<WebPortalItem>): void {
  const current = loadWebsites();
  const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
  saveWebsites(updated);
}

export function deleteWebsite(id: string): void {
  const current = loadWebsites();
  const updated = current.filter((item) => item.id !== id);
  saveWebsites(updated);
}

export function resetWebsitesToDefault(): WebPortalItem[] {
  saveWebsites(DEFAULT_WEBSITES);
  return DEFAULT_WEBSITES;
}

export async function syncWebsitesToCloud(items: WebPortalItem[]): Promise<boolean> {
  const settings = loadSettings();
  const url = settings.googleSheetsWebhookUrl;
  if (!url || !url.trim().startsWith('https://script.google.com/')) return false;

  try {
    await fetch(url.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'save_websites',
        websites: items,
      }),
    });
    return true;
  } catch (e) {
    console.error('Failed to sync websites to cloud:', e);
    return false;
  }
}

export async function syncWebsitesFromCloud(): Promise<WebPortalItem[] | null> {
  const settings = loadSettings();
  const url = settings.googleSheetsWebhookUrl;
  if (!url || !url.trim().startsWith('https://script.google.com/')) return null;

  try {
    const res = await fetch(`${url.trim()}?action=get_websites&_t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.status === 'success' && Array.isArray(data.websites) && data.websites.length > 0) {
      saveWebsites(data.websites);
      return data.websites;
    }
  } catch (e) {
    console.warn('Could not sync websites from cloud, using local cache:', e);
  }
  return null;
}

import {
  Globe,
  School,
  BookOpen,
  HardDrive,
  BarChart3,
  Palette,
  FileText,
  Link,
  LucideIcon,
} from 'lucide-react';
import { ToolDefinition } from '../types';

/**
 * Converts WebPortalItems to standard ToolDefinition cards for rendering in the main grid
 */
export function convertWebsitesToToolDefinitions(items: WebPortalItem[]): ToolDefinition[] {
  const iconMap: Record<string, LucideIcon> = {
    school: School,
    book: BookOpen,
    drive: HardDrive,
    chart: BarChart3,
    palette: Palette,
    file: FileText,
    link: Link,
    globe: Globe,
  };

  const themeMap: Record<string, any> = {
    school: {
      gradientFrom: 'from-sky-100/90 dark:from-sky-950/40',
      gradientTo: 'to-blue-50/70 dark:to-blue-900/20',
      borderColor: 'border-sky-300 dark:border-sky-800/60',
      hoverBorder: 'hover:border-sky-500 dark:hover:border-sky-400',
      iconBgFrom: 'from-sky-600',
      iconBgTo: 'to-blue-600',
      iconColor: 'text-sky-600',
      badge: 'ระบบโรงเรียน 🏫',
      badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    },
    official: {
      gradientFrom: 'from-emerald-100/90 dark:from-emerald-950/40',
      gradientTo: 'to-teal-50/70 dark:to-teal-900/20',
      borderColor: 'border-emerald-300 dark:border-emerald-800/60',
      hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-400',
      iconBgFrom: 'from-emerald-600',
      iconBgTo: 'to-teal-600',
      iconColor: 'text-emerald-600',
      badge: 'งานราชการ 📑',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    },
    teaching: {
      gradientFrom: 'from-purple-100/90 dark:from-purple-950/40',
      gradientTo: 'to-pink-50/70 dark:to-pink-900/20',
      borderColor: 'border-purple-300 dark:border-purple-800/60',
      hoverBorder: 'hover:border-purple-500 dark:hover:border-purple-400',
      iconBgFrom: 'from-purple-600',
      iconBgTo: 'to-pink-600',
      iconColor: 'text-purple-600',
      badge: 'สื่อการสอน 🎨',
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
    },
    general: {
      gradientFrom: 'from-indigo-100/90 dark:from-indigo-950/40',
      gradientTo: 'to-violet-50/70 dark:to-violet-900/20',
      borderColor: 'border-indigo-300 dark:border-indigo-800/60',
      hoverBorder: 'hover:border-indigo-500 dark:hover:border-indigo-400',
      iconBgFrom: 'from-indigo-600',
      iconBgTo: 'to-violet-600',
      iconColor: 'text-indigo-600',
      badge: 'ระบบออนไลน์ 🔗',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
    },
  };

  return items
    .filter((item) => item.isActive)
    .map((item) => {
      const Icon = iconMap[item.iconType] || Globe;
      const theme = themeMap[item.category] || themeMap.general;

      return {
        id: item.id as any,
        title: item.title,
        description: item.description || item.url,
        icon: Icon,
        gradientFrom: theme.gradientFrom,
        gradientTo: theme.gradientTo,
        borderColor: theme.borderColor,
        hoverBorder: theme.hoverBorder,
        iconBgFrom: theme.iconBgFrom,
        iconBgTo: theme.iconBgTo,
        iconColor: theme.iconColor,
        badge: theme.badge,
        badgeColor: theme.badgeColor,
        category: 'web',
        isExternalLink: true,
        externalUrl: item.url,
      };
    });
}
