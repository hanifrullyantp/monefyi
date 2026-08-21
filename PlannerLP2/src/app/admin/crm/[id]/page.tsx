"use client";
import { useState } from "react";
import { use } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  DollarSign,
  Calendar,
  Plus,
  Save,
  ExternalLink,
  User,
  Hash,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils/format";
import {
  LeadStatus,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_SOURCE_LABELS,
} from "@/lib/types/leads";
import { openWhatsApp } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";

const PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "survey_scheduled",
  "survey_done",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { leads, updateLead, updateLeadStatus, addActivity, deleteLead } = useLeadsStore();
  const router = useRouter();

  const lead = leads.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(lead || {});
  const [newActivity, setNewActivity] = useState("");
  const [activityType, setActivityType] = useState<"note" | "call" | "whatsapp" | "meeting">("note");

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Lead tidak ditemukan</p>
        <Link href="/admin/crm" className="text-emerald-600 hover:underline">
          Kembali ke CRM
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    updateLead(id, form as Partial<typeof lead>);
    setEditing(false);
  };

  const handleAddActivity = () => {
    if (!newActivity.trim()) return;
    addActivity(id, {
      type: activityType,
      content: newActivity,
      timestamp: new Date().toISOString(),
    });
    setNewActivity("");
  };

  const handleDelete = () => {
    if (confirm("Hapus lead ini?")) {
      deleteLead(id);
      router.push("/admin/crm");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <Link
          href="/admin/crm"
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold text-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          BACK TO PIPELINE
        </Link>

        <div className="flex items-center gap-3">
           <button
            onClick={() => openWhatsApp(lead.phone, `Halo ${lead.name}, ...`)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl px-5 py-2.5 text-sm font-bold hover:bg-emerald-100 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            WHATSAPP
          </button>
          {editing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 text-white rounded-2xl px-6 py-2.5 text-sm font-bold shadow-premium hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" />
              SAVE CHANGES
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-slate-900 text-white rounded-2xl px-6 py-2.5 text-sm font-bold hover:bg-slate-800 transition-all"
            >
              EDIT LEAD
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Header */}
      <div className="bg-slate-900 text-white rounded-[40px] p-8 md:p-12 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="w-32 h-32 bg-emerald-500 rounded-[32px] flex items-center justify-center text-5xl font-black shadow-glow border-4 border-white/10">
            {lead.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest", LEAD_STATUS_COLORS[lead.status])}>
                {LEAD_STATUS_LABELS[lead.status]}
              </span>
              <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-300 border border-white/5">
                ID: #{lead.id.slice(-5)}
              </span>
              <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-300 border border-white/5 uppercase tracking-widest">
                Source: {LEAD_SOURCE_LABELS[lead.source]}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-2">{lead.name}</h1>
            <p className="text-xl text-emerald-400 font-bold mb-6 flex items-center gap-2">
              <Hash className="w-5 h-5" />
              {lead.projectType}
            </p>
            
            <div className="flex flex-wrap gap-6 text-slate-400">
               <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.city || "No Location"}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "No Estimate"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Info Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative group overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                CLIENT DETAILS
              </h2>
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Lead Name</label>
                    <input
                      value={(form as typeof lead).name || ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Phone Number</label>
                    <input
                      value={(form as typeof lead).phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Project Type</label>
                    <input
                      value={(form as typeof lead).projectType || ""}
                      onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                   <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">City / Location</label>
                    <input
                      value={(form as typeof lead).city || ""}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Estimated Value (IDR)</label>
                    <input
                      type="number"
                      value={(form as typeof lead).estimatedValue || ""}
                      onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                   <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Lead Source</label>
                    <select
                      value={(form as typeof lead).source}
                      onChange={(e) => setForm({ ...form, source: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Internal Notes</label>
                  <textarea
                    value={(form as typeof lead).notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    placeholder="Add special requirements or observations here..."
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-6">
                  {[
                    { icon: Phone, label: "CONTACT NUMBER", value: lead.phone, color: "text-blue-500" },
                    { icon: MapPin, label: "LOCATION", value: lead.city || "Not Specified", color: "text-rose-500" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100", color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                        <p className="text-sm font-black text-slate-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  {[
                    { icon: DollarSign, label: "BUDGET ESTIMATE", value: lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "No Quote Yet", color: "text-emerald-500" },
                    { icon: ExternalLink, label: "ACQUISITION CHANNEL", value: LEAD_SOURCE_LABELS[lead.source], color: "text-amber-500" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100", color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                        <p className="text-sm font-black text-slate-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {lead.notes && (
                  <div className="col-span-2 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">INTERNAL NOTES</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                ACTIVITY FEED
            </h2>

            {/* Add Activity */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="note">Note</option>
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="meeting">On-site Meeting</option>
              </select>
              <input
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
                placeholder="Log a new activity or progress update..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                onClick={handleAddActivity}
                className="bg-slate-900 text-white rounded-2xl px-6 py-3 font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                POST
              </button>
            </div>

            {/* Activity List */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {[...lead.activities].reverse().map((activity) => (
                <div key={activity.id} className="relative">
                  <div className={cn(
                    "absolute -left-8 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10",
                    activity.type === "status_change" ? "bg-amber-400" : "bg-emerald-500"
                  )}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-50 hover:bg-white hover:border-slate-100 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activity.type.replace("_", " ")}</p>
                      <p className="text-[10px] font-bold text-slate-400 italic">{formatRelativeTime(activity.timestamp)}</p>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{activity.content}</p>
                  </div>
                </div>
              ))}
              {lead.activities.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activities logged yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right - Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Update Status</h3>
            <div className="space-y-2">
              {PIPELINE_COLUMNS.map((status) => (
                <button
                  key={status}
                  onClick={() => updateLeadStatus(id, status)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    lead.status === status
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  {LEAD_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Survei</h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={(form as typeof lead).surveyDate || ""}
                    onChange={(e) => setForm({ ...form, surveyDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Jam</label>
                  <input
                    type="time"
                    value={(form as typeof lead).surveyTime || ""}
                    onChange={(e) => setForm({ ...form, surveyTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm">
                {lead.surveyDate ? (
                  <>
                    <p className="text-slate-900 font-semibold">{formatDate(lead.surveyDate)}</p>
                    {lead.surveyTime && <p className="text-slate-500">{lead.surveyTime}</p>}
                  </>
                ) : (
                  <p className="text-slate-400">Belum dijadwalkan</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2.5 text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 rounded-xl hover:bg-red-50 transition-all"
          >
            Hapus Lead
          </button>
        </div>
      </div>
    </div>
  );
}
