import { LucideIcon } from 'lucide-react';

export type ToolId =
  | 'edit-pdf'
  | 'ai-summarize'
  | 'ai-chat-pdf'
  | 'ai-memo'
  | 'scan'
  | 'merge'
  | 'organize'
  | 'split'
  | 'compress-pdf'
  | 'pdf-to-image'
  | 'compress-image'
  | 'jpg-to-pdf'
  | 'page-number'
  | 'watermark'
  | 'crop'
  | 'protect'
  | 'sign'
  | 'annotate'
  | 'qr-code'
  | 'pdf-to-word';

export interface ToolDefinition {
  id: ToolId;
  title: string;
  description: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  hoverBorder: string;
  iconBgFrom: string;
  iconBgTo: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  category: 'pdf' | 'image' | 'office' | 'ai';
}

export interface PDFPageInfo {
  pageNumber: number;
  thumbnailUrl: string;
  rotation: number;
  selected: boolean;
}
