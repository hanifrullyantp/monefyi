"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Bot,
  QrCode,
  Users,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  DollarSign,
  HardHat,
  RefreshCw,
  Plus,
  Trash2,
  Play,
} from "lucide-react";
import {
  loadWABotConfig,
  saveWABotConfig,
  sendWhatsAppMessage,
  handleIncomingWAMessage,
  type WABotConfig,
  type WAProvider,
  type WAEmpContact,
} from "@/lib/services/whatsappBotService";

export default function WhatsAppBotAdminPage() {
  const [config, setConfig] = useState<WABotConfig>(() => loadWABotConfig());
  const [activeTab, setActiveTab] = useState<"gateway" | "cs" | "employees" | "simulator">("gateway");
  const [saved, setSaved] = useState(false);

  // Test send state
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Halo! Ini pesan tes integrasi Bot WhatsApp Monefyi. Koneksi berhasil aktif!");
  const [testingSend, setTestingSend] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Simulator state
  const [simSenderPhone, setSimSenderPhone] = useState("6281234567801");
  const [simInput, setSimInput] = useState("#kasbon 300rb Pak Slamet Proyek Budi");
  const [simHistory, setSimHistory] = useState<
    Array<{ id: string; sender: "user" | "bot"; text: string; role?: string; time: string }>
  >([
    {
      id: "1",
      sender: "bot",
      text: "Halo! Bot WhatsApp Monefyi aktif siap melayani pertanyaan customer maupun koordinasi karyawan.",
      time: "09:00",
    },
  ]);

  // Employee modal/add state
  const [newEmp, setNewEmp] = useState<{ name: string; phone: string; role: WAEmpContact["role"]; notes: string }>({
    name: "",
    phone: "",
    role: "finance",
    notes: "",
  });
  const [showAddEmp, setShowAddEmp] = useState(false);

  // Webhook Origin URL
  const [webhookFullUrl, setWebhookFullUrl] = useState("/api/webhook/whatsapp");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookFullUrl(`${window.location.origin}/api/webhook/whatsapp`);
    }
  }, []);

  const handleSave = () => {
    saveWABotConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestSend = async () => {
    if (!testPhone) {
      alert("Masukkan nomor tujuan pengujian terlebih dahulu (contoh: 6281234567890)");
      return;
    }
    setTestingSend(true);
    setTestResult(null);
    try {
      const res = await sendWhatsAppMessage(testPhone, testMessage, config);
      setTestResult(res);
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : "Gagal mengirim pesan tes",
      });
    } finally {
      setTestingSend(false);
    }
  };

  const handleSimulateChat = () => {
    if (!simInput.trim()) return;
    const nowTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    // Tambah pesan pengirim
    const userMsg = {
      id: Date.now().toString(),
      sender: "user" as const,
      text: simInput,
      time: nowTime,
    };

    // Jalankan engine respon
    const reply = handleIncomingWAMessage(simSenderPhone, simInput, config);

    const botMsg = {
      id: (Date.now() + 1).toString(),
      sender: "bot" as const,
      text: reply.replyText,
      role: reply.employeeRole || (reply.senderType === "customer" ? "CS (Mbak Esti)" : "Bot"),
      time: nowTime,
    };

    setSimHistory((prev) => [...prev, userMsg, botMsg]);
    setSimInput("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Berhasil disalin ke clipboard!");
  };

  const handleAddEmployee = () => {
    if (!newEmp.name || !newEmp.phone) {
      alert("Nama dan nomor WhatsApp karyawan wajib diisi");
      return;
    }
    const emp: WAEmpContact = {
      id: "emp-" + Date.now(),
      name: newEmp.name,
      phone: newEmp.phone,
      role: newEmp.role,
      active: true,
      notes: newEmp.notes,
    };
    setConfig((prev) => ({
      ...prev,
      employees: [...prev.employees, emp],
    }));
    setNewEmp({ name: "", phone: "", role: "finance", notes: "" });
    setShowAddEmp(false);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Hapus nomor karyawan ini dari daftar koordinasi?")) {
      setConfig((prev) => ({
        ...prev,
        employees: prev.employees.filter((e) => e.id !== id),
      }));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pengaturan Bot WhatsApp
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Otomasi Customer Support (Mbak Esti) &amp; Koordinasi Tim Lapangan (Finance, Mandor) via Gateway Non-Resmi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="accent-emerald-600 w-4 h-4"
            />
            <span>{config.enabled ? "Bot Aktif" : "Bot Dinonaktifkan"}</span>
          </label>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-900/25 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saved ? "Tersimpan!" : "Simpan Pengaturan"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: "gateway" as const, label: "1. Koneksi Gateway (Non-Resmi)", icon: QrCode },
          { id: "cs" as const, label: "2. Bot CS (Mbak Esti)", icon: Bot },
          { id: "employees" as const, label: "3. Koordinasi Karyawan (Finance & Mandor)", icon: Users },
          { id: "simulator" as const, label: "4. Simulator & Tester Chat", icon: Play },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GATEWAY CONFIG */}
      {activeTab === "gateway" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Penyedia Gateway WhatsApp (Tanpa API Resmi Meta)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gunakan nomor WhatsApp nomor kantor atau nomor pribadi Anda sendiri melalui scan QR di gateway. Tidak butuh verifikasi Facebook Business, tidak ada biaya per template dari Meta, dan langsung aktif dalam 2 menit.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pilih Gateway WhatsApp
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "fonnte" as const, name: "Fonnte", desc: "Paling populer & mudah" },
                    { id: "wablas" as const, name: "Wablas", desc: "Stabil & multi-device" },
                    { id: "starsender" as const, name: "Starsender", desc: "Ekonomis" },
                    { id: "custom_baileys" as const, name: "Custom / Baileys", desc: "Self-hosted server" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setConfig({ ...config, provider: p.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        config.provider === p.id
                          ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    API Token / Key Gateway
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Contoh: fonnte_token_abc123..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Didapat dari dashboard gateway (menu API / Token).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nomor WhatsApp Pengirim (Bot)
                  </label>
                  <input
                    type="text"
                    value={config.senderPhone}
                    onChange={(e) => setConfig({ ...config, senderPhone: e.target.value })}
                    placeholder="6281234567890"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nomor HP yang di-scan di gateway WhatsApp.
                  </p>
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div className="pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  URL Webhook Masuk (Tempel di Gateway Anda)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookFullUrl}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookFullUrl)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Salin URL ini dan tempelkan pada kolom <strong>Webhook URL</strong> di dashboard Fonnte / Wablas agar setiap ada chat masuk otomatis dijawab oleh Monefyi AI.
                </p>
              </div>
            </div>

            {/* Test Send Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                Uji Coba Kirim Pesan WhatsApp
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kirim Pesan Uji ke Nomor:
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Contoh: 6281234567890"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={testingSend}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/20"
                  >
                    {testingSend ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{testingSend ? "Mengirim..." : "Kirim Pesan Tes"}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tutorial Sidebar */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg space-y-3">
              <h3 className="font-extrabold text-sm text-amber-300 flex items-center gap-2">
                <span>⚡ Tutorial Cepat (Fonnte / Non-Resmi)</span>
              </h3>
              <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Buka situs penyedia gateway (contoh: <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">fonnte.com</a>) dan daftar gratis.
                </li>
                <li>
                  Di dashboard gateway, hubungkan perangkat dengan <strong>Scan QR WhatsApp</strong> dari HP Anda.
                </li>
                <li>
                  Buka menu <strong>API</strong>, salin <strong>Token</strong> Anda lalu tempel ke kolom di sebelah kiri.
                </li>
                <li>
                  Salin <strong>URL Webhook</strong> di atas dan tempel di pengaturan Webhook dashboard Fonnte.
                </li>
                <li>
                  Klik tombol <strong>Kirim Pesan Tes</strong> untuk memverifikasi. Selesai!
                </li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Keuntungan Non-Resmi:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                <li>Bisa pakai nomor WhatsApp biasa / nomor pribadi.</li>
                <li>Bebas kirim pesan tanpa nunggu template disetujui Meta.</li>
                <li>Gratis atau biaya bulanan flat terjangkau tanpa tagihan per pesan.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOT CS (MBAK ESTI) */}
      {activeTab === "cs" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 max-w-3xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" />
                Customer Support AI (Mbak Esti di WhatsApp)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mbak Esti otomatis menjawab pertanyaan calon klien seputar aplikasi, pembuatan penawaran RAB, dan info paket upgrade.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={config.csEnabled}
                onChange={(e) => setConfig({ ...config, csEnabled: e.target.checked })}
                className="accent-emerald-600 w-4 h-4"
              />
              <span>{config.csEnabled ? "Aktif" : "Nonaktif"}</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nomor WhatsApp Pribadi Owner (Untuk Notifikasi Eskalasi)
            </label>
            <input
              type="text"
              value={config.ownerPhone}
              onChange={(e) => setConfig({ ...config, ownerPhone: e.target.value })}
              placeholder="Contoh: 6281234567890"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Jika calon pembeli meminta diskon khusus, negosiasi harga, kerja sama besar, atau komplain, Mbak Esti akan otomatis meneruskan pesan tersebut ke nomor Owner ini.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Template Sapaan Awal (Auto Greeting)
            </label>
            <textarea
              rows={3}
              value={config.csGreeting}
              onChange={(e) => setConfig({ ...config, csGreeting: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none"
            />
          </div>
        </div>
      )}

      {/* TAB 3: KOORDINASI KARYAWAN (FINANCE & MANDOR) */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Daftar Karyawan Terdaftar (Finance, Mandor, PM)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nomor yang terdaftar di sini otomatis dikenali sebagai tim internal dan dapat mengirimkan perintah koordinasi via WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddEmp(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Karyawan</span>
              </button>
            </div>

            {/* Modal Tambah Karyawan */}
            {showAddEmp && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                <p className="font-extrabold text-xs text-emerald-950">Daftarkan Nomor WhatsApp Karyawan Baru:</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nama Karyawan"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="No. WA (628xxx)"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as WAEmpContact["role"] })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="finance">Finance (Keuangan &amp; Kasbon)</option>
                    <option value="mandor">Mandor (Opname &amp; Progres)</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="purchasing">Purchasing / Belanja</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddEmployee}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 w-full"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEmp(false)}
                      className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List Karyawan */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-900 uppercase font-black text-[10px] tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">No. WhatsApp</th>
                    <th className="py-3 px-4">Peran / Divisi</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {config.employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-3 px-4 font-mono">{emp.phone}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            emp.role === "finance"
                              ? "bg-purple-100 text-purple-800"
                              : emp.role === "mandor"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{emp.notes || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Karyawan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Format Perintah Cepat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-5 space-y-2">
              <h3 className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-purple-700" />
                Format Perintah WhatsApp Tim Finance:
              </h3>
              <ul className="text-xs text-purple-900 space-y-1.5 font-mono">
                <li>• <span className="font-bold">#kas-masuk [jumlah] [keterangan]</span> (catat kas masuk)</li>
                <li>• <span className="font-bold">#kas-keluar [jumlah] [keterangan]</span> (catat kas keluar)</li>
                <li>• <span className="font-bold">#cek-kasbon</span> (rekap pengajuan kasbon mandor)</li>
                <li>• <span className="font-bold">#cek-termin</span> (daftar invoice jatuh tempo)</li>
              </ul>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-2">
              <h3 className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-amber-700" />
                Format Perintah WhatsApp Tim Mandor Lapangan:
              </h3>
              <ul className="text-xs text-amber-900 space-y-1.5 font-mono">
                <li>• <span className="font-bold">#opname [persen] [proyek] [catatan]</span> (lapor progres)</li>
                <li>• <span className="font-bold">#kasbon [jumlah] [tukang] [proyek]</span> (ajukan kasbon)</li>
                <li>• <span className="font-bold">#lapor-material [barang] [jumlah]</span> (kebutuhan bahan)</li>
                <li>• <span className="font-bold">#bantuan</span> (melihat panduan lengkap)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SIMULATOR & TESTER CHAT */}
      {activeTab === "simulator" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600" />
                Simulator &amp; Live Tester Bot WhatsApp
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Uji langsung bagaimana bot merespon pesan tanpa harus mengirim pesan nyata dari HP.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSimHistory([])}
              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg font-bold"
            >
              Bersihkan Chat
            </button>
          </div>

          {/* Pengirim Mocking */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl text-xs">
            <span className="font-bold text-slate-700">Simulasikan Sebagai:</span>
            <button
              type="button"
              onClick={() => {
                setSimSenderPhone("6281234567801");
                setSimInput("#cek-kasbon");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                simSenderPhone === "6281234567801"
                  ? "bg-purple-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Finance (Mbak Rina)
            </button>
            <button
              type="button"
              onClick={() => {
                setSimSenderPhone("6281234567802");
                setSimInput("#opname 85% Kitchen Set Budi - Top table granit selesai");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                simSenderPhone === "6281234567802"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Mandor (Pak Joko)
            </button>
            <button
              type="button"
              onClick={() => {
                setSimSenderPhone("628999999999");
                setSimInput("Halo Mbak Esti, saya mau tanya cara bikin PDF penawaran di HP");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                simSenderPhone === "628999999999"
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Calon Customer (CS)
            </button>
          </div>

          {/* Kotak Chat Preview */}
          <div className="h-80 bg-slate-100 rounded-2xl p-4 overflow-y-auto space-y-3 border border-slate-200 font-sans">
            {simHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${item.sender === "user" ? "items-end" : "items-start"}`}
              >
                {item.role && (
                  <span className="text-[10px] font-extrabold text-slate-400 mb-1 px-1">
                    {item.role}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-wrap ${
                    item.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-xs"
                      : "bg-white text-slate-900 border border-slate-200 rounded-bl-xs"
                  }`}
                >
                  {item.text}
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      item.sender === "user" ? "text-emerald-200" : "text-slate-400"
                    }`}
                  >
                    {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Chat */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimulateChat()}
              placeholder="Ketik pesan simulasi..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 outline-none"
            />
            <button
              type="button"
              onClick={handleSimulateChat}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
            >
              <Send className="w-4 h-4" />
              <span>Kirim</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

