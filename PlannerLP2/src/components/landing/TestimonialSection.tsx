"use client";
import { motion } from "framer-motion";
import { Star, Quote, ArrowRight, CheckCircle2 } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}



export function TestimonialSection() {
  const { content } = useContentStore();
  const { testimonial } = content;
  const { featured, others, stats } = testimonial;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section id="testimoni" className="py-24 md:py-32 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-50 to-transparent" />
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-20"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase mb-6">
            {testimonial.badge}
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            {testimonial.title}
          </h2>
          <p className="mt-6 text-xl text-slate-500 font-bold max-w-3xl mx-auto leading-relaxed italic">
            &ldquo;{testimonial.subtitle}&rdquo;
          </p>
        </motion.div>

        {/* Featured Story */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-[48px] p-8 md:p-16 border-2 border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] mb-24 relative"
        >
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
          
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 relative z-10">
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
                  <h3 className="text-3xl font-black text-slate-900 leading-tight mb-1">{featured.name}</h3>
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
                  <h4 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
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

                  {/* Hidup Baru */}
                  <div className="mb-12">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 block">HIDUP BARU</span>
                    <p className="text-xl text-slate-600 font-black leading-relaxed">{featured.newLife}</p>
                  </div>

                  {/* Big Quote */}
                  <div className="bg-slate-900 text-white rounded-[40px] p-10 md:p-14 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 blur-[80px] -mr-24 -mt-24" />
                    <Quote className="w-12 h-12 text-emerald-500 mb-8 opacity-50" />
                    <p className="text-2xl md:text-4xl font-black leading-tight mb-8">
                      &ldquo;{featured.bigQuote}&rdquo;
                    </p>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-1 bg-emerald-500 rounded-full" />
                       <p className="text-emerald-400 font-black tracking-widest uppercase text-xs">— {featured.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => scrollTo("harga")}
                    className="mt-12 group flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] px-10 py-5 font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    {featured.ctaText}
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Other Stories */}
        <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">
          Cerita Transformasi Lainnya
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {others.map((story, i) => (
            <motion.div
              key={story.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {getInitials(story.name)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{story.name}</p>
                  <p className="text-xs text-slate-500">{story.type}</p>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-3 text-sm leading-tight">
                {story.storyTitle}
              </h4>
              <p className="text-sm text-slate-600 italic mb-4">&ldquo;{story.quote}&rdquo;</p>
              <div className="space-y-2">
                <div className="bg-red-50 border-l-2 border-red-300 pl-3 py-1.5 rounded-r-lg">
                  <p className="text-xs text-red-700">{story.pain}</p>
                </div>
                <div className="bg-emerald-50 border-l-2 border-emerald-400 pl-3 py-1.5 rounded-r-lg">
                  <p className="text-xs text-emerald-700">{story.result}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing Quote */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xl italic text-slate-600">&ldquo;{testimonial.closingQuote}&rdquo;</p>
          <p className="text-slate-400 mt-2 text-sm">{testimonial.closingAttribution}</p>
        </div>

        {/* Share Story CTA */}
        <div className="bg-emerald-50 rounded-2xl p-8 text-center mt-8">
          <h4 className="text-xl font-bold text-slate-900 mb-2">Punya Cerita untuk Dibagikan?</h4>
          <p className="text-slate-600 mb-4">Setiap cerita transformasi menginspirasi orang lain.</p>
          <button className="inline-flex items-center gap-2 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl px-6 py-3 font-semibold text-sm transition-all">
            Kirim Cerita Anda
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Container>
    </section>
  );
}
