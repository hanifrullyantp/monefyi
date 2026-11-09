import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Receipt,
  Layers,
  Calculator,
  FileText,
  Send,
  FolderOpen,
  ShieldCheck,
  Smartphone,
  Users,
  CheckCircle2,
  DollarSign,
  Building,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';

type GuideTab =
  | 'quickstart'
  | 'branding'
  | 'pricelist'
  | 'calculator'
  | 'pdf_export'
  | 'whatsapp'
  | 'project_convert'
  | 'license_device';

export default function EstimatorGuidePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GuideTab>('quickstart');

  // Interactive margin & waste calculator simulator
  const [sampleHpp, setSampleHpp] = useState(15000000);
  const [sampleMargin, setSampleMargin] = useState(25);
  const [enableWaste, setEnableWaste] = useState(true);

  const wasteAmount = enableWaste ? Math.round(sampleHpp * 0.08) : 0;
  const totalCost = sampleHpp + wasteAmount;
  const sellingPrice = Math.round(totalCost / (1 - sampleMargin / 100));
  const profitAmount = sellingPrice - totalCost;

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/estimator')}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
              title="Kembali ke Estimator"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Pusat Panduan Monefyi Estimator
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                  RESMI 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Tutorial langkah demi langkah membuat RAB, RAP, & penawaran resmi anti-boncos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/app/estimator/new')}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Receipt className="w-4 h-4" />
              <span>Buat Estimasi Baru</span>
            </button>
            <a
              href="https://wa.me/6281214736340?text=Halo%20Admin%20Monefyi%2C%20saya%20butuh%20bantuan%20penggunaan%20Estimator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Bantuan WA</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Buku Panduan Pengguna & Kontraktor
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Kuasai Estimator dalam 5 Menit
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Pelajari cara menghitung HPP secara presisi, memproteksi keuntungan proyek dengan rumus waste material, mencetak Surat Penawaran Harga (SPH) resmi berlogo usaha Anda, hingga kirim penawaran via WhatsApp dalam 1-klik.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Coba Simulasi Hitung Margin
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('branding')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Building className="w-4 h-4 text-emerald-400" />
                Setup Logo & Kop Surat
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {[
            { id: 'quickstart', label: '1. Alur Cepat', icon: Sparkles },
            { id: 'branding', label: '2. Logo & Kop Surat', icon: Building },
            { id: 'pricelist', label: '3. Database Bahan & Upah', icon: Layers },
            { id: 'calculator', label: '4. Hitung Margin & HPP', icon: Calculator },
            { id: 'pdf_export', label: '5. Cetak PDF & Excel', icon: FileText },
            { id: 'whatsapp', label: '6. Kirim WhatsApp', icon: Send },
            { id: 'project_convert', label: '7. Jadi Proyek Aktif', icon: FolderOpen },
            { id: 'license_device', label: '8. Lisensi & 1 Perangkat', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as GuideTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {/* TAB 1: QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                  Alur Kerja 4 Langkah: Dari Hitung Sampai Closing
                </h3>
                <p className="text-sm text-slate-600">
                  Berikut alur kerja kontraktor dan desainer interior profesional saat menggunakan Monefyi Estimator:
                </p>
              </div>

              {/* 4 Step Visual Workflow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center mb-3">
                    1
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Input Data Proyek</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ketik nama klien, nomor WhatsApp, lokasi proyek, dan masa berlaku penawaran.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center mb-3">
                    2
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Susun Bahan & Upah</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pilih material dari database atau ketik manual. Masukkan ongkos tukang harian/borongan.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center mb-3">
                    3
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Kunci Profit & Waste</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tentukan target margin keuntungan (misal 25%). Aktifkan waste factor 8-10% anti-boncos.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center mb-3">
                    4
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Kirim WA & Cetak PDF</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download PDF resmi berlogo usaha Anda atau kirim pesan WhatsApp otomatis ke klien.
                  </p>
                </div>
              </div>

              {/* TAMPILAN VISUAL: MOCKUP KARTU ESTIMASI */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-gradient-to-b from-slate-50 to-white">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Contoh Tampilan Kartu Estimasi di Aplikasi:</span>
                  </div>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    Status: Penawaran Terkirim
                  </span>
                </div>

                {/* Card Simulator */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm max-w-xl mx-auto">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">EST-2026-004</span>
                      <h4 className="text-base font-black text-slate-900">Pembuatan Kitchen Set Minimalis Duco</h4>
                      <p className="text-xs text-slate-500">Klien: Ibu Rina · 0812-9876-xxxx · Serpong</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      Penawaran
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 my-2 border-y border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Harga Penawaran Klien</span>
                      <span className="text-lg font-black text-slate-900">Rp 28.500.000</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Laba Bersih</span>
                      <span className="text-base font-black text-emerald-600">Rp 7.125.000 (25%)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-400 text-[11px]">Dibuat 2 hari yang lalu</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 cursor-pointer">
                        PDF
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-white cursor-pointer">
                        Kirim WA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <Building className="w-6 h-6 text-emerald-600" />
                  Kustomisasi Kop Surat & Identitas Usaha
                </h3>
                <p className="text-sm text-slate-600">
                  Surat Penawaran Harga (SPH) yang memiliki kop surat resmi dan logo sendiri meningkatkan kepercayaan klien hingga 3x lipat dibanding coretan kertas atau pesan WhatsApp biasa.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-sm text-slate-900 mb-2">Data yang Perlu Diisi:</h4>
                    <ul className="text-xs text-slate-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Nama Usaha / Workshop:</strong> Contoh: <em>CV Karya Mandiri Interior</em>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Logo Perusahaan:</strong> Format PNG transparan agar terlihat elegan di PDF.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Warna Tema (Brand Color):</strong> Menyesuaikan warna header kop surat.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Rekening Pembayaran DP:</strong> Nama bank, no. rekening, & nama pemilik.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Tanda Tangan Digital:</strong> Scan paraf penanggung jawab untuk lembar pengesahan.</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/app/estimator/settings')}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>Buka Menu Pengaturan Branding Sekarang</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* TAMPILAN VISUAL: MOCKUP KOP SURAT */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Pratinjau Kop Surat PDF:
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-xl shadow-sm">
                          KM
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900">CV KARYA MANDIRI INTERIOR</div>
                          <div className="text-[10px] text-slate-500">Jl. Raya Serpong No. 88, Tangerang Selatan</div>
                          <div className="text-[10px] text-slate-500">WhatsApp: 0812-3456-7890 · Email: halo@karyamandiri.com</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center py-2">
                      <div className="font-black text-xs text-slate-900 uppercase tracking-wider">SURAT PENAWARAN HARGA (SPH)</div>
                      <div className="text-[10px] text-slate-400">Nomor: SPH-2026/04/012 · Tanggal: 9 November 2026</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICELIST */}
          {activeTab === 'pricelist' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <Layers className="w-6 h-6 text-emerald-600" />
                  Database Material & Upah Tukang (Pricelist)
                </h3>
                <p className="text-sm text-slate-600">
                  Hindari mengetik harga bahan berulang kali. Simpan harga material dan ongkos tukang Anda sekali, lalu gunakan di semua penawaran proyek.
                </p>
              </div>

              {/* TAMPILAN VISUAL: TABEL PRICELIST */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Contoh Database Bahan di Sistem:</span>
                  <button
                    type="button"
                    onClick={() => navigate('/app/estimator/pricelist')}
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                  >
                    Buka Halaman Pricelist
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {[
                    { name: 'Multiplek 18mm Uty (Meranti)', category: 'Material Kayu', unit: 'Lembar', price: 235000 },
                    { name: 'HPL Taco Standar Solid / Woodgrain', category: 'Finishing Interior', unit: 'Lembar', price: 175000 },
                    { name: 'Hollow Galvanis 4x4 Tebal 1.4mm', category: 'Kanopi / Besi', unit: 'Batang (6m)', price: 92000 },
                    { name: 'Upah Tukang Kayu / Interior Borongan', category: 'Upah Tenaga', unit: 'Meter Lari (m¹)', price: 450000 },
                    { name: 'Upah Tukang Las Harian', category: 'Upah Tenaga', unit: 'Hari Kerja', price: 160000 },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.category} · Satuan: {item.unit}</div>
                      </div>
                      <div className="text-right font-black text-slate-800">
                        {formatRupiah(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CALCULATOR (INTERAKTIF!) */}
          {activeTab === 'calculator' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <Calculator className="w-6 h-6 text-emerald-600" />
                  Kalkulator Margin & Waste Material (Anti-Boncos)
                </h3>
                <p className="text-sm text-slate-600">
                  Geser simulator interaktif di bawah ini untuk melihat bagaimana rumus otomatis Monefyi menghitung HPP, cadangan potongan sisa material (waste), keuntungan bersih, dan harga jual ke klien:
                </p>
              </div>

              {/* Interactive Widget Box */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* Controls */}
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-300">Biaya Modal Dasar Bahan & Tukang (HPP):</span>
                        <span className="text-emerald-400 font-mono font-black">{formatRupiah(sampleHpp)}</span>
                      </div>
                      <input
                        type="range"
                        min={5000000}
                        max={50000000}
                        step={1000000}
                        value={sampleHpp}
                        onChange={(e) => setSampleHpp(Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Rp 5 Juta</span>
                        <span>Rp 50 Juta</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-300">Target Margin Keuntungan:</span>
                        <span className="text-amber-300 font-mono font-black">{sampleMargin}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={50}
                        step={5}
                        value={sampleMargin}
                        onChange={(e) => setSampleMargin(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>10% (Tipis)</span>
                        <span>25% (Ideal)</span>
                        <span>50% (Tinggi)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700">
                      <div>
                        <div className="text-xs font-bold text-slate-200">Aktifkan Waste Factor (8%)</div>
                        <div className="text-[10px] text-slate-400">Proteksi cadangan sisa potongan material</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnableWaste(!enableWaste)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          enableWaste ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            enableWaste ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Real-time Calculation Result Screen */}
                  <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-4">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Hasil Kalkulasi Real-time:
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Modal Bahan + Tukang:</span>
                        <span className="font-mono">{formatRupiah(sampleHpp)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Cadangan Waste (8%):</span>
                        <span className="font-mono text-amber-400">{formatRupiah(wasteAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-200 font-bold pt-2 border-t border-slate-800">
                        <span>Total HPP Riil:</span>
                        <span className="font-mono">{formatRupiah(totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Keuntungan Bersih (Profit):</span>
                        <span className="font-mono">+{formatRupiah(profitAmount)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                        Harga Jual Resmi ke Klien:
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        {formatRupiah(sellingPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PDF & EXCEL EXPORT */}
          {activeTab === 'pdf_export' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  Cetak PDF Resmi & Export Excel RAP
                </h3>
                <p className="text-sm text-slate-600">
                  Dokumen yang Anda hasilkan bebas watermark selamanya dan memiliki dua mode tampilan sesuai kebutuhan:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <span>Mode Ringkas (Summary)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Hanya menampilkan pos pekerjaan utama dan total harga penawaran. Sangat disarankan untuk pemilik rumah/klien pribadi agar tidak memicu tawar-menawar harga per sak semen atau per lembar triplek.
                  </p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md">
                    Cocok untuk: Owner Rumah / Residensial
                  </span>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                    <span>Mode Rinci (Detailed & Excel)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Menampilkan rincian volume, spesifikasi material, harga satuan, dan rekap RAP operasional lapangan. Cocok untuk proyek tender komersial, kantor, atau audit internal mandor.
                  </p>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-extrabold px-2 py-0.5 rounded-md">
                    Cocok untuk: Tender & Rekap Lapangan
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <Send className="w-6 h-6 text-emerald-600" />
                  Kirim Penawaran Otomatis via WhatsApp
                </h3>
                <p className="text-sm text-slate-600">
                  Tidak perlu lagi menyusun kalimat panjang secara manual. Tekan tombol <strong>Kirim WhatsApp</strong> di estimasi, dan format pesan profesional langsung siap dikirim:
                </p>
              </div>

              {/* TAMPILAN VISUAL: BUBBLE CHAT WA */}
              <div className="max-w-md mx-auto bg-[#ECE5DD] p-4 rounded-3xl border border-slate-300 shadow-inner">
                <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm text-xs space-y-2 border border-slate-200/80">
                  <p className="font-semibold text-slate-900">Halo Ibu Rina,</p>
                  <p className="text-slate-700">
                    Terima kasih atas kepercayaannya berkonsultasi dengan <strong>CV Karya Mandiri Interior</strong>.
                  </p>
                  <p className="text-slate-700">
                    Berikut kami lampirkan Surat Penawaran Harga (SPH) resmi untuk pekerjaan:
                    <br />
                    <strong>• Pembuatan Kitchen Set Minimalis Duco</strong>
                  </p>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800">
                    <div>Total Nilai: <strong>Rp 28.500.000</strong></div>
                    <div className="text-[10px] text-slate-500">Masa berlaku penawaran: 14 hari</div>
                  </div>
                  <p className="text-slate-700">
                    Dokumen spesifikasi lengkap terlampir dalam file PDF. Jika ada bagian yang ingin disesuaikan dengan anggaran Ibu, kami dengan senang hati siap berdiskusi. 🙌
                  </p>
                  <div className="text-right text-[10px] text-slate-400">10:42 ✓✓</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PROJECT CONVERT */}
          {activeTab === 'project_convert' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <FolderOpen className="w-6 h-6 text-emerald-600" />
                  Konversi Estimasi Menjadi Proyek Aktif & SPK
                </h3>
                <p className="text-sm text-slate-600">
                  Begitu penawaran disetujui oleh klien (*Deal / Won*), Anda tidak perlu mengetik ulang data proyek:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 mb-0.5">Ubah Status Menjadi "Won / Selesai"</h5>
                    <p className="text-slate-500">
                      Di daftar estimasi atau kartu Kanban, pindahkan status ke <strong>Won / Diterima</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 mb-0.5">Klik Tombol "Konversi ke Proyek"</h5>
                    <p className="text-slate-500">
                      Sistem otomatis mengunci rincian modal Anda sebagai <strong>RAP (Rencana Anggaran Pelaksanaan)</strong> proyek.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 mb-0.5">Kelola Jadwal Kerja & Arus Kas Lapangan</h5>
                    <p className="text-slate-500">
                      Di menu Proyek, Anda bisa mengatur kurva S / jadwal kerja tukang serta mencatat kas keluar-masuk bon material lapangan agar anggaran tidak jebol.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: LISENSI & SINGLE DEVICE */}
          {activeTab === 'license_device' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  Aturan Lisensi Workspace & Kebijakan 1 Perangkat Aktif
                </h3>
                <p className="text-sm text-slate-600">
                  Untuk menjaga keamanan data bisnis Anda dan memastikan integritas lisensi, aplikasi menerapkan aturan berikut:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aturan 1: Lisensi Pengguna */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">1 Lisensi = 1 Pengguna (Owner)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Setiap pembelian standar memberi hak akses untuk <strong>1 pengguna aktif</strong> di workspace milik Anda.
                  </p>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                    <div className="font-bold">Ingin Menambah Karyawan / Rekan Kerja?</div>
                    <p>
                      Anda dapat menambah staf/karyawan ke dalam proyek yang sama dengan membeli <strong>Lisensi Tambahan (Bump Lisensi Rp50.000)</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      *Contoh: Pembeli yang mengambil bump lisensi berhak memiliki 2 akun pengguna (1 akun utama + 1 staf/karyawan) dalam 1 proyek bersama.
                    </p>
                  </div>
                </div>

                {/* Aturan 2: Single Device Login */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">Proteksi 1 Perangkat Aktif (Single Device)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Satu akun login hanya dapat aktif di <strong>1 perangkat pada satu waktu</strong>.
                  </p>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                    <div className="font-bold">Bagaimana Jika Ingin Pindah Perangkat?</div>
                    <p>
                      Jika Anda login di HP baru, sesi di Laptop/komputer lama akan otomatis keluar (*logout*) dengan notifikasi keamanan. Anda bebas berpindah perangkat kapan saja cukup dengan login ulang.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between flex-wrap gap-3 text-xs">
                <div>
                  <span className="font-bold">Butuh Bantuan Lisensi atau Reset Perangkat?</span>
                  <p className="text-slate-400 text-[11px]">Tim technical support kami siap membantu kapan saja via WhatsApp.</p>
                </div>
                <a
                  href="https://wa.me/6281214736340?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20terkait%20lisensi%20atau%20perangkat%20Estimator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white transition-colors"
                >
                  Hubungi Admin
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
