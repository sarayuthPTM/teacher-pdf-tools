import { ActivityLog, ToolUsageStat } from '../types/admin';
import { loadSettings } from './settings-service';

const USAGE_STATS_KEY = 'teacher_tools_usage_stats';
const ACTIVITY_LOGS_KEY = 'teacher_tools_activity_logs';
const VISITORS_KEY = 'teacher_tools_visitors';
const SESSION_VISITED_KEY = 'teacher_tools_session_tracked';

function detectDevice(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return '📱 iPhone/iPad';
  if (/Android/.test(ua)) return '📱 Android';
  if (/Macintosh/.test(ua)) return '💻 Mac';
  if (/Windows/.test(ua)) return '💻 Windows';
  return '🌐 Web Browser';
}

/**
 * Asynchronously send event log to Google Sheets Apps Script Webhook
 */
export function sendToGoogleSheets(payload: {
  type: 'visit' | 'tool_use';
  toolId?: string;
  toolTitle?: string;
  details?: string;
}): void {
  try {
    const settings = loadSettings();
    const url = settings.googleSheetsWebhookUrl;
    if (!url || !url.trim().startsWith('https://script.google.com/')) return;

    fetch(url.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        ...payload,
        device: detectDevice(),
        userAgent: navigator.userAgent,
      }),
    }).catch((e) => console.warn('Failed to send stats to Google Sheets:', e));
  } catch (e) {
    // Ignore network errors
  }
}

export function getToolUsageStats(): Record<string, number> {
  try {
    const saved = localStorage.getItem(USAGE_STATS_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to get usage stats:', e);
    return {};
  }
}

export function trackToolUsage(toolId: string, toolTitle: string, details?: string): void {
  try {
    const currentStats = getToolUsageStats();
    currentStats[toolId] = (currentStats[toolId] || 0) + 1;
    localStorage.setItem(USAGE_STATS_KEY, JSON.stringify(currentStats));

    // Append to recent activity logs
    const logs = getActivityLogs();
    const newLog: ActivityLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      toolId,
      toolTitle,
      timestamp: Date.now(),
      details: details || 'ใช้งานสำเร็จ',
    };
    const updatedLogs = [newLog, ...logs].slice(0, 100); // keep last 100
    localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(updatedLogs));

    // Sync to Google Sheets
    sendToGoogleSheets({
      type: 'tool_use',
      toolId,
      toolTitle,
      details: details || 'ใช้งานสำเร็จ',
    });
  } catch (e) {
    console.error('Failed to track tool usage:', e);
  }
}

export function getActivityLogs(): ActivityLog[] {
  try {
    const saved = localStorage.getItem(ACTIVITY_LOGS_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to get activity logs:', e);
    return [];
  }
}

export function getVisitorCount(): number {
  try {
    const saved = localStorage.getItem(VISITORS_KEY);
    return saved ? parseInt(saved, 10) : 1;
  } catch (e) {
    return 1;
  }
}

export function incrementVisitorCount(): number {
  try {
    const count = getVisitorCount() + 1;
    localStorage.setItem(VISITORS_KEY, count.toString());

    // Only send page view once per session
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(SESSION_VISITED_KEY)) {
      sessionStorage.setItem(SESSION_VISITED_KEY, 'true');
      sendToGoogleSheets({
        type: 'visit',
        toolTitle: 'เข้าสู่เว็บไซต์หน้าแรก',
        details: 'เปิดหน้าเว็บ',
      });
    }

    return count;
  } catch (e) {
    return 1;
  }
}

export function resetAllStats(): void {
  try {
    localStorage.removeItem(USAGE_STATS_KEY);
    localStorage.removeItem(ACTIVITY_LOGS_KEY);
    localStorage.setItem(VISITORS_KEY, '1');
  } catch (e) {
    console.error('Failed to reset stats:', e);
  }
}

