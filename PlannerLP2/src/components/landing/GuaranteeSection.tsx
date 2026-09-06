"use client";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { plannerAppPath } from "@/lib/config/plannerApp";

export function GuaranteeSection() {
  const { content } = useContentStore();
  const { guarantee } = content;
  const refundHref = plannerAppPath("/contact?refund=1");

  return (
    <section className="py-12 md:py-20 bg-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 md:p-12 border border-emerald-200 text-center"
        >
          <div className="flex justify-center mb-6">
            <ShieldCheck className="w-20 h-20 text-emerald-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">
            {guarantee.title}
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mx-auto mb-8">
            {guarantee.paragraph}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {guarantee.checkpoints.map((cp, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{cp}</span>
              </div>
            ))}
          </div>
          <a
            href={refundHref}
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-200/60 transition-colors"
          >
            {guarantee.refundCtaText || "Ajukan Garansi Refund"}
          </a>
          <p className="text-xs text-slate-600 mt-3 max-w-md mx-auto">
            Login diperlukan untuk verifikasi pembelian. Refund diproses manual via Lynk dalam 1–3 hari kerja.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
