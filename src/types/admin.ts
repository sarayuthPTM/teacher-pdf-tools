export interface ToolUsageStat {
  toolId: string;
  count: number;
  lastUsed?: number;
}

export interface ActivityLog {
  id: string;
  toolId: string;
  toolTitle: string;
  timestamp: number;
  details?: string;
}

export interface FeedbackMessage {
  id: string;
  name: string;
  department?: string;
  category: 'question' | 'bug' | 'feature' | 'general';
  message: string;
  timestamp: number;
  read?: boolean;
}

export interface SiteSettings {
  siteTitle: string;
  heroTitle?: string;
  siteSubtitle: string;
  logoUrl: string | null;
  backgroundImageUrl?: string | null;
  backgroundOpacity?: number; // 0 to 100
  backgroundBlur?: number; // 0 to 20 px
  fontFamily: 'Prompt' | 'Sarabun' | 'Kanit';
  primaryColor: string;
  headerGradient: string;
  disabledTools: string[];
  toolOrder?: string[];
  customBadges: Record<string, string>;
  adminPin: string;
  geminiApiKey: string;
  geminiModel: string;
  contactLineId?: string;
  contactEmail?: string;
  footerSecurityText?: string;
  footerBadge1?: string;
  footerBadge2?: string;
  footerCopyright?: string;
  googleSheetsWebhookUrl?: string;
  announcement: {
    enabled: boolean;
    text: string;
    type: 'info' | 'warning' | 'success';
  };
}

export type AdminTab = 'dashboard' | 'tools' | 'ai' | 'theme' | 'announcement' | 'messages' | 'security';
