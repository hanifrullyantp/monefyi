"use client";
import { useParams, useRouter } from "next/navigation";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArrowLeft, Phone, MessageCircle, Plus, CheckCircle2 } from "lucide-react";
import { LeadStatusLabels, LeadStatusColors, ProjectTypeLabels, LeadSourceLabels } from "@/lib/types/leads";
import type { LeadStatus } from "@/lib/types/leads";
import { formatRupiah, formatDate } from "@/lib/utils/format";
import { useState } from "react";
import { buildWAUrl } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";

const allStatuses: LeadStatus[] = ["new", "contacted", "survey", "proposal", "negotiation", "won", "lost"];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { leads, updateLeadStatus, addActivity, updateLead } = useLeadsStore();
  const [note, setNote] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);

  const lead = leads.find((l) => l.id === params.id);

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Lead tidak ditemukan.</p>
        <button onClick={() => router.push("/admin/crm")} className="mt-4 text-emerald-600 hover:underline text-sm">
          Kembali ke CRM
        </button>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!note.trim()) return;
    addActivity(lead.id, { type: "note", content: note, user: "Admin" });
    setNote("");
    setShowNoteForm(false);
  };

  const waUrl = buildWAUrl(lead.phone, `Halo ${lead.name}, saya dari Monefyi Planner ingin menindaklanjuti proyek ${lead.projectType} Anda.`);

  return (
    <div>
      <PageHeader
        title={lead.name}
        description={`Lead Detail · ${ProjectTypeLabels[lead.projectType]}`}
        actions={
          <button
            onClick={() => router.push("/admin/crm")}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Informasi Lead</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Nama", value: lead.name },
                { label: "Telepon", value: lead.phone },
                { label: "Email", value: lead.email ?? "-" },
                { label: "Lokasi", value: lead.location ?? "-" },
                { label: "Jenis Proyek", value: ProjectTypeLabels[lead.projectType] },
                { label: "Estimasi Nilai", value: formatRupiah(lead.estimatedValue) },
                { label: "Sumber", value: LeadSourceLabels[lead.source] },
                { label: "Tanggal Survei", value: lead.surveyDate ? formatDate(lead.surveyDate) : "-" },
                { label: "Ditugaskan ke", value: lead.assignedTo ?? "-" },
                { label: "Dibuat", value: formatDate(lead.createdAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-slate-900 font-medium mt-1">{value}</p>
                </div>
              ))}
            </div>

            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Catatan</p>
                <p className="text-sm text-slate-700 leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Aktivitas</h3>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Tambah Catatan
              </button>
            </div>

            {showNoteForm && (
              <div className="mb-4 space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Tulis catatan..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNoteForm(false)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm transition-colors">Batal</button>
                  <button onClick={handleAddNote} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">Simpan</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {[...lead.activities].reverse().map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">{activity.content}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activity.user} · {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {lead.activities.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada aktivitas</p>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Status Changer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h4 className="font-bold text-slate-900 mb-4 text-sm">Status Pipeline</h4>
            <div className="space-y-2">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateLeadStatus(lead.id, s)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all",
                    lead.status === s
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", lead.status === s ? "bg-emerald-400" : "bg-slate-300")} />
                  {LeadStatusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h4 className="font-bold text-slate-900 mb-4 text-sm">Aksi Cepat</h4>
            <div className="space-y-2">
              <a
                href={`tel:${lead.phone}`}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors"
              >
                <Phone className="w-4 h-4 text-slate-500" />
                Telepon Sekarang
              </a>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-sm font-medium text-emerald-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
