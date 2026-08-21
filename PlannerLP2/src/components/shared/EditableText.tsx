"use client";
import { useState, useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { useContentStore } from "@/lib/store/contentStore";
import { cn } from "@/lib/utils/cn";
import { Check, X, Edit2 } from "lucide-react";
import type { SiteContent } from "@/lib/types/content";

interface EditableTextProps {
  section: keyof SiteContent;
  field: string;
  value: string;
  className?: string;
  multiline?: boolean;
}

export function EditableText({
  section,
  field,
  value,
  className,
  multiline = false,
}: EditableTextProps) {
  const { isEditMode, isAdmin } = useUIStore();
  const { updateField } = useContentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setOriginalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setOriginalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (!isAdmin || !isEditMode) {
    return <span className={className}>{value}</span>;
  }

  const handleSave = () => {
    updateField(section, field, tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setOriginalValue(value);
    setIsEditing(false);
  };

  return (
    <span className={cn("relative group inline-block min-w-[20px]", className)}>
      {isEditing ? (
        <div className="relative z-50">
          {multiline ? (
            <textarea
              ref={inputRef as any}
              value={tempValue}
              onChange={(e) => setOriginalValue(e.target.value)}
              className="w-full p-2 border-2 border-emerald-500 rounded-lg bg-white text-slate-900 focus:outline-none"
              rows={4}
            />
          ) : (
            <input
              ref={inputRef as any}
              value={tempValue}
              onChange={(e) => setOriginalValue(e.target.value)}
              className="w-full p-1 border-b-2 border-emerald-500 bg-emerald-50 text-slate-900 focus:outline-none"
            />
          )}
          <div className="absolute right-0 -top-10 flex gap-1">
            <button
              onClick={handleSave}
              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            onClick={() => setIsEditing(true)}
            className="cursor-pointer hover:bg-emerald-50 hover:ring-2 hover:ring-emerald-200 transition-all rounded px-1"
          >
            {value}
          </span>
          <Edit2 className="w-3 h-3 text-emerald-600 absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </>
      )}
    </span>
  );
}
