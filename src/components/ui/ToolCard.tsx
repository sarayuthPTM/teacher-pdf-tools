import React from 'react';
import { ToolDefinition } from '../../types';

interface ToolCardProps {
  tool: ToolDefinition;
  onClick: () => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onClick }) => {
  const Icon = tool.icon;

  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-2xl border p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lift sm:flex-row sm:items-start sm:gap-4 sm:p-5 sm:text-left ${tool.gradientFrom} ${tool.gradientTo} ${tool.borderColor} ${tool.hoverBorder} shadow-soft bg-gradient-to-br`}
    >
      {/* Background subtle watermark icon decoration */}
      <span className="pointer-events-none absolute -bottom-6 -right-6 hidden h-28 w-28 opacity-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 sm:block">
        <Icon className="h-full w-full" />
      </span>

      {/* Badge if present (e.g. ปลอดภัยในเครื่อง) */}
      {tool.badge && (
        <span
          className={`absolute right-3 top-3 hidden rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:block ${
            tool.badgeColor || 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
          }`}
        >
          {tool.badge}
        </span>
      )}

      {/* Icon */}
      <div
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.iconBgFrom} ${tool.iconBgTo} text-white shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14 sm:rounded-2xl`}
      >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>

      {/* Content */}
      <div className="relative min-w-0 flex-1">
        <h3 className="text-base font-bold text-slate-900 line-clamp-1 dark:text-white sm:text-lg">
          {tool.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-300 sm:text-sm">
          {tool.description}
        </p>
      </div>
    </button>
  );
};
