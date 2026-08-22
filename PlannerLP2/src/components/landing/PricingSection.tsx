"use client";
import { motion } from "framer-motion";
import { Check, X, Star } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";

function CellVal({ value }: { value: string }) {
  if (value === "check") return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === "cross") return <X className="w-4 h-4 text-slate-300 mx-auto" />;
  return <span className="text-sm text-slate-600">{value}</span>;
}

import { EditableText } from "@/components/shared/EditableText";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

export function PricingSection() {
  const { content } = useContentStore();
  const { pricing } = content;
  const { startCheckout } = useLandingCta();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const groupedRows = pricing.comparisonRows.reduce<Record<string, typeof pricing.comparisonRows>>((acc, row) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push(row);
    return acc;
  }, {});

  return (
    <section id="harga" className="py-12 md:py-28 bg-slate-50">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-4">
            <EditableText section="pricing" field="badge" value={pricing.badge} />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            <EditableText section="pricing" field="title" value={pricing.title} />
          </h2>
          <p className="text-lg text-slate-600">
             <EditableText section="pricing" field="subtitle" value={pricing.subtitle} />
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className={cn(
          "grid grid-cols-1 gap-8 items-start mb-16",
          pricing.cards.length === 2 ? "lg:grid-cols-2 max-w-4xl mx-auto" : "lg:grid-cols-3"
        )}>
          {pricing.cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "rounded-2xl p-8 relative",
                card.highlighted
                  ? "bg-white border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 lg:-translate-y-4 lg:scale-105"
                  : card.darkBg
                  ? "bg-slate-900 text-white border-2 border-slate-800"
                  : "bg-white border-2 border-slate-200"
              )}
            >
              {/* Popular badge */}
              {card.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg">
                    <Star className="w-4 h-4 fill-white" />
                    {card.badge}
                  </span>
                </div>
              )}

              {!card.highlighted && (
                <span
                  className={cn(
                    "inline-block text-xs font-bold rounded-full px-3 py-1 mb-4",
                    card.darkBg
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-100 text-slate-700"
                  )}
                >
                  {card.badge}
                </span>
              )}

              {card.highlighted && <div className="mt-4" />}

              <h3 className={cn("text-2xl font-extrabold mb-1", card.darkBg ? "text-white" : "text-slate-900")}>
                {card.title}
              </h3>
              <p className={cn("text-sm mb-6", card.darkBg ? "text-slate-400" : "text-slate-500")}>
                {card.subtitle}
              </p>

              {/* Price */}
              <div className="mb-6">
                {card.originalPrice && (
                  <p className="text-slate-400 line-through text-base">{card.originalPrice}</p>
                )}
                <p className={cn("text-4xl font-extrabold", card.highlighted ? "text-emerald-600" : card.darkBg ? "text-white" : "text-slate-900")}>
                  {card.price}
                </p>
                <p className={cn("text-sm mt-1", card.darkBg ? "text-slate-400" : "text-slate-500")}>{card.pricePeriod}</p>
                {card.priceNote && (
                  <p className={cn("text-xs mt-0.5", card.darkBg ? "text-slate-500" : "text-slate-400")}>{card.priceNote}</p>
                )}
                {card.savingsBadge && (
                  <span className="inline-block mt-2 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full px-3 py-1">
                    {card.savingsBadge}
                  </span>
                )}
              </div>

              {/* Why choose */}
              <div className="mb-6">
                <p className={cn("text-xs font-bold tracking-wider uppercase mb-3", card.darkBg ? "text-slate-400" : "text-slate-500")}>
                  Kenapa Pilih:
                </p>
                <ul className="space-y-2">
                  {card.whyChoose.map((why, j) => (
                    <li key={j} className={cn("text-sm flex items-start gap-2", card.darkBg ? "text-slate-300" : "text-slate-700")}>
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {why}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Milestones */}
              {card.milestones && (
                <div className="mb-6 bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-700 tracking-wider uppercase mb-3">
                    Perubahan Nyata dalam 90 Hari
                  </p>
                  <div className="space-y-3">
                    {card.milestones.map((m, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-bold flex-shrink-0">
                          {m.period}
                        </span>
                        <p className="text-xs text-emerald-800">{m.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target users (Pro+) */}
              {card.targetUsers && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
                    Cocok Untuk:
                  </p>
                  <ul className="space-y-1.5">
                    {card.targetUsers.map((u, j) => (
                      <li key={j} className="text-sm text-slate-300 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Features */}
              <div className="mb-8 border-t border-slate-100 pt-6">
                <p className={cn("text-xs font-bold tracking-wider uppercase mb-3", card.darkBg ? "text-slate-400" : "text-slate-500")}>
                  Yang Kamu Dapat:
                </p>
                <ul className="space-y-2">
                  {card.features.map((feat, j) => (
                    <li key={j} className={cn("text-sm flex items-start gap-2", !feat.included ? "opacity-40" : "", card.darkBg ? "text-slate-300" : "text-slate-700")}>
                      {feat.included ? (
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      )}
                      {feat.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <button
                onClick={() => void startCheckout(card.id)}
                className={cn(
                  "w-full rounded-xl py-4 font-bold text-base transition-all duration-200",
                  card.highlighted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
                    : card.darkBg
                    ? "border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-900/30"
                    : "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                )}
              >
                {card.ctaText}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-3">
            Pilih yang Paling Pas Untukmu
          </h3>
          <p className="text-slate-500 text-center mb-8">
            Bandingkan detail fitur untuk pilih paket yang sesuai bisnismu.
          </p>
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="py-3 px-6 text-left text-sm font-semibold text-slate-700">Detail Fitur</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-slate-700">Basic</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-emerald-700 bg-emerald-50 border-x border-emerald-100">Estimator Pro ⭐</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedRows).map(([group, rows]) => (
                  <>
                    <tr key={`group-${group}`} className="bg-slate-50">
                      <td colSpan={4} className="py-2 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {group}
                      </td>
                    </tr>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-6 text-sm text-slate-700">{row.feature}</td>
                        <td className="py-3 px-4 text-center"><CellVal value={row.estimator} /></td>
                        <td className="py-3 px-4 text-center bg-emerald-50/50 border-x border-emerald-100">
                          <CellVal value={row.lifetime} />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-16">
          <h3 className="text-xl font-bold text-slate-900 text-center mb-8">
            Gak Yakin Pilih yang Mana?
          </h3>
          <div className="flex flex-col md:flex-row justify-center gap-6 max-w-5xl mx-auto">
            {pricing.recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-1 max-w-sm bg-white rounded-[32px] p-8 border border-slate-100 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all group text-center"
              >
                <p className="text-sm text-slate-400 italic mb-4 font-medium px-4 leading-relaxed group-hover:text-slate-600 transition-colors">
                  &ldquo;{rec.situation}&rdquo;
                </p>
                <div className="w-10 h-1 bg-emerald-100 mx-auto mb-6 rounded-full group-hover:w-16 transition-all" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Rekomendasi Utama:</p>
                <p className="text-2xl font-black text-emerald-600 mb-3">{rec.plan}</p>
                <p className="text-sm text-slate-500 font-bold leading-relaxed">{rec.reason}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mini FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 text-center mb-6">Masih Ragu?</h3>
          <div className="space-y-4">
            {pricing.miniQuestions.map((q, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">{q.question}</p>
                <p className="text-sm text-slate-600">{q.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
