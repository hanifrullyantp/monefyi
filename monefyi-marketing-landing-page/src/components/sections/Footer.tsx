import React from 'react';
import { Mail, Globe, Share2, MessageCircle } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { Logo } from '../ui/Logo';
import { EditableText } from '../admin/EditableText';

export function Footer() {
  const { settings } = useSiteSettings();
  const footer = settings.content.footer;
  const socials = settings.socials;

  return (
    <footer className="bg-slate-950 border-t border-white/5 py-12 md:py-20">
      <SectionWrapper className="py-0 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="md:col-span-2">
             {settings.branding.logoUrl ? (
               <img src={settings.branding.logoUrl} alt={settings.general.siteName} className="h-9 w-auto object-contain mb-6" />
             ) : (
               <Logo className="mb-6" size={36} />
             )}
             <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
               <EditableText id="general_description" defaultValue={settings.general.description} multiline />
             </p>
             <div className="flex gap-4">
                {[
                  { icon: Globe, href: socials.instagram },
                  { icon: Share2, href: socials.twitter },
                  { icon: MessageCircle, href: socials.youtube },
                  { icon: Share2, href: socials.tiktok },
                ].map((s, i) => (
                  <a key={i} href={s.href} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                    <s.icon size={20} />
                  </a>
                ))}
             </div>
          </div>

          <div>
             <h4 className="text-white font-bold mb-6">
                <EditableText id="content_footer_navHeader" defaultValue={footer.navHeader} />
             </h4>
             <ul className="space-y-4">
                {settings.content.hero.cta && (
                  <>
                    <li><a href="#features" className="text-sm text-slate-500 hover:text-green-400">Fitur</a></li>
                    <li><a href="#testimonials" className="text-sm text-slate-500 hover:text-green-400">Testimoni</a></li>
                    <li><a href="#pricing" className="text-sm text-slate-500 hover:text-green-400">Harga</a></li>
                  </>
                )}
                <li><a href="/terms.html" className="text-sm text-slate-500 hover:text-green-400">Syarat &amp; Ketentuan</a></li>
                <li><a href="/privacy.html" className="text-sm text-slate-500 hover:text-green-400">Kebijakan Privasi</a></li>
             </ul>
          </div>

          <div>
             <h4 className="text-white font-bold mb-6">
                <EditableText id="content_footer_contactHeader" defaultValue={footer.contactHeader} />
             </h4>
             <ul className="space-y-4">
                <li className="flex items-center gap-3">
                   <Mail size={16} className="text-green-500" />
                   <a href={`mailto:${settings.general.supportEmail}`} className="text-sm text-slate-500 hover:text-white">{settings.general.supportEmail}</a>
                </li>
                <li className="text-xs text-slate-600 leading-relaxed mt-8">
                   <EditableText id="content_footer_disclaimer" defaultValue={footer.disclaimer} multiline />
                </li>
             </ul>
          </div>

        </div>

        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-slate-600 font-bold uppercase tracking-widest">
           <p>© 2026 {settings.general.siteName.toUpperCase()} INDONESIA. ALL RIGHTS RESERVED.</p>
           <p>MADE WITH ❤️ FOR INDONESIAN FINANCIAL FREEDOM</p>
        </div>
      </SectionWrapper>
    </footer>
  );
}
