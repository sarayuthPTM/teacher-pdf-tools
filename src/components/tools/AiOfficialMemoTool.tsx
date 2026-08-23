import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  Send,
  Building,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  FileDown,
  UploadCloud,
  Reply,
  Layers,
  FileSearch,
  Maximize2,
  Minimize2,
  Printer,
} from 'lucide-react';
import { FileDropzone } from '../ui/FileDropzone';
import {
  draftOfficialMemo,
  draftReplyMemo,
  exportMemoToDocx,
  extractTextFromPdf,
  OfficialMemoInput,
} from '../../lib/ai-service';
import { loadSettings } from '../../lib/settings-service';

export const AiOfficialMemoTool: React.FC = () => {
  const todayStr = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Mode: 'new' (Draft New Memo) | 'reply' (Reply to Incoming File)
  const [activeMode, setActiveMode] = useState<'new' | 'reply'>('reply');
  const [isExpandedView, setIsExpandedView] = useState(false);

  // State for Mode 1: Draft New Memo
  const [formData, setFormData] = useState<OfficialMemoInput>({
    memoType: 'internal',
    department: 'โรงเรียน...',
    docNumber: 'ที่ ศธ ....../.......',
    dateStr: todayStr,
    subject: '',
    recipient: 'ผู้อำนวยการโรงเรียน...',
    senderName: '',
    senderPosition: 'ครู ค.ศ.1',
    mainDetails: '',
    attachments: '',
  });

  // State for Mode 2: Reply to Incoming File
  const [incomingFile, setIncomingFile] = useState<File | null>(null);
  const [incomingPdfText, setIncomingPdfText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [replyIntent, setReplyIntent] = useState('');
  const [replyDepartment, setReplyDepartment] = useState('โรงเรียน...');
  const [replySenderName, setReplySenderName] = useState('');
  const [replySenderPosition, setReplySenderPosition] = useState('ผู้อำนวยการโรงเรียน...');
  const [replyAttachments, setReplyAttachments] = useState('');

  // Result state
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const memoTypePresets = [
    { id: 'internal', label: 'บันทึกข้อความทั่วไป' },
    { id: 'project', label: 'ขออนุมัติโครงการ/กิจกรรม' },
    { id: 'travel', label: 'ขออนุมัติไปราชการ/พานักเรียนไปแข่ง' },
    { id: 'facility', label: 'ขอใช้สถานที่/ยานพาหนะ' },
    { id: 'report', label: 'รายงานผลการปฏิบัติงาน' },
  ];

  const quickReplyPresets = [
    {
      title: '✅ ตอบรับเข้าร่วม & ส่งรายชื่อ',
      text: 'โรงเรียนขอตอบรับเข้าร่วมกิจกรรมดังกล่าว และขอส่งรายชื่อครูผู้ควบคุม 2 คน และนักเรียน 4 คน ตามเอกสารแนบ',
    },
    {
      title: '📊 ส่งข้อมูล/รายงานผล',
      text: 'โรงเรียนได้ดำเนินการตามแบบสำรวจ/กิจกรรมดังกล่าวเรียบร้อยแล้ว จึงขอส่งรายงานและข้อมูลตามสิ่งที่ส่งมาด้วย',
    },
    {
      title: '🙏 ขอขอบคุณและแจ้งผล',
      text: 'โรงเรียนขอขอบคุณสำหรับความอนุเคราะห์ และขอแจ้งผลการดำเนินงานให้ทราบตามรายละเอียดที่แนบมาพร้อมนี้',
    },
  ];

  const handleIncomingFileSelected = async (files: File[]) => {
    if (!files[0]) return;
    const file = files[0];
    setIncomingFile(file);
    setErrorMsg(null);

    try {
      setIsExtracting(true);
      const extracted = await extractTextFromPdf(file);
      setIncomingPdfText(extracted.text);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('ไม่สามารถอ่านข้อความจากไฟล์ที่เลือกได้');
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate Draft for Mode 1 (New)
  const handleGenerateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.mainDetails.trim()) {
      alert('กรุณากรอกหัวข้อเรื่องและรายละเอียดความประสงค์');
      return;
    }

    setErrorMsg(null);
    setIsDrafting(true);

    try {
      const settings = loadSettings();
      const apiKey = settings.geminiApiKey;
      const model = settings.geminiModel || 'gemini-3.5-flash';

      const result = await draftOfficialMemo(formData, apiKey, model);
      setDraftResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการร่างหนังสือราชการ');
    } finally {
      setIsDrafting(false);
    }
  };

  // Generate Draft for Mode 2 (Reply from File)
  const handleGenerateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingPdfText.trim() || !replyIntent.trim()) {
      alert('กรุณาเลือกไฟล์หนังสือเข้าและระบุประเด็นที่ต้องการตอบกลับ');
      return;
    }

    setErrorMsg(null);
    setIsDrafting(true);

    try {
      const settings = loadSettings();
      const apiKey = settings.geminiApiKey;
      const model = settings.geminiModel || 'gemini-3.5-flash';

      const result = await draftReplyMemo(
        {
          incomingPdfText,
          replyIntent,
          department: replyDepartment,
          senderName: replySenderName,
          senderPosition: replySenderPosition,
          attachments: replyAttachments,
        },
        apiKey,
        model
      );
      setDraftResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการร่างหนังสือตอบกลับ');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopy = () => {
    if (!draftResult) return;
    navigator.clipboard.writeText(draftResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadDocx = async () => {
    if (!draftResult) return;
    const titlePrefix = activeMode === 'reply' ? 'หนังสือตอบกลับ' : 'บันทึกข้อความ';
    const cleanFilename = `${titlePrefix}_${(formData.subject || incomingFile?.name || 'ราชการ').replace(/[^a-zA-Z0-9ก-๙]/g, '_')}`;
    await exportMemoToDocx(draftResult, cleanFilename);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          AI ร่างหนังสือราชการ & บันทึกข้อความ (Official Memo Drafter)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ร่างบันทึกข้อความและหนังสือตอบกลับตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พร้อมดาวน์โหลดเป็น Word (.docx)
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 shadow-inner dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveMode('new');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition ${
              activeMode === 'new'
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" /> ร่างหนังสือใหม่ / ขออนุมัติทั่วไป
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('reply');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold transition ${
              activeMode === 'reply'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Reply className="h-4 w-4" /> 📥 ร่างหนังสือตอบกลับจากไฟล์ส่งมา (Reply Letter)
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form: Takes 4-5 columns on large screens, or hides if expanded */}
        <div className={`${isExpandedView ? 'hidden' : 'lg:col-span-5 xl:col-span-4'} space-y-4`}>
          {activeMode === 'new' ? (
            /* Mode 1: Draft New Memo */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                กรอกข้อมูลเพื่อร่างหนังสือราชการใหม่
              </h3>

              <form onSubmit={handleGenerateNew} className="space-y-4">
                {/* Memo Type Preset */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ประเภทหนังสือ / วัตถุประสงค์
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {memoTypePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, memoType: preset.id as any })}
                        className={`rounded-xl border p-2 text-center text-xs transition ${
                          formData.memoType === preset.id
                            ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department & Recipient */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      ส่วนราชการ / กลุ่มสาระฯ
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="เช่น โรงเรียนบ้านนาวิทยา กลุ่มสาระฯ ภาษาไทย"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      เรียน (ผู้รับหนังสือ)
                    </label>
                    <input
                      type="text"
                      value={formData.recipient}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      placeholder="เช่น ผู้อำนวยการโรงเรียน..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    เรื่อง (Subject) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="เช่น ขออนุมัติพานักเรียนเข้าร่วมการแข่งขันทักษะวิชาการ"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Main Details */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    รายละเอียด / ประเด็นความประสงค์ (พิมพ์คร่าวๆ ได้เลย AI จะแต่งภาษาให้) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.mainDetails}
                    onChange={(e) => setFormData({ ...formData, mainDetails: e.target.value })}
                    placeholder="เช่น ต้องการพานักเรียน ม.3 จำนวน 4 คน ไปแข่งหุ่นยนต์ที่มหาวิทยาลัย... ในวันที่ 20 ก.ย. โดยขออนุมัติค่าเดินทาง 2,000 บาท และขอใช้รถตู้โรงเรียน..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Sender Name & Position */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      ชื่อผู้เสนอเรื่อง
                    </label>
                    <input
                      type="text"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder="เช่น นายสมชาย ใจดี"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={formData.senderPosition}
                      onChange={(e) => setFormData({ ...formData, senderPosition: e.target.value })}
                      placeholder="เช่น ครู วิทยฐานะชำนาญการ"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isDrafting || !formData.subject || !formData.mainDetails}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI กำลังเรียบเรียงภาษาหนังสือราชการ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      ร่างหนังสือราชการด้วย AI
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Mode 2: Reply from Incoming File */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Reply className="h-4 w-4 text-emerald-600" />
                อัปโหลดไฟล์หนังสือเข้า เพื่อร่างหนังสือตอบกลับ/ส่งกลับ
              </h3>

              {!incomingFile ? (
                <FileDropzone
                  accept=".pdf"
                  multiple={false}
                  onFilesSelected={handleIncomingFileSelected}
                  title="ลากไฟล์หนังสือเข้า (PDF) มาวางที่นี่"
                  buttonText="เลือกไฟล์หนังสือเข้า"
                />
              ) : (
                <form onSubmit={handleGenerateReply} className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2.5">
                      <FileSearch className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {incomingFile.name}
                        </p>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          {isExtracting ? 'กำลังอ่านเนื้อหาหนังสือ...' : 'อ่านหนังสือต้นเรื่องสำเร็จแล้ว'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIncomingFile(null);
                        setIncomingPdfText('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      เปลี่ยนไฟล์
                    </button>
                  </div>

                  {/* Quick Reply Presets */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      💡 ตัวอย่างข้อความตอบกลับด่วน:
                    </label>
                    <div className="space-y-2">
                      {quickReplyPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyIntent(preset.text)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs transition hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-800/50"
                        >
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {preset.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                            {preset.text}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reply Intent */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      ระบุประเด็นที่ต้องการตอบกลับ (พิมพ์ประเด็นสั้นๆ ได้เลย AI จะเรียบเรียงให้อย่างเป็นทางการ) *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={replyIntent}
                      onChange={(e) => setReplyIntent(e.target.value)}
                      placeholder="เช่น โรงเรียนขอตอบรับเข้าร่วมการประชุม และขอส่งรายชื่อครู 2 คน คือ นาย ก และ นาง ข พร้อมแนบเบอร์โทร..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Department & Sender */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        ส่วนราชการผู้ตอบกลับ
                      </label>
                      <input
                        type="text"
                        value={replyDepartment}
                        onChange={(e) => setReplyDepartment(e.target.value)}
                        placeholder="เช่น โรงเรียนบ้านนาวิทยา"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        ตำแหน่งผู้ลงนาม
                      </label>
                      <input
                        type="text"
                        value={replySenderPosition}
                        onChange={(e) => setReplySenderPosition(e.target.value)}
                        placeholder="เช่น ผู้อำนวยการโรงเรียน..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isDrafting || isExtracting || !incomingPdfText || !replyIntent}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                  >
                    {isDrafting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI กำลังวิเคราะห์หนังสือเข้าและร่างหนังสือตอบกลับ...
                      </>
                    ) : (
                      <>
                        <Reply className="h-4 w-4" />
                        ร่างหนังสือตอบกลับด้วย AI
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Output Area: Spacious Document View */}
        <div className={`${isExpandedView ? 'lg:col-span-12' : 'lg:col-span-7 xl:col-span-8'}`}>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  📄 ร่างเอกสารราชการฉบับสมบูรณ์ (Preview)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setIsExpandedView(!isExpandedView)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  title={isExpandedView ? 'ย่อหน้าจอ' : 'ขยายเต็มหน้าจอ'}
                >
                  {isExpandedView ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {isExpandedView ? 'แสดงฟอร์ม' : 'ขยายเต็มจอ'}
                </button>

                {draftResult && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadDocx}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <FileDown className="h-4 w-4" /> โหลดเป็น Word (.docx)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Document Paper Layout */}
            {draftResult ? (
              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-8 dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 sm:p-12 shadow-md dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="font-sarabun text-[15px] sm:text-[16px] leading-[2.1] text-slate-900 dark:text-slate-100 whitespace-pre-wrap selection:bg-emerald-100">
                    {draftResult}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center text-center text-slate-400">
                <FileText className="mb-3 h-14 w-14 opacity-20" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {activeMode === 'reply'
                    ? 'อัปโหลดไฟล์หนังสือเข้า ระบุประเด็น แล้วกด "ร่างหนังสือตอบกลับด้วย AI"'
                    : 'กรอกข้อมูลทางด้านซ้ายแล้วกดปุ่ม "ร่างหนังสือราชการด้วย AI"'}
                </p>
                <span className="mt-1 max-w-md text-xs text-slate-400">
                  ระบบจะสกัดเลขอ้างอิง และเรียบเรียงสำนวนราชการตามระเบียบงานสารบรรณให้อัตโนมัติในรูปแบบหน้ากระดาษราชการที่อ่านง่ายสบายตา
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
