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
