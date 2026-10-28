"use client";
import { motion } from "framer-motion";
import { Quote, ArrowRight, CheckCircle2 } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";



export function TestimonialSection() {
  const { content } = useContentStore();
  const { testimonial } = content;
  const { featured, stats } = testimonial;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section id="testimoni" className="py-10 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-50 to-transparent" />
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mx-auto mb-8"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase mb-4">
            {testimonial.badge}
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-[1.15]">
            {testimonial.title}
          </h2>
          <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed italic">
            &ldquo;{testimonial.subtitle}&rdquo;
          </p>
        </motion.div>

        {/* Featured Story */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-8 relative"
        >
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
          
          <div className="flex flex-col gap-6 relative z-10">
             {/* Profile Sidebar */}
             <div className="space-y-8">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-slate-900 text-white rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl">
                    HR
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div>
                   <span className="inline-block text-[10px] font-black bg-emerald-50 text-emerald-600 rounded-full px-3 py-1 mb-2 tracking-widest uppercase">
                    {featured.title}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{featured.name}</h3>
                  <p className="text-slate-400 font-bold text-sm tracking-tight">{featured.info}</p>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Monefyi Global Impact</p>
                  <div className="grid grid-cols-2 gap-4">
                    {stats.slice(0, 2).map(s => (
                       <div key={s.label}>
                          <p className="text-2xl font-black text-slate-900">{s.value}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                       </div>
                    ))}
                  </div>
                </div>
             </div>

             {/* Story Content */}
             <div className="space-y-12">
                <div>
                  <h4 className="text-lg font-black text-slate-900 mb-4 leading-tight">
                    &ldquo;{featured.storyTitle}&rdquo;
                  </h4>
                  
                  {/* Masa Lalu */}
                  <div className="mb-10">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4 block">MASA LALU</span>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed italic bg-rose-50/50 p-6 rounded-[32px] border border-rose-100/50">
                      {featured.pastSection}
                    </p>
                    <p className="font-black text-slate-900 mt-6 text-xl leading-relaxed">
                      &ldquo;{featured.pastHighlight}&rdquo;
                    </p>
                  </div>

                  {/* Titik Balik */}
                  <div className="mb-12">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4 block">TITIK BALIK</span>
                    <p className="text-lg text-slate-600 font-bold leading-relaxed">{featured.turningPoint}</p>
                  </div>

                  {/* Transformasi Timeline */}
                  <div className="mb-12">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 block">THE TRANSFORMASI</span>
                    <div className="relative space-y-10 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {featured.milestones.map((m, i) => (
                        <div key={i} className="relative pl-12 group">
                          <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center z-10 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all">
                             <div className="w-2 h-2 bg-slate-300 rounded-full group-hover:bg-emerald-500 transition-all" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] bg-emerald-500 text-white rounded-full px-3 py-0.5 font-black uppercase tracking-widest">
                                {m.period}
                              </span>
                              <span className="font-black text-slate-900 text-lg">{m.title}</span>
                            </div>
                            <p className="text-slate-500 font-bold leading-relaxed">{m.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3 block">HIDUP BARU</span>
                    <p className="text-sm text-slate-600 font-semibold leading-relaxed">{featured.newLife}</p>
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl p-5 relative overflow-hidden">
                    <Quote className="w-8 h-8 text-emerald-500 mb-3 opacity-50" />
                    <p className="text-base font-black leading-snug mb-4">
                      &ldquo;{featured.bigQuote}&rdquo;
                    </p>
                    <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">— {featured.name}</p>
                  </div>

                  <button
                    onClick={() => scrollTo("harga")}
                    className="mt-6 group flex w-full items-center justify-center gap-2 btn-brand rounded-xl text-sm"
                  >
                    {featured.ctaText}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
             </div>
          </div>
        </motion.div>

        <div className="text-center mx-auto mb-8">
          <p className="text-sm italic text-slate-600">&ldquo;{testimonial.closingQuote}&rdquo;</p>
          <p className="text-slate-400 mt-1 text-xs">{testimonial.closingAttribution}</p>
        </div>

        <div className="bg-[var(--surface-soft)] border border-[var(--surface-alt)] rounded-2xl p-5 text-center">
          <h4 className="text-base font-bold text-[var(--ink)] mb-1">Punya Cerita untuk Dibagikan?</h4>
          <p className="text-[var(--muted)] mb-3 text-sm">
            Cerita transformasi lainnya akan tampil di sini setelah kami verifikasi kiriman Anda.
          </p>
          <a
            href="mailto:support@monefyi.com?subject=Cerita%20Transformasi%20Estimator&body=Nama%20%2F%20Bisnis%3A%0A%0ACerita%20sebelum%20%26%20sesudah%3A%0A"
            className="inline-flex items-center gap-2 btn-brand rounded-xl px-5 py-2.5 text-sm"
          >
            Kirim Cerita Anda
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </Container>
    </section>
  );
}
