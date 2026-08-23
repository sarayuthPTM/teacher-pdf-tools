import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Loader2,
  FileText,
  Trash2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { extractTextFromPdf, chatWithPdf } from '../../lib/ai-service';
import { loadSettings } from '../../lib/settings-service';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const AiChatPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnswering]);

  const handleFileSelected = async (files: File[]) => {
    if (!files[0]) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setErrorMsg(null);
    setMessages([]);

    try {
      setIsExtracting(true);
      const extracted = await extractTextFromPdf(selectedFile);
      setPdfText(extracted.text);
      setNumPages(extracted.numPages);

      // Initial welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: `สวัสดีครับ! ผมได้อ่านเอกสาร "${selectedFile.name}" (${extracted.numPages} หน้า) เรียบร้อยแล้ว คุณครูสามารถพิมพ์ถามคำถามเกี่ยวกับเนื้อหาในเอกสารนี้ได้เลยครับ`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('ไม่สามารถอ่านข้อความจากไฟล์ PDF ได้');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const question = queryText || inputQuery;
    if (!question.trim() || !pdfText || isAnswering) return;

    setInputQuery('');
    setErrorMsg(null);

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: question,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAnswering(true);

    try {
      const settings = loadSettings();
      const apiKey = settings.geminiApiKey;
      const model = settings.geminiModel || 'gemini-1.5-flash';

      const responseText = await chatWithPdf(
        pdfText,
        messages.map((m) => ({ role: m.role, text: m.text })),
        question,
        apiKey,
        model
      );

      const aiMsg: ChatMessage = {
        id: `${Date.now()}-ai`,
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการตอบคำถาม');
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          แชทถาม-ตอบกับเอกสาร PDF (Chat with PDF)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          พูดคุยและสอบถามข้อมูล กฎระเบียบ หรือรายละเอียดสำคัญจากไฟล์เอกสารได้ทันที
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากไฟล์ PDF ที่ต้องการพูดคุยมาวางที่นี่"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          {/* File Info Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 line-clamp-1 dark:text-white">
                  {file.name}
                </p>
                <span className="text-[11px] text-slate-400">
                  {isExtracting ? 'กำลังวิเคราะห์หน้าเอกสาร...' : `เอกสารพร้อมใช้งาน (${numPages} หน้า)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMessages([])}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="ล้างประวัติการคุย"
              >
                <Trash2 className="h-3.5 w-3.5" /> ล้างแชท
              </button>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPdfText('');
                  setMessages([]);
                }}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                เปลี่ยนไฟล์
              </button>
            </div>
          </div>

          {/* Quick Questions Suggestions */}
          {messages.length <= 1 && !isExtracting && (
            <div className="border-b border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                💡 คำถามแนะนำ:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  'เอกสารนี้มีใจความสำคัญเกี่ยวกับอะไร?',
                  'มีข้อปฏิบัติหรือสิ่งที่ต้องดำเนินการอย่างไรบ้าง?',
                  'มีกำหนดการหรือกำหนดส่งเมื่อไร?',
                  'ใครคือกลุ่มเป้าหมายหรือผู้มีหน้าที่รับผิดชอบ?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages Box */}
          <div className="h-[420px] overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-tr from-indigo-600 to-sky-600'
                        : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              );
            })}

            {isAnswering && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-slate-100 p-4 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    AI กำลังค้นหาข้อมูลและตอบคำถาม...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {errorMsg && (
            <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input Box */}
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                disabled={isAnswering || isExtracting}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="พิมพ์คำถามเกี่ยวกับเอกสารนี้ที่นี่... (เช่น สรุปประเด็นหลัก, ระเบียบมีอะไรบ้าง)"
                className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || isAnswering || isExtracting}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md transition hover:opacity-95 disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
