import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps): React.ReactElement {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn('space-y-3', className)}>
      {items.map(item => (
        <div key={item.id} className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/50 backdrop-blur-sm">
          <button
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left text-white hover:bg-slate-800/50 transition-colors"
          >
            <span className="font-medium text-sm md:text-base">{item.question}</span>
            <motion.div animate={{ rotate: openId === item.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {openId === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50">
                  <div className="pt-3">{item.answer}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
