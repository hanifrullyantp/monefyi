"use client";
import { useState, useEffect } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, RefreshCw, AlertCircle, Check } from "lucide-react";

export default function KontenJsonPage() {
  const { content, updateContent, markSaved, resetContent } = useContentStore();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setJsonText(JSON.stringify(content, null, 2));
  }, [content]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      updateContent(parsed);
      markSaved();
      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError("JSON tidak valid: " + String(err));
    }
  };

  const handleReset = () => {
    if (confirm("Reset semua konten ke default? Ini tidak bisa diundo.")) {
      resetContent();
      setError("");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">JSON Editor</h1>
          <p className="text-slate-500 text-sm mt-1">Edit seluruh konten landing page dalam format JSON</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 border border-red-200 text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4" /> Reset Default
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50">
          <p className="text-xs text-slate-500">
            Hati-hati saat mengedit JSON secara langsung. Pastikan struktur JSON tetap valid.
          </p>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setError("");
          }}
          className="w-full font-mono text-xs text-slate-800 p-4 outline-none resize-none"
          style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
