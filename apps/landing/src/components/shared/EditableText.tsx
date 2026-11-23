"use client";
import { useState, useEffect, useRef } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
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
  const { isEditMode, isAdmin } = useLandingAdmin();
  const { updateField } = useContentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditMode) return;
    if (isEditing && tempValue !== value) {
      updateField(section, field, tempValue);
    }
    setIsEditing(false);
  }, [isEditMode, isEditing, tempValue, value, section, field, updateField]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  if (!isEditMode) {
    return <span className={className}>{value}</span>;
  }

  const handleSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateField(section, field, tempValue);
    setIsEditing(false);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <span
      className={cn("relative group inline-block min-w-[20px] max-w-full", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <div
          className="relative z-50 w-full min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full p-3 border-2 border-emerald-500 rounded-xl bg-white text-slate-900 focus:outline-none text-base touch-manipulation shadow-lg"
              rows={4}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full min-w-[140px] p-2 border-2 border-emerald-500 rounded-xl bg-white text-slate-900 focus:outline-none text-base touch-manipulation shadow-lg"
            />
          )}
          <div className="flex gap-2 mt-2 justify-end">
            <button
              type="button"
              onClick={handleSave}
              aria-label="Simpan"
              className="inline-flex items-center justify-center min-h-[38px] px-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg touch-manipulation text-xs font-bold gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Simpan
            </button>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Batal"
              className="inline-flex items-center justify-center min-h-[38px] px-3 bg-slate-500 text-white rounded-xl hover:bg-slate-600 shadow-lg touch-manipulation text-xs font-medium gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Batal
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setIsEditing(true);
              }
            }}
            className={cn(
              "cursor-pointer transition-all rounded-md px-1 -mx-1 touch-manipulation inline-flex items-center gap-1",
              "text-slate-900",
              "ring-2 ring-dashed ring-amber-400 bg-amber-50/90 hover:bg-amber-100/90",
              "active:bg-amber-200 active:ring-amber-500",
            )}
            title="Klik untuk mengedit teks ini"
          >
            <span>{value}</span>
            <Edit2
              aria-hidden
              className="w-3.5 h-3.5 text-amber-600 shrink-0 opacity-80 group-hover:opacity-100"
            />
          </span>
        </>
      )}
    </span>
  );
}
