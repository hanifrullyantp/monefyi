import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Quote, 
  Clock, 
  MapPin, 
  Search, 
  Brain, 
  TrendingDown, 
  PiggyBank, 
  Smile, 
  ArrowRight, 
  Frown, 
  Shield, 
  Calculator, 
  Eye, 
  Target, 
  Users, 
  MessageCircle, 
  Heart,
  X,
  Trophy,
  Calendar,
  Sparkles
} from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { storiesData, StoryTestimonial } from '../../data/testimonials-data';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { AnimatedCounter } from '../ui/AnimatedCounter';

const iconMap: Record<string, any> = {
  Search, Brain, TrendingDown, PiggyBank, Smile, Frown, Shield, Calculator, Eye, Target, Users, MessageCircle, Heart, Trophy, Calendar
};

export function Testimonials() {
  const [selectedStory, setSelectedPlan] = useState<StoryTestimonial | null>(null);
  const featuredStory = storiesData.find(s => s.featured);
  const otherStories = storiesData.filter(s => !s.featured);

  return (
    <SectionWrapper id="testimonials" background="dark" className="overflow-hidden">
      {/* 1. Section Header */}
      <div className="max-w-4xl mx-auto text-center mb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-8"
        >
          <Sparkles size={14} className="text-green-400" />
          <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Cerita Nyata</span>
        </motion.div>
        
        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter">
          Bukan Sekadar Angka Berubah. <br />
          <span className="gradient-text-green">Hidup Mereka yang Berubah.</span>
        </h2>
        
        <p className="text-lg text-slate-400 mt-6 max-w-2xl mx-auto leading-relaxed">
          3.847+ orang sudah rasakan ketenangan finansial yang selama ini mereka cari.
        </p>
      </div>

      {/* 2. Featured Story */}
      {featuredStory && (
        <FeaturedStoryCard story={featuredStory} onOpen={() => setSelectedPlan(featuredStory)} />
      )}

      {/* 3. Story Grid */}
      <div className="max-w-7xl mx-auto mt-32">
        <h3 className="text-xl md:text-2xl font-bold text-slate-400 text-center mb-16 uppercase tracking-[0.2em]">Cerita Transformasi Lainnya</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {otherStories.map((story, i) => (
            <StoryCard key={story.id} story={story} index={i} onOpen={() => setSelectedPlan(story)} />
          ))}
        </div>
      </div>

      {/* 4. Diversity Statement */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto mt-32 bg-gradient-to-br from-green-950/30 to-slate-900/50 border border-green-500/20 rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden"
      >
        <Quote className="absolute top-10 left-10 text-green-500/10 w-32 h-32 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-xl md:text-3xl italic font-medium text-white leading-relaxed">
            "Setiap cerita berbeda. Karena setiap perjalanan finansial itu personal. Yang sama: semua menemukan ketenangan yang sebelumnya terasa mustahil."
          </p>
          <div className="mt-8 flex flex-col items-center">
             <div className="w-px h-10 bg-gradient-to-b from-green-500/50 to-transparent mb-4" />
             <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">— Tim Monefyi</p>
          </div>
        </div>
      </motion.div>

      {/* 5. Community Impact Numbers */}
      <div className="max-w-6xl mx-auto mt-32 pt-20 border-t border-white/5">
        <h3 className="text-center text-white font-bold text-2xl mb-16 uppercase tracking-tighter">Dampak Kolektif Kami</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          <ImpactStat end={3847} label="Pengguna Aktif" suffix="+" />
          <ImpactStat end={12.4} label="Total User Savings" prefix="Rp " suffix="M" decimals={1} />
          <ImpactStat end={8.2} label="Hutang Dilunasi" prefix="Rp " suffix="M" decimals={1} />
          <ImpactStat end={4.8} label="Rating Real Users" suffix="/5" decimals={1} />
        </div>
      </div>

      {/* 6. Story Submission CTA */}
      <div className="max-w-3xl mx-auto mt-32 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 md:p-20 relative overflow-hidden group">
           <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="relative z-10">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-8">
                <Heart size={32} />
              </div>
              <h4 className="text-3xl font-black text-white mb-4">Punya Cerita Untuk Dibagikan?</h4>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                Setiap cerita transformasi menginspirasi orang lain. Bagikan perjalanan finansial Anda dengan kami.
              </p>
              <Button size="xl" className="gap-3">
                <MessageCircle size={20} />
                Bagikan Cerita Saya
              </Button>
           </div>
        </div>
      </div>

      {/* 7. Story Modal */}
      <AnimatePresence>
        {selectedStory && (
          <StoryModal story={selectedStory} onClose={() => setSelectedPlan(null)} />
        )}
      </AnimatePresence>
    </SectionWrapper>
  );
}

function FeaturedStoryCard({ story, onOpen }: { story: StoryTestimonial; onOpen: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-7xl mx-auto glass rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Profile Sidebar */}
        <div className="lg:col-span-5 bg-slate-900/50 p-10 md:p-16 flex flex-col justify-center items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-white/5">
          <div className="relative">
             <div className="w-48 h-60 md:w-64 md:h-80 bg-slate-800 rounded-3xl overflow-hidden ring-4 ring-green-500/20 shadow-2xl mb-10">
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-6xl font-black text-white/20">
                  {story.name[0]}
                </div>
             </div>
             <div className="absolute -bottom-4 -right-4 bg-green-500 text-slate-950 p-3 rounded-2xl shadow-xl">
               <Quote size={24} fill="currentColor" />
             </div>
          </div>
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-green-500/20">
              <Clock size={12} /> {story.duration}
            </div>
            <h4 className="text-3xl font-black text-white tracking-tighter">{story.name}</h4>
            <p className="text-slate-400 font-medium">{story.role} · {story.age} thn</p>
            <div className="flex items-center justify-center lg:justify-start gap-1">
               {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-2 text-slate-500 text-xs mt-4">
               <MapPin size={14} /> {story.location}
            </div>
          </div>
        </div>

        {/* Narrative Area */}
        <div className="lg:col-span-7 p-10 md:p-16 lg:p-20 flex flex-col bg-slate-950/20 backdrop-blur-sm overflow-y-auto max-h-[900px] no-scrollbar">
          <h3 className="text-3xl md:text-5xl font-black text-white mb-10 leading-tight tracking-tighter gradient-text-green">
            {story.storyTitle}
          </h3>

          <div className="space-y-12">
            {/* Before */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Masa Lalu</span>
              <p className="text-slate-400 text-lg leading-relaxed">{story.before.paragraph}</p>
              <div className="bg-red-500/5 border-l-4 border-red-500 p-6 rounded-r-2xl">
                 <div className="flex gap-4">
                    <Frown className="text-red-500 flex-shrink-0" size={24} />
                    <p className="text-red-300 italic font-medium leading-relaxed">{story.before.keyPain}</p>
                 </div>
              </div>
            </div>

            {/* Turning Point */}
            <div className="py-10 border-y border-white/5">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] block mb-6 text-center">Titik Balik</span>
              <div className="relative px-8 md:px-12 py-6">
                <Quote className="absolute top-0 left-0 text-amber-500/20 w-12 h-12" />
                <p className="text-xl md:text-2xl text-white italic font-medium text-center leading-relaxed">
                  {story.moment.quote}
                </p>
                <p className="text-xs text-amber-500 font-bold text-center mt-6 tracking-widest">— {story.moment.context}</p>
              </div>
            </div>

            {/* Journey Timeline */}
            <div className="space-y-8">
              <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.3em]">Transformasi</span>
              <div className="space-y-0">
                {story.journey.map((m, idx) => {
                  const Icon = iconMap[m.icon] || Smile;
                  return (
                    <div key={idx} className="flex gap-6 relative pb-10 last:pb-0">
                      {idx < story.journey.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-green-500/20" />
                      )}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white z-10 flex-shrink-0 shadow-lg shadow-green-500/20">
                        <Icon size={14} strokeWidth={3} />
                      </div>
                      <div className="pt-0.5">
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 block">{m.time}</span>
                        <h5 className="text-white font-bold mb-1">{m.title}</h5>
                        <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* After */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em]">Hidup Baru</span>
              <p className="text-slate-300 text-lg leading-relaxed">{story.after.paragraph}</p>
              <div className="bg-green-500/5 border-l-4 border-green-500 p-6 rounded-r-2xl">
                 <div className="flex gap-4">
                    <Smile className="text-green-500 flex-shrink-0" size={24} />
                    <p className="text-green-300 font-bold leading-relaxed">{story.after.keyOutcome}</p>
                 </div>
              </div>
            </div>

            {/* Final Punch */}
            <div className="pt-10 border-t border-white/10 text-center">
               <p className="text-2xl md:text-3xl font-black text-white italic tracking-tight leading-snug">
                 "{story.punchLine}"
               </p>
               <button 
                 onClick={() => window.location.hash = 'pricing'}
                 className="mt-10 text-green-400 font-black uppercase text-xs tracking-[0.3em] flex items-center gap-2 mx-auto hover:text-green-300 transition-all group"
               >
                 Rasakan Transformasi Anda <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StoryCard({ story, index, onOpen }: { story: StoryTestimonial; index: number; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      onClick={onOpen}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-green-500/30 rounded-3xl p-8 transition-all cursor-pointer group shadow-xl flex flex-col h-full"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xl font-bold text-white shadow-lg border border-white/5">
          {story.name[0]}
        </div>
        <div>
          <h4 className="text-white font-bold text-lg">{story.name}</h4>
          <p className="text-slate-500 text-xs">{story.role}</p>
        </div>
      </div>

      <h5 className="text-lg font-bold text-white mb-4 leading-snug group-hover:text-green-400 transition-colors">
        {story.storyTitle}
      </h5>

      <p className="text-sm text-slate-400 italic mb-8 flex-grow leading-relaxed">
        "{story.microStory}"
      </p>

      <div className="space-y-3 mb-8">
         <div className="flex items-center gap-3 bg-red-900/10 border border-red-500/20 px-3 py-2 rounded-xl">
            <Frown size={14} className="text-red-500" />
            <span className="text-[10px] text-red-300 leading-tight">{story.transformation.before}</span>
         </div>
         <div className="flex items-center gap-3 bg-green-900/10 border border-green-500/20 px-3 py-2 rounded-xl">
            <Check size={14} className="text-green-500" />
            <span className="text-[10px] text-green-300 leading-tight font-bold">{story.transformation.after}</span>
         </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-white/5">
         <div className="flex items-center gap-1.5">
           <Star size={12} className="text-amber-400 fill-amber-400" />
           <span className="text-xs font-bold text-white">{story.rating}.0</span>
         </div>
         <button className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
           Baca Cerita <ArrowRight size={12} />
         </button>
      </div>
    </motion.div>
  );
}

function StoryModal({ story, onClose }: { story: StoryTestimonial; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-5xl max-h-full overflow-y-auto no-scrollbar rounded-[2.5rem] border border-white/10"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-colors border border-white/10"
        >
          <X size={24} />
        </button>
        
        <div className="bg-slate-900">
           {/* Re-use the layout of Featured Story but with slight modal adjustments */}
           <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-4 bg-slate-950/50 p-10 flex flex-col items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-white/5">
                <div className="w-40 h-40 bg-slate-800 rounded-3xl overflow-hidden ring-4 ring-green-500/20 shadow-2xl mb-8">
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-4xl font-black text-white/20">
                    {story.name[0]}
                  </div>
                </div>
                <div className="space-y-3">
                  <Badge variant="green">{story.duration}</Badge>
                  <h4 className="text-2xl font-black text-white">{story.name}</h4>
                  <p className="text-slate-400 text-sm font-medium">{story.role} · {story.age} thn</p>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-slate-500 text-xs mt-2 flex items-center gap-1"><MapPin size={12} /> {story.location}</p>
                </div>
              </div>

              <div className="lg:col-span-8 p-10 lg:p-16 flex flex-col bg-slate-900">
                <h3 className="text-3xl font-black text-white mb-10 leading-tight tracking-tighter gradient-text-green">{story.storyTitle}</h3>
                <div className="space-y-12">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Masa Lalu</span>
                    <p className="text-slate-400 text-base leading-relaxed">{story.before.paragraph}</p>
                  </div>
                  <div className="py-8 border-y border-white/5 italic text-lg text-white font-medium text-center">"{story.moment.quote}"</div>
                  <div className="space-y-8">
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.3em]">Perjalanan Perubahan</span>
                    <div className="space-y-8">
                      {story.journey.map((m, idx) => {
                        const Icon = iconMap[m.icon] || Smile;
                        return (
                          <div key={idx} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0">
                              <Icon size={16} />
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-green-500 uppercase block mb-1">{m.time}</span>
                              <h5 className="text-white text-sm font-bold">{m.title}</h5>
                              <p className="text-xs text-slate-400">{m.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em]">Hidup Sekarang</span>
                    <p className="text-slate-300 text-base leading-relaxed">{story.after.paragraph}</p>
                  </div>
                  <div className="pt-10 border-t border-white/10 text-center">
                    <p className="text-2xl font-black text-white italic">"{story.punchLine}"</p>
                    <div className="mt-10 flex gap-4 justify-center">
                       <Button onClick={() => { onClose(); window.location.hash = 'pricing'; }}>Coba Monefyi Sekarang</Button>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}

function ImpactStat({ end, label, prefix = '', suffix = '', decimals = 0 }: any) {
  return (
    <div className="text-center group">
       <div className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2">
          <GradientText variant="green">
             <AnimatedCounter end={end} prefix={prefix} suffix={suffix} decimals={decimals} />
          </GradientText>
       </div>
       <p className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{label}</p>
    </div>
  );
}

function Badge({ children, variant = 'green' }: any) {
  const styles = {
    green: "bg-green-500/10 text-green-400 border-green-500/30",
    slate: "bg-slate-800 text-slate-400 border-slate-700"
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase border", styles[variant as keyof typeof styles])}>
      {children}
    </span>
  );
}
