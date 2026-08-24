import React, { useState, useEffect } from 'react';
import {
  Camera,
  Files,
  LayoutGrid,
  Scissors,
  Minimize2,
  Images,
  Image as ImageIcon,
  FileImage,
  Hash,
  Droplet,
  Crop,
  Lock,
  PenTool,
  Type,
  QrCode,
  FileText,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Eye,
  MessageSquare,
  Bot,
  Zap,
  FileEdit,
} from 'lucide-react';
import { ToolDefinition, ToolId } from './types';
import { SiteSettings } from './types/admin';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { AnnouncementBanner } from './components/layout/AnnouncementBanner';
import { ToolCard } from './components/ui/ToolCard';
import { loadSettings, saveSettings, syncSettingsFromCloud } from './lib/settings-service';
import { trackToolUsage, syncStatsFromCloud, incrementVisitorCount } from './lib/analytics-service';

// Admin Components
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { FloatingChatWidget } from './components/chat/FloatingChatWidget';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';

// AI Tools Components
import { AiSummarizerTool } from './components/tools/AiSummarizerTool';
import { AiChatPdfTool } from './components/tools/AiChatPdfTool';
import { AiOfficialMemoTool } from './components/tools/AiOfficialMemoTool';

// PDF & Office Tools Components
import { EditPdfTool } from './components/tools/EditPdfTool';
import { QRCodeTool } from './components/tools/QRCodeTool';
import { MergeTool } from './components/tools/MergeTool';
import { SplitTool } from './components/tools/SplitTool';
import { OrganizeTool } from './components/tools/OrganizeTool';
import { SignTool } from './components/tools/SignTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import { PageNumberTool } from './components/tools/PageNumberTool';
import { ImageToPdfTool } from './components/tools/ImageToPdfTool';
import { PdfToImageTool } from './components/tools/PdfToImageTool';
import { PdfToWordTool } from './components/tools/PdfToWordTool';
import { CompressPdfTool } from './components/tools/CompressPdfTool';
import { CompressImageTool } from './components/tools/CompressImageTool';
import { CropTool } from './components/tools/CropTool';
import { ProtectTool } from './components/tools/ProtectTool';
import { ScanTool } from './components/tools/ScanTool';
import { AnnotateTool } from './components/tools/AnnotateTool';

