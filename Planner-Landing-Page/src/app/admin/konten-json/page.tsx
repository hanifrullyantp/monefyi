"use client";
import { useState, useEffect } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, RotateCcw, AlertCircle } from "lucide-react";

export default function KontenJsonPage() {
  const { content, updateContent, save, resetAll } = useContentStore();
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setJsonText(JSON.stringify(content, null, 2));
  }, [content]);

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    setJsonError("");
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setSaveStatus("saving");
      updateContent(parsed);
      setTimeout(() => {
        save();
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }, 300);
    } catch (e) {
      setJsonError("JSON tidak valid: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const handleReset = () => {
    if (confirm("Reset semua konten ke default? Ini tidak bisa dibatalkan.")) {
      resetAll();
      save();
    }
  };

  return (
    <div>
      <PageHeader
        title="Konten JSON Editor"
        description="Edit raw JSON konten landing page"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Default
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <Save className="w-4 h-4" />
              Simpan
            </button>
          </div>
        }
      />

      {jsonError && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{jsonError}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 font-mono flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="ml-2">content.json</span>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          className="w-full h-[calc(100vh-280px)] p-6 font-mono text-sm text-slate-800 bg-slate-50 focus:outline-none resize-none leading-relaxed"
          spellCheck={false}
          aria-label="JSON Editor"
        />
      </div>
    </div>
  );
}
