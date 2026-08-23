import { SiteSettings } from '../types/admin';

const SETTINGS_KEY = 'teacher_tools_site_settings';

export const defaultSettings: SiteSettings = {
  siteTitle: 'เครื่องมือสำหรับครู (PDF & Office Tools)',
  heroTitle: 'ระบบจัดการเอกสาร PDF ใช้งานง่ายในที่เดียว',
  siteSubtitle: 'รวม 16 เครื่องมือจำเป็นสำหรับงาน PDF และงานสำนักงานโรงเรียน ช่วยให้คุณสแกน สร้าง รวม แยก แปลงเป็น Word/รูปภาพ ใส่ลายน้ำ เซ็นเอกสาร และสร้าง QR Code แต่งรูป ได้สะดวกและปลอดภัย 100% ผ่านเว็บ',
  logoUrl: null,
  backgroundImageUrl: null,
  backgroundOpacity: 25,
  backgroundBlur: 0,
  fontFamily: 'Prompt',
  primaryColor: '#0284c7',
  headerGradient: 'linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #d946ef 100%)',
  disabledTools: [],
  toolOrder: [],
  customBadges: {},
  adminPin: '1234', // Default PIN
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash',
  footerSecurityText: 'ปลอดภัย 100%: ไฟล์ทั้งหมดประมวลผลภายในเบราว์เซอร์ของคุณ ไม่ถูกส่งไปเก็บที่เซิร์ฟเวอร์',
  footerBadge1: 'ทำงานรวดเร็ว ไม่มีสะดุด',
  footerBadge2: 'รองรับไฟล์สูงสุด 100 MB',
  footerCopyright: 'พัฒนาด้วยเทคโนโลยีเว็บมาตรฐาน ต่อยอดจากระบบต้นแบบของ วิทยาลัยเทคนิคพังงา โดย โรงเรียนกาญจนาภิเษกวิทยาลัย กระบี่',
  googleSheetsWebhookUrl: 'https://script.google.com/macros/s/AKfycbya2HjcRpV8hI99Y2HAIL896UQuYxHMMiDaoIbqgo_FgozmQ08I6qEFJD20B1uUwWNR-w/exec',
  announcement: {
    enabled: true,
    text: 'ยินดีต้อนรับสู่ระบบจัดการเอกสารสำหรับคุณครูและบุคลากร ประมวลผลบนเครื่อง 100% ปลอดภัย เอกสารไม่รั่วไหล',
    type: 'info',
  },
};

export function loadSettings(): SiteSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return defaultSettings;
    const parsed = JSON.parse(saved);
    return {
      ...defaultSettings,
      ...parsed,
      // Ensure Google Sheets URL defaults to the active Webhook if not customized
      googleSheetsWebhookUrl: parsed.googleSheetsWebhookUrl || defaultSettings.googleSheetsWebhookUrl,
    };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return defaultSettings;
  }
}

export function saveSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function resetSettings(): SiteSettings {
  saveSettings(defaultSettings);
  return defaultSettings;
}
