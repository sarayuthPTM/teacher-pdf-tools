import React, { useRef, useState } from 'react';
import { UploadCloud, File, Plus } from 'lucide-react';

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  compact?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  multiple = false,
  onFilesSelected,
  title = 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์',
  subtitle = 'รองรับไฟล์ PDF หรือรูปภาพ (สูงสุด 50MB)',
  buttonText = 'เลือกไฟล์จากอุปกรณ์',
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };

  if (compact) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-500 hover:bg-sky-50/50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:bg-sky-950/30"
        >
          <Plus className="h-4 w-4" />
          <span>{buttonText}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
        isDragOver
          ? 'border-sky-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/40'
          : 'border-slate-300 bg-slate-50/50 hover:border-sky-400 hover:bg-sky-50/30 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-sky-500 dark:hover:bg-sky-950/20'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 shadow-inner dark:bg-sky-900/50 dark:text-sky-300 sm:h-20 sm:w-20">
        <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
        {subtitle}
      </p>

      <button
        type="button"
        className="mt-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
      >
        {buttonText}
      </button>
    </div>
  );
};
