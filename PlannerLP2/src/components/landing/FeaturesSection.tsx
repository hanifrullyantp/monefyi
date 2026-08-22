"use client";
import { motion } from "framer-motion";
import {
  Calculator,
  MessageSquare,
  FileText,
  RefreshCw,
  GanttChart,
  CheckSquare,
  TrendingDown,
  UserCheck,
  Receipt,
  Users,
  BarChart3,
  Smartphone,
} from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  MessageSquare,
  FileText,
  RefreshCw,
  GanttChart,
  CheckSquare,
  TrendingDown,
  UserCheck,
  Receipt,
  Users,
  BarChart3,
  Smartphone,
};

export function FeaturesSection() {
  const { content } = useContentStore();
  const { features } = content;

  return (
    <section id="fitur" className="py-12 md:py-28 bg-white">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-4">
            {features.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {features.title}
          </h2>
          <p className="text-lg text-slate-600">{features.subtitle}</p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.features.map((feature, i) => {
            const Icon = iconMap[feature.icon] || Calculator;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 }}
                className={cn(
                  "bg-white rounded-2xl p-6 border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 group",
                  feature.featured && "md:col-span-1"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
                {feature.featured && (
                  <div className="mt-4">
                    <span className="inline-block bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-1 rounded-lg border border-emerald-100">
                      Fitur Unggulan
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
