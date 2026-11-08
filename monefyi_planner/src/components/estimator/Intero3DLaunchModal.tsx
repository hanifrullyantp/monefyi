// monefyi_planner/src/components/estimator/Intero3DLaunchModal.tsx
import { useEffect, useState } from 'react';
import { Box, Download, ExternalLink, Layers, Sparkles, X } from 'lucide-react';
import type { EstimationFormDraft, EstimationItem, EstimationItemDraft } from '../../types/estimator';
import {
  analyzeEstimationForIntero,
  buildInteroWizardLaunch,
  downloadInteroFile,
  generateInteroLaunchUrl,
  type InteroCountertopType,
  type InteroDimensionProposal,
  type InteroDoorMaterial,
  type InteroKitchenShape,
} from '../../services/intero3dService';

interface Props {
  open: boolean;
  onClose: () => void;
  draft: EstimationFormDraft;
  items: Array<EstimationItem | EstimationItemDraft>;
}

export default function Intero3DLaunchModal({ open, onClose, draft, items }: Props) {
  const [proposal, setProposal] = useState<InteroDimensionProposal | null>(null);
  const [targetDomain, setTargetDomain] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    if (open) {
      const initial = analyzeEstimationForIntero(draft, items);
      setProposal(initial);
    }
  }, [open, draft, items]);

  if (!open || !proposal) return null;

  const handleShapeChange = (shape: InteroKitchenShape) => {
    const totalCm = Math.round(proposal.totalBaseM * 100);
    const lengths = { ...proposal.lengthsCm };

    if (shape === 'I') {
      lengths.back = Math.max(160, totalCm);
    } else if (shape === 'L') {
      const backCm = Math.max(180, Math.round((totalCm * 0.58) / 10) * 10);
      lengths.back = backCm;
      lengths.left = Math.max(140, totalCm - backCm);
    } else if (shape === 'U') {
      const backCm = Math.max(200, Math.round((totalCm * 0.45) / 10) * 10);
      const sideCm = Math.max(140, Math.round(((totalCm - backCm) / 2) / 10) * 10);
      lengths.back = backCm;
      lengths.left = sideCm;
      lengths.right = sideCm;
    }

    setProposal({ ...proposal, shape, lengthsCm: lengths });
  };

  const handleLaunch3D = () => {
    const launch = buildInteroWizardLaunch(draft, proposal);
    const domain = targetDomain === 'local' ? 'http://localhost:5173' : 'https://3d.intero.id';
    const url = generateInteroLaunchUrl(launch, domain);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleDownloadFile = () => {
    const launch = buildInteroWizardLaunch(draft, proposal);
    downloadInteroFile(launch, draft.title || 'Proyek_Kitchen_Monefyi');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Box className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Instant 3D Generator (Intero)</h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Konversi otomatis hasil estimasi RAB menjadi visualisasi 3D di 3d.intero.id
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700 text-xs">
          {/* Ringkasan RAB & Rekomendasi Sudut */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-950">
                Data RAB Terdeteksi: Kabinet Bawah {proposal.totalBaseM.toFixed(1)}m · Kabinet Atas {proposal.totalWallM.toFixed(1)}m
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Di Monefyi dihitung per meter lari kabinet atas &amp; bawah. Di Intero, kabinet dialokasikan ke dinding sudut.
                Anda dapat menyesuaikan pembagian panjang dinding di bawah ini sebelum membuka 3D:
              </p>
            </div>
          </div>

          {/* 1. Pemilihan Bentuk Dapur */}
          <div>
            <label className="font-bold text-slate-900 block mb-2 uppercase tracking-wider text-[11px]">
              1. Bentuk Tata Letak Dapur
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'I' as const, label: 'Lurus (Bentuk I)', desc: '1 Dinding memanjang' },
                { id: 'L' as const, label: 'Sudut (Bentuk L)', desc: '2 Dinding siku bertemu' },
                { id: 'U' as const, label: 'Sudut U (Bentuk U)', desc: '3 Dinding tapal kuda' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleShapeChange(item.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${proposal.shape === item.id
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                >
                  <p className="font-bold text-slate-900 text-xs">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Pembagian Dimensi Sudut (cm) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <label className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
              2. Alokasi Panjang Dinding (cm)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Dinding Belakang (Utama)
                </span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500">
                  <input
                    type="number"
                    step="10"
                    value={proposal.lengthsCm.back}
                    onChange={(e) =>
                      setProposal({
                        ...proposal,
                        lengthsCm: { ...proposal.lengthsCm, back: Number(e.target.value) || 100 },
                      })
                    }
                    className="w-full text-xs font-bold text-slate-900 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">cm</span>
                </div>
              </div>

              {(proposal.shape === 'L' || proposal.shape === 'U') && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Dinding Kiri (Sudut Siku)
                  </span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500">
                    <input
                      type="number"
                      step="10"
                      value={proposal.lengthsCm.left}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          lengthsCm: { ...proposal.lengthsCm, left: Number(e.target.value) || 100 },
                        })
                      }
                      className="w-full text-xs font-bold text-slate-900 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 font-mono">cm</span>
                  </div>
                </div>
              )}

              {proposal.shape === 'U' && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Dinding Kanan
                  </span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500">
                    <input
                      type="number"
                      step="10"
                      value={proposal.lengthsCm.right}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          lengthsCm: { ...proposal.lengthsCm, right: Number(e.target.value) || 100 },
                        })
                      }
                      className="w-full text-xs font-bold text-slate-900 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 font-mono">cm</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tinggi Plafon (Puncak)
                </span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500">
                  <input
                    type="number"
                    step="10"
                    value={proposal.ceilingCm}
                    onChange={(e) =>
                      setProposal({ ...proposal, ceilingCm: Number(e.target.value) || 240 })
                    }
                    className="w-full text-xs font-bold text-slate-900 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Finishing & Material */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Bahan Pintu / Finishing
              </label>
              <select
                value={proposal.material.doorMaterial}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    material: {
                      ...proposal.material,
                      doorMaterial: e.target.value as InteroDoorMaterial,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              >
                <option value="HPL">HPL (Motif Serat Kayu / Solid)</option>
                <option value="Duco">Cat Duco (Gloss / Semi-Doff)</option>
                <option value="ACP">ACP (Aluminium Composite Panel)</option>
                <option value="Solid Wood">Kayu Solid / Jati</option>
                <option value="Glass">Kaca / Aluminium Frame</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Top Table (Countertop)
              </label>
              <select
                value={proposal.material.countertop}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    material: {
                      ...proposal.material,
                      countertop: e.target.value as InteroCountertopType,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              >
                <option value="granit_hitam">Granit Hitam (Nero Assoluto / Star)</option>
                <option value="granit_putih">Granit Putih</option>
                <option value="granit_grey">Granit Grey</option>
                <option value="carrara">Marmer Carrara Putih</option>
                <option value="calacatta">Marmer Calacatta Emas</option>
                <option value="solid_surface">Solid Surface Polos</option>
                <option value="butcher_block">Butcher Block (Kayu)</option>
              </select>
            </div>
          </div>

          {/* 4. Fitur & Peralatan Terpasang */}
          <div>
            <label className="font-bold text-slate-900 block mb-2 uppercase tracking-wider text-[11px]">
              4. Peralatan yang Ditata Otomatis di 3D
            </label>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {[
                { key: 'sink', label: 'Wastafel Sink' },
                { key: 'cooktop', label: 'Kompor Tanam' },
                { key: 'hood', label: 'Cooker Hood' },
                { key: 'fridge', label: 'Kulkas 2 Pintu' },
                { key: 'dishRack', label: 'Rak Piring Atas' },
                { key: 'gasRack', label: 'Laci Tabung Gas' },
                { key: 'island', label: 'Meja Island' },
              ].map(({ key, label }) => {
                const active = proposal.detectedAppliances[key as keyof typeof proposal.detectedAppliances];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setProposal({
                        ...proposal,
                        detectedAppliances: {
                          ...proposal.detectedAppliances,
                          [key]: !active,
                        },
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${active
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                  >
                    <span>{active ? '✓' : '+'}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opsi Target Lingkungan */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Buka ke server:</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="domain"
                  checked={targetDomain === 'cloud'}
                  onChange={() => setTargetDomain('cloud')}
                  className="accent-emerald-600"
                />
                <span>3d.intero.id (Cloud)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer ml-2">
                <input
                  type="radio"
                  name="domain"
                  checked={targetDomain === 'local'}
                  onChange={() => setTargetDomain('local')}
                  className="accent-emerald-600"
                />
                <span>localhost:5173 (Dev)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            title="Unduh file format .intero untuk dibuka manual"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh .intero</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleLaunch3D}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-800/20 active:scale-95 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka 3D Intero Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

