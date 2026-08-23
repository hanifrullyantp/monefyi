"use client";

import { Plus, Trash2 } from "lucide-react";
import { ANIMATION_OPTIONS } from "@/components/landing/AnimatedHeadline";
import type { HeroContent, HeadlineAnimationEffect } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";

interface HeroAdminFieldsProps {
  hero: HeroContent;
  onChange: (hero: HeroContent) => void;
}

/** Form khusus hero: headline animasi + quick points. */
export function HeroAdminFields({ hero, onChange }: HeroAdminFieldsProps) {
  const animated = hero.headlineAnimated ?? defaultContent.hero.headlineAnimated;

  const patchAnimated = (patch: Partial<typeof animated>) => {
    onChange({
      ...hero,
      headlineAnimated: { ...animated, ...patch },
    });
  };

  const patchWord = (index: number, value: string) => {
    const next = [...animated.rotatingWords];
    next[index] = value;
    patchAnimated({ rotatingWords: next });
  };

  const patchQuickPoint = (index: number, value: string) => {
    const next = [...hero.quickPoints];
    next[index] = value;
    onChange({ ...hero, quickPoints: next });
  };

  return (
    <div className="space-y-8 mb-8 pb-8 border-b border-slate-100">
      <div>
        <h3 className="font-bold text-slate-900 mb-1">Headline Animasi</h3>
        <p className="text-xs text-slate-500 mb-4">
          Format: Prefix + teks bergilir + suffix. Contoh: &quot;Bisa Buat [RAB] Dalam 1 Menit, Mau?&quot;
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Prefix</span>
            <input
              value={animated.prefix}
              onChange={(e) => patchAnimated({ prefix: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Suffix</span>
            <input
              value={animated.suffix}
              onChange={(e) => patchAnimated({ suffix: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase">Efek Animasi</span>
            <select
              value={animated.animation}
              onChange={(e) =>
                patchAnimated({ animation: e.target.value as HeadlineAnimationEffect })
              }
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
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
              value={animated.intervalMs ?? 2500}
              onChange={(e) =>
                patchAnimated({ intervalMs: Number(e.target.value) || 2500 })
              }
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="text-xs font-bold text-slate-500 uppercase">Teks Bergilir</span>
          <div className="mt-2 space-y-2">
            {animated.rotatingWords.map((word, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={word}
                  onChange={(e) => patchWord(i, e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchAnimated({
                      rotatingWords: animated.rotatingWords.filter((_, j) => j !== i),
                    })
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
                patchAnimated({
                  rotatingWords: [...animated.rotatingWords, "Teks Baru"],
                })
              }
              className="flex items-center gap-1 text-xs font-bold text-emerald-600"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah teks
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-900 mb-1">Poin Utama (Quick Points)</h3>
        <p className="text-xs text-slate-500 mb-4">Tampil di mobile & desktop di bawah subheadline.</p>
        <div className="space-y-2">
          {hero.quickPoints.map((point, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                rows={2}
                value={point}
                onChange={(e) => patchQuickPoint(i, e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-y"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...hero,
                    quickPoints: hero.quickPoints.filter((_, j) => j !== i),
                  })
                }
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl self-start"
                aria-label="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({ ...hero, quickPoints: [...hero.quickPoints, "Poin baru"] })
            }
            className="flex items-center gap-1 text-xs font-bold text-emerald-600"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah poin
          </button>
        </div>
      </div>
    </div>
  );
}
