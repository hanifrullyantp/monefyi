"use client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArrowRight } from "lucide-react";

export default function CrmTemplatePage() {
  return (
    <div>
      <PageHeader
        title="Template WhatsApp"
        description="Pipeline & follow-up dikelola per lead di CRM"
      />
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-xl">
        <p className="text-slate-600 text-sm leading-relaxed">
          Template WA mock (Intero/WOCENSA) sudah dihapus. Status pipeline dan catatan follow-up dikelola langsung di halaman detail lead CRM.
        </p>
        <Link
          href="/admin/crm"
          className="mt-6 inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:underline"
        >
          Buka CRM & Leads <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