const allToolsDefinition: ToolDefinition[] = [
  // --- CORE PDF EDITOR ---
  {
    id: 'edit-pdf',
    title: 'แก้ไขไฟล์ PDF (Edit PDF)',
    description: 'พิมพ์ข้อความ ลบ/ปิดทับคำเดิม วาด ไฮไลท์ และแทรกรูปภาพลงบนไฟล์ PDF ได้โดยตรง',
    icon: FileEdit,
    gradientFrom: 'from-blue-100/90 dark:from-blue-950/40',
    gradientTo: 'to-indigo-50/70 dark:to-indigo-900/20',
    borderColor: 'border-blue-300 dark:border-blue-800/60',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-400',
    iconBgFrom: 'from-blue-600',
    iconBgTo: 'to-indigo-600',
    iconColor: 'text-blue-600',
    badge: 'แก้ไขได้ทันที ✏️',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    category: 'pdf',
  },

  // --- 3 NEW AI TOOLS FOR TEACHERS ---
  {
    id: 'ai-summarize',
    title: 'AI สรุปเนื้อหาเอกสาร PDF',
    description: 'วิเคราะห์และสรุปประเด็นสำคัญ สาระที่ต้องปฏิบัติ จากเอกสาร PDF หนาๆ ในไม่กี่วินาที',
    icon: Sparkles,
    gradientFrom: 'from-purple-100/90 dark:from-purple-950/40',
    gradientTo: 'to-indigo-50/70 dark:to-indigo-900/20',
    borderColor: 'border-purple-300 dark:border-purple-800/60',
    hoverBorder: 'hover:border-purple-500 dark:hover:border-purple-400',
    iconBgFrom: 'from-purple-600',
    iconBgTo: 'to-indigo-600',
    iconColor: 'text-purple-600',
    badge: 'AI อัจฉริยะ ✨',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
    category: 'ai',
  },
  {
    id: 'ai-chat-pdf',
    title: 'แชทถาม-ตอบกับเอกสาร PDF',
    description: 'พูดคุยสอบถามข้อมูล กฎระเบียบ เกณฑ์การวัดผล หรือประเด็นสำคัญจากเอกสาร PDF',
    icon: MessageSquare,
    gradientFrom: 'from-sky-100/90 dark:from-sky-950/40',
    gradientTo: 'to-blue-50/70 dark:to-blue-900/20',
    borderColor: 'border-sky-300 dark:border-sky-800/60',
    hoverBorder: 'hover:border-sky-500 dark:hover:border-sky-400',
    iconBgFrom: 'from-sky-600',
    iconBgTo: 'to-blue-600',
    iconColor: 'text-sky-600',
    badge: 'ถาม-ตอบ PDF 💬',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    category: 'ai',
  },
  {
    id: 'ai-memo',
    title: 'AI ร่างหนังสือราชการ & บันทึกข้อความ',
    description: 'ร่างบันทึกข้อความราชการภาษาทางการ 100% ตามระเบียบสำนักนายกฯ พร้อมโหลดเป็น Word',
    icon: FileText,
    gradientFrom: 'from-emerald-100/90 dark:from-emerald-950/40',
    gradientTo: 'to-teal-50/70 dark:to-teal-900/20',
    borderColor: 'border-emerald-300 dark:border-emerald-800/60',
    hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-400',
    iconBgFrom: 'from-emerald-600',
    iconBgTo: 'to-teal-600',
    iconColor: 'text-emerald-600',
    badge: 'ภาษาทางการ 100% ✍️',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    category: 'ai',
  },

  // --- CORE TOOLS ---
  {
    id: 'scan',
    title: 'สแกนเอกสาร',
    description: 'ถ่ายหรือเลือกรูปเอกสาร ครอบมุมมอง ลบเงา แล้วรวมเป็น PDF',
    icon: Camera,
    gradientFrom: 'from-pink-100/90 dark:from-pink-950/40',
    gradientTo: 'to-pink-50/70 dark:to-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800/60',
    hoverBorder: 'hover:border-pink-400 dark:hover:border-pink-600',
    iconBgFrom: 'from-pink-500',
    iconBgTo: 'to-rose-500',
    iconColor: 'text-pink-500',
    category: 'pdf',
  },
  {
    id: 'merge',
    title: 'รวมไฟล์ PDF',
    description: 'ต่อหลายไฟล์เข้าด้วยกันตามลำดับที่จัดไว้',
    icon: Files,
    gradientFrom: 'from-blue-100/90 dark:from-blue-950/40',
    gradientTo: 'to-blue-50/70 dark:to-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800/60',
    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
    iconBgFrom: 'from-blue-500',
    iconBgTo: 'to-indigo-600',
    iconColor: 'text-blue-500',
    category: 'pdf',
  },
  {
    id: 'organize',
    title: 'จัดหน้า PDF',
    description: 'ลากสลับลำดับ หมุนที่วางผิดด้าน ตัดหน้าที่ไม่ต้องการทิ้ง',
    icon: LayoutGrid,
    gradientFrom: 'from-violet-100/90 dark:from-violet-950/40',
    gradientTo: 'to-violet-50/70 dark:to-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800/60',
    hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-600',
    iconBgFrom: 'from-violet-500',
    iconBgTo: 'to-purple-600',
    iconColor: 'text-violet-500',
    category: 'pdf',
  },
  {
    id: 'split',
    title: 'แยกไฟล์ PDF',
    description: 'ดึงเฉพาะหน้าที่ต้องการออกมาเป็นไฟล์ใหม่',
    icon: Scissors,
    gradientFrom: 'from-teal-100/90 dark:from-teal-950/40',
    gradientTo: 'to-teal-50/70 dark:to-teal-900/20',
    borderColor: 'border-teal-200 dark:border-teal-800/60',
    hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-600',
    iconBgFrom: 'from-teal-500',
    iconBgTo: 'to-emerald-600',
    iconColor: 'text-teal-500',
    category: 'pdf',
  },
  {
    id: 'compress-pdf',
    title: 'ลดขนาด PDF',
    description: 'บีบอัดภาพในเอกสารให้ไฟล์เล็กลง ส่งอีเมลได้สะดวก',
    icon: Minimize2,
    gradientFrom: 'from-amber-100/90 dark:from-amber-950/40',
    gradientTo: 'to-amber-50/70 dark:to-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    iconBgFrom: 'from-amber-500',
    iconBgTo: 'to-yellow-600',
    iconColor: 'text-amber-500',
    badge: 'ปลอดภัยในเครื่อง',
    category: 'pdf',
  },
  {
    id: 'pdf-to-image',
    title: 'แปลงเป็นรูป PDF→JPG',
    description: 'เปลี่ยนทุกหน้าเป็น PNG หรือ JPEG ดูตัวอย่างแล้วเลือกดาวน์โหลดได้',
    icon: Images,
    gradientFrom: 'from-rose-100/90 dark:from-rose-950/40',
    gradientTo: 'to-rose-50/70 dark:to-rose-900/20',
    borderColor: 'border-rose-200 dark:border-rose-800/60',
    hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
    iconBgFrom: 'from-rose-500',
    iconBgTo: 'to-pink-600',
    iconColor: 'text-rose-500',
    category: 'pdf',
  },
  {
    id: 'compress-image',
    title: 'ลดขนาดไฟล์ภาพ',
    description: 'บีบอัด JPG, PNG, WEBP ให้เล็กลง ปรับคุณภาพและย่อขนาดได้ ทำในเบราว์เซอร์',
    icon: ImageIcon,
    gradientFrom: 'from-amber-100/90 dark:from-amber-950/40',
    gradientTo: 'to-amber-50/70 dark:to-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    iconBgFrom: 'from-amber-500',
    iconBgTo: 'to-orange-600',
    iconColor: 'text-amber-500',
    category: 'image',
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG → PDF',
    description: 'รวมรูปถ่ายเอกสารหลายใบให้เป็นไฟล์ PDF เดียว',
    icon: FileImage,
    gradientFrom: 'from-sky-100/90 dark:from-sky-950/40',
    gradientTo: 'to-sky-50/70 dark:to-sky-900/20',
    borderColor: 'border-sky-200 dark:border-sky-800/60',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
    iconBgFrom: 'from-sky-500',
    iconBgTo: 'to-blue-600',
    iconColor: 'text-sky-500',
    category: 'pdf',
  },
  {
    id: 'page-number',
    title: 'ใส่เลขหน้า PDF',
    description: 'ใส่เลขกำกับทุกหน้า เลือกได้ทั้งเลขอารบิกและเลขไทย',
    icon: Hash,
    gradientFrom: 'from-indigo-100/90 dark:from-indigo-950/40',
    gradientTo: 'to-indigo-50/70 dark:to-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800/60',
    hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
    iconBgFrom: 'from-indigo-500',
    iconBgTo: 'to-blue-600',
    iconColor: 'text-indigo-500',
    category: 'pdf',
  },
  {
    id: 'watermark',
    title: 'ใส่ลายน้ำ PDF',
    description: 'แปะข้อความหรือรูปภาพจางๆ ทับทุกหน้า กันการคัดลอก',
    icon: Droplet,
    gradientFrom: 'from-fuchsia-100/90 dark:from-fuchsia-950/40',
    gradientTo: 'to-fuchsia-50/70 dark:to-fuchsia-900/20',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800/60',
    hoverBorder: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-600',
    iconBgFrom: 'from-fuchsia-500',
    iconBgTo: 'to-purple-600',
    iconColor: 'text-fuchsia-500',
    category: 'pdf',
  },
  {
    id: 'crop',
    title: 'ครอบตัดขอบ PDF',
    description: 'ตัดขอบกระดาษที่ไม่ต้องการออกทุกหน้าพร้อมกัน',
    icon: Crop,
    gradientFrom: 'from-cyan-100/90 dark:from-cyan-950/40',
    gradientTo: 'to-cyan-50/70 dark:to-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800/60',
    hoverBorder: 'hover:border-cyan-400 dark:hover:border-cyan-600',
    iconBgFrom: 'from-cyan-500',
    iconBgTo: 'to-teal-600',
    iconColor: 'text-cyan-500',
    category: 'pdf',
  },
  {
    id: 'protect',
    title: 'ใส่รหัสผ่าน PDF',
    description: 'เข้ารหัสไฟล์ให้ต้องใส่รหัสผ่านก่อนเปิดอ่าน',
    icon: Lock,
    gradientFrom: 'from-orange-100/90 dark:from-orange-950/40',
    gradientTo: 'to-orange-50/70 dark:to-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800/60',
    hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600',
    iconBgFrom: 'from-orange-500',
    iconBgTo: 'to-amber-600',
    iconColor: 'text-orange-500',
    category: 'pdf',
  },
  {
    id: 'sign',
    title: 'เซ็นเอกสาร PDF',
    description: 'วาด อัปโหลด หรือพิมพ์ลายเซ็น แล้ววางตำแหน่งบนหน้าเอกสาร',
    icon: PenTool,
    gradientFrom: 'from-emerald-100/90 dark:from-emerald-950/40',
    gradientTo: 'to-emerald-50/70 dark:to-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    iconBgFrom: 'from-emerald-500',
    iconBgTo: 'to-teal-600',
    iconColor: 'text-emerald-500',
    category: 'pdf',
  },
  {
    id: 'annotate',
    title: 'เพิ่มข้อมูลใน PDF',
    description: 'เพิ่มข้อความ สัญลักษณ์ หรือรูปภาพลงในเอกสาร ลากปรับตำแหน่งได้อิสระ',
    icon: Type,
    gradientFrom: 'from-lime-100/90 dark:from-lime-950/40',
    gradientTo: 'to-lime-50/70 dark:to-lime-900/20',
    borderColor: 'border-lime-200 dark:border-lime-800/60',
    hoverBorder: 'hover:border-lime-400 dark:hover:border-lime-600',
    iconBgFrom: 'from-lime-500',
    iconBgTo: 'to-emerald-600',
    iconColor: 'text-lime-500',
    category: 'pdf',
  },
  {
    id: 'qr-code',
    title: 'สร้าง QR Code ใส่โลโก้',
    description: 'สร้าง QR Code ลิงก์/ข้อความ/Wi-Fi ปรับแต่งสีสัน และใส่โลโก้โรงเรียนตรงกลาง',
    icon: QrCode,
    gradientFrom: 'from-sky-100/90 dark:from-sky-950/40',
    gradientTo: 'to-indigo-50/70 dark:to-indigo-900/20',
    borderColor: 'border-sky-300 dark:border-sky-800/60',
    hoverBorder: 'hover:border-sky-500 dark:hover:border-sky-400',
    iconBgFrom: 'from-sky-500',
    iconBgTo: 'to-indigo-600',
    iconColor: 'text-sky-500',
    badge: 'เครื่องมือยอดนิยม ⭐',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    category: 'office',
  },
  {
    id: 'pdf-to-word',
    title: 'แปลง PDF เป็น Word',
    description: 'สกัดข้อความจากเอกสาร PDF ส่งออกเป็นไฟล์ Word (.docx) แก้ไขต่อได้ทันที',
    icon: FileText,
    gradientFrom: 'from-blue-100/90 dark:from-blue-950/40',
    gradientTo: 'to-sky-50/70 dark:to-sky-900/20',
    borderColor: 'border-blue-300 dark:border-blue-800/60',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-400',
    iconBgFrom: 'from-blue-600',
    iconBgTo: 'to-sky-500',
    iconColor: 'text-blue-600',
    badge: 'แปลงไฟล์รวดเร็ว',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    category: 'office',
  },
];

