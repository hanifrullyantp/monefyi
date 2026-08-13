"use client";

import { motion } from "framer-motion";
import { BookOpen, Users, Scale, ChevronRight } from "lucide-react";

export function PengantarFaraid() {
  return (
    <section id="pengantar-faraid" className="py-20 bg-slate-950">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Mengenal Ilmu Faraid
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Ilmu yang membahas pembagian harta warisan sesuai syari'ah Islam
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 — Apa itu Faraid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border border-slate-700 bg-slate-800/50"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
            >
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Apa itu Ilmu Faraid?
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Ilmu Faraid adalah cabang ilmu fiqih Islam yang membahas pembagian
              harta peninggalan (warisan) kepada ahli waris yang berhak sesuai
              ketentuan Al-Qur'an dan Sunnah Nabi ﷺ.
            </p>

            {/* Hadits */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
                borderLeft: "3px solid #3b82f6",
              }}
            >
              <p className="text-base font-amiri text-right text-blue-100 leading-loose mb-2" lang="ar" dir="rtl">
                تَعَلَّمُوا الْفَرَائِضَ وَعَلِّمُوهَا النَّاسَ
              </p>
              <p className="text-xs italic text-slate-300 mb-1">
                &ldquo;Pelajarilah ilmu faraid dan ajarkanlah kepada manusia...&rdquo;
              </p>
              <p className="text-xs text-blue-400 font-semibold">
                HR. Ibnu Majah
              </p>
            </div>
          </motion.div>

          {/* Card 2 — Urutan Kewajiban */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 border border-slate-700 bg-slate-800/50"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
            >
              <Scale className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Urutan Sebelum Bagi Waris
            </h3>
            <div className="space-y-3">
              {[
                {
                  no: 1,
                  label: "Biaya Perawatan Jenazah",
                  sub: "Tajhiz, kafan, pemakaman",
                  color: "text-amber-400",
                  border: "border-amber-700",
                  bg: "bg-amber-900/20",
                },
                {
                  no: 2,
                  label: "Pelunasan Hutang",
                  sub: "Semua hutang almarhum",
                  color: "text-red-400",
                  border: "border-red-700",
                  bg: "bg-red-900/20",
                },
                {
                  no: 3,
                  label: "Pelaksanaan Wasiat",
                  sub: "Maks 1/3 dari harta bersih",
                  color: "text-purple-400",
                  border: "border-purple-700",
                  bg: "bg-purple-900/20",
                },
                {
                  no: 4,
                  label: "Bagi Warisan",
                  sub: "Kepada semua ahli waris",
                  color: "text-green-400",
                  border: "border-green-700",
                  bg: "bg-green-900/20",
                },
              ].map((step) => (
                <div
                  key={step.no}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${step.border} ${step.bg}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${step.color} border ${step.border}`}
                  >
                    {step.no}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${step.color}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-400">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 3 — Golongan Ahli Waris */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-6 border border-slate-700 bg-slate-800/50"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}
            >
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              3 Golongan Ahli Waris
            </h3>
            <div className="space-y-4">
              {[
                {
                  nama: "Ashabul Furudh",
                  arab: "أَصْحَابُ الْفُرُوضِ",
                  desc: "Ahli waris yang bagiannya sudah ditentukan langsung dalam Al-Qur'an (1/2, 1/4, 1/8, 2/3, 1/3, 1/6).",
                  color: "text-green-400",
                  border: "border-green-700",
                },
                {
                  nama: "Ashabah",
                  arab: "الْعَصَبَةُ",
                  desc: "Ahli waris yang mendapat sisa harta setelah ashabul furudh. Diprioritaskan berdasarkan kedekatan.",
                  color: "text-blue-400",
                  border: "border-blue-700",
                },
                {
                  nama: "Dzawil Arham",
                  arab: "ذَوُو الْأَرْحَامِ",
                  desc: "Kerabat jauh yang mendapat warisan hanya jika tidak ada golongan 1 dan 2.",
                  color: "text-purple-400",
                  border: "border-purple-700",
                },
              ].map((gol) => (
                <div
                  key={gol.nama}
                  className={`p-3 rounded-xl border border-slate-700 bg-slate-900/50`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronRight className={`w-4 h-4 ${gol.color}`} />
                    <span className={`text-sm font-semibold ${gol.color}`}>
                      {gol.nama}
                    </span>
                  </div>
                  <p className={`text-sm font-amiri text-right mb-1 ${gol.color} opacity-80`} lang="ar" dir="rtl">
                    {gol.arab}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {gol.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
