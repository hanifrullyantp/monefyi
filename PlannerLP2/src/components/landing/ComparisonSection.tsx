"use client";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";

function CellValue({ value }: { value: string }) {
  if (value === "check") {
    return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
  }
  if (value === "Tidak Ada" || value === "Tidak Jadi") {
    return <X className="w-4 h-4 text-red-400 mx-auto" />;
  }
  if (value === "Manual" || value === "Dasar") {
    return <span className="text-amber-600 italic text-sm">{value}</span>;
  }
  if (value === "Sebagian") {
    return <span className="text-amber-600 italic text-sm">{value}</span>;
  }
  return <span className="text-slate-700 text-sm font-medium">{value}</span>;
}

export function ComparisonSection() {
  const { content } = useContentStore();
  const { comparison } = content;

  return (
    <section className="py-20 md:py-28 bg-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-4">
            {comparison.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {comparison.title}
          </h2>
          <p className="text-lg text-slate-600">{comparison.subtitle}</p>
        </motion.div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full min-w-[640px] bg-white">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-6 text-left text-sm font-semibold">Kenapa Pindah ke Digital?</th>
                <th className="py-4 px-4 text-center text-sm font-semibold">Cara Manual (Excel/WA)</th>
                <th className="py-4 px-6 text-center text-sm font-semibold bg-emerald-600 rounded-t-none">
                  Monefyi Estimator
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="py-4 px-6 text-sm font-medium text-slate-800">
                    {row.feature}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CellValue value={row.excel} />
                  </td>
                  <td className="py-4 px-6 text-center bg-emerald-50/50 border-x-2 border-emerald-500/20">
                    <CellValue value={row.monefyi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 mt-4 text-center italic">{comparison.note}</p>
      </Container>
    </section>
  );
}
