'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ZAKAT_TYPES } from '@/data/zakat-types';
import {
  Briefcase,
  Coins,
  Gem,
  Building2,
  Wheat,
  Moon,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Coins,
  Gem,
  Building2,
  Wheat,
  Moon,
  TrendingUp,
};

export function ZakatMenu() {
  return (
    <section id="calculators" className="py-16">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pilih Jenis Zakat
          </h2>
          <p className="text-green-100/70 text-lg">
            7 kalkulator zakat lengkap untuk berbagai kebutuhan
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ZAKAT_TYPES.map((zakat, index) => {
            const Icon = iconMap[zakat.icon] || Coins;

            return (
              <motion.div
                key={zakat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Link href={zakat.href} className="block h-full">
                  <div className="group relative h-full bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-3xl p-6 hover:border-green-500/40 transition-all cursor-pointer">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 rounded-3xl transition-colors" />

                    <div className="relative">
                      {/* Icon */}
                      <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center group-hover:from-green-500/30 group-hover:to-green-600/20 transition-colors">
                        <Icon className="w-7 h-7 text-green-400" />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-2">
                        {zakat.name}
                      </h3>

                      {/* Description */}
                      <p className="text-green-100/60 text-sm mb-4 line-clamp-2">
                        {zakat.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-green-500/10">
                        <span className="text-xs text-green-300">
                          {zakat.rate}
                        </span>
                        <div className="flex items-center gap-1 text-green-400 group-hover:gap-2 transition-all">
                          <span className="text-sm font-medium">Hitung</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
