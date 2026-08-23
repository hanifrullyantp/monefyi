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
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (!isEditMode) setIsEditing(false);
  }, [isEditMode]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) {
        inputRef.current.select();
      }
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
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <span className={cn("relative group inline-block min-w-[20px] max-w-full", className)}>
      {isEditing ? (
        <div className="relative z-50 w-full min-w-[120px]">
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 border-2 border-emerald-500 rounded-xl bg-white text-slate-900 focus:outline-none text-base touch-manipulation"
              rows={4}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-w-[120px] p-2 border-2 border-emerald-500 rounded-xl bg-white text-slate-900 focus:outline-none text-base touch-manipulation"
            />
          )}
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="button"
              onClick={handleSave}
              aria-label="Simpan"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg touch-manipulation"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Batal"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] bg-slate-500 text-white rounded-xl hover:bg-slate-600 shadow-lg touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setIsEditing(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditing(true);
              }
            }}
            className={cn(
              "cursor-pointer transition-all rounded-md px-1 -mx-1 touch-manipulation",
              "ring-2 ring-dashed ring-emerald-400/80 bg-emerald-50/50",
              "active:bg-emerald-100 active:ring-emerald-500",
              "md:ring-0 md:bg-transparent md:hover:bg-emerald-50 md:hover:ring-2 md:hover:ring-emerald-200",
            )}
          >
            {value}
          </span>
          <Edit2
            aria-hidden
            className="w-3.5 h-3.5 text-emerald-600 absolute -right-4 top-1/2 -translate-y-1/2 opacity-80 md:opacity-0 md:group-hover:opacity-100 pointer-events-none"
          />
        </>
      )}
    </span>
  );
}
