import React from 'react';
import { Users, Star, PiggyBank } from 'lucide-react';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { siteConfig } from '../../data/site-config';

export function SocialProofBar() {
  return (
    <div className="bg-gradient-to-r from-green-950 via-green-900 to-green-950 py-10 md:py-16 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-around items-center gap-10 md:gap-0">
          
          {/* Stats 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-green-400">
              <Users size={24} />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mb-1">
              <AnimatedCounter end={siteConfig.stats.users} suffix="+" />
            </div>
            <p className="text-xs md:text-sm font-bold text-green-400 uppercase tracking-widest">Pengguna Aktif</p>
          </div>

          <div className="hidden md:block w-px h-16 bg-white/10" />

          {/* Stats 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-amber-400">
              <Star size={24} fill="currentColor" />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mb-1">
              <AnimatedCounter end={siteConfig.stats.rating} decimals={1} suffix="/5" />
            </div>
            <p className="text-xs md:text-sm font-bold text-amber-400 uppercase tracking-widest">Rating User</p>
          </div>

          <div className="hidden md:block w-px h-16 bg-white/10" />

          {/* Stats 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-emerald-400">
              <PiggyBank size={24} />
            </div>
            <div className="text-2xl md:text-3xl font-black text-white mb-1">
              <AnimatedCounter end={12.4} decimals={1} prefix="Rp " suffix="M" />
            </div>
            <p className="text-xs md:text-sm font-bold text-emerald-400 uppercase tracking-widest">Total Saving</p>
          </div>

        </div>
      </div>
    </div>
  );
}
