"use client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArrowRight } from "lucide-react";

/** Form lead menggunakan opsi dari Kontak & Sosial — tidak ada mock field builder. */
export default function FormPage() {
  return (
    <div>
      <PageHeader
        title="Form Lead"
        description="Opsi form konsultasi dikelola bersama kontak landing"
      />
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-xl">
        <p className="text-slate-600 text-sm leading-relaxed">
          Field form lead (jenis kebutuhan, range budget, pesan WA abandonment) tersimpan di section{" "}
          <strong>contactSocial</strong> — sama dengan yang dipakai landing page.
        </p>
        <Link
          href="/admin/kontak"
          className="mt-6 inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:underline"
        >
          Edit di Kontak & Sosial <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
