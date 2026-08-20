"use client";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Lock, User, Bell, Database, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = useState("profile");

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 500);
  };

  const tabs = [
    { id: "profile", label: "Profil Admin", icon: User },
    { id: "security", label: "Keamanan", icon: Shield },
    { id: "notifications", label: "Notifikasi", icon: Bell },
    { id: "backup", label: "Backup & Data", icon: Database },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Konfigurasi akun dan sistem admin"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              <Save className="w-4 h-4" />Simpan
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-emerald-500" : "text-slate-400")} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Profil Admin</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Nama Lengkap</label>
                  <input type="text" defaultValue="Monefyi Administrator" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Email</label>
                  <input type="email" defaultValue="admin@monefyi.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Ubah Password</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Password Saat Ini</label>
                  <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Password Baru</label>
                  <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Konfirmasi Password Baru</label>
                  <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Email & WA Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: "Email untuk Lead baru", active: true },
                  { label: "WhatsApp notification untuk Lead baru", active: true },
                  { label: "Daily Summary report", active: false },
                  { label: "Security alerts", active: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <button className={cn("w-12 h-6 rounded-full transition-all relative", item.active ? "bg-emerald-500" : "bg-slate-300")}>
                      <div className={cn("w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all", item.active ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "backup" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Backup & Pemulihan</h3>
              <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-sm text-amber-800 leading-relaxed">
                  Semua data saat ini disimpan di Browser Local Storage. Pastikan melakukan export secara berkala untuk cadangan.
                </p>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-all">Download Backup JSON</button>
                  <button className="px-4 py-2 bg-white border border-amber-200 text-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-all">Restore dari File</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
