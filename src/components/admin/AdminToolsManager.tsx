import React, { useState } from 'react';
import {
  Sliders,
  Eye,
  EyeOff,
  Tag,
  Check,
  Save,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  GripVertical,
  Move,
} from 'lucide-react';
import { ToolDefinition } from '../../types';
import { SiteSettings } from '../../types/admin';

interface AdminToolsManagerProps {
  allTools: ToolDefinition[];
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminToolsManager: React.FC<AdminToolsManagerProps> = ({
  allTools,
  settings,
  onUpdateSettings,
}) => {
  const [disabledTools, setDisabledTools] = useState<string[]>(settings.disabledTools || []);
  const [customBadges, setCustomBadges] = useState<Record<string, string>>(
    settings.customBadges || {}
  );
  const [saved, setSaved] = useState(false);

  // Initialize tool order
  const [toolOrder, setToolOrder] = useState<string[]>(() => {
    if (settings.toolOrder && settings.toolOrder.length > 0) {
      const existingIds = settings.toolOrder;
      const missingIds = allTools
        .map((t) => t.id)
        .filter((id) => !existingIds.includes(id));
      return [...existingIds, ...missingIds];
    }
    return allTools.map((t) => t.id);
  });

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Get tools array sorted by toolOrder
  const sortedTools = [...allTools].sort((a, b) => {
    const idxA = toolOrder.indexOf(a.id);
    const idxB = toolOrder.indexOf(b.id);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  const toggleTool = (toolId: string) => {
    setDisabledTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
    setSaved(false);
  };

  const handleBadgeChange = (toolId: string, badgeText: string) => {
    setCustomBadges((prev) => ({
      ...prev,
      [toolId]: badgeText,
    }));
    setSaved(false);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...toolOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setToolOrder(newOrder);
    setSaved(false);
  };

  const moveDown = (index: number) => {
    if (index >= toolOrder.length - 1) return;
    const newOrder = [...toolOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setToolOrder(newOrder);
    setSaved(false);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...toolOrder];
    const [movedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);

    setToolOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setSaved(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleResetOrder = () => {
    const defaultOrder = allTools.map((t) => t.id);
    setToolOrder(defaultOrder);
    setSaved(false);
  };

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      disabledTools,
      toolOrder,
      customBadges,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            จัดการลำดับและเปิด-ปิดเครื่องมือ (Tools Management)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            🖱️ <strong>คลิกจับลาก (Drag & Drop)</strong> เพื่อสลับลำดับก่อน-หลังได้ทันที หรือกดปุ่มลูกศรขึ้น/ลง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetOrder}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="รีเซ็ตเป็นลำดับมาตรฐาน"
          >
            <RotateCcw className="h-3.5 w-3.5" /> ลำดับเริ่มต้น
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'บันทึกเรียบร้อยแล้ว' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortedTools.map((tool, index) => {
            const isEnabled = !disabledTools.includes(tool.id);
            const Icon = tool.icon;
            const currentBadge =
              customBadges[tool.id] !== undefined ? customBadges[tool.id] : tool.badge || '';

            const isBeingDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            return (
              <div
                key={tool.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 select-none ${
                  isBeingDragged
                    ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50/30 scale-95'
                    : isDragOver
                    ? 'border-2 border-indigo-600 bg-indigo-50/80 shadow-lg scale-[1.02] dark:border-indigo-400 dark:bg-indigo-950/40'
                    : isEnabled
                    ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700'
                    : 'border-rose-200/80 bg-rose-50/40 opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Drag Grip Handle & Rank */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-8 w-6 cursor-grab active:cursor-grabbing items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        title="คลิกค้างแล้วลากเพื่อสลับลำดับ"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Rank Position */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveUp(index)}
                          className="flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                          title="ขยับขึ้น"
                        >
                          <ArrowUp className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          disabled={index === sortedTools.length - 1}
                          onClick={() => moveDown(index)}
                          className="flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                          title="ขยับลง"
                        >
                          <ArrowDown className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {tool.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        id: {tool.id}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isEnabled
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {isEnabled ? (
                      <>
                        <Eye className="h-3.5 w-3.5" /> เปิดใช้งาน
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> ปิดใช้งาน
                      </>
                    )}
                  </button>
                </div>

                {/* Badge input */}
                <div className="mt-3.5 flex items-center gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">ป้ายกำกับ:</span>
                  <input
                    type="text"
                    value={currentBadge}
                    onChange={(e) => handleBadgeChange(tool.id, e.target.value)}
                    placeholder="เช่น ยอดนิยม ⭐ หรือเว้นว่าง"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
