import { FeedbackMessage } from '../types/admin';

const FEEDBACK_KEY = 'teacher_tools_feedback_messages';

export function getFeedbackMessages(): FeedbackMessage[] {
  try {
    const saved = localStorage.getItem(FEEDBACK_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to get feedback messages:', e);
    return [];
  }
}

export function saveFeedbackMessage(
  name: string,
  category: 'question' | 'bug' | 'feature' | 'general',
  message: string,
  department?: string
): FeedbackMessage {
  const messages = getFeedbackMessages();
  const newMsg: FeedbackMessage = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: name.trim() || 'คุณครู/บุคลากร',
    department: department?.trim() || undefined,
    category,
    message: message.trim(),
    timestamp: Date.now(),
    read: false,
  };

  const updated = [newMsg, ...messages];
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save feedback:', e);
  }

  return newMsg;
}

export function markFeedbackAsRead(id: string): void {
  const messages = getFeedbackMessages();
  const updated = messages.map((m) => (m.id === id ? { ...m, read: true } : m));
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to mark read:', e);
  }
}

export function deleteFeedbackMessage(id: string): void {
  const messages = getFeedbackMessages();
  const updated = messages.filter((m) => m.id !== id);
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete message:', e);
  }
}

export function getUnreadFeedbackCount(): number {
  const messages = getFeedbackMessages();
  return messages.filter((m) => !m.read).length;
}
