"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save } from "lucide-react";

export default function KontakPage() {
  const { content, updateSection, publishContent } = useContentStore();
  const [footer, setFooter] = useState(content.footer);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    updateSection("footer", footer);
    await publishContent();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Kontak & Sosial</h1>
        <button onClick={save} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {[
          { key: "email", label: "Email Support" },
          { key: "whatsapp", label: "No. WhatsApp" },
          { key: "instagram", label: "Instagram Handle" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">{label}</label>
            <input
              value={(footer as unknown as Record<string, string>)[key] || ""}
              onChange={(e) => setFooter({ ...footer, [key]: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        ))}

        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Social Links</label>
          <div className="space-y-2">
            {footer.socialLinks.map((link, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  value={link.platform}
                  readOnly
                  className="border border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50"
                />
                <input
                  value={link.href}
                  onChange={(e) => {
                    const newLinks = [...footer.socialLinks];
                    newLinks[i] = { ...link, href: e.target.value };
                    setFooter({ ...footer, socialLinks: newLinks });
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
