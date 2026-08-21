"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Copy, Check, ExternalLink } from "lucide-react";
import type { SaveStatus } from "@/lib/hooks/useAdminContentSave";

export default function MediaPage() {
  const { content, updateSection, save } = useContentStore();
  const [global, setGlobal] = useState(content.global);
  const [ogImage, setOgImage] = useState(content.seo.ogImage);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [copied, setCopied] = useState<string | null>(null);

  const assets = [
    { label: "Logo", url: global.logoUrl, field: "logoUrl" as const },
    { label: "Favicon", url: global.faviconUrl, field: "faviconUrl" as const },
    { label: "OG Image (SEO)", url: ogImage, field: "og" as const },
  ];

  const handleSave = () => {
    setSaveStatus("saving");
    updateSection("global", global);
    updateSection("seo", { ...content.seo, ogImage });
    save();
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Media & Branding"
        description="URL aset yang dipakai landing page (dari Global & SEO)"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
            >
              <Save className="w-4 h-4" /> Simpan
            </button>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.label} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="aspect-video bg-slate-100 flex items-center justify-center p-4">
              {asset.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.label} className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="text-sm text-slate-400">Belum ada URL</p>
              )}
            </div>
            <div className="p-4 space-y-2">
              <p className="font-bold text-slate-900 text-sm">{asset.label}</p>
              <input
                type="url"
                value={asset.field === "og" ? ogImage : global[asset.field]}
                onChange={(e) => {
                  if (asset.field === "og") setOgImage(e.target.value);
                  else setGlobal({ ...global, [asset.field]: e.target.value });
                }}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              {asset.url && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyUrl(asset.url)}
                    className="text-xs text-slate-600 inline-flex items-center gap-1"
                  >
                    {copied === asset.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Salin URL
                  </button>
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Buka
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
