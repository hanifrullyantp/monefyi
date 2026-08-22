"use client";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, CreditCard, Star } from "lucide-react";
import { Container } from "@/components/shared/Container";

const badges = [
  {
    Icon: ShieldCheck,
    text: "Garansi 7 hari 100% uang kembali",
  },
  {
    Icon: Lock,
    text: "Data terenkripsi (end-to-end)",
  },
  {
    Icon: CreditCard,
    text: "Pembayaran aman (BCA/Mandiri/QRIS/GoPay)",
  },
];

export function TrustBadges() {
  return (
    <section className="py-8 md:py-12 bg-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
        >
          {badges.map(({ Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 shadow-sm"
            >
              <Icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {text}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
