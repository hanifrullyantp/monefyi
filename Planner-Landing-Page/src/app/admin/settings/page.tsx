"use client";
import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { Download, Upload, Database } from "lucide-react";
import { getStorage, setStorage } from "@/lib/utils/storage";

const CONTENT_KEY = "monefyi_content";
const LEADS_KEY = "monefyi_leads";

export default function SettingsPage() {
  const [message, setMessage] = useState("");

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      content: getStorage(CONTENT_KEY, null),
      leads: getStorage(LEADS_KEY, []),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monefyi-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup diunduh.");
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          content?: unknown;
          leads?: unknown;
        };
        if (parsed.content) setStorage(CONTENT_KEY, parsed.content);
        if (parsed.leads) setStorage(LEADS_KEY, parsed.leads);
        setMessage("Import berhasil. Refresh halaman admin & landing.");
      } catch {
        setMessage("File backup tidak valid.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Backup & restore data landing + CRM"
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <Database className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-bold text-slate-900">Backup & Data</h3>
            <p className="text-sm text-slate-500 mt-1">
              Semua konten landing (`monefyi_content`) dan leads CRM (`monefyi_leads`) disimpan di browser localStorage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold cursor-pointer">
            <Upload className="w-4 h-4" /> Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
              }}
            />
          </label>
        </div>

        {message && <p className="text-sm text-emerald-700 font-medium">{message}</p>}

        <p className="text-xs text-slate-400">
          Akun admin dikelola di{" "}
          <Link href="/admin/login" className="text-emerald-600 underline">/admin/login</Link>{" "}
          (lihat `lib/accounts.ts`).
        </p>
      </div>
    </div>
  );
}
