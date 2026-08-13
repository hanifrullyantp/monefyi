import React, { useState } from 'react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { Accordion } from '../ui/Accordion';
import { cn } from '../../lib/cn';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { EditableText } from '../admin/EditableText';

export function FAQ() {
  const { settings } = useSiteSettings();
  const faqData = settings.content.faq;
  const header = settings.content.headers.faq;
  const categories = ['Semua', ...Array.from(new Set(faqData.map((f: any) => f.category))) as string[]];
  
  const [activeTab, setActiveTab] = useState('Semua');

  const filteredFaqs = activeTab === 'Semua' 
    ? faqData 
    : faqData.filter((f: any) => f.category === activeTab);

  return (
    <SectionWrapper id="faq" background="alt">
      <SectionHeader
        eyebrow={<EditableText id="header_eyebrow_faq" defaultValue={header.eyebrow} />}
        title={<EditableText id="header_title_faq" defaultValue={header.title} />}
        highlight={<EditableText id="header_highlight_faq" defaultValue={header.highlight} />}
        subtitle={<EditableText id="header_subtitle_faq" defaultValue={header.subtitle} multiline />}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                'px-5 py-2 rounded-full text-xs font-bold transition-all',
                activeTab === cat 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <Accordion items={filteredFaqs} />
      </div>
    </SectionWrapper>
  );
}
