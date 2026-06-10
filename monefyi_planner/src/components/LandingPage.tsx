import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Layers, Sparkles, ArrowRight, Star, PlayCircle,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';
import { fetchLandingContent, saveLandingContent } from '../services/landingService';
import {
  DEFAULT_LANDING_CONTENT,
  type LandingContent,
} from '../types/landingContent';
import { showToast } from '../store/uiStore';
import EditableText from './landing/EditableText';
import LandingAdminBar from './landing/LandingAdminBar';
import LandingSettingsModal from './landing/LandingSettingsModal';
import { resolveLandingIcon } from './landing/landingIcons';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { platformRole, user, authInitializing } = useAppStore();

  const [content, setContent] = useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const editMode =
    searchParams.get('edit') === '1' &&
    isPlatformAdmin(platformRole, user?.email);

  const dirty = useMemo(
    () => JSON.stringify(content) !== savedSnapshot,
    [content, savedSnapshot],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLandingContent();
      setContent(data);
      setSavedSnapshot(JSON.stringify(data));
    } catch {
      setContent(DEFAULT_LANDING_CONTENT);
      setSavedSnapshot(JSON.stringify(DEFAULT_LANDING_CONTENT));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = content.seo.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', content.seo.description);
  }, [content.seo]);

  const patch = (partial: Partial<LandingContent>) => {
    setContent(prev => ({ ...prev, ...partial }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLandingContent(content);
      setSavedSnapshot(JSON.stringify(content));
      showToast('Landing page disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const brandStyle = {
    '--landing-primary': content.brand.primaryColor,
    '--landing-secondary': content.brand.secondaryColor,
  } as React.CSSProperties;

  if (loading && !editMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white overflow-x-hidden"
      style={brandStyle}
    >
      {editMode ? (
        <>
          <LandingAdminBar
            dirty={dirty}
            saving={saving}
            onOpenSettings={() => setSettingsOpen(true)}
            onSave={handleSave}
            onExit={() => navigate('/app')}
          />
          <LandingSettingsModal
            open={settingsOpen}
            content={content}
            onClose={() => setSettingsOpen(false)}
            onApply={next => {
              setContent(next);
              setSettingsOpen(false);
            }}
          />
          <div className="fixed top-0 left-0 right-0 z-[55] bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1">
            Mode edit — klik teks untuk ubah inline, atau buka Pengaturan untuk JSON lengkap
          </div>
        </>
      ) : null}

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          editMode ? 'top-6' : ''
        } bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {content.brand.logoUrl ? (
              <img src={content.brand.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${content.brand.primaryColor}, ${content.brand.secondaryColor})` }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-bold text-slate-900 text-lg">
              <EditableText
                editMode={editMode}
                value={content.brand.productName}
                onChange={v => patch({ brand: { ...content.brand, productName: v } })}
              />{' '}
              <span style={{ color: content.brand.primaryColor }}>
                <EditableText
                  editMode={editMode}
                  value={content.brand.productAccent}
                  onChange={v => patch({ brand: { ...content.brand, productAccent: v } })}
                />
              </span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900">Fitur</a>
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900">Cara Kerja</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">Harga</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-700 px-3 py-2">
              Masuk
            </Link>
            <Link
              to="/signup"
              className="text-white text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ backgroundColor: content.brand.primaryColor }}
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      <section className={`relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden ${editMode ? 'mt-6' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 border"
              style={{
                backgroundColor: `${content.brand.primaryColor}18`,
                borderColor: `${content.brand.primaryColor}40`,
                color: content.brand.secondaryColor,
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: content.brand.primaryColor }} />
              <EditableText
                editMode={editMode}
                value={content.hero.badge}
                onChange={v => patch({ hero: { ...content.hero, badge: v } })}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-6"
            >
              <EditableText
                editMode={editMode}
                as="span"
                value={content.hero.title}
                onChange={v => patch({ hero: { ...content.hero, title: v } })}
              />{' '}
              <span style={{ color: content.brand.primaryColor }}>
                <EditableText
                  editMode={editMode}
                  as="span"
                  value={content.hero.titleHighlight}
                  onChange={v => patch({ hero: { ...content.hero, titleHighlight: v } })}
                />
              </span>{' '}
              Bisnis Konstruksimu
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 max-w-2xl mx-auto mb-10"
            >
              <EditableText
                editMode={editMode}
                multiline
                as="span"
                value={content.hero.subtitle}
                onChange={v => patch({ hero: { ...content.hero, subtitle: v } })}
              />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link
                to="/signup"
                className="group flex items-center gap-3 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-lg"
                style={{ backgroundColor: content.brand.primaryColor }}
              >
                <Sparkles className="w-5 h-5" />
                <EditableText
                  editMode={editMode}
                  value={content.hero.ctaPrimary}
                  onChange={v => patch({ hero: { ...content.hero, ctaPrimary: v } })}
                />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 font-semibold px-6 py-4 rounded-2xl border bg-white shadow-sm"
              >
                <PlayCircle className="w-5 h-5" />
                <EditableText
                  editMode={editMode}
                  value={content.hero.ctaSecondary}
                  onChange={v => patch({ hero: { ...content.hero, ctaSecondary: v } })}
                />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-16">
              {content.stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-black" style={{ color: content.brand.primaryColor }}>
                    {editMode ? (
                      <input
                        className="w-full text-center bg-transparent border border-dashed border-emerald-300 rounded px-1"
                        value={stat.value}
                        onChange={e => {
                          const stats = [...content.stats];
                          stats[i] = { ...stats[i], value: e.target.value };
                          patch({ stats });
                        }}
                      />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {editMode ? (
                      <input
                        className="w-full text-center text-sm bg-transparent border border-dashed border-slate-300 rounded px-1"
                        value={stat.label}
                        onChange={e => {
                          const stats = [...content.stats];
                          stats[i] = { ...stats[i], label: e.target.value };
                          patch({ stats });
                        }}
                      />
                    ) : (
                      stat.label
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center text-xs text-slate-400 font-mono">planner.monefyi.com</div>
              </div>
              <DashboardPreview primaryColor={content.brand.primaryColor} />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
              style={{ backgroundColor: `${content.brand.primaryColor}18`, color: content.brand.primaryColor }}
            >
              <Layers className="w-4 h-4" />
              <EditableText
                editMode={editMode}
                value={content.featuresSection.eyebrow}
                onChange={v =>
                  patch({ featuresSection: { ...content.featuresSection, eyebrow: v } })
                }
              />
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              <EditableText
                editMode={editMode}
                multiline
                as="span"
                value={content.featuresSection.title}
                onChange={v =>
                  patch({ featuresSection: { ...content.featuresSection, title: v } })
                }
              />
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              <EditableText
                editMode={editMode}
                multiline
                as="span"
                value={content.featuresSection.subtitle}
                onChange={v =>
                  patch({ featuresSection: { ...content.featuresSection, subtitle: v } })
                }
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.features.map((feature, i) => {
              const Icon = resolveLandingIcon(feature.iconKey);
              return (
                <motion.div
                  key={i}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl border border-slate-100 hover:shadow-lg bg-white"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                    style={{ background: `linear-gradient(135deg, ${content.brand.primaryColor}, ${content.brand.secondaryColor})` }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">
                    <EditableText
                      editMode={editMode}
                      value={feature.title}
                      onChange={v => {
                        const features = [...content.features];
                        features[i] = { ...features[i], title: v };
                        patch({ features });
                      }}
                    />
                  </h3>
                  <p className="text-sm text-slate-500">
                    <EditableText
                      editMode={editMode}
                      multiline
                      as="span"
                      value={feature.desc}
                      onChange={v => {
                        const features = [...content.features];
                        features[i] = { ...features[i], desc: v };
                        patch({ features });
                      }}
                    />
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 text-white" style={{ background: content.brand.secondaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <EditableText
                editMode={editMode}
                value={content.howItWorks.eyebrow}
                onChange={v => patch({ howItWorks: { ...content.howItWorks, eyebrow: v } })}
              />
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              <EditableText
                editMode={editMode}
                as="span"
                value={content.howItWorks.title}
                onChange={v => patch({ howItWorks: { ...content.howItWorks, title: v } })}
              />{' '}
              <span style={{ color: content.brand.primaryColor }}>
                <EditableText
                  editMode={editMode}
                  as="span"
                  value={content.howItWorks.titleHighlight}
                  onChange={v =>
                    patch({ howItWorks: { ...content.howItWorks, titleHighlight: v } })
                  }
                />
              </span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              <EditableText
                editMode={editMode}
                multiline
                as="span"
                value={content.howItWorks.subtitle}
                onChange={v => patch({ howItWorks: { ...content.howItWorks, subtitle: v } })}
              />
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-16 text-center">
            <EditableText
              editMode={editMode}
              as="span"
              value={content.testimonialsSection.title}
              onChange={v =>
                patch({ testimonialsSection: { title: v } })
              }
            />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm mb-6 italic">
                  &ldquo;
                  <EditableText
                    editMode={editMode}
                    multiline
                    as="span"
                    value={t.text}
                    onChange={v => {
                      const testimonials = [...content.testimonials];
                      testimonials[i] = { ...testimonials[i], text: v };
                      patch({ testimonials });
                    }}
                  />
                  &rdquo;
                </p>
                <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              <EditableText
                editMode={editMode}
                as="span"
                value={content.pricingSection.title}
                onChange={v =>
                  patch({ pricingSection: { ...content.pricingSection, title: v } })
                }
              />
            </h2>
            <p className="text-lg text-slate-500">
              <EditableText
                editMode={editMode}
                as="span"
                value={content.pricingSection.subtitle}
                onChange={v =>
                  patch({ pricingSection: { ...content.pricingSection, subtitle: v } })
                }
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {content.plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-6 border-2 ${plan.color} ${plan.highlight ? 'shadow-xl relative' : 'bg-white'}`}
                style={
                  plan.highlight
                    ? { background: `linear-gradient(to bottom, ${content.brand.primaryColor}12, white)` }
                    : undefined
                }
              >
                {plan.highlight ? (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-xs font-bold rounded-full"
                    style={{ backgroundColor: content.brand.primaryColor }}
                  >
                    PALING POPULER
                  </div>
                ) : null}
                <h3 className="font-black text-xl mb-1">{plan.name}</h3>
                <p className="text-slate-500 text-sm mb-3">{plan.desc}</p>
                <div className="text-3xl font-black mb-6">
                  {plan.price}
                  {plan.period ? <span className="text-sm text-slate-500">{plan.period}</span> : null}
                </div>
                <ul className="space-y-3 mb-8 text-sm text-slate-600">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.name === 'Enterprise' ? '/contact' : '/signup'}
                  className="w-full py-3 rounded-xl font-bold text-sm block text-center"
                  style={
                    plan.highlight
                      ? { backgroundColor: content.brand.primaryColor, color: '#fff' }
                      : undefined
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-24 text-white"
        style={{
          background: `linear-gradient(135deg, ${content.brand.primaryColor}, ${content.brand.secondaryColor})`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <EditableText
              editMode={editMode}
              as="span"
              value={content.cta.title}
              onChange={v => patch({ cta: { ...content.cta, title: v } })}
            />
            <br />
            <EditableText
              editMode={editMode}
              as="span"
              value={content.cta.titleBreak}
              onChange={v => patch({ cta: { ...content.cta, titleBreak: v } })}
            />
          </h2>
          <p className="text-lg mb-10 opacity-90">
            <EditableText
              editMode={editMode}
              multiline
              as="span"
              value={content.cta.subtitle}
              onChange={v => patch({ cta: { ...content.cta, subtitle: v } })}
            />
          </p>
          <Link
            to="/signup"
            className="bg-white font-bold px-10 py-4 rounded-2xl text-lg inline-flex items-center gap-2"
            style={{ color: content.brand.primaryColor }}
          >
            <EditableText
              editMode={editMode}
              value={content.cta.button}
              onChange={v => patch({ cta: { ...content.cta, button: v } })}
            />
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="text-slate-400 py-12" style={{ backgroundColor: content.brand.secondaryColor }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-white font-bold">
            {content.brand.productName} {content.brand.productAccent}
          </span>
          <p className="text-sm text-center">
            {content.footer.copyright}{' '}
            <EditableText
              editMode={editMode}
              as="span"
              value={content.footer.tagline}
              onChange={v => patch({ footer: { ...content.footer, tagline: v } })}
            />
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/join" className="hover:text-white">Punya undangan?</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      {!editMode && !authInitializing && isPlatformAdmin(platformRole, user?.email) ? (
        <Link
          to="/?edit=1"
          className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-lg hover:bg-slate-800"
        >
          Edit landing
        </Link>
      ) : null}
    </div>
  );
}

function DashboardPreview({ primaryColor }: { primaryColor: string }) {
  const projects = [
    { name: 'Rumah Pak Ahmad', progress: 67, budget: 62, health: 'at_risk' as const },
    { name: 'Gudang Logistik PT Maju', progress: 45, budget: 40, health: 'on_track' as const },
  ];

  return (
    <div className="bg-slate-50 p-4 md:p-6 min-h-[320px]">
      <div className="grid grid-cols-2 gap-3 mb-6">
        {['Omzet', 'Profit'].map(label => (
          <div key={label} className="bg-white rounded-xl p-3 border border-slate-100">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="font-bold text-slate-900 text-sm">—</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {projects.map((proj, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border flex gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium truncate">{proj.name}</div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full">
                <div className="h-full rounded-full" style={{ width: `${proj.progress}%`, backgroundColor: primaryColor }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