export const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai' | 'pdf' | 'office' | 'image'>('all');
  const [isDark, setIsDark] = useState(false);

  // Settings & Admin State
  const [settings, setSettings] = useState<SiteSettings>(loadSettings());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Visitor counter state (Real Tracking)
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<number>(1);

  useEffect(() => {
    // 1. Sync central settings from Google Sheets Cloud
    syncSettingsFromCloud().then((cloudSettings) => {
      if (cloudSettings) {
        setSettings(cloudSettings);
      }
    });

    // 2. Track this visitor session (send to Google Sheets)
    const count = incrementVisitorCount();
    setVisitorCount(count);

    // 3. Sync real-time combined visitor total from Google Sheets
    syncStatsFromCloud().then(() => {
      const savedCount = localStorage.getItem('teacher_tools_visitors');
      if (savedCount) {
        setVisitorCount(parseInt(savedCount, 10));
      }
    });

    // Dynamic active session estimate
    const randomActive = Math.floor(Math.random() * 2) + 1;
    setOnlineUsers(randomActive);
  }, []);

  const handleUpdateSettings = (newSettings: SiteSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelectTool = (toolId: ToolId) => {
    setActiveTool(toolId);
    const toolDef = allToolsDefinition.find((t) => t.id === toolId);
    if (toolDef) {
      trackToolUsage(toolId, toolDef.title, 'เปิดใช้งานเครื่องมือ');
    }
  };

  // Sort tools by settings.toolOrder (if configured)
  const orderedTools = [...allToolsDefinition].sort((a, b) => {
    if (!settings.toolOrder || settings.toolOrder.length === 0) return 0;
    const idxA = settings.toolOrder.indexOf(a.id);
    const idxB = settings.toolOrder.indexOf(b.id);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  // Filter tools: exclude disabled tools, filter by category and search query
  const filteredTools = orderedTools
    .filter((t) => !settings.disabledTools?.includes(t.id))
    .filter((t) => selectedCategory === 'all' || t.category === selectedCategory)
    .filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((t) => {
      if (settings.customBadges && settings.customBadges[t.id] !== undefined) {
        return { ...t, badge: settings.customBadges[t.id] || undefined };
      }
      return t;
    });

  if (isAdminOpen) {
    return (
      <AdminLayout
        onExitAdmin={() => setIsAdminOpen(false)}
        allTools={allToolsDefinition}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    );
  }

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'edit-pdf':
        return <EditPdfTool />;
      case 'ai-summarize':
        return <AiSummarizerTool />;
      case 'ai-chat-pdf':
        return <AiChatPdfTool />;
      case 'ai-memo':
        return <AiOfficialMemoTool />;
      case 'qr-code':
        return <QRCodeTool />;
      case 'merge':
        return <MergeTool />;
      case 'split':
        return <SplitTool />;
      case 'organize':
        return <OrganizeTool />;
      case 'sign':
        return <SignTool />;
      case 'watermark':
        return <WatermarkTool />;
      case 'page-number':
        return <PageNumberTool />;
      case 'jpg-to-pdf':
        return <ImageToPdfTool />;
      case 'pdf-to-image':
        return <PdfToImageTool />;
      case 'pdf-to-word':
        return <PdfToWordTool />;
      case 'compress-pdf':
        return <CompressPdfTool />;
      case 'compress-image':
        return <CompressImageTool />;
      case 'crop':
        return <CropTool />;
      case 'protect':
        return <ProtectTool />;
      case 'scan':
        return <ScanTool />;
      case 'annotate':
        return <AnnotateTool />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{ fontFamily: settings.fontFamily || 'Prompt' }}
      className="relative flex min-h-screen flex-col bg-[#f8fafc] dark:bg-slate-950"
    >
      {/* Dynamic Background Image Layer with Opacity & Blur */}
      {settings.backgroundImageUrl && (
        <div
          className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center bg-fixed transition-all duration-300"
          style={{
            backgroundImage: `url(${settings.backgroundImageUrl})`,
            opacity: (settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 25) / 100,
            filter: settings.backgroundBlur ? `blur(${settings.backgroundBlur}px)` : 'none',
          }}
        />
      )}

      {/* Top Announcement Banner */}
      <AnnouncementBanner announcement={settings.announcement} />

      <Header
        currentTool={activeTool}
        onBackToHome={() => setActiveTool(null)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAdmin={() => setIsLoginModalOpen(true)}
        siteTitle={settings.siteTitle}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto w-full max-w-[1600px]">
          {activeTool ? (
            <div>{renderActiveTool()}</div>
          ) : (
            <div>
              {/* Hero Banner */}
              <div className="mb-8 text-center sm:text-left">
                <h1 className="bg-gradient-to-r from-sky-600 via-indigo-600 to-pink-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
                  {settings.heroTitle || 'ระบบจัดการเอกสาร PDF ใช้งานง่ายในที่เดียว'}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                  {settings.siteSubtitle}
                </p>

                {/* Visitor & Online User Status Pills */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    <Eye className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                    ผู้เข้าชมทั้งหมด {visitorCount.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    กำลังใช้งานอยู่ {onlineUsers} คน
                  </span>
                </div>

                {/* Search Bar & Category Filter Tabs */}
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <Search className="ml-2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาเครื่องมือ เช่น AI สรุปเอกสาร, ร่างหนังสือราชการ, QR Code..."
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-white"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mr-2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
                    {[
                      { id: 'all' as const, label: 'ทั้งหมด' },
                      { id: 'ai' as const, label: '✨ AI สำหรับครู' },
                      { id: 'pdf' as const, label: '📄 งาน PDF' },
                      { id: 'office' as const, label: '🏢 สำนักงาน & QR' },
                      { id: 'image' as const, label: '🖼️ รูปภาพ' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:py-1.5 ${
                          selectedCategory === cat.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onClick={() => handleSelectTool(tool.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer
        securityText={settings.footerSecurityText}
        badge1={settings.footerBadge1}
        badge2={settings.footerBadge2}
        copyright={settings.footerCopyright}
      />

      {/* Admin Login PIN Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        correctPin={settings.adminPin || '1234'}
        onSuccess={() => {
          setIsLoginModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* Floating Chat & Contact Widget (Bottom Right) */}
      {!isAdminOpen && <FloatingChatWidget settings={settings} />}

      {/* PWA Install Prompt Banner */}
      {!isAdminOpen && <PwaInstallPrompt />}
    </div>
  );
};
