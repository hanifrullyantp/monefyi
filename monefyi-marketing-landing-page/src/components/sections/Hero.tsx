import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Star, PlayCircle as Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { GradientText } from '../ui/GradientText';
import { PhoneMockup } from '../hero/PhoneMockup';
import { DemoVideoModal } from '../hero/DemoVideoModal';
import { EditableText } from '../admin/EditableText';
import { PremiumIcon } from '../ui/PremiumIcon';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function Hero() {
  const { settings } = useSiteSettings();
  const content = settings.content.hero;
  const [demoOpen, setDemoOpen] = useState(false);
  const videoUrl = settings.media?.hero_video?.url || '';
  const posterUrl = settings.media?.hero_video_poster?.url || '';

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-green-950/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8"
            >
              <Star size={14} className="text-amber-400" fill="currentColor" />
              <span className="text-sm font-medium text-slate-300">
                <EditableText id="content_hero_eyebrow" defaultValue={content.eyebrow} />
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="block"
              >
                <EditableText id="content_hero_headline1" defaultValue={content.headline1} />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="block break-words"
              >
                <GradientText variant="green">
                  <EditableText id="content_hero_headline2" defaultValue={content.headline2} as="span" />
                </GradientText>
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed mb-10"
            >
              <EditableText id="content_hero_subheadline" defaultValue={content.subheadline} multiline />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="space-y-4 mb-10"
            >
              {content.bullets.map((bullet: string, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <PremiumIcon name="CheckCircle2" size="xs" color="green" />
                  <EditableText id={`content_hero_bullets_${i}`} defaultValue={bullet} className="text-slate-200 font-medium" />
                </div>
              ))}
            </motion.div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button 
                size="xl" 
                className="w-full sm:w-auto gap-3"
                onClick={() => window.location.hash = 'bonus'}
              >
                <Rocket size={20} />
                <EditableText id="content_hero_cta_primary" defaultValue={content.cta.primary} />
              </Button>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group py-3 px-6"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10">
                  <Play size={16} fill="currentColor" />
                </div>
                <span className="font-bold underline decoration-slate-600 underline-offset-4">
                  <EditableText id="content_hero_cta_secondary" defaultValue={content.cta.secondary} />
                </span>
              </button>
            </div>

            <div className="mt-12 flex items-center gap-6">
              {content.trustBadges.map((badge: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-slate-700">
                  <PremiumIcon name={badge.icon as any} size="xs" color="slate" />
                  <span className="text-xs text-slate-500 font-medium">
                    <EditableText id={`content_hero_trustBadges_${i}`} defaultValue={badge.text} />
                  </span>
                  {i < content.trustBadges.length - 1 && <span className="text-slate-700">·</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 relative">
            <PhoneMockup />
          </div>
        </div>
      </div>

      <DemoVideoModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        videoUrl={videoUrl}
        posterUrl={posterUrl}
        title={content.cta?.secondary || 'Demo Monefyi'}
      />
    </section>
  );
}
