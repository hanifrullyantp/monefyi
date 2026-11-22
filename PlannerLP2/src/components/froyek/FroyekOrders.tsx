"use client";

import { useEffect, useState } from "react";

interface Lead {
  email?: string;
  name?: string;
  full_name?: string;
  phone?: string;
  status?: string;
  planTier?: string;
  amount?: number;
  grand_total?: number;
  product_title?: string;
  created_at?: string;
}

export function FroyekOrders() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    void fetch("/api/crm/lead?limit=200")
      .then((res) => res.json())
      .then((json) => {
        if (!json?.ok || !Array.isArray(json.leads)) {
          setError(json?.error || "Pesanan tidak bisa dimuat");
          return;
        }
        setLeads(json.leads);
      })
      .catch(() => setError("Pesanan tidak bisa dimuat"));
  }, []);

  function exportCsv() {
    const header = ["email", "nama", "telepon", "status", "paket", "jumlah"];
    const lines = leads.map((lead) => [
      lead.email || "",
      lead.name || lead.full_name || "",
      lead.phone || "",
      lead.status || "",
      lead.planTier || lead.product_title || "",
      String(lead.amount || lead.grand_total || ""),
    ].map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pesanan-froyek.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function remind(lead: Lead) {
    if (!lead.email) return;
    const res = await fetch("/api/email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: lead.email,
        name: lead.name || lead.full_name || "Pengunjung",
        type: "froyek_help",
        resetLink: "https://froyek.com/pilih",
      }),
    });
    setNote(res.ok ? `Pengingat dikirim ke ${lead.email}` : "Pengingat gagal dikirim");
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Pesanan checkout</h1>
      <p className="text-sm text-slate-600">Daftar dari CRM checkout Mayar, dipakai Estimator dan Froyek.</p>
      <button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" onClick={exportCsv}>Ekspor CSV</button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {note ? <p className="text-sm text-emerald-800">{note}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b"><th className="p-2">Email</th><th className="p-2">Status</th><th className="p-2">Paket</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {leads.slice(0, 50).map((lead) => (
              <tr key={`${lead.email}-${lead.created_at}`} className="border-b border-slate-100">
                <td className="p-2">{lead.email}</td>
                <td className="p-2">{lead.status}</td>
                <td className="p-2">{lead.planTier || lead.product_title}</td>
                <td className="p-2"><button type="button" className="text-emerald-800" onClick={() => remind(lead)}>Kirim pengingat</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
