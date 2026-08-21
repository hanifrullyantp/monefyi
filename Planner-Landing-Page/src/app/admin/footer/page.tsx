"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import type { FooterContent } from "@/lib/types/content";
import { useAdminContentSave, type SaveStatus } from "@/lib/hooks/useAdminContentSave";

function parseBottomLinks(raw: string): FooterContent["bottomLinks"] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [text, href = "#"] = line.split("|").map((s) => s.trim());
      return { text, href };
    });
}

function formatBottomLinks(links: FooterContent["bottomLinks"]): string {
  return links.map((l) => `${l.text}|${l.href}`).join("\n");
}

export default function FooterPage() {
  const { content } = useContentStore();
  const { persistSection } = useAdminContentSave();
  const [footer, setFooter] = useState(content.footer);
  const [bottomLinksRaw, setBottomLinksRaw] = useState(formatBottomLinks(content.footer.bottomLinks));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = () => {
    persistSection(
      "footer",
      { ...footer, bottomLinks: parseBottomLinks(bottomLinksRaw) },
      setSaveStatus,
    );
  };

  return (
    <div className="max-w-4xl pb-20">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900">Footer & Privasi</h2>
        <SaveIndicator status={saveStatus} className="ml-auto" />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={handleSave}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
        >
          Simpan perubahan
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm space-y-8">
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Logo / brand (teks)</label>
          <input
            type="text"
            value={footer.logo}
            onChange={(e) => setFooter({ ...footer, logo: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Tagline</label>
          <textarea
            value={footer.tagline}
            onChange={(e) => setFooter({ ...footer, tagline: e.target.value })}
            rows={3}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Email kontak</label>
            <input
              type="email"
              value={footer.contact.email}
              onChange={(e) =>
                setFooter({ ...footer, contact: { ...footer.contact, email: e.target.value } })
              }
              className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Telepon</label>
            <input
              type="text"
              value={footer.contact.phone}
              onChange={(e) =>
                setFooter({ ...footer, contact: { ...footer.contact, phone: e.target.value } })
              }
              className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">Copyright</label>
          <input
            type="text"
            value={footer.copyright}
            onChange={(e) => setFooter({ ...footer, copyright: e.target.value })}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-medium"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-2">
            Link bawah — format: label|href per baris
          </label>
          <textarea
            value={bottomLinksRaw}
            onChange={(e) => setBottomLinksRaw(e.target.value)}
            rows={4}
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
