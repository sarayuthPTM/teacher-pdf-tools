import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Activity,
  CheckCircle2,
  Users,
  Download,
  Flame,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getToolUsageStats, getActivityLogs } from '../../lib/analytics-service';
import { ToolDefinition } from '../../types';
import { UsageAnalyticsChart } from './UsageAnalyticsChart';

interface AdminDashboardProps {
  allTools: ToolDefinition[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ allTools }) => {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'pdf' | 'image' | 'office'>('all');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');

  const refreshData = () => {
    setStats(getToolUsageStats());
    setLogs(getActivityLogs());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Calculate totals
  const totalOperations = Object.values(stats).reduce((a, b) => a + b, 0);
  const visitorCount = parseInt(localStorage.getItem('teacher_tools_visitors') || '1', 10);
  const avgDailyUsers = Math.max(1, Math.round(visitorCount / Math.max(1, (logs.length > 0 ? 7 : 1))));

  // Map tool data with titles and usage counts
  const toolStatsList = allTools.map((tool) => {
    const count = stats[tool.id] || 0;
    const percentage = totalOperations > 0 ? ((count / totalOperations) * 100).toFixed(1) : '0';
    return {
      ...tool,
      count,
      percentage: parseFloat(percentage),
    };
  });

  // Filter & Sort
  const filteredList = toolStatsList
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      return a.title.localeCompare(b.title);
    });

  const exportStatsCsv = () => {
    const headers = ['รหัสเครื่องมือ', 'ชื่อเครื่องมือ', 'หมวดหมู่', 'จำนวนครั้งที่ใช้งาน', 'สัดส่วน (%)'];
    const rows = toolStatsList
      .sort((a, b) => b.count - a.count)
      .map((t) => [t.id, `"${t.title}"`, t.category, t.count, `${t.percentage}%`]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tool_usage_report_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            ภาพรวม & สถิติการใช้งานเครื่องมือ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            วิเคราะห์ความนิยมและแนวโน้มการใช้งานเครื่องมือทั้งหมด เพื่อนำไปพัฒนาและปรับปรุงระบบ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> รีเฟรชข้อมูล
          </button>
          <button
            onClick={exportStatsCsv}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95"
          >
            <Download className="h-3.5 w-3.5" /> ส่งออกรายงาน (.CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards (4 Cards - Replaced Bandwidth Card with Avg Daily Users) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Visitors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ผู้เข้าชมสะสมทั้งหมด
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
              <Eye className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {visitorCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" /> เพิ่มขึ้นต่อเนื่อง
          </div>
        </div>

        {/* Card 2: Total Operations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              เอกสารที่ประมวลผลสำเร็จ
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalOperations.toLocaleString()} <span className="text-xs font-normal text-slate-400">รายการ</span>
          </p>
          <div className="mt-1 text-[11px] text-slate-500">
            รวมทุกเครื่องมือในระบบ
          </div>
        </div>

        {/* Card 3: Average Daily Users (Replaced Bandwidth Card) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ผู้ใช้งานเฉลี่ยต่อวัน
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            ~{avgDailyUsers.toLocaleString()} <span className="text-xs font-normal text-slate-400">คน/วัน</span>
          </p>
          <div className="mt-1 text-[11px] text-violet-600 dark:text-violet-400">
            ครูและบุคลากรในโรงเรียน
          </div>
        </div>

        {/* Card 4: Top Tool */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              เครื่องมือยอดนิยมอันดับ 1
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900 line-clamp-1 dark:text-white">
            {filteredList[0]?.title || 'รวมไฟล์ PDF'}
          </p>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            {filteredList[0]?.count || 0} ครั้ง ({filteredList[0]?.percentage || 0}%)
          </div>
        </div>
      </div>

      {/* NEW: Interactive Modern Analytics Chart with Time Periods */}
      <UsageAnalyticsChart />

      {/* Main Breakdown: Tool Usage Ranking with Visual Progress Bars */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Ranked Tool Usage */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  สถิติการใช้งานเครื่องมือแต่ละตัว (เรียงจากมากไปน้อย)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  แสดงจำนวนครั้งและเปอร์เซ็นต์ความนิยมของเครื่องมือทั้ง 16 รายการ
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">ทุกหมวดหมู่ ({toolStatsList.length})</option>
                  <option value="pdf">งาน PDF</option>
                  <option value="office">งานสำนักงาน & QR</option>
                  <option value="image">งานรูปภาพ</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="count">เรียงตามยอดใช้งานสูงสุด</option>
                  <option value="name">เรียงตามชื่อ ก-ฮ</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="mt-4 space-y-3.5">
              {filteredList.map((tool, index) => {
                const Icon = tool.icon;
                const maxCount = filteredList[0]?.count || 1;
                const barWidth = Math.max(4, (tool.count / maxCount) * 100);

                return (
                  <div
                    key={tool.id}
                    className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-slate-300 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            index === 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : index === 1
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              : index === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {tool.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {tool.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {tool.count.toLocaleString()}
                        </span>
                        <span className="ml-1 text-xs text-slate-500">ครั้ง</span>
                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {tool.percentage}%
                        </p>
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Recent Live Activity Log */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Activity className="h-5 w-5 text-emerald-500" />
              บันทึกกิจกรรมล่าสุด
            </h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              กิจกรรมการใช้งานเอกสาร (ไม่บันทึกข้อมูลส่วนบุคคล)
            </p>

            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => {
                const timeAgo = Math.round((Date.now() - log.timestamp) / (1000 * 60));
                const timeStr =
                  timeAgo < 1 ? 'เมื่อสักครู่' : timeAgo < 60 ? `${timeAgo} นาทีที่แล้ว` : `${Math.round(timeAgo / 60)} ชม. ที่แล้ว`;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {log.toolTitle}
                      </p>
                      {log.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {log.details}
                        </p>
                      )}
                      <span className="mt-1 block text-[10px] text-slate-400">
                        <Clock className="mr-1 inline h-2.5 w-2.5" />
                        {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
