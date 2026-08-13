"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import type { JenisAkad } from "@/types/bagi-hasil";
import { getAkadById } from "@/lib/akad-data";
import { cn } from "@/lib/cn";

interface PanduanAkadProps {
  activeAkad: JenisAkad;
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

function AccordionItem({ title, children, isOpen, onToggle, index }: AccordionItemProps) {
  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 py-4 text-left transition-colors hover:text-green-400"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-400">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-slate-200">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-9">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PanduanAkad({ activeAkad }: PanduanAkadProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const akad = getAkadById(activeAkad);

  const toggle = useCallback((i: number) => {
    setOpenIndex((prev) => (prev === i ? null : i));
  }, []);

  if (!akad) return null;

  const sections = [
    {
      title: "Definisi & Konsep",
      content: (
        <p className="text-sm text-slate-400 leading-relaxed">{akad.definisi}</p>
      ),
    },
    {
      title: "Rukun Akad",
      content: (
        <ul className="space-y-1.5">
          {akad.rukun.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
              {r}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Syarat Sah",
      content: (
        <ul className="space-y-1.5">
          {akad.syarat.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              {s}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Ketentuan Keuntungan",
      content: (
        <p className="text-sm text-slate-400 leading-relaxed">
          {akad.keuntunganDibagi}
        </p>
      ),
    },
    {
      title: "Ketentuan Kerugian",
      content: (
        <p className="text-sm text-slate-400 leading-relaxed">
          {akad.kerugianDitanggung}
        </p>
      ),
    },
    {
      title: "Contoh Kasus Nyata",
      content: (
        <p className="text-sm text-slate-400 leading-relaxed italic">
          &ldquo;{akad.contohKasus}&rdquo;
        </p>
      ),
    },
    {
      title: "Yang Perlu Diperhatikan",
      content: (
        <ul className="space-y-1.5">
          {[
            "Pastikan semua syarat terpenuhi sebelum memulai akad",
            "Nisbah keuntungan harus disepakati secara jelas di awal",
            "Dokumentasikan akad secara tertulis dan disaksikan",
            "Konsultasikan dengan ulama atau ahli fiqh muamalah",
            "Usaha yang dijalankan harus bersifat halal",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="mt-0.5 text-amber-400">💡</span>
              {tip}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-green-400" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Panduan Akad {akad.nama}
          </h2>
          <p
            lang="ar"
            className="font-amiri text-base text-green-600"
          >
            {akad.namaArab}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 px-6 divide-y divide-slate-700/0">
        {sections.map((section, i) => (
          <AccordionItem
            key={section.title}
            title={section.title}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
            index={i}
          >
            {section.content}
          </AccordionItem>
        ))}
      </div>
    </div>
  );
}
