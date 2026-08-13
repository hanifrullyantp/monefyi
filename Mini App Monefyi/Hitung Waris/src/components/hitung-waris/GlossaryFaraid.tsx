"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface GlossaryItem {
  istilah: string;
  arab?: string;
  definisi: string;
  contoh?: string;
}

const GLOSSARY: GlossaryItem[] = [
  {
    istilah: "Faraid",
    arab: "الْفَرَائِضُ",
    definisi:
      "Ilmu yang membahas pembagian harta warisan menurut hukum Islam. Disebut juga 'ilmu mawaris' atau 'fiqih mawaris'. Termasuk salah satu ilmu yang sangat penting dalam Islam.",
    contoh: "Mempelajari siapa saja yang berhak mendapat warisan dan berapa bagiannya.",
  },
  {
    istilah: "Ashabul Furudh",
    arab: "أَصْحَابُ الْفُرُوضِ",
    definisi:
      "Golongan ahli waris yang bagiannya sudah ditentukan secara pasti dalam nash Al-Qur'an atau Sunnah. Bagian mereka: 1/2, 1/4, 1/8, 2/3, 1/3, atau 1/6.",
    contoh: "Istri mendapat 1/4 jika tidak ada anak — ini adalah bagian furudhnya.",
  },
  {
    istilah: "Ashabah",
    arab: "الْعَصَبَةُ",
    definisi:
      "Golongan ahli waris yang tidak memiliki bagian tetap. Mereka mendapat sisa harta setelah ashabul furudh mendapat bagiannya. Jika tidak ada ashabul furudh, mereka mendapat semua harta.",
    contoh: "Anak laki-laki adalah ashabah — dia mendapat sisa setelah ibu mendapat 1/6.",
  },
  {
    istilah: "Dzawil Arham",
    arab: "ذَوُو الْأَرْحَامِ",
    definisi:
      "Kerabat yang tidak termasuk ashabul furudh maupun ashabah. Mereka hanya mendapat warisan jika tidak ada ahli waris dari kedua golongan di atas.",
    contoh: "Cucu dari anak perempuan, paman dari pihak ibu, dll.",
  },
  {
    istilah: "Hajb Hirman",
    arab: "حَجْبُ الْحِرْمَانِ",
    definisi:
      "Terhalang sepenuhnya dari mendapat warisan karena ada ahli waris lain yang lebih dekat. Ahli waris yang terhijab hirman tidak mendapat apa-apa.",
    contoh: "Kakek terhijab hirman oleh ayah. Selama ayah masih hidup, kakek tidak mendapat warisan.",
  },
  {
    istilah: "Hajb Nuqshan",
    arab: "حَجْبُ النُّقْصَانِ",
    definisi:
      "Bagian ahli waris berkurang karena adanya ahli waris lain, tetapi tidak sampai terhalang sepenuhnya.",
    contoh: "Suami mendapat 1/2 jika tidak ada anak, berkurang menjadi 1/4 jika ada anak (hajb nuqshan oleh anak).",
  },
  {
    istilah: "'Aul",
    arab: "الْعَوْلُ",
    definisi:
      "Kondisi ketika total bagian ashabul furudh melebihi jumlah harta (lebih dari 100%). Solusinya: semua bagian dikurangi secara proporsional sehingga totalnya kembali 100%.",
    contoh: "Jika total bagian = 13/12 (melebihi 1), maka penyebut diubah menjadi 13 dan semua bagian berkurang proporsional.",
  },
  {
    istilah: "Radd",
    arab: "الرَّدُّ",
    definisi:
      "Kondisi ketika setelah semua ashabul furudh mendapat bagiannya, masih ada sisa harta dan tidak ada ashabah. Sisa tersebut dikembalikan ke ashabul furudh secara proporsional (kecuali suami/istri).",
    contoh: "Jika total bagian = 9/12 = 75%, sisa 25% dikembalikan ke ahli waris furudh.",
  },
  {
    istilah: "Kalalah",
    arab: "الْكَلَالَةُ",
    definisi:
      "Kondisi seseorang meninggal dunia tanpa meninggalkan anak (keturunan langsung) dan tanpa orang tua (ayah). Dalam kondisi kalalah, saudara-saudara mendapat warisan.",
    contoh: "QS. An-Nisa: 176 menjelaskan bagian saudara perempuan dalam kondisi kalalah.",
  },
  {
    istilah: "Gharawain / Umariyatain",
    arab: "الْغَرَّاوَيْنِ",
    definisi:
      "Masalah khusus dalam faraid ketika ahli waris hanya terdiri dari: suami/istri + ayah + ibu. Dalam kondisi ini, ibu mendapat 1/3 dari sisa setelah bagian suami/istri.",
    contoh: "Suami (1/2) + Ayah (sisa) + Ibu (1/3 dari sisa). Dinamakan Umariyatain karena Khalifah Umar memutuskan dua kasus serupa.",
  },
  {
    istilah: "Wasiat",
    arab: "الْوَصِيَّةُ",
    definisi:
      "Pesan atau pemberian harta yang dilakukan seseorang sebelum wafat kepada orang lain (bukan ahli waris). Dibatasi maksimal 1/3 dari harta bersih berdasarkan ijma' ulama.",
    contoh: "Mewasiatkan 1/5 harta untuk pesantren — ini sah karena di bawah 1/3.",
  },
  {
    istilah: "Tajhiz",
    arab: "التَّجْهِيزُ",
    definisi:
      "Biaya perawatan jenazah yang meliputi: memandikan, mengkafani, menshalatkan, dan memakamkan. Ini adalah kewajiban pertama yang harus dipenuhi dari harta almarhum sebelum dibagi.",
    contoh: "Biaya pembelian kain kafan, penggalian kubur, dll.",
  },
  {
    istilah: "Muwarits",
    arab: "الْمُوَرِّثُ",
    definisi:
      "Orang yang meninggal dunia dan meninggalkan harta warisan. Disebut juga 'pewaris' atau 'si mayit'.",
  },
  {
    istilah: "Waris",
    arab: "الْوَارِثُ",
    definisi:
      "Orang yang berhak mendapat harta warisan dari muwarits. Syaratnya: beragama Islam, tidak membunuh muwarits, dan tidak murtad.",
  },
];

function GlossaryItemCard({ item, index }: { item: GlossaryItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl border border-slate-700 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm font-semibold text-white">
              {item.istilah}
            </span>
            {item.arab && (
              <span
                lang="ar"
                className="ml-3 text-sm font-amiri text-blue-300 opacity-75"
                dir="rtl"
              >
                {item.arab}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-700/50">
              <p className="text-sm text-slate-300 leading-relaxed mt-3">
                {item.definisi}
              </p>
              {item.contoh && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    Contoh:
                  </p>
                  <p className="text-xs text-slate-400 italic">{item.contoh}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function GlossaryFaraid() {
  return (
    <section id="glossary" className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-green-400" />
          <h2 className="text-3xl font-bold text-white">
            Kamus Istilah Faraid
          </h2>
        </div>
        <p className="text-slate-400 max-w-xl mx-auto">
          Pelajari istilah-istilah penting dalam Ilmu Faraid
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-3">
        {GLOSSARY.map((item, i) => (
          <GlossaryItemCard key={item.istilah} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
