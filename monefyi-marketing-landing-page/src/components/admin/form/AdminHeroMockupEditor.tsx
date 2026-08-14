/** Editor slideshow gambar di phone mockup hero */
import React from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import type { HeroMockupSettings, HeroMockupSlide } from '../../../types';
import { AdminSelect } from './AdminSelect';
import { AdminInput } from './AdminInput';
import { AdminImageUpload } from './AdminImageUpload';

interface AdminHeroMockupEditorProps {
  value: HeroMockupSettings;
  onChange: (v: HeroMockupSettings) => void;
}

const DEFAULT: HeroMockupSettings = {
  mode: 'screens',
  intervalSeconds: 4,
  slides: [],
};

export function AdminHeroMockupEditor({ value, onChange }: AdminHeroMockupEditorProps) {
  const cfg = { ...DEFAULT, ...value, slides: value?.slides || [] };

  const patch = (partial: Partial<HeroMockupSettings>) => onChange({ ...cfg, ...partial });

  const updateSlide = (index: number, partial: Partial<HeroMockupSlide>) => {
    const slides = cfg.slides.map((s, i) => (i === index ? { ...s, ...partial } : s));
    patch({ slides });
  };

  const addSlide = () => {
    if (cfg.slides.length >= 12) return;
    patch({
      slides: [
        ...cfg.slides,
        { id: `slide-${Date.now()}`, url: '', label: `Slide ${cfg.slides.length + 1}` },
      ],
    });
  };

  const removeSlide = (index: number) => {
    patch({ slides: cfg.slides.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <AdminSelect
        label="Mode Mockup Hero"
        value={cfg.mode}
        options={[
          { value: 'screens', label: 'Animasi bawaan (React screens)' },
          { value: 'images', label: 'Slideshow gambar upload' },
        ]}
        onChange={(v) => patch({ mode: v as HeroMockupSettings['mode'] })}
      />

      {cfg.mode === 'images' && (
        <>
          <AdminInput
            label="Interval rotasi (detik)"
            value={String(cfg.intervalSeconds)}
            onChange={(v) => patch({ intervalSeconds: Math.max(2, Math.min(30, Number(v) || 4)) })}
          />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Gambar Mockup ({cfg.slides.length}/12)
              </span>
              <button
                type="button"
                onClick={addSlide}
                className="text-xs font-bold text-green-400 flex items-center gap-1 hover:text-green-300"
              >
                <Plus size={14} /> Tambah Gambar
              </button>
            </div>

            {cfg.slides.length === 0 && (
              <p className="text-xs text-slate-500 p-4 border border-dashed border-slate-700 rounded-xl flex items-center gap-2">
                <ImageIcon size={16} /> Belum ada gambar. Tambah minimal 1 screenshot app.
              </p>
            )}

            {cfg.slides.map((slide, index) => (
              <div key={slide.id || index} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Slide {index + 1}</span>
                  <button type="button" onClick={() => removeSlide(index)} className="text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <AdminInput
                  label="Label (opsional)"
                  value={slide.label || ''}
                  onChange={(v) => updateSlide(index, { label: v })}
                />
                <AdminImageUpload
                  label="Screenshot / Mockup"
                  currentUrl={slide.url}
                  onChange={(url) => updateSlide(index, { url })}
                  maxSizeKb={2048}
                  showUrlInput
                />
              </div>
            ))}
          </div>
        </>
      )}

      {cfg.mode === 'screens' && (
        <p className="text-xs text-slate-500">
          Mode animasi bawaan menampilkan 5 layar demo (Dashboard, Safe to Spend, dll.) dengan rotasi otomatis.
          Angka di mockup bisa diedit inline saat admin mode aktif.
        </p>
      )}
    </div>
  );
}
