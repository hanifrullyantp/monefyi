'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { FAQ_ZAKAT } from '@/data/faq';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16">
      <Container>
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pertanyaan Umum
          </h2>
          <p className="text-green-100/70 text-lg">
            Jawaban untuk pertanyaan seputar zakat
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ZAKAT.map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-500/20 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className="font-medium text-white pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-green-400 flex-shrink-0 transition-transform duration-300',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-5 text-green-100/70">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
