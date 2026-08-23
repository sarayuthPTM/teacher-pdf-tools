import React, { useState } from 'react';
import {
  Calendar,
  BarChart3,
  TrendingUp,
  LineChart as LineChartIcon,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getActivityLogs, getToolUsageStats } from '../../lib/analytics-service';

export type TimeRange = 'today' | '7days' | '30days' | 'year';
export type ChartStyle = 'area' | 'bar';

interface DataPoint {
  label: string;
  value: number;
  subValue?: string;
}

export const UsageAnalyticsChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('area');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const logs = getActivityLogs();
  const stats = getToolUsageStats();
  const totalOperations = Object.values(stats).reduce((a, b) => a + b, 0);

  // Compute real data points from logs & stats
  const now = Date.now();
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'];

  // 1. Today (by hour blocks)
  const todayPoints: DataPoint[] = [
    { label: '08:00', value: 0, subValue: 'เช้า' },
    { label: '10:00', value: 0, subValue: 'สาย' },
    { label: '12:00', value: 0, subValue: 'เที่ยง' },
    { label: '14:00', value: 0, subValue: 'บ่าย' },
    { label: '16:00', value: 0, subValue: 'เย็น' },
    { label: '18:00', value: 0, subValue: 'ค่ำ' },
    { label: '20:00', value: 0, subValue: 'ดึก' },
  ];

  // Distribute real today logs
  logs.forEach((log) => {
    const d = new Date(log.timestamp);
    if (d.toDateString() === new Date().toDateString()) {
      const hour = d.getHours();
      if (hour < 9) todayPoints[0].value += 1;
      else if (hour < 11) todayPoints[1].value += 1;
      else if (hour < 13) todayPoints[2].value += 1;
      else if (hour < 15) todayPoints[3].value += 1;
      else if (hour < 17) todayPoints[4].value += 1;
      else if (hour < 19) todayPoints[5].value += 1;
      else todayPoints[6].value += 1;
    }
  });

  // 2. 7 Days (Last 7 days real counts)
  const sevenDayPoints: DataPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayLabel = dayNames[d.getDay()];
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;

    const count = logs.filter(
      (l) => new Date(l.timestamp).toDateString() === d.toDateString()
    ).length;

    return {
      label: dayLabel,
      value: count,
      subValue: dateStr,
    };
  });

  // 3. 30 Days (4 weeks)
  const thirtyDayPoints: DataPoint[] = [
    { label: 'สัปดาห์ 1', value: 0, subValue: '1-7 วันที่แล้ว' },
    { label: 'สัปดาห์ 2', value: 0, subValue: '8-14 วันที่แล้ว' },
    { label: 'สัปดาห์ 3', value: 0, subValue: '15-21 วันที่แล้ว' },
    { label: 'สัปดาห์ 4', value: 0, subValue: '22-30 วันที่แล้ว' },
  ];

  logs.forEach((log) => {
    const diffDays = Math.floor((now - log.timestamp) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) thirtyDayPoints[0].value += 1;
    else if (diffDays <= 14) thirtyDayPoints[1].value += 1;
    else if (diffDays <= 21) thirtyDayPoints[2].value += 1;
    else if (diffDays <= 30) thirtyDayPoints[3].value += 1;
  });

  // 4. Year (12 months)
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const currentMonth = new Date().getMonth();
  const yearPoints: DataPoint[] = monthNames.map((m, idx) => ({
    label: m,
    value: idx === currentMonth ? totalOperations : 0,
    subValue: idx === currentMonth ? 'เดือนปัจจุบัน' : undefined,
  }));

  const dataMap: Record<TimeRange, DataPoint[]> = {
    today: todayPoints,
    '7days': sevenDayPoints,
    '30days': thirtyDayPoints,
    year: yearPoints,
  };

  const currentData = dataMap[timeRange];
  const maxValue = Math.max(...currentData.map((d) => d.value), 5);
  const totalPeriodValue = currentData.reduce((acc, curr) => acc + curr.value, 0);
  const avgValue = Math.round(totalPeriodValue / Math.max(1, currentData.length));
  const peakData = [...currentData].sort((a, b) => b.value - a.value)[0];

  // SVG dimensions for Area Chart
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Calculate coordinates
  const points = currentData.map((d, index) => {
    const x = paddingX + (index / (currentData.length - 1)) * graphWidth;
    const y = svgHeight - paddingY - (d.value / maxValue) * graphHeight;
    return { x, y, ...d };
  });

  // Construct smooth bezier curve path for Area & Line
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      {/* Chart Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              กราฟสถิติแนวโน้มการใช้งานระบบ (Real Analytics)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            วิเคราะห์ปริมาณการเปิดใช้งานเอกสารและเครื่องมือตามช่วงเวลาจริง
          </p>
        </div>

        {/* Style & Time Range Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Style Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              className={`rounded-lg p-1.5 transition ${
                chartStyle === 'area'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="กราฟพื้นที่แบบโค้งไล่เฉดสี"
            >
              <LineChartIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('bar')}
              className={`rounded-lg p-1.5 transition ${
                chartStyle === 'bar'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="กราฟแท่งแนวตั้ง"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Time Range Pills */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[
              { id: 'today' as TimeRange, label: 'วันนี้' },
              { id: '7days' as TimeRange, label: '7 วันล่าสุด' },
              { id: '30days' as TimeRange, label: '30 วันล่าสุด' },
              { id: 'year' as TimeRange, label: 'รายเดือน (ทั้งปี)' },
            ].map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setTimeRange(range.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  timeRange === range.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Metrics Badges */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ยอดรวมช่วงนี้: <strong>{totalPeriodValue} ครั้ง</strong></span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>เฉลี่ย: <strong>{avgValue} ครั้ง/ช่วง</strong></span>
        </div>
        {peakData && peakData.value > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>ช่วงพีคสุด: <strong>{peakData.label} ({peakData.value} ครั้ง)</strong></span>
          </div>
        )}
      </div>

      {/* Main Interactive Chart Canvas */}
      <div className="relative mt-6 h-60 w-full overflow-hidden">
        {chartStyle === 'area' ? (
          /* Area Curve Chart */
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = svgHeight - paddingY - ratio * graphHeight;
              const val = Math.round(ratio * maxValue);
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[9px]"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Gradient Fill Path */}
            <path d={areaD} fill="url(#areaGradient)" />

            {/* Line Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="filter drop-shadow-sm transition-all duration-300"
            />

            {/* Interactive Data Points */}
            {points.map((pt, idx) => (
              <g
                key={idx}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Outer ring on hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="7"
                  className="fill-indigo-600/20 opacity-0 group-hover:opacity-100 transition duration-150"
                />
                {/* Center dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  className="fill-white stroke-indigo-600 stroke-2 group-hover:scale-125 transition duration-150"
                />
                {/* X Axis Label */}
                <text
                  x={pt.x}
                  y={svgHeight - paddingY + 18}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium group-hover:fill-indigo-600 group-hover:font-bold transition"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          /* Bar Chart Mode */
          <div className="flex h-full w-full items-end justify-between px-6 pb-6">
            {currentData.map((d, idx) => {
              const heightPercent = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
              const isPeak = peakData?.label === d.label && d.value > 0;

              return (
                <div
                  key={idx}
                  className="group flex flex-1 flex-col items-center gap-2"
                  onMouseEnter={() => setHoveredPoint(d)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 dark:text-slate-300">
                    {d.value}
                  </span>
                  <div className="relative w-full max-w-[36px] overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-800">
                    <div
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                      className={`w-full transition-all duration-300 ${
                        isPeak
                          ? 'bg-gradient-to-t from-amber-500 to-orange-400'
                          : 'bg-gradient-to-t from-indigo-600 to-sky-500 group-hover:from-indigo-500 group-hover:to-sky-400'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 group-hover:text-indigo-600 dark:text-slate-400">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="pointer-events-none absolute right-4 top-2 rounded-xl border border-indigo-200 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-xs dark:border-indigo-900 dark:bg-slate-900/95">
            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              {hoveredPoint.label} {hoveredPoint.subValue ? `(${hoveredPoint.subValue})` : ''}
            </p>
            <p className="text-xs font-black text-slate-900 dark:text-white">
              {hoveredPoint.value.toLocaleString()} ครั้ง
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
