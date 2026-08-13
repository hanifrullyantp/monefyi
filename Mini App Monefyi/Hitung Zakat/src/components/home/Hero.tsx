'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { GradientText } from '@/components/ui/GradientText';
import { Moon, Star, Check, ArrowDown } from 'lucide-react';

const trustItems = [
  'Fatwa MUI compliant',
  'Referensi Quran & Hadits',
  'Update harga emas real-time',
];

export function Hero() {
  const scrollToCalculators = () => {
    document.getElementById('calculators')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-green-950 via-green-950/95 to-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse delay-300" />
        <div className="absolute top-60 left-1/4 w-1 h-1 bg-green-300 rounded-full animate-pulse delay-500" />
        <div className="absolute bottom-40 right-1/3 w-2 h-2 bg-green-500 rounded-full animate-pulse delay-700" />
      </div>

      <Container className="relative py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-8"
          >
            <Moon className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300 font-medium">
              Kalkulator Zakat
            </span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
          >
            Hitung Zakatmu dengan{' '}
            <GradientText>Mudah & Akurat</GradientText>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-green-100/70 mb-8"
          >
            7 jenis zakat dalam 1 aplikasi. GRATIS. Tanpa registrasi.
            <br className="hidden md:block" />
            Sesuai syariat dan fatwa MUI.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={scrollToCalculators}
              rightIcon={<ArrowDown className="w-5 h-5" />}
            >
              Mulai Hitung Zakat
            </Button>
          </motion.div>

          {/* Trust Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 md:gap-6 mt-10"
          >
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-green-100/60"
              >
                <Check className="w-4 h-4 text-green-400" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
