import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { LandingContent } from '../../types/landingContent';
import { mergeLandingContent } from '../../types/landingContent';

type SettingsTab = 'global' | 'hero' | 'seo' | 'json';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'global', label: 'Global & merek' },
  { id: 'hero', label: 'Hero' },
  { id: 'seo', label: 'SEO' },
  { id: 'json', label: 'Konten JSON' },
];

interface LandingSettingsModalProps {
  open: boolean;
  content: LandingContent;
  onClose: () => void;
  onApply: (content: LandingContent) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function LandingSettingsModal({
  open,
  content,
  onClose,
  onApply,
}: LandingSettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('global');
  const [draft, setDraft] = useState(content);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(content);
      setJsonText(JSON.stringify(content, null, 2));
      setJsonError('');
      setTab('global');
    }
  }, [open, content]);

  if (!open) return null;

  const patch = (partial: Partial<LandingContent>) => {
    setDraft(prev => mergeLandingContent({ ...prev, ...partial }));
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<LandingContent>;
      const merged = mergeLandingContent(parsed);
      setDraft(merged);
      setJsonError('');
      onApply(merged);
    } catch {
      setJsonError('JSON tidak valid. Periksa sintaks.');
    }
  };

  const handleSave = () => {
    if (tab === 'json') {
      applyJson();
      return;
    }
    onApply(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-white"
        role="dialog"
        aria-labelledby="landing-settings-title"
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-slate-700">
          <div>
            <h2 id="landing-settings-title" className="text-xl font-bold">
              Pengaturan
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Global, SEO, dan ekspor konten landing (JSON).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-2 overflow-x-auto scrollbar-thin">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                tab === t.id
                  ? 'border-emerald-400 bg-emerald-500/20 text-white'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'global' && (
            <>
              <Field label="Logo / ikon merek (URL)">
                <input
                  className={inputCls}
                  value={draft.brand.logoUrl}
                  onChange={e => patch({ brand: { ...draft.brand, logoUrl: e.target.value } })}
                  placeholder="https://…/logo.png"
                />
              </Field>
              {draft.brand.logoUrl ? (
                <img
                  src={draft.brand.logoUrl}
                  alt=""
                  className="h-10 w-10 object-contain rounded-lg bg-slate-800"
                />
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Warna primer">
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={draft.brand.primaryColor}
                      onChange={e =>
                        patch({ brand: { ...draft.brand, primaryColor: e.target.value } })
                      }
                      className="h-10 w-12 rounded cursor-pointer"
                    />
                    <input
                      className={inputCls}
                      value={draft.brand.primaryColor}
                      onChange={e =>
                        patch({ brand: { ...draft.brand, primaryColor: e.target.value } })
                      }
                    />
                  </div>
                </Field>
                <Field label="Warna sekunder">
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={draft.brand.secondaryColor}
                      onChange={e =>
                        patch({ brand: { ...draft.brand, secondaryColor: e.target.value } })
                      }
                      className="h-10 w-12 rounded cursor-pointer"
                    />
                    <input
                      className={inputCls}
                      value={draft.brand.secondaryColor}
                      onChange={e =>
                        patch({ brand: { ...draft.brand, secondaryColor: e.target.value } })
                      }
                    />
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama produk">
                  <input
                    className={inputCls}
                    value={draft.brand.productName}
                    onChange={e =>
                      patch({ brand: { ...draft.brand, productName: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Aksen nama">
                  <input
                    className={inputCls}
                    value={draft.brand.productAccent}
                    onChange={e =>
                      patch({ brand: { ...draft.brand, productAccent: e.target.value } })
                    }
                  />
                </Field>
              </div>
            </>
          )}

          {tab === 'hero' && (
            <>
              <Field label="Badge">
                <input
                  className={inputCls}
                  value={draft.hero.badge}
                  onChange={e => patch({ hero: { ...draft.hero, badge: e.target.value } })}
                />
              </Field>
              <Field label="Judul (baris 1)">
                <input
                  className={inputCls}
                  value={draft.hero.title}
                  onChange={e => patch({ hero: { ...draft.hero, title: e.target.value } })}
                />
              </Field>
              <Field label="Judul sorotan">
                <input
                  className={inputCls}
                  value={draft.hero.titleHighlight}
                  onChange={e =>
                    patch({ hero: { ...draft.hero, titleHighlight: e.target.value } })
                  }
                />
              </Field>
              <Field label="Subjudul">
                <textarea
                  className={`${inputCls} min-h-[5rem]`}
                  value={draft.hero.subtitle}
                  onChange={e => patch({ hero: { ...draft.hero, subtitle: e.target.value } })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA utama">
                  <input
                    className={inputCls}
                    value={draft.hero.ctaPrimary}
                    onChange={e =>
                      patch({ hero: { ...draft.hero, ctaPrimary: e.target.value } })
                    }
                  />
                </Field>
                <Field label="CTA sekunder">
                  <input
                    className={inputCls}
                    value={draft.hero.ctaSecondary}
                    onChange={e =>
                      patch({ hero: { ...draft.hero, ctaSecondary: e.target.value } })
                    }
                  />
                </Field>
              </div>
            </>
          )}

          {tab === 'seo' && (
            <>
              <Field label="Meta title">
                <input
                  className={inputCls}
                  value={draft.seo.title}
                  onChange={e => patch({ seo: { ...draft.seo, title: e.target.value } })}
                />
              </Field>
              <Field label="Meta description">
                <textarea
                  className={`${inputCls} min-h-[5rem]`}
                  value={draft.seo.description}
                  onChange={e => patch({ seo: { ...draft.seo, description: e.target.value } })}
                />
              </Field>
            </>
          )}

          {tab === 'json' && (
            <>
              <p className="text-xs text-slate-400">
                Edit struktur lengkap landing (fitur, testimoni, harga, dll.). Format harus valid JSON.
              </p>
              <textarea
                className={`${inputCls} font-mono text-xs min-h-[320px]`}
                value={jsonText}
                onChange={e => {
                  setJsonText(e.target.value);
                  setJsonError('');
                }}
                spellCheck={false}
              />
              {jsonError ? <p className="text-sm text-rose-400">{jsonError}</p> : null}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
