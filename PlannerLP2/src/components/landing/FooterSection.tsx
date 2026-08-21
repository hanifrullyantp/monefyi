"use client";
import { Link, Share2, Play, Zap } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";

const socialIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram: Share2,
  Facebook: Link,
  YouTube: Play,
  TikTok: Play,
  LinkedIn: Link,
};

import { EditableText } from "@/components/shared/EditableText";

export function FooterSection() {
  const { content } = useContentStore();
  const { footer } = content;

  return (
    <footer className="bg-slate-950 text-white pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* About */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 font-extrabold text-lg mb-4">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span>
                Monefyi <span className="text-emerald-400">Estimator</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              <EditableText section="footer" field="tagline" value={footer.tagline} multiline />
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-bold text-white mb-4">Navigasi</h4>
            <ul className="space-y-2">
              {footer.navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><EditableText section="footer" field="email" value={footer.email} /></li>
              <li>WA: <EditableText section="footer" field="whatsapp" value={footer.whatsapp} /></li>
              <li>IG: <EditableText section="footer" field="instagram" value={footer.instagram} /></li>
            </ul>
            <h4 className="font-bold text-white mb-3 mt-6">Ikuti Kami</h4>
            <div className="flex flex-wrap gap-2">
              {footer.socialLinks.map((social) => {
                const Icon = socialIconMap[social.platform];
                return (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-emerald-600 flex items-center justify-center transition-colors"
                    aria-label={social.platform}
                  >
                    {Icon ? <Icon className="w-4 h-4" /> : <span className="text-xs">{social.platform[0]}</span>}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 text-center space-y-2">
          <p className="text-xs text-slate-500">{footer.disclaimer}</p>
          <p className="text-xs text-slate-600">{footer.copyright}</p>
          <p className="text-xs text-slate-700">{footer.madeWith}</p>
        </div>
      </Container>
    </footer>
  );
}
