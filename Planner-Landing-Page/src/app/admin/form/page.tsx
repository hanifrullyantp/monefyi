"use client";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Plus, Trash2, GripVertical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const defaultFields = [
  { id: 1, label: "Nama Lengkap", type: "text", required: true, placeholder: "Masukkan nama Anda" },
  { id: 2, label: "Nomor WhatsApp", type: "tel", required: true, placeholder: "0812xxxx" },
  { id: 3, label: "Jenis Proyek", type: "select", required: true, options: ["Renovasi", "Interior", "Kitchen Set"] },
  { id: 4, label: "Lokasi Proyek", type: "text", required: false, placeholder: "Kota/Kecamatan" },
];

export default function FormPage() {
  const [fields, setFields] = useState(defaultFields);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 500);
  };

  return (
    <div>
      <PageHeader
        title="Form Builder"
        description="Kelola input yang akan tampil di form pendaftaran lead"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Save className="w-4 h-4" />Simpan
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Fields List */}
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 group">
              <GripVertical className="w-5 h-5 text-slate-300 cursor-grab" />
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Label</label>
                  <input type="text" value={f.label} onChange={(e) => {
                    const next = [...fields];
                    next[i].label = e.target.value;
                    setFields(next);
                  }} className="w-full text-sm font-medium text-slate-900 border-none p-0 focus:ring-0" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe</label>
                  <select value={f.type} onChange={(e) => {
                    const next = [...fields];
                    next[i].type = e.target.value;
                    setFields(next);
                  }} className="w-full text-sm text-slate-600 border-none p-0 focus:ring-0 bg-transparent">
                    <option value="text">Text</option>
                    <option value="tel">Telepon</option>
                    <option value="email">Email</option>
                    <option value="select">Dropdown</option>
                    <option value="textarea">Textarea</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" checked={f.required} onChange={(e) => {
                    const next = [...fields];
                    next[i].required = e.target.checked;
                    setFields(next);
                  }} className="rounded text-emerald-500" />
                  <span className="text-xs text-slate-600">Required</span>
                </div>
              </div>
              <button onClick={() => setFields(fields.filter(field => field.id !== f.id))} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setFields([...fields, { id: Date.now(), label: "Field Baru", type: "text", required: false, placeholder: "" }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all font-medium text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Field
          </button>
        </div>

        {/* Preview */}
        <div className="bg-slate-100 rounded-3xl p-6 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Preview Form</h3>
          </div>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.id}>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">{f.label}{f.required && "*"}</label>
                {f.type === "select" ? (
                  <div className="w-full h-10 bg-white border border-slate-200 rounded-xl" />
                ) : f.type === "textarea" ? (
                  <div className="w-full h-20 bg-white border border-slate-200 rounded-xl" />
                ) : (
                  <div className="w-full h-10 bg-white border border-slate-200 rounded-xl" />
                )}
              </div>
            ))}
            <div className="h-12 bg-slate-900 rounded-xl mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
