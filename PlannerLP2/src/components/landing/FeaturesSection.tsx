"use client";

import { motion } from "framer-motion";
import { Calculator, MessageSquare, FileText, Receipt } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { EditableFeatureField } from "@/components/shared/EditableFeatureField";
import { pickCoreFeatures, CORE_FEATURE_TITLES } from "@/lib/content/featureGrid";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  MessageSquare,
  FileText,
  Receipt,
};

export function FeaturesSection() {
  const { content } = useContentStore();
  const { features } = content;
  const visible = pickCoreFeatures(features.features);

  return (
    <section id="fitur" className="section-pad bg-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-8 md:mb-10"
        >
          <span className="inline-block bg-[var(--surface-soft)] text-[var(--brand-600)] rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase mb-3">
            <EditableText section="features" field="badge" value={features.badge} />
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--ink)] tracking-tight mb-3">
            <EditableText section="features" field="title" value={features.title} />
          </h2>
          <p className="text-[var(--muted)]">
            <EditableText section="features" field="subtitle" value={features.subtitle} multiline />
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
          {visible.map((feature, i) => {
            const Icon = iconMap[feature.icon] || Calculator;
            const featureIndex = features.features.findIndex(
              (f) => f.title === feature.title || f.title === CORE_FEATURE_TITLES[i],
            );
            const idx = featureIndex >= 0 ? featureIndex : i;

            return (
              <motion.div
                key={CORE_FEATURE_TITLES[i] ?? feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-[var(--surface-soft)] rounded-2xl p-4 md:p-5 border border-[var(--surface-alt)] hover:border-[var(--brand-400)]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-[var(--brand-600)] flex items-center justify-center mb-3 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-[var(--ink)] mb-1.5 leading-snug">
                  <EditableFeatureField featureIndex={idx} field="title" value={feature.title} />
                </h3>
                <p className="text-xs md:text-sm text-[var(--muted)] leading-snug line-clamp-4">
                  <EditableFeatureField
                    featureIndex={idx}
                    field="description"
                    value={feature.description}
                    multiline
                  />
                </p>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
