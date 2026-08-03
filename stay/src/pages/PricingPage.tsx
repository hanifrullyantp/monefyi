import { useState } from 'react';
import { 
  TrendingUp, Calendar, Zap, AlertTriangle, 
  Plus, Check, X, Info, Settings, ArrowRight,
  DollarSign
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/format';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

interface Rule {
  id: string;
  name: string;
  condition: string;
  adjustment: string;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function PricingPage() {
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', name: 'Weekend Premium', condition: 'Hari Jumat & Sabtu', adjustment: '+25%', isActive: true, priority: 'medium' },
    { id: '2', name: 'High Occupancy Boost', condition: 'Occupancy > 85%', adjustment: '+15%', isActive: true, priority: 'high' },
    { id: '3', name: 'Last Minute Rescue', condition: 'Sisa < 24 jam & Kosong', adjustment: '-15%', isActive: false, priority: 'medium' },
    { id: '4', name: 'Holiday Season', condition: 'Libur Nasional', adjustment: '+50%', isActive: true, priority: 'urgent' },
  ]);

  const [selectedMonth, setSelectedMonth] = useState('Juni 2024');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
            Dynamic Pricing Engine
          </h1>
          <p className="text-sm text-slate-500 font-medium text-center sm:text-left">Optimalkan pendapatan dengan penyesuaian harga otomatis</p>
        </div>
        <Button className="rounded-2xl h-12 px-6 bg-slate-900 shadow-xl shadow-slate-200">
          <Plus className="h-4 w-4 mr-2" /> Aturan Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Rules Management */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aturan Aktif</h3>
            <Badge variant="success" className="text-[8px] py-0">{rules.filter(r => r.isActive).length} Running</Badge>
          </div>
          
          <div className="space-y-3">
            {rules.map((rule) => (
              <div 
                key={rule.id}
                className={cn(
                  "bg-white p-5 rounded-[2rem] border-2 transition-all group",
                  rule.isActive ? "border-emerald-500 shadow-lg shadow-emerald-100/50" : "border-slate-100 opacity-60"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-2 rounded-xl",
                    rule.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{rule.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{rule.condition}</p>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className={cn(
                    "text-lg font-black",
                    rule.adjustment.startsWith('+') ? "text-emerald-600" : "text-rose-500"
                  )}>{rule.adjustment}</span>
                  
                  <div 
                    onClick={() => setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all cursor-pointer",
                      rule.isActive ? "bg-emerald-500" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      rule.isActive ? "right-1" : "left-1"
                    )} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 p-5 rounded-[2rem] flex items-start gap-4">
             <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
             <p className="text-[10px] text-amber-700 font-medium leading-relaxed italic">
               Aturan dengan prioritas <b>High</b> akan menimpa aturan <b>Low</b> jika terjadi konflik pada tanggal yang sama.
             </p>
          </div>
        </div>

        {/* Right: Visual Price Calendar */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 bg-white border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Prediksi Harga</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{selectedMonth}</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="rounded-xl h-10 border-slate-200">Bulan Lalu</Button>
                 <Button variant="outline" size="sm" className="rounded-xl h-10 border-slate-200">Bulan Depan</Button>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-7 gap-3">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase py-2 tracking-widest">{d}</div>
                ))}
                
                {Array.from({ length: 30 }).map((_, i) => {
                  const day = i + 1;
                  const isWeekend = (day + 3) % 7 === 5 || (day + 3) % 7 === 6;
                  const isHoliday = day === 17;
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "aspect-square rounded-2xl p-3 flex flex-col items-center justify-between border-2 transition-all cursor-pointer group",
                        isHoliday ? "bg-rose-50 border-rose-100 shadow-lg shadow-rose-100/50" : 
                        isWeekend ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-transparent hover:border-slate-200"
                      )}
                    >
                      <span className="text-[10px] font-black text-slate-400 self-start">{day}</span>
                      <div className="text-center">
                        <p className={cn(
                          "text-xs font-black",
                          isHoliday ? "text-rose-600" : isWeekend ? "text-emerald-600" : "text-slate-700"
                        )}>
                          {isHoliday ? "1.8jt" : isWeekend ? "1.2jt" : "850rb"}
                        </p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ESTIMASI</p>
                      </div>
                      <div className="flex gap-0.5 h-1">
                        {isWeekend && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                        {isHoliday && <div className="w-1 h-1 rounded-full bg-rose-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <CalendarLegend color="bg-emerald-500" label="Harga Weekend" />
                <CalendarLegend color="bg-rose-500" label="Harga Libur" />
                <CalendarLegend color="bg-slate-300" label="Harga Normal" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Harga dapat berubah real-time berdasarkan sisa kamar</p>
            </div>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-slate-200/30 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Potensi Revenue</p>
                <p className="text-xl font-black text-slate-800">+Rp12.4M <span className="text-xs font-bold text-emerald-500 italic">/bulan</span></p>
              </div>
            </Card>
            
            <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-slate-200/30 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                <Info className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saran Promo</p>
                <p className="text-xs font-bold text-slate-600 leading-tight">Occupancy Selasa depan rendah. Aktifkan diskon 10% untuk tingkatkan booking.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
