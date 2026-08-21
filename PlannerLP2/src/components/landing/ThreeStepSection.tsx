"use client";
import { motion } from "framer-motion";
import {
  MessageCircle,
  MapPin,
  Hammer,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  MapPin,
  Hammer,
};

const badgeColors: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

import { EditableText } from "@/components/shared/EditableText";

export function ThreeStepSection() {
  const { content } = useContentStore();
  const { threeStep } = content;

  return (
    <section id="tiga-step" className="py-20 md:py-28 bg-white">
      <Container>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-4">
            <EditableText section="threeStep" field="badge" value={threeStep.badge} />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            <EditableText section="threeStep" field="title" value={threeStep.title} />
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            <EditableText section="threeStep" field="subtitle" value={threeStep.subtitle} />
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {threeStep.steps.map((step, index) => {
            const Icon = iconMap[step.icon] || MessageCircle;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-0">
                  {/* Left - Number */}
                  <div className="flex flex-col items-center md:items-start justify-start p-8 md:p-10 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100">
                    <span className="text-8xl md:text-9xl font-extrabold text-emerald-100 leading-none tracking-tighter select-none">
                      {step.number}
                    </span>
                    <span
                      className={cn(
                        "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase",
                        badgeColors[step.badgeColor] || "bg-slate-100 text-slate-700"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {step.badge}
                    </span>
                  </div>

                  {/* Right - Content */}
                  <div className="p-8 md:p-10">
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                      {step.title}
                    </h3>

                    {/* Problem */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-red-600 tracking-wider uppercase">
                          Masalah yang sering terjadi
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed pl-6">
                        {step.problem}
                      </p>
                    </div>

                    {/* Solution */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 tracking-wider uppercase">
                          Yang seharusnya dilakukan
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed pl-6">
                        {step.solution}
                      </p>
                    </div>

                    {/* Example Box (Step 1) */}
                    {step.exampleBox && (
                      <div className="bg-slate-50 border-l-4 border-emerald-500 rounded-r-xl p-4 my-6">
                        <pre className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {step.exampleBox}
                        </pre>
                      </div>
                    )}

                    {/* Important Points (Step 2) */}
                    {step.importantPoints && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-slate-700 mb-3">
                          Saat survei, klien:
                        </p>
                        <ul className="space-y-2 pl-2">
                          {step.importantPoints.map((pt, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Results */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                          Hasilnya
                        </span>
                      </div>
                      <ul className="space-y-2 pl-2">
                        {step.results.map((result, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {result}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-emerald-900">
                        <span className="font-bold">Intinya: </span>
                        {step.summary}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
