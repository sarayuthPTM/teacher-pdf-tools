import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  Trash2,
  Clock,
  User,
  Building,
  RefreshCw,
  Search,
  MessageSquare,
  HelpCircle,
  Bug,
  Lightbulb,
  Check,
} from 'lucide-react';
import {
  getFeedbackMessages,
  markFeedbackAsRead,
  deleteFeedbackMessage,
} from '../../lib/feedback-service';
import { FeedbackMessage } from '../../types/admin';

export const AdminMessages: React.FC = () => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const refreshMessages = () => {
    setMessages(getFeedbackMessages());
  };

  useEffect(() => {
    refreshMessages();
  }, []);

  const handleMarkRead = (id: string) => {
    markFeedbackAsRead(id);
    refreshMessages();
  };

  const handleDelete = (id: string) => {
    if (confirm('คุณต้องการลบข้อความนี้ใช่หรือไม่?')) {
      deleteFeedbackMessage(id);
      refreshMessages();
    }
  };

  const filteredMessages = messages
    .filter((m) => filterCategory === 'all' || m.category === filterCategory)
    .filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'question':
        return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">❓ สอบถาม</span>;
      case 'bug':
        return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">🐛 แจ้งปัญหา</span>;
      case 'feature':
        return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">💡 เสนอแนะ</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">💬 ทั่วไป</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            กล่องข้อความติดต่อ & สอบถาม (Feedback Inbox)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ข้อความ คำถาม และข้อเสนอแนะที่ส่งมาจากกล่องแชทด้านล่างขวาของเว็บไซต์
          </p>
        </div>

        <button
          onClick={refreshMessages}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className="h-3.5 w-3.5" /> รีเฟรชข้อความ ({messages.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อผู้ส่ง, กลุ่มสาระ หรือข้อความ..."
            className="w-full bg-transparent focus:outline-none dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'question', label: 'สอบถาม' },
            { id: 'bug', label: 'แจ้งปัญหา' },
            { id: 'feature', label: 'เสนอแนะ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterCategory === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <Mail className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              ยังไม่มีข้อความติดต่อเข้ามา
            </p>
            <span className="mt-1 text-xs text-slate-400">
              เมื่อมีคุณครูหรือบุคลากรส่งข้อความผ่านกล่องแชทด้านล่างขวา ข้อความจะปรากฏที่นี่ทันทีครับ
            </span>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const dateStr = new Date(msg.timestamp).toLocaleString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  msg.read
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/60 dark:bg-indigo-950/20 shadow-sm'
                }`}
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {msg.name}
                        </h4>
                        {msg.department && (
                          <span className="text-xs text-slate-400 font-medium">
                            ({msg.department})
                          </span>
                        )}
                        {getCategoryBadge(msg.category)}
                        {!msg.read && (
                          <span className="rounded-full bg-pink-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                            ใหม่
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="h-3 w-3" /> {dateStr}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleMarkRead(msg.id)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        msg.read
                          ? 'text-slate-400 hover:text-slate-600'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                    >
                      <Check className="h-3.5 w-3.5" /> {msg.read ? 'อ่านแล้ว' : 'ทำเครื่องหมายว่าอ่าน'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="ลบข้อความ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 whitespace-pre-wrap">
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
