"use client";

import { useFroyekStore } from "@/lib/froyek/store";
import { sanitizeText } from "@/lib/froyek/sanitize";

export function T({
  path,
  text,
  className,
  as: Tag = "span",
}: {
  path: string;
  text: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "a";
}) {
  const editing = useFroyekStore((state) => state.editing);
  const patch = useFroyekStore((state) => state.patch);
  if (!editing) return <Tag className={className}>{text}</Tag>;
  return (
    <Tag
      className={`${className || ""} rounded-sm outline outline-dashed outline-emerald-600`}
      contentEditable
      suppressHydrationWarning
      onBlur={(event) => patch(path, sanitizeText(event.currentTarget.textContent || ""))}
    >
      {text}
    </Tag>
  );
}
