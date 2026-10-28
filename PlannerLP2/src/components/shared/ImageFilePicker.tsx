"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { processImageFileForMedia } from "@/lib/media/processImageFile";

export type PickedImage = Awaited<ReturnType<typeof processImageFileForMedia>>;

interface ImageFilePickerProps {
  onPick: (image: PickedImage) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

/** Hidden file input — klik children untuk pilih gambar dari perangkat. */
export function ImageFilePicker({ onPick, children, className, disabled }: ImageFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    if (disabled || busy) return;
    setError(null);
    inputRef.current?.click();
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const image = await processImageFileForMedia(file);
      await onPick(image);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal.";
      setError(msg);
      console.error("Image upload failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-hidden
        onChange={onChange}
      />
      <div
        role="button"
        tabIndex={disabled || busy ? -1 : 0}
        aria-disabled={disabled || busy}
        onClick={open}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            open();
          }
        }}
        className={cn(
          className,
          (disabled || busy) && "opacity-60 pointer-events-none",
        )}
      >
        {children}
      </div>
      {error ? (
        <p className="text-xs font-bold text-rose-600 mt-2" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
