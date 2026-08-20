"use client";
import { Globe, Play, Briefcase } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Fallback icons for social platforms
const socialIconMap: Record<string, LucideIcon> = {
  Instagram: Globe,
  Youtube: Play,
  Linkedin: Briefcase,
  instagram: Globe,
  youtube: Play,
  linkedin: Briefcase,
};

export function FooterSection() {
  const { content } = useContentStore();
  const { footer } = content;

  return (
    <footer className="bg-slate-950 text-white pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Top section */}
        <div className="grid md:grid-cols-3 gap-12">
          {/* Col 1 — Logo & Tagline */}
          <div className="md:col-span-2">
            <p className="text-2xl font-bold text-white">{footer.logo}</p>
            <p className="text-base text-slate-400 mt-4 max-w-md leading-relaxed">
              {footer.tagline}
            </p>
          </div>

          {/* Col 2 — Kontak & Social */}
          <div>
            <p className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase mb-4">
              {footer.contact.label}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">{footer.contact.email}</p>
              <p className="text-sm text-slate-300">{footer.contact.phone}</p>
            </div>

            <p className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase mb-4 mt-8">
              {footer.social.label}
            </p>
            <div className="flex gap-3">
              {footer.social.links.map((link) => {
                const Icon = socialIconMap[link.icon] ?? Globe;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-emerald-500 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={link.platform}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 mt-16 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">{footer.copyright}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap justify-center">
              {footer.bottomLinks.map((link, i) => (
                <span key={link.text} className="flex items-center gap-1">
                  {i > 0 && <span className="mx-1">·</span>}
                  {link.href.startsWith("http") ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-slate-300 transition-colors"
                    >
                      {link.text}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-slate-300 transition-colors">
                      {link.text}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
