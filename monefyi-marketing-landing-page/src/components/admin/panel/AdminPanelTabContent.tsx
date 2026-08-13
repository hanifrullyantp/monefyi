import React from 'react';
import {
  Globe,
  Layout,
  MousePointer2,
  PieChart,
  Target,
  Users,
} from 'lucide-react';
import type { SiteSettings } from '../../../types';
import { SectionCard } from '../SectionCard';
import { AdminInput } from '../form/AdminInput';
import { AdminTextarea } from '../form/AdminTextarea';
import { AdminToggle } from '../form/AdminToggle';
import { AdminRepeater } from '../form/AdminRepeater';
import { AdminColorPicker } from '../form/AdminColorPicker';
import { AdminImageUpload } from '../form/AdminImageUpload';
import { LeadsTab } from './LeadsTab';
import { setSettingsPath } from './settings-path';
import type { AdminPanelTab } from './admin-nav';
import { cn } from '../../../lib/cn';
import { bonusAppsData } from '../../../data/bonus-apps-data';

interface TabContentProps {
  tab: AdminPanelTab;
  draft: SiteSettings;
  onChange: (next: SiteSettings) => void;
  localJson: string;
  onJsonChange: (value: string) => void;
}

export function AdminPanelTabContent({
  tab,
  draft,
  onChange,
  localJson,
  onJsonChange,
}: TabContentProps): React.ReactElement {
  const patch = (path: string, value: unknown) => onChange(setSettingsPath(draft, path, value));

  switch (tab) {
    case 'dashboard':
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={Users} label="Total Leads" value={String(draft.leads?.length || 0)} color="blue" />
            <StatCard
              icon={Layout}
              label="Active Sections"
              value={`${draft.sections.filter((s) => s.active).length} / ${draft.sections.length}`}
              color="amber"
            />
            <StatCard icon={MousePointer2} label="FAQ Items" value={String(draft.content.faq?.length || 0)} color="green" />
          </div>
          {(draft.leads?.length || 0) > 0 && (
            <SectionCard title="Lead Terbaru">
              <div className="divide-y divide-white/5">
                {(draft.leads || []).slice(0, 5).map((l: { id: string; name?: string; whatsapp?: string; planName?: string; status?: string }) => (
                  <div key={l.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-bold text-white">{l.name || '—'}</p>
                      <p className="text-xs text-slate-500">{l.whatsapp} · {l.planName || '—'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase text-blue-400">{l.status || 'baru'}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          <SectionCard title="Marketing Pixels">
            <div className="space-y-4">
              <AdminInput
                label="Facebook Pixel ID"
                value={draft.marketing.fbPixelId}
                onChange={(v) => patch('marketing.fbPixelId', v)}
                icon={Target}
              />
              <AdminInput
                label="Google Analytics ID"
                value={draft.marketing.googleAnalyticsId}
                onChange={(v) => patch('marketing.googleAnalyticsId', v)}
                icon={Globe}
              />
            </div>
          </SectionCard>
        </div>
      );

    case 'global':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Identitas Situs">
            <div className="space-y-4">
              <AdminInput label="Nama Situs" value={draft.general.siteName} onChange={(v) => patch('general.siteName', v)} />
              <AdminInput label="Tagline" value={draft.general.tagline} onChange={(v) => patch('general.tagline', v)} />
              <AdminTextarea label="Meta Description" value={draft.general.description} onChange={(v) => patch('general.description', v)} />
            </div>
          </SectionCard>
          <SectionCard title="Branding">
            <div className="space-y-4">
              <AdminColorPicker label="Accent Color" value={draft.branding.accentColor} onChange={(v) => patch('branding.accentColor', v)} />
              <AdminImageUpload label="Logo URL" currentUrl={draft.branding.logoUrl || ''} onChange={(v) => patch('branding.logoUrl', v)} />
              <AdminImageUpload label="Favicon URL" currentUrl={draft.branding.faviconUrl || ''} onChange={(v) => patch('branding.faviconUrl', v)} />
            </div>
          </SectionCard>
        </div>
      );

    case 'contact':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Kontak">
            <div className="space-y-4">
              <AdminInput label="Support Email" type="email" value={draft.general.supportEmail} onChange={(v) => patch('general.supportEmail', v)} />
              <AdminInput label="WhatsApp Number" type="tel" value={draft.general.whatsappNumber} onChange={(v) => patch('general.whatsappNumber', v)} helperText="Format: 628xxx" />
            </div>
          </SectionCard>
          <SectionCard title="Social Media">
            <div className="space-y-4">
              <AdminInput label="Instagram" value={draft.socials.instagram} onChange={(v) => patch('socials.instagram', v)} />
              <AdminInput label="Twitter / X" value={draft.socials.twitter} onChange={(v) => patch('socials.twitter', v)} />
              <AdminInput label="YouTube" value={draft.socials.youtube} onChange={(v) => patch('socials.youtube', v)} />
              <AdminInput label="TikTok" value={draft.socials.tiktok} onChange={(v) => patch('socials.tiktok', v)} />
            </div>
          </SectionCard>
        </div>
      );

    case 'seo':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="SEO & Analytics">
            <AdminTextarea label="Meta Description (override)" value={draft.general.description} onChange={(v) => patch('general.description', v)} />
            <div className="mt-4 space-y-4">
              <AdminInput label="Facebook Pixel" value={draft.marketing.fbPixelId} onChange={(v) => patch('marketing.fbPixelId', v)} />
              <AdminInput label="Google Analytics" value={draft.marketing.googleAnalyticsId} onChange={(v) => patch('marketing.googleAnalyticsId', v)} />
            </div>
          </SectionCard>
        </div>
      );

    case 'notifications':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Announcement Bar">
            <AdminToggle label="Tampilkan banner atas" checked={draft.announcement.active} onChange={(v) => patch('announcement.active', v)} />
            <AdminTextarea label="Teks Banner" value={draft.announcement.text} onChange={(v) => patch('announcement.text', v)} />
          </SectionCard>
        </div>
      );

    case 'hero':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Hero Copy">
            <div className="space-y-4">
              <AdminInput label="Eyebrow" value={draft.content.hero.eyebrow} onChange={(v) => patch('content.hero.eyebrow', v)} />
              <AdminInput label="Headline 1" value={draft.content.hero.headline1} onChange={(v) => patch('content.hero.headline1', v)} />
              <AdminInput label="Headline 2 (hijau)" value={draft.content.hero.headline2} onChange={(v) => patch('content.hero.headline2', v)} />
              <AdminTextarea label="Sub-headline" value={draft.content.hero.subheadline} onChange={(v) => patch('content.hero.subheadline', v)} />
              <AdminInput label="CTA Primary" value={draft.content.hero.cta?.primary || ''} onChange={(v) => patch('content.hero.cta.primary', v)} />
              <AdminInput label="CTA Secondary" value={draft.content.hero.cta?.secondary || ''} onChange={(v) => patch('content.hero.cta.secondary', v)} />
            </div>
          </SectionCard>
          <SectionCard title="Hero Bullets">
            <AdminRepeater
              label="Bullet Points"
              items={(draft.content.hero.bullets || []).map((text: string) => ({ text }))}
              onChange={(items) => patch('content.hero.bullets', items.map((i) => i.text))}
              fields={[{ key: 'text', label: 'Teks', type: 'text' }]}
              addLabel="Tambah Bullet"
              maxItems={8}
            />
          </SectionCard>
        </div>
      );

    case 'sections':
      return (
        <div className="space-y-8">
          <SectionCard title="Urutan & Visibilitas Section">
            <div className="space-y-3">
              {[...draft.sections].sort((a, b) => a.order - b.order).map((s, idx) => (
                <SectionRow key={s.id} section={s} index={idx} sections={draft.sections} onChange={(sections) => patch('sections', sections)} />
              ))}
            </div>
          </SectionCard>
          <SectionHeaderEditor draft={draft} patch={patch} />
          <SectionCard title="Pain Points">
            <AdminRepeater
              label="Daftar Pain Point"
              items={(draft.content.painPoints || []).map((p: string) => ({ text: p }))}
              onChange={(items) => patch('content.painPoints', items.map((i) => i.text))}
              fields={[{ key: 'text', label: 'Pain Point', type: 'textarea' }]}
              maxItems={12}
            />
          </SectionCard>
          <SectionCard title="Garansi (checklist)">
            <AdminRepeater
              label="Item Garansi"
              items={(draft.content.guarantee || []).map((g: string) => ({ text: g }))}
              onChange={(items) => patch('content.guarantee', items.map((i) => i.text))}
              fields={[{ key: 'text', label: 'Item', type: 'text' }]}
              maxItems={8}
            />
          </SectionCard>
        </div>
      );

    case 'features':
      return (
        <div className="space-y-8">
          <HeaderFields draft={draft} headerKey="features" patch={patch} />
          <SectionCard title="Fitur Cards">
            <AdminRepeater
              label="Features"
              items={draft.content.features || []}
              onChange={(items) => patch('content.features', items)}
              fields={[
                { key: 'id', label: 'ID', type: 'text' },
                { key: 'icon', label: 'Icon (Lucide)', type: 'text' },
                { key: 'title', label: 'Judul', type: 'text' },
                { key: 'description', label: 'Deskripsi', type: 'textarea' },
                {
                  key: 'size',
                  label: 'Ukuran',
                  type: 'select',
                  options: [
                    { value: 'big', label: 'Big' },
                    { value: 'small', label: 'Small' },
                  ],
                },
                {
                  key: 'color',
                  label: 'Warna',
                  type: 'select',
                  options: [
                    { value: 'green', label: 'Green' },
                    { value: 'blue', label: 'Blue' },
                    { value: 'purple', label: 'Purple' },
                    { value: 'amber', label: 'Amber' },
                    { value: 'slate', label: 'Slate' },
                    { value: 'gold', label: 'Gold' },
                  ],
                },
              ]}
              maxItems={20}
            />
          </SectionCard>
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-8">
          <HeaderFields draft={draft} headerKey="testimonials" patch={patch} />
          <SectionCard title="Testimonial Stories">
            <AdminRepeater
              label="Stories"
              items={(draft.content.testimonials || []).map((t: Record<string, unknown>) => ({
                id: t.id,
                name: t.name,
                role: t.role,
                location: t.location,
                storyTitle: t.storyTitle,
                microStory: t.microStory,
                beforeShort: (t.transformation as { before?: string })?.before || '',
                afterShort: (t.transformation as { after?: string })?.after || '',
                featured: t.featured,
              }))}
              onChange={(items) =>
                patch(
                  'content.testimonials',
                  items.map(({ beforeShort, afterShort, ...rest }) => ({
                    ...rest,
                    transformation: { before: beforeShort, after: afterShort },
                  }))
                )
              }
              fields={[
                { key: 'id', label: 'ID', type: 'text' },
                { key: 'name', label: 'Nama', type: 'text' },
                { key: 'role', label: 'Role', type: 'text' },
                { key: 'location', label: 'Lokasi', type: 'text' },
                { key: 'storyTitle', label: 'Judul Cerita', type: 'text' },
                { key: 'microStory', label: 'Micro Story', type: 'textarea' },
                { key: 'beforeShort', label: 'Before (singkat)', type: 'text' },
                { key: 'afterShort', label: 'After (singkat)', type: 'text' },
                { key: 'featured', label: 'Featured', type: 'toggle' },
              ]}
              maxItems={12}
            />
          </SectionCard>
        </div>
      );

    case 'pricing':
      return (
        <div className="space-y-8">
          <HeaderFields draft={draft} headerKey="pricing" patch={patch} />
          <SectionCard title="Pricing Header (data)">
            <div className="space-y-4">
              <AdminInput label="Badge" value={draft.content.pricing?.header?.badge || ''} onChange={(v) => patch('content.pricing.header.badge', v)} />
              <AdminInput label="Title" value={draft.content.pricing?.header?.title || ''} onChange={(v) => patch('content.pricing.header.title', v)} />
              <AdminInput label="Highlight" value={draft.content.pricing?.header?.titleHighlight || ''} onChange={(v) => patch('content.pricing.header.titleHighlight', v)} />
              <AdminTextarea label="Subtitle" value={draft.content.pricing?.header?.subtitle || ''} onChange={(v) => patch('content.pricing.header.subtitle', v)} />
            </div>
          </SectionCard>
          {(draft.content.pricing?.plans || []).map((plan: Record<string, unknown>, i: number) => (
            <SectionCard key={String(plan.id)} title={`Plan: ${plan.name}`}>
              <div className="space-y-4">
                <AdminInput label="Nama" value={String(plan.name || '')} onChange={(v) => {
                  const plans = [...draft.content.pricing.plans];
                  plans[i] = { ...plans[i], name: v };
                  patch('content.pricing.plans', plans);
                }} />
                <AdminInput label="Tagline" value={String(plan.tagline || '')} onChange={(v) => {
                  const plans = [...draft.content.pricing.plans];
                  plans[i] = { ...plans[i], tagline: v };
                  patch('content.pricing.plans', plans);
                }} />
                <AdminInput label="Harga Display" value={String((plan.price as { display?: string })?.display || '')} onChange={(v) => {
                  const plans = [...draft.content.pricing.plans];
                  plans[i] = { ...plans[i], price: { ...(plans[i].price as object), display: v } };
                  patch('content.pricing.plans', plans);
                }} />
                <AdminInput label="CTA Label" value={String((plan.cta as { label?: string })?.label || '')} onChange={(v) => {
                  const plans = [...draft.content.pricing.plans];
                  plans[i] = { ...plans[i], cta: { ...(plans[i].cta as object), label: v } };
                  patch('content.pricing.plans', plans);
                }} />
                <AdminRepeater
                  label="Fitur Plan"
                  items={(plan.features as { text?: string; included?: boolean; highlight?: boolean }[]) || []}
                  onChange={(features) => {
                    const plans = [...draft.content.pricing.plans];
                    plans[i] = { ...plans[i], features };
                    patch('content.pricing.plans', plans);
                  }}
                  fields={[
                    { key: 'text', label: 'Fitur', type: 'text' },
                    { key: 'included', label: 'Included', type: 'toggle' },
                    { key: 'highlight', label: 'Highlight', type: 'toggle' },
                  ]}
                  addLabel="Tambah Fitur"
                  maxItems={24}
                />
              </div>
            </SectionCard>
          ))}
          <SectionCard title="Pricing Plans (tambah/hapus)">
            <AdminRepeater
              label="Plans"
              items={(draft.content.pricing?.plans || []).map((p: Record<string, unknown>) => ({
                id: p.id,
                name: p.name,
                tagline: p.tagline || '',
                priceDisplay: (p.price as { display?: string })?.display || '',
                ctaLabel: (p.cta as { label?: string })?.label || '',
              }))}
              onChange={(items) => {
                const existing = draft.content.pricing?.plans || [];
                patch(
                  'content.pricing.plans',
                  items.map((item, idx) => {
                    const prev = existing[idx] || {};
                    return {
                      ...prev,
                      id: item.id,
                      name: item.name,
                      tagline: item.tagline,
                      price: { ...(prev.price as object), display: item.priceDisplay },
                      cta: { ...(prev.cta as object), label: item.ctaLabel },
                    };
                  })
                );
              }}
              fields={[
                { key: 'id', label: 'Plan ID', type: 'text' },
                { key: 'name', label: 'Nama', type: 'text' },
                { key: 'tagline', label: 'Tagline', type: 'text' },
                { key: 'priceDisplay', label: 'Harga Display', type: 'text' },
                { key: 'ctaLabel', label: 'CTA Label', type: 'text' },
              ]}
              addLabel="Tambah Plan"
              maxItems={6}
            />
          </SectionCard>
          <SectionCard title="Quick FAQ (Pricing)">
            <AdminRepeater
              label="FAQ Pricing"
              items={draft.content.pricing?.quickFAQ || []}
              onChange={(items) => patch('content.pricing.quickFAQ', items)}
              fields={[
                { key: 'q', label: 'Pertanyaan', type: 'text' },
                { key: 'a', label: 'Jawaban', type: 'textarea' },
              ]}
              maxItems={10}
            />
          </SectionCard>
        </div>
      );

    case 'bonus':
      return (
        <div className="space-y-8">
          <HeaderFields draft={draft} headerKey="bonus" patch={patch} />
          <SectionCard title="Bonus Apps">
            <AdminRepeater
              label="Aplikasi Bonus"
              items={draft.content.bonusApps || bonusAppsData}
              onChange={(items) => patch('content.bonusApps', items)}
              fields={[
                { key: 'id', label: 'ID', type: 'text' },
                { key: 'name', label: 'Nama', type: 'text' },
                { key: 'description', label: 'Deskripsi', type: 'textarea' },
                { key: 'icon', label: 'Icon (Lucide)', type: 'text' },
                {
                  key: 'color',
                  label: 'Warna',
                  type: 'select',
                  options: [
                    { value: 'green', label: 'Green' },
                    { value: 'blue', label: 'Blue' },
                    { value: 'purple', label: 'Purple' },
                    { value: 'amber', label: 'Amber' },
                  ],
                },
                { key: 'value', label: 'Nilai (Rp)', type: 'text' },
              ]}
              addLabel="Tambah Bonus App"
              maxItems={8}
            />
          </SectionCard>
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-8">
          <HeaderFields draft={draft} headerKey="faq" patch={patch} />
          <SectionCard title="FAQ Items">
            <AdminRepeater
              label="Pertanyaan & Jawaban"
              items={draft.content.faq || []}
              onChange={(items) => patch('content.faq', items)}
              fields={[
                { key: 'id', label: 'ID', type: 'text' },
                { key: 'category', label: 'Kategori', type: 'text' },
                { key: 'question', label: 'Pertanyaan', type: 'text' },
                { key: 'answer', label: 'Jawaban', type: 'textarea' },
              ]}
              maxItems={40}
            />
          </SectionCard>
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Footer Copy">
            <AdminInput label="Nav Header" value={draft.content.footer?.navHeader || ''} onChange={(v) => patch('content.footer.navHeader', v)} />
            <AdminInput label="Contact Header" value={draft.content.footer?.contactHeader || ''} onChange={(v) => patch('content.footer.contactHeader', v)} />
            <AdminTextarea label="Disclaimer" value={draft.content.footer?.disclaimer || ''} onChange={(v) => patch('content.footer.disclaimer', v)} />
          </SectionCard>
        </div>
      );

    case 'phone-mockup':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Phone Mockup Media">
            <AdminImageUpload label="Hero Video URL" currentUrl={draft.media?.hero_video?.url || ''} onChange={(v) => patch('media.hero_video', { type: 'video', url: v })} />
            <AdminImageUpload label="Transformation Image" currentUrl={draft.media?.transformation_image?.url || ''} onChange={(v) => patch('media.transformation_image', { type: 'image', url: v })} />
            <p className="text-xs text-slate-500 mt-4">Data angka di phone mockup bisa diedit inline saat admin mode aktif (klik Edit di mockup).</p>
          </SectionCard>
        </div>
      );

    case 'floating':
      return (
        <div className="space-y-8 max-w-2xl">
          <SectionCard title="Floating Elements">
            <AdminInput label="WhatsApp Number" value={draft.general.whatsappNumber} onChange={(v) => patch('general.whatsappNumber', v)} />
            <p className="text-xs text-slate-500 mt-4">Trust ticker, scroll progress, dan exit intent menggunakan copy default — edit via inline di landing.</p>
          </SectionCard>
        </div>
      );

    case 'json-editor':
      return (
        <div className="h-full flex flex-col min-h-[400px]">
          <textarea
            value={localJson}
            onChange={(e) => onJsonChange(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/5 rounded-3xl p-6 text-xs text-green-400 font-mono focus:outline-none focus:border-amber-500/50 resize-none min-h-[360px]"
            spellCheck={false}
          />
        </div>
      );

    case 'leads':
      return <LeadsTab settings={draft} onChange={onChange} />;

    default:
      return <p className="text-slate-500">Section belum tersedia.</p>;
  }
}

function HeaderFields({
  draft,
  headerKey,
  patch,
}: {
  draft: SiteSettings;
  headerKey: string;
  patch: (path: string, value: unknown) => void;
}) {
  const header = draft.content.headers?.[headerKey] || { eyebrow: '', title: '', highlight: '', subtitle: '' };
  return (
    <SectionCard title={`Header: ${headerKey}`}>
      <div className="space-y-4">
        <AdminInput label="Eyebrow" value={header.eyebrow} onChange={(v) => patch(`content.headers.${headerKey}.eyebrow`, v)} />
        <AdminInput label="Title" value={header.title} onChange={(v) => patch(`content.headers.${headerKey}.title`, v)} />
        <AdminInput label="Highlight" value={header.highlight} onChange={(v) => patch(`content.headers.${headerKey}.highlight`, v)} />
        <AdminTextarea label="Subtitle" value={header.subtitle} onChange={(v) => patch(`content.headers.${headerKey}.subtitle`, v)} />
      </div>
    </SectionCard>
  );
}

function SectionHeaderEditor({
  draft,
  patch,
}: {
  draft: SiteSettings;
  patch: (path: string, value: unknown) => void;
}) {
  const keys = ['pain_points', 'how_it_works', 'transformation'];
  return (
    <SectionCard title="Section Headers">
      <div className="space-y-8">
        {keys.map((key) => (
          <HeaderFields key={key} draft={draft} headerKey={key} patch={patch} />
        ))}
      </div>
    </SectionCard>
  );
}

function SectionRow({
  section,
  index,
  sections,
  onChange,
}: {
  section: SiteSettings['sections'][0];
  index: number;
  sections: SiteSettings['sections'];
  onChange: (sections: SiteSettings['sections']) => void;
}) {
  const swap = (target: number) => {
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const temp = next[index].order;
    next[index] = { ...next[index], order: next[target].order };
    next[target] = { ...next[target], order: temp };
    onChange(next);
  };

  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-2xl border', section.active ? 'bg-slate-800/50 border-white/5' : 'bg-slate-950/50 opacity-50 border-transparent')}>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => swap(index - 1)} className="text-slate-600 hover:text-white p-1 text-xs">▲</button>
        <button type="button" onClick={() => swap(index + 1)} className="text-slate-600 hover:text-white p-1 text-xs">▼</button>
      </div>
      <div className="flex-grow">
        <h4 className="text-white font-bold text-sm">{section.label}</h4>
        <code className="text-[9px] text-slate-600">{section.id}</code>
      </div>
      <button
        type="button"
        onClick={() => onChange(sections.map((s) => (s.id === section.id ? { ...s, active: !s.active } : s)))}
        className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase', section.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400')}
      >
        {section.active ? 'Visible' : 'Hidden'}
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof PieChart; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };
  return (
    <div className="p-6 bg-slate-800/40 border border-white/5 rounded-2xl">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colors[color])}>
        <Icon size={20} />
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <h4 className="text-2xl font-black text-white mt-1">{value}</h4>
    </div>
  );
}
