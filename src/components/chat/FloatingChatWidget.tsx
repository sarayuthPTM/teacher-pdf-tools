import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  HelpCircle,
  Bug,
  Lightbulb,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { saveFeedbackMessage } from '../../lib/feedback-service';
import { callGeminiApi } from '../../lib/ai-service';
import { SiteSettings } from '../../types/admin';

interface FloatingChatWidgetProps {
  settings: SiteSettings;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({ settings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'contact'>('ai');

  // AI Chat state
  const [aiQuery, setAiQuery] = useState('');
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'สวัสดีครับคุณครู! ยินดีต้อนรับสู่ระบบเครื่องมือสำหรับครู มีข้อสงสัยเกี่ยวกับการใช้งานเว็บ เครื่องมือ PDF หรือต้องการปรึกษางานสำนักงาน/หนังสือราชการ ถามผมได้เลยครับ 😊',
    },
  ]);

  // Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactDept, setContactDept] = useState('');
  const [contactCategory, setContactCategory] = useState<'question' | 'bug' | 'feature' | 'general'>('question');
  const [contactMessage, setContactMessage] = useState('');
  const [isSentSuccess, setIsSentSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isOpen, activeTab]);

  // Handle AI send
  const handleSendAi = async (textToSend?: string) => {
    const query = textToSend || aiQuery;
    if (!query.trim() || isAiAnswering) return;

    setAiQuery('');
    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      text: query,
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiAnswering(true);

    try {
      const apiKey = settings.geminiApiKey;
      const model = settings.geminiModel || 'gemini-3.5-flash';

      const prompt = `ประวัติการคุย:
${aiMessages.slice(-4).map((m) => `${m.role === 'user' ? 'ครู' : 'AI'}: ${m.text}`).join('\n')}

คำถามล่าสุด: "${query}"

กรุณาตอบคำถามเป็นภาษาไทยอย่างสุภาพ กระชับ เป็นประโยชน์ต่อคุณครู (ระบบนี้มี 19 เครื่องมือ เช่น AI สรุปเอกสาร, AI แชทกับ PDF, AI ร่างหนังสือราชการและหนังสือตอบกลับ, รวม/แยก/ลดขนาด PDF, แปลงเป็น Word, สแกนเอกสาร, สร้าง QR Code):`;

      const systemInstruction = `คุณคือผู้ช่วย AI ประจำเว็บไซต์เครื่องมือสำหรับครู ตอบคำถามอย่างเป็นมิตร สุภาพ รวดเร็ว และกระชับ ไม่เกิน 3-4 ประโยค`;

      const reply = await callGeminiApi(prompt, systemInstruction, apiKey, model);

      setAiMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          role: 'model',
          text: reply,
        },
      ]);
    } catch (e: any) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: 'model',
          text: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง หรือสลับไปที่แท็บ "ส่งข้อความถึงผู้ดูแล" ได้ครับ',
        },
      ]);
    } finally {
      setIsAiAnswering(false);
    }
  };

  // Handle Contact Send
  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    saveFeedbackMessage(contactName, contactCategory, contactMessage, contactDept);
    setIsSentSuccess(true);
    setContactMessage('');
    setTimeout(() => {
      setIsSentSuccess(false);
    }, 4000);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Expanded Popup Window */}
      {isOpen && (
        <div className="mb-3 flex h-[80vh] max-h-[540px] w-[calc(100vw-2rem)] sm:w-[410px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200 dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 text-white dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">ศูนย์ช่วยเหลือ & ติดต่อผู้ดูแล</h3>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ออนไลน์ พร้อมให้ความช่วยเหลือ
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/30"
              title="ปิดหน้าต่าง"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                activeTab === 'ai'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              แชทผู้ช่วย AI
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                activeTab === 'contact'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Mail className="h-3.5 w-3.5 text-pink-600" />
              ส่งข้อความถึงผู้ดูแล
            </button>
          </div>

          {/* Tab 1: AI Chat Assistant */}
          {activeTab === 'ai' && (
            <div className="flex flex-1 flex-col overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
              {/* Quick Questions on start */}
              {aiMessages.length <= 1 && (
                <div className="border-b border-slate-100 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-400">คำถามแนะนำ:</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[
                      'เว็บนี้ทำอะไรได้บ้าง?',
                      'วิธีรวมไฟล์ PDF ทำอย่างไร?',
                      'ขอคำแนะนำร่างหนังสือราชการ',
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendAi(q)}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 shadow-2xs hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Box */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
                          isUser
                            ? 'bg-gradient-to-tr from-indigo-600 to-sky-600'
                            : 'bg-gradient-to-tr from-purple-600 to-pink-600'
                        }`}
                      >
                        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </div>

                      <div
                        className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  );
                })}

                {isAiAnswering && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                    <span>AI กำลังพิมพ์ตอบ...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAi();
                }}
                className="border-t border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="พิมพ์คำถามที่นี่..."
                    disabled={isAiAnswering}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!aiQuery.trim() || isAiAnswering}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm transition hover:opacity-95 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Contact Form (Direct to Admin) */}
          {activeTab === 'contact' && (
            <div className="flex flex-1 flex-col overflow-y-auto p-4 bg-white dark:bg-slate-900">
              {isSentSuccess ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    ส่งข้อความสำเร็จแล้ว!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ข้อความของคุณถูกส่งไปยังกล่องข้อความของผู้ดูแลระบบเรียบร้อยแล้ว ขอบคุณสำหรับข้อมูลครับ
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendContact} className="space-y-3.5">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      ส่งข้อความ / แจ้งปัญหา / แนะนำเครื่องมือ
                    </span>
                    <p className="text-[11px] text-slate-400">
                      ข้อความจะถูกส่งตรงเข้าสู่หน้าควบคุมของผู้ดูแลระบบ
                    </p>
                  </div>

                  {/* Category Pills */}
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {[
                      { id: 'question' as const, label: 'สอบถาม' },
                      { id: 'feature' as const, label: 'เสนอแนะ' },
                      { id: 'bug' as const, label: 'แจ้งปัญหา' },
                      { id: 'general' as const, label: 'ทั่วไป' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setContactCategory(cat.id)}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-semibold transition ${
                          contactCategory === cat.id
                            ? 'bg-indigo-50 border border-indigo-600 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Name & Dept */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">ชื่อของคุณ</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="เช่น ครูสมชาย"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">กลุ่มสาระ / งาน</label>
                      <input
                        type="text"
                        value={contactDept}
                        onChange={(e) => setContactDept(e.target.value)}
                        placeholder="เช่น วิชาการ"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      ข้อความ / รายละเอียด *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="พิมพ์ข้อความ คำถาม หรือสิ่งที่อยากให้เพิ่มที่นี่..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95"
                  >
                    <Send className="h-3.5 w-3.5" /> ส่งข้อความถึงผู้ดูแลระบบ
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
        title="แชทสอบถาม / ส่งข้อความถึงผู้ดูแล"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-pink-500 border-2 border-white dark:border-slate-950" />
        </span>

        {isOpen ? (
          <ChevronDown className="h-6 w-6 transition group-hover:rotate-180" />
        ) : (
          <MessageCircle className="h-6 w-6 transition group-hover:scale-110" />
        )}
      </button>
    </div>
  );
};
