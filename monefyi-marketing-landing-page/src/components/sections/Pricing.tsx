import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  X, 
  Rocket, 
  Zap, 
  Brain, 
  TrendingUp, 
  Gift, 
  Calendar, 
  PiggyBank, 
  Trophy, 
  ShieldCheck, 
  ChevronRight,
  ArrowRight,
  Users
} from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatRupiah } from '../../lib/formatters';
import { cn } from '../../lib/cn';
import { CheckoutFunnel } from '../ui/CheckoutFunnel';
import { PremiumIcon } from '../ui/PremiumIcon';
import { Accordion } from '../ui/Accordion';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { EditableText } from '../admin/EditableText';

export function Pricing() {
  const { settings } = useSiteSettings();
  const pricing = settings?.content?.pricing;
  const header = settings?.content?.headers?.pricing;
  
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('lifetime');

  if (!pricing || !header) return null;

  const handleOrder = (id: string) => {
    setSelectedPlanId(id);
    setCheckoutOpen(true);
  };

  return (
    <SectionWrapper id="pricing">
      <SectionHeader
        eyebrow={<EditableText id="header_eyebrow_pricing" defaultValue={header.eyebrow} />}
        title={<EditableText id="header_title_pricing" defaultValue={header.title} />}
        highlight={<EditableText id="header_highlight_pricing" defaultValue={header.highlight} />}
        subtitle={<EditableText id="header_subtitle_pricing" defaultValue={header.subtitle} multiline />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-24">
        {pricing.plans.map((plan: any, i: number) => (
          <PricingCard key={plan.id} plan={plan} index={i} onOrder={handleOrder} />
        ))}
      </div>

      <div className="mb-24">
        <div className="text-center mb-16">
           <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Pilih yang Paling Pas Untukmu</h3>
           <p className="text-slate-400 text-sm max-w-xl mx-auto">Bandingkan fitur lengkap dan temukan paket yang sesuai dengan kebutuhan finansialmu saat ini.</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl overflow-x-auto no-scrollbar">
           <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                 <tr className="border-b border-white/5 bg-slate-950/30">
                    <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Fitur Unggulan</th>
                    {pricing.plans.map((p: any) => (
                      <th key={p.id} className={cn(
                        "p-6 text-center text-sm font-bold",
                        p.highlighted ? "text-green-400 bg-green-500/5" : "text-white"
                      )}>
                        {p.name}
                      </th>
                    ))}
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {(() => {
                    const gratisPlan = pricing.plans.find((p: any) => p.id === 'gratis');
                    const lifetimePlan = pricing.plans.find((p: any) => p.id === 'lifetime');

                    const isFeatureIncluded = (plan: any, featText: string): boolean => {
                      const feature = plan.features.find((feat: any) => feat.text === featText);
                      if (feature?.included) return true;

                      if (plan.id === 'lifetime' || plan.id === 'pro') {
                        const gratisFeature = gratisPlan?.features.find((feat: any) => feat.text === featText);
                        if (gratisFeature?.included) return true;
                      }

                      if (plan.id === 'pro') {
                        const lifetimeFeature = lifetimePlan?.features.find((feat: any) => feat.text === featText);
                        if (lifetimeFeature?.included) return true;
                      }

                      return false;
                    };

                    const allFeatureTexts = Array.from(new Set(pricing.plans.flatMap((p: any) => p.features.map((f: any) => f.text))));
                    return allFeatureTexts.map((featText: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors group">
                        <td className="p-5 text-sm text-slate-300 group-hover:text-white transition-colors">{featText}</td>
                        {pricing.plans.map((p: any) => (
                          <td key={p.id} className={cn(
                            "p-5 text-center transition-colors",
                            p.highlighted && "bg-green-500/5"
                          )}>
                             {isFeatureIncluded(p, featText) ? (
                               <div className="flex justify-center"><Check size={20} className={p.highlighted ? "text-green-400" : "text-slate-500"} /></div>
                             ) : (
                               <div className="flex justify-center"><X size={16} className="text-slate-800" /></div>
                             )}
                          </td>
                        ))}
                      </tr>
                    ));
                 })()}
              </tbody>
           </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {pricing.comparison.scenarios.map((s: any, idx: number) => (
             <motion.div 
               key={idx} 
               whileHover={{ y: -5 }} 
               className={cn(
                 "bg-slate-900/30 border rounded-3xl p-8 transition-all group text-left",
                 s.recommended === 'Lifetime' ? "border-green-500/30 ring-1 ring-green-500/20 shadow-green-glow" : "border-slate-800"
               )}
             >
                <div className="flex items-center gap-3 mb-6">
                   <div className={cn(
                     "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                     s.recommended === 'Lifetime' ? "bg-green-500 text-slate-900" : "bg-slate-800 text-slate-400"
                   )}>
                      <Users size={20} />
                   </div>
                   <p className="text-slate-200 text-sm font-bold leading-tight">{s.scenario}</p>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rekomendasi:</span>
                   <Badge variant={s.badgeColor}>{s.recommended}</Badge>
                </div>
                
                <p className="text-xs text-slate-500 mb-8 leading-relaxed line-clamp-2">{s.reason}</p>
                
                <button 
                  onClick={() => handleOrder(s.recommended.toLowerCase().replace('+', ''))} 
                  className={cn(
                    "w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    s.recommended === 'Lifetime' 
                      ? "bg-green-500 text-slate-900 hover:bg-green-400 shadow-lg shadow-green-500/20" 
                      : "border border-slate-700 text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  Pilih Plan Ini <ArrowRight size={14} />
                </button>
             </motion.div>
           ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto mb-24 text-left">
         <div className="text-center mb-10"><h3 className="text-2xl font-black text-white mb-2">Masih Ragu?</h3><p className="text-slate-500 text-sm">3 Hal yang paling sering ditanyakan user baru</p></div>
         <Accordion items={pricing.quickFAQ.map((f: any, i: number) => ({ id: `qpricing_${i}`, question: f.q, answer: f.a }))} />
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mb-24">
         <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {pricing.trustSignals.map((s: any, i: number) => (
              <div key={i} className="flex flex-col items-center text-center gap-2">
                 <PremiumIcon name={s.icon as any} color="green" size="xs" variant="filled" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.text}</span>
              </div>
            ))}
         </div>
      </div>

      <CheckoutFunnel open={checkoutOpen} onClose={() => setCheckoutOpen(false)} initialPlanId={selectedPlanId} />
    </SectionWrapper>
  );
}

function PricingCard({ plan, index, onOrder }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -4 }} className={cn('flex flex-col p-8 rounded-[2.5rem] border transition-all relative overflow-hidden text-left', plan.highlighted ? 'bg-slate-900 border-green-500 shadow-green-glow-lg lg:scale-105 z-10' : 'bg-slate-900/50 border-slate-800')}>
      {plan.highlighted && <div className="absolute -top-1 -right-1 w-32 h-32 overflow-hidden"><div className="absolute top-5 -right-8 w-40 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[10px] font-black py-1 rotate-45 text-center uppercase tracking-tighter shadow-lg">{plan.badge}</div></div>}
      <div className="mb-8"><Badge variant={plan.badgeColor} className="mb-4">{plan.badge}</Badge><h3 className="text-3xl font-black text-white mb-1 tracking-tight">{plan.name}</h3><p className="text-slate-400 text-sm leading-relaxed">{plan.tagline}</p></div>
      <div className="mb-10"><div className="flex flex-col">{plan.price.originalAmount && <span className="text-slate-500 text-sm line-through decoration-red-500/50 mb-1">{formatRupiah(plan.price.originalAmount)}</span>}<div className="flex items-baseline gap-2"><span className="text-5xl font-black text-white tracking-tighter">{plan.price.display}</span><div className="flex flex-col"><span className="text-slate-400 text-sm font-bold uppercase">{plan.price.period}</span>{plan.price.savingsText && <span className="text-[10px] text-green-400 font-bold">{plan.price.savingsText}</span>}</div></div><p className="text-[10px] text-slate-500 italic mt-2 font-medium">{plan.price.note}</p></div></div>
      <div className="mb-10 pt-8 border-t border-slate-800 space-y-6"><h4 className="text-xs font-black text-white uppercase tracking-widest">{plan.whyChoose.title}</h4><div className="space-y-5">{plan.whyChoose.reasons.map((r: any, idx: number) => (<div key={idx} className="flex gap-4 group/reason"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 to-green-700/20 flex items-center justify-center flex-shrink-0 group-hover/reason:scale-110 transition-transform"><PremiumIcon name={r.icon} size="xs" color="green" /></div><div><p className="text-xs font-bold text-white mb-1 leading-tight">{r.title}</p><p className="text-[10px] text-slate-500 leading-relaxed">{r.desc}</p></div></div>))}</div></div>
      <div className="mb-10 p-5 bg-green-500/5 border border-green-500/10 rounded-3xl relative overflow-hidden"><h4 className="text-xs font-black text-green-400 uppercase tracking-widest mb-4">{plan.impact.title}</h4>{plan.impact.isTimeline ? (<div className="space-y-4">{plan.impact.outcomes.map((o: any, idx: number) => (<div key={idx} className="flex gap-3 relative">{idx < 2 && <div className="absolute left-2.5 top-6 bottom-[-20px] w-px bg-green-500/20" />}<div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10"><PremiumIcon name={o.icon} size="xs" className="text-slate-900" /></div><div><p className="text-[10px] font-black text-green-400 uppercase tracking-tighter">{o.metric}</p><p className="text-[11px] text-slate-300 leading-snug">{o.desc}</p></div></div>))}</div>) : (<ul className="space-y-3">{plan.impact.outcomes.map((o: string, idx: number) => (<li key={idx} className="flex items-start gap-2"><Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" /><p className="text-[11px] text-slate-300 leading-snug">{o}</p></li>))}</ul>)}{plan.impact.socialProof && (<div className="mt-6 pt-4 border-t border-green-500/10"><p className="text-[10px] italic text-slate-500 font-medium">"{plan.impact.socialProof}"</p></div>)}</div>
      <div className="mb-10 space-y-4"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fitur Terpilih</h4><ul className="space-y-3">{plan.features.slice(0, 5).map((f: any, idx: number) => (<li key={idx} className={cn("flex items-start gap-3", !f.included && "opacity-40")}>{f.included ? <Check size={14} className="text-green-500 mt-0.5" /> : <X size={14} className="text-slate-600 mt-0.5" />}<span className={cn("text-xs", f.highlight ? "text-white font-bold" : "text-slate-400", f.highlight && "bg-white/5 px-2 py-0.5 rounded")}>{f.text}</span></li>))}</ul></div>
      {plan.bonusHighlight && (<div className="mb-10 p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-3xl"><h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">{plan.bonusHighlight.title}</h4><ul className="space-y-2 mb-4">{plan.bonusHighlight.items.map((item: string, idx: number) => (<li key={idx} className="flex items-center gap-2 text-[10px] text-slate-300"><Gift size={10} className="text-amber-500" /> {item}</li>))}</ul><p className="text-[10px] font-black text-white leading-relaxed">{plan.bonusHighlight.note}</p></div>)}
      <div className="mt-auto"><Button variant={plan.highlighted ? 'primary' : 'outline'} fullWidth className={cn("flex flex-col h-auto py-4 gap-0.5 group", plan.highlighted && "shadow-green-glow animate-pulse hover:animate-none")} onClick={() => onOrder(plan.id)}><span className="text-base font-black">{plan.cta.label}</span><span className="text-[10px] uppercase font-bold opacity-70 tracking-widest">{plan.cta.subtext}</span></Button><p className="text-[10px] text-slate-500 text-center mt-4 flex items-center justify-center gap-2"><ShieldCheck size={10} /> {Array.isArray(plan.trust) ? plan.trust[0] : plan.trust}</p></div>
    </motion.div>
  );
}
