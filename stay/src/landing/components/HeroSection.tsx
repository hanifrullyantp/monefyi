import React, { useState, useEffect } from 'react';
import { Star, Shield, Heart, ArrowRight, Play, Bell } from 'lucide-react';
import { LoginLink } from '../LoginLink';

interface HeroSectionProps {
  isEditMode?: boolean;
  onShowDemo?: () => void;
}

const floatingBadges = [
  { icon: '🎉', text: '+3 Booking baru', sub: 'baru saja', color: 'bg-emerald-50 border-emerald-200', pos: 'top-8 -left-4 md:-left-10' },
  { icon: '💰', text: 'Rp 850.000 masuk', sub: '2 menit lalu', color: 'bg-blue-50 border-blue-200', pos: 'bottom-24 -left-4 md:-left-8' },
  { icon: '✅', text: 'Kamar 205 siap', sub: 'housekeeping', color: 'bg-amber-50 border-amber-200', pos: 'top-20 -right-4 md:-right-10' },
];

const HeroSection: React.FC<HeroSectionProps> = ({ isEditMode, onShowDemo }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden gradient-bg hero-pattern"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              🏨 Platform #1 Manajemen Penginapan Indonesia
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6 ${isEditMode ? 'inline-editable' : ''}`}
              contentEditable={isEditMode}
              suppressContentEditableWarning
            >
              Kelola Penginapan Anda{' '}
              <span className="text-emerald-500 relative">
                Tanpa Ribet
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10 Q150 2 298 10" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              , Tanpa Pusing
            </h1>

            {/* Sub-headline */}
            <p
              className={`text-lg text-gray-600 leading-relaxed mb-8 max-w-xl ${isEditMode ? 'inline-editable' : ''}`}
              contentEditable={isEditMode}
              suppressContentEditableWarning
            >
              Sudah capek catat booking di buku? Bingung menghitung pendapatan? Bingung mana kamar yang kosong?{' '}
              <strong className="text-gray-800">STAY</strong> hadir untuk membebaskan Anda dari semua itu — semua dalam satu aplikasi yang mudah dipakai bahkan oleh orang tua sekalipun.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <LoginLink className="group flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-emerald-200 hover:shadow-emerald-300">
                <span>Coba Gratis 14 Hari</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </LoginLink>
              <button
                onClick={onShowDemo}
                className="group flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 hover:border-emerald-400 text-gray-700 hover:text-emerald-600 font-bold rounded-xl text-lg transition-all duration-200 bg-white"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Lihat Demo Dashboard</span>
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="font-medium text-gray-700">4.9/5</span>
                <span>dari 500+ pemilik</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Data aman & terenkripsi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-emerald-600">Gratis selamanya</span>
                <span>untuk 5 kamar pertama</span>
              </div>
            </div>
          </div>

          {/* Right — Dashboard Mockup */}
          <div className={`relative transition-all duration-1000 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="relative float-animation">
              {/* Dashboard mockup */}
              <div className="dashboard-mockup bg-gray-900 relative">
                {/* Browser chrome */}
                <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                  </div>
                  <div className="flex-1 mx-4 bg-gray-700 rounded-md h-6 flex items-center px-3">
                    <span className="text-gray-400 text-xs">app.stay.monefyi.com</span>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="bg-white p-0">
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">STAY Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-400" />
                      <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-emerald-700 text-xs font-bold">SR</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {[
                      { label: 'Pendapatan Hari Ini', value: 'Rp 4,2Jt', change: '+12%', color: 'text-emerald-600' },
                      { label: 'Kamar Terisi', value: '18/24', change: '75%', color: 'text-blue-600' },
                      { label: 'Booking Baru', value: '7', change: '+3', color: 'text-purple-600' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                        <div className={`text-sm font-black ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-emerald-500 font-semibold">{stat.change} ↑</div>
                      </div>
                    ))}
                  </div>

                  {/* Room grid */}
                  <div className="px-4 pb-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Denah Kamar — Lantai 2</div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { n: '201', s: 'occupied' }, { n: '202', s: 'empty' }, { n: '203', s: 'occupied' },
                        { n: '204', s: 'cleaning' }, { n: '205', s: 'empty' },
                        { n: '206', s: 'occupied' }, { n: '207', s: 'empty' }, { n: '208', s: 'occupied' },
                        { n: '209', s: 'occupied' }, { n: '210', s: 'empty' },
                      ].map((room) => (
                        <div
                          key={room.n}
                          className={`rounded p-1.5 text-center cursor-pointer transition-all ${
                            room.s === 'occupied' ? 'bg-red-100 border border-red-200' :
                            room.s === 'cleaning' ? 'bg-amber-100 border border-amber-200' :
                            'bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          <div className="text-xs font-bold text-gray-700">{room.n}</div>
                          <div className={`text-[9px] ${
                            room.s === 'occupied' ? 'text-red-500' :
                            room.s === 'cleaning' ? 'text-amber-500' :
                            'text-emerald-500'
                          }`}>
                            {room.s === 'occupied' ? 'Terisi' : room.s === 'cleaning' ? 'Cleaning' : 'Kosong'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mini chart */}
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Pendapatan 7 Hari</div>
                      <div className="flex items-end gap-1 h-12">
                        {[40, 65, 50, 80, 70, 90, 85].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-emerald-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              {floatingBadges.map((badge, i) => (
                <div
                  key={i}
                  className={`absolute ${badge.pos} glass-card border ${badge.color} rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 min-w-max`}
                  style={{ animation: `float ${6 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }}
                >
                  <span className="text-lg">{badge.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{badge.text}</div>
                    <div className="text-[10px] text-gray-500">{badge.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-500">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-200 rounded" /> Kosong</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded" /> Terisi</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-200 rounded" /> Cleaning</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
