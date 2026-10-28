"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, CreditCard, MessageCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";

const badges = [
  { Icon: ShieldCheck, text: "Garansi 7 hari uang kembali" },
  { Icon: CreditCard, text: "Bayar via QRIS / BCA / Mandiri / GoPay" },
  { Icon: Lock, text: "Data akun terenkripsi" },
  { Icon: MessageCircle, text: "Support WhatsApp responsif" },
];

export function TrustBadges() {
  return (
    <section id="trust" className="py-8 md:py-10 bg-white border-y border-[var(--surface-alt)]">
      <Container className="content-max">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3"
        >
          {badges.map(({ Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 bg-[var(--surface-soft)] border border-[var(--surface-alt)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] min-h-[44px]"
            >
              <Icon className="w-4 h-4 text-[var(--brand-600)] shrink-0" />
              {text}
            </div>
          ))}
        </motion.div>
        <p className="text-center text-xs text-[var(--muted)] mt-4">
          Dibuat untuk kontraktor, interior designer, kitchen set, kanopi & furniture custom.
        </p>
      </Container>
    </section>
  );
}
