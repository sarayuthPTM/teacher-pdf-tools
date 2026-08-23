import React, { useState } from 'react';
import {
  Sparkles,
  KeyRound,
  Cpu,
  Save,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SiteSettings } from '../../types/admin';
import { testGeminiConnection } from '../../lib/ai-service';

interface AdminAiSettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminAiSettings: React.FC<AdminAiSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [model, setModel] = useState(settings.geminiModel || 'gemini-1.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const modelOptions = [
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash (แนะนำ ⭐)',
      desc: 'เสถียรและเร็วมาก ตอบสนองฉับไว รองรับภาษาไทย 100% ฟรีตลอดชีพ',
      badge: 'เร็ว & เสถียร',
    },
    {
      id: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash (รุ่นใหม่)',
      desc: 'วิเคราะห์เอกสารและระเบียบราชการได้อย่างละเอียดและแม่นยำยิ่งขึ้น',
      badge: 'ฉลาดแม่นยำ',
    },
    {
      id: 'gemini-3.7-flash',
      name: 'Gemini 3.7 Flash (AI Studio)',
      desc: 'โมเดลเจเนอเรชันล่าสุดจาก Google AI Studio',
      badge: 'ล่าสุด',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash (มาตรฐาน)',
      desc: 'โมเดลมาตรฐานความเร็วสูง',
      badge: 'มาตรฐาน',
    },
  ];

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      geminiApiKey: apiKey.trim(),
      geminiModel: model,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, msg: 'กรุณากรอก API Key ก่อนทดสอบ' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const isOk = await testGeminiConnection(apiKey.trim(), model);
      if (isOk) {
        setTestResult({ success: true, msg: 'เชื่อมต่อ Google Gemini API สำเร็จ 100% พร้อมใช้งาน!' });
      } else {
        setTestResult({ success: false, msg: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบความถูกต้องของ API Key' });
      }
    } catch (e: any) {
      setTestResult({ success: false, msg: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            ตั้งค่าปัญญาประดิษฐ์ AI (Google Gemini Settings)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            กำหนด API Key และเลือกโมเดล AI เพื่อให้คุณครูทุกคนในโรงเรียนใช้งานเครื่องมือ AI ได้ฟรี
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'บันทึกเรียบร้อยแล้ว' : 'บันทึกการตั้งค่า AI'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* API Key Configuration */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <KeyRound className="h-4 w-4 text-purple-600" />
              1. กำหนดรหัส Google Gemini API Key
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Google Gemini API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {showKey ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                  </button>
                </div>

                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="วาง Gemini API Key ที่นี่ (เช่น AQ... หรือ AIzaSy...)"
                  className="w-full font-mono rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Test Button & Result */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={isTesting || !apiKey.trim()}
                  onClick={handleTestConnection}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  ทดสอบการเชื่อมต่อ API
                </button>
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-2xl p-3.5 text-xs font-semibold ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Model Selection & Custom Model Input */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Cpu className="h-4 w-4 text-indigo-600" />
                2. เลือกหรือพิมพ์ระบุโมเดล AI ที่ต้องการใช้งาน
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                โมเดลปัจจุบัน: {model || 'ไม่ได้ระบุ'}
              </span>
            </div>

            {/* Custom Input Field to Type Any Model with Immediate Test Button */}
            <div className="mt-4 rounded-2xl border border-dashed border-purple-300 bg-purple-50/40 p-4 dark:border-purple-800 dark:bg-purple-950/20">
              <label className="mb-1.5 block text-xs font-bold text-purple-900 dark:text-purple-300">
                ✏️ พิมพ์ชื่อโมเดลที่ต้องการเอง (Custom Model Name / ID):
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value.trim());
                    setTestResult(null);
                  }}
                  placeholder="เช่น gemini-3.7-flash, gemini-3.6-flash, gemini-2.5-pro..."
                  className="flex-1 font-mono rounded-xl border border-purple-200 bg-white p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-purple-800 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  disabled={isTesting || !apiKey.trim() || !model.trim()}
                  onClick={handleTestConnection}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  กดทดสอบการเชื่อมต่อโมเดลนี้
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}

              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                * คุณสามารถพิมพ์ชื่อโมเดลรุ่นใหม่จาก Google AI Studio ได้อิสระ แล้วกดปุ่มทดสอบเพื่อตรวจสอบความพร้อมใช้งานได้ทันที
              </p>
            </div>

            {/* Preset Model Buttons */}
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                หรือคลิกเลือกโมเดลแนะนำด่วน:
              </p>
              {modelOptions.map((opt) => {
                const isSelected = model.toLowerCase() === opt.id.toLowerCase();

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setModel(opt.id)}
                    className={`flex w-full items-start justify-between rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-2 border-purple-600 bg-purple-50/60 shadow-sm dark:border-purple-500 dark:bg-purple-950/30'
                        : 'border-slate-200 bg-slate-50/50 hover:border-purple-200 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {opt.name}
                        </p>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {opt.desc}
                      </p>
                      <span className="mt-1.5 inline-block font-mono text-[10px] text-slate-400">
                        id: {opt.id}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="lg:col-span-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-amber-500" />
              วิธีขอรับ Gemini API Key ฟรี
            </h3>

            <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                1. เข้าไปที่เว็บไซต์ <strong>Google AI Studio</strong> (ล็อกอินด้วยบัญชี Google เช่น บัญชีอีเมลโรงเรียนหรือ Gmail)
              </p>
              <p>
                2. คลิกที่ปุ่ม <strong>"Get API key"</strong> ด้านบนซ้าย
              </p>
              <p>
                3. กด <strong>"Create API key"</strong> แล้วคัดลอกรหัสมาวางในช่องทางด้านซ้าย
              </p>
              <p>
                4. กดปุ่ม <strong>"บันทึกการตั้งค่า AI"</strong> เพียงเท่านี้คุณครูทุกคนก็จะใช้งาน AI ได้ทันทีครับ!
              </p>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                เปิด Google AI Studio <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
