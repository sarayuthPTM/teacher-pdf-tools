import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Bot,
  Copy,
  Check,
  Download,
  Loader2,
  ListChecks,
  FileCheck,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import { extractTextFromPdf, summarizePdf } from '../../lib/ai-service';
import { loadSettings } from '../../lib/settings-service';

export const AiSummarizerTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [summaryType, setSummaryType] = useState<'bullet' | 'detailed' | 'action_items'>('bullet');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files[0]) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setSummaryResult('');
    setErrorMsg(null);

    try {
      setIsExtracting(true);
      const extracted = await extractTextFromPdf(selectedFile);
      setPdfText(extracted.text);
      setNumPages(extracted.numPages);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('ไม่สามารถอ่านข้อความจากไฟล์ PDF ได้');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!pdfText.trim()) return;
    setErrorMsg(null);
    setIsSummarizing(true);

    try {
      const settings = loadSettings();
      const apiKey = settings.geminiApiKey;
      const model = settings.geminiModel || 'gemini-1.5-flash';

      const result = await summarizePdf(pdfText, summaryType, apiKey, model);
      setSummaryResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสรุปเนื้อหาด้วย AI');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (!summaryResult) return;
    navigator.clipboard.writeText(summaryResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    if (!summaryResult) return;
    const blob = new Blob([summaryResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `สรุปเนื้อหา_${file?.name.replace('.pdf', '') || 'เอกสาร'}.txt`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          AI สรุปเนื้อหาเอกสาร PDF (AI Summarizer)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          สรุปใจความสำคัญ ประเด็นที่ต้องปฏิบัติ และสาระสำคัญจากเอกสาร PDF หนาๆ ได้ในไม่กี่วินาที
        </p>
      </div>

      {!file ? (
        <FileDropzone
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="ลากไฟล์ PDF ที่ต้องการให้ AI สรุปมาวางที่นี่"
          buttonText="เลือกไฟล์ PDF"
        />
      ) : (
        <div className="space-y-6">
          {/* File Card & Options */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  ไฟล์ที่เลือก:
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {file.name} ({numPages} หน้า)
                </h4>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPdfText('');
                  setSummaryResult('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                เปลี่ยนไฟล์ใหม่
              </button>
            </div>

            {/* Summary Style Selectors */}
            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                เลือกรูปแบบการสรุป:
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    id: 'bullet' as const,
                    title: '📌 สรุปประเด็นสั้นกระชับ',
                    desc: 'สรุปเป็นข้อๆ 5-7 ข้อ เข้าใจได้ใน 1 นาที',
                    icon: ListChecks,
                  },
                  {
                    id: 'detailed' as const,
                    title: '📑 สรุปวิเคราะห์ละเอียด',
                    desc: 'แบ่งหมวดหมู่วัตถุประสงค์ สาระสำคัญ และข้อสรุป',
                    icon: FileCheck,
                  },
                  {
                    id: 'action_items' as const,
                    title: '⚡ สรุปสิ่งที่ต้องปฏิบัติ',
                    desc: 'เจาะจงขั้นตอน ข้อปฏิบัติ และกำหนดส่ง',
                    icon: Zap,
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSummaryType(opt.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      summaryType === opt.id
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{opt.title}</p>
                    <p className="mt-1 text-[11px] opacity-75">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              disabled={isExtracting || isSummarizing || !pdfText}
              onClick={handleGenerateSummary}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI กำลังวิเคราะห์และสรุปเนื้อหา...
                </>
              ) : isExtracting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังดึงข้อความจากเอกสาร...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  เริ่มการสรุปด้วย AI
                </>
              )}
            </button>
          </div>

          {/* Result Area */}
          {summaryResult && (
            <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-lift dark:border-indigo-900/50 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>ผลการสรุปเนื้อหาโดย AI</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <Download className="h-3.5 w-3.5" /> ดาวน์โหลดข้อความ (.txt)
                  </button>
                </div>
              </div>

              <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {summaryResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
