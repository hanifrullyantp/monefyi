"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Edit2, Plus, Trash2, X } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { cn } from "@/lib/utils/cn";
import type { HeadlineAnimationEffect, HeroHeadlineAnimated } from "@/lib/types/content";

const ANIMATION_OPTIONS: { value: HeadlineAnimationEffect; label: string }[] = [
  { value: "scroll-up", label: "Geser ke atas" },
  { value: "scroll-down", label: "Geser ke bawah" },
  { value: "typing", label: "Typing" },
  { value: "fade", label: "Fade" },
];

interface AnimatedHeadlineProps {
  config: HeroHeadlineAnimated;
  className?: string;
}

function useRotatingIndex(length: number, intervalMs: number, paused: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [length, intervalMs, paused]);

  return index;
}

function RotatingWord({
  word,
  animation,
}: {
  word: string;
  animation: HeadlineAnimationEffect;
}) {
  if (animation === "typing") {
    return <TypingWord word={word} />;
  }

  const variants = {
    "scroll-up": {
      initial: { y: "100%", opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: "-100%", opacity: 0 },
    },
    "scroll-down": {
      initial: { y: "-100%", opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: "100%", opacity: 0 },
    },
    fade: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
    },
    typing: {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
    },
  };

  const v = variants[animation];

  return (
    <motion.span
      key={word}
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block text-emerald-600 whitespace-nowrap"
    >
      {word}
    </motion.span>
  );
}

function TypingWord({ word }: { word: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const tick = () => {
      i += 1;
      setDisplayed(word.slice(0, i));
      if (i < word.length) {
        window.setTimeout(tick, 55);
      }
    };
    const start = window.setTimeout(tick, 80);
    return () => window.clearTimeout(start);
  }, [word]);

  return (
    <span className="text-emerald-600">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-[2px] h-[0.85em] bg-emerald-500 ml-0.5 align-middle"
      />
    </span>
  );
}

/** Headline dengan teks rotasi + inline edit & pilihan efek animasi. */
export function AnimatedHeadline({ config, className }: AnimatedHeadlineProps) {
  const { isEditMode, isAdmin } = useLandingAdmin();
  const { updateSection, content } = useContentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<HeroHeadlineAnimated>(config);

  const words = config.rotatingWords.filter(Boolean);
  const intervalMs = config.intervalMs ?? 2500;
  const index = useRotatingIndex(words.length, intervalMs, isEditing);
  const currentWord = words[index] ?? words[0] ?? "";

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    if (!isEditMode) setIsEditing(false);
  }, [isEditMode]);

  const save = useCallback(() => {
    const cleaned = {
      ...draft,
      rotatingWords: draft.rotatingWords.map((w) => w.trim()).filter(Boolean),
    };
    updateSection("hero", {
      ...content.hero,
      headlineAnimated: cleaned,
      headline: `${cleaned.prefix}"${cleaned.rotatingWords[0] ?? ""}"${cleaned.suffix}`,
    });
    setIsEditing(false);
  }, [content.hero, draft, updateSection]);

  const cancel = () => {
    setDraft(config);
    setIsEditing(false);
  };

  if (isAdmin && isEditMode && isEditing) {
    return (
      <div className={cn("relative z-50 w-full space-y-4 text-left", className)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Prefix</span>
            <input
              value={draft.prefix}
              onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value }))}
              className="mt-1 w-full rounded-xl border-2 border-emerald-500 px-3 py-2 text-sm"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(draft.lineBreakAfterPrefix)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lineBreakAfterPrefix: e.target.checked }))
                }
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Enter setelah prefix
            </label>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Suffix</span>
            <input
              value={draft.suffix}
              onChange={(e) => setDraft((d) => ({ ...d, suffix: e.target.value }))}
              className="mt-1 w-full rounded-xl border-2 border-emerald-500 px-3 py-2 text-sm"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(draft.lineBreakBeforeSuffix)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lineBreakBeforeSuffix: e.target.checked }))
                }
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Enter sebelum suffix
            </label>
          </label>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-500 uppercase">Teks Bergilir</span>
          <div className="mt-2 space-y-2">
            {draft.rotatingWords.map((word, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={word}
                  onChange={(e) => {
                    const next = [...draft.rotatingWords];
                    next[i] = e.target.value;
                    setDraft((d) => ({ ...d, rotatingWords: next }));
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      rotatingWords: d.rotatingWords.filter((_, j) => j !== i),
                    }))
                  }
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                  aria-label="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({ ...d, rotatingWords: [...d.rotatingWords, "Teks Baru"] }))
              }
              className="flex items-center gap-1 text-xs font-bold text-emerald-600"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah teks
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Efek Animasi</span>
            <select
              value={draft.animation}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  animation: e.target.value as HeadlineAnimationEffect,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {ANIMATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Interval (ms)</span>
            <input
              type="number"
              min={800}
              step={100}
              value={draft.intervalMs ?? 2500}
              onChange={(e) =>
                setDraft((d) => ({ ...d, intervalMs: Number(e.target.value) || 2500 }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-1 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-bold"
          >
            <Check className="w-4 h-4" /> Simpan
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 bg-slate-500 text-white rounded-xl px-4 py-2 text-sm font-bold"
          >
            <X className="w-4 h-4" /> Batal
          </button>
        </div>
      </div>
    );
  }

  const headlineBody = (
    <>
      {config.prefix}
      {config.lineBreakAfterPrefix ? <br /> : null}
      <span className="relative inline-block align-bottom mx-0.5">
        <span className="inline-flex items-center justify-center min-w-[2ch] overflow-hidden">
          {config.animation === "typing" ? (
            <RotatingWord word={currentWord} animation="typing" />
          ) : (
            <span
              className="relative inline-block overflow-hidden align-bottom"
              style={{ height: "1.1em" }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <RotatingWord word={currentWord} animation={config.animation} />
              </AnimatePresence>
            </span>
          )}
        </span>
      </span>
      {config.lineBreakBeforeSuffix ? <br /> : null}
      {config.suffix}
    </>
  );

  if (isAdmin && isEditMode) {
    return (
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
          "relative group cursor-pointer rounded-md px-1 -mx-1",
          "ring-2 ring-dashed ring-emerald-400/80 bg-emerald-50/50",
          className,
        )}
      >
        {headlineBody}
        <Edit2 className="w-3.5 h-3.5 text-emerald-600 absolute -right-5 top-2 opacity-80 pointer-events-none" />
      </span>
    );
  }

  return <span className={className}>{headlineBody}</span>;
}

export { ANIMATION_OPTIONS };
