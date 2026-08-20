"use client";
import { ReactNode } from "react";
import { useUiStore } from "@/lib/store/uiStore";
import { Edit3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface EditableProps {
  children: ReactNode;
  sectionId: string;
  adminPath?: string;
  className?: string;
}

export function Editable({ children, sectionId, adminPath = "/admin/konten", className }: EditableProps) {
  const { inlineEditMode } = useUiStore();

  if (!inlineEditMode) return <>{children}</>;

  return (
    <div className={cn("relative border-2 border-dashed border-emerald-300 transition-colors min-h-[50px]", className)}>
      <div className="absolute top-0 right-0 z-40 bg-emerald-500 text-white px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm pointer-events-none">
        <Edit3 className="w-3 h-3" />
        Section: {sectionId}
      </div>
      {children}
    </div>
  );
}
