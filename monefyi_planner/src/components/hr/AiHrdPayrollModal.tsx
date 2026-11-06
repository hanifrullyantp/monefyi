import React, { useState, useMemo } from 'react';
import {
  Bot,
  Wallet,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  X,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { OrgMember } from '../../types/onboarding';
import type { AttendanceRecord } from '../../services/attendanceService';
import type { MemberCompensation, BonRequest } from '../../services/payrollService';
import {
  analyzeFieldPayroll,
  executeMayarDisbursementBatch,
  generateSlipGajiMessage,
  type FieldPayrollBudget,
  type EmployeePayrollCalculation,
  type PayrollAnalysisSummary,
  type DisbursementBatchRecord,
} from '../../services/aiHrdPayrollService';
import { showToast } from '../../store/uiStore';

interface AiHrdPayrollModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  actorId: string;
  members: OrgMember[];
  attendanceRecords: AttendanceRecord[];
  compensationList: MemberCompensation[];
  bonRequests: BonRequest[];
  onDisbursementCompleted?: () => void;
}

export default function AiHrdPayrollModal({
  open,
  onClose,
  orgId,
  actorId,
  members,
  attendanceRecords,
  compensationList,
  bonRequests,
  onDisbursementCompleted,
}: AiHrdPayrollModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Input Saldo dari Manager HR Lapangan
  const [budgetForm, setBudgetForm] = useState<FieldPayrollBudget>({
    budgetAmount: 15000000,
    sourceAccount: 'kas_lapangan',
    periodLabel: `Minggu ${Math.ceil(new Date().getDate() / 7)} ${new Date().toLocaleString('id-ID', {
      month: 'long',
      year: 'numeric',
    })}`,
    notes: 'Alokasi penggajian tukang & mandor lapangan sesuai progres mingguan.',
    managerName: 'Pak Raka (Site Manager)',
  });

  // Step 2: Perhitungan & Konfirmasi Kebenaran
  const [analysis, setAnalysis] = useState<{
    calculations: EmployeePayrollCalculation[];
    summary: PayrollAnalysisSummary;
  } | null>(null);

  const [confirmedTruth, setConfirmedTruth] = useState({
    attendanceVerified: true,
    deductionsVerified: true,
    bankAccountsVerified: true,
    approvalAck: false,
  });

  // Step 3: Eksekusi & Hasil
  const [isExecuting, setIsExecuting] = useState(false);
  const [disbursementResult, setDisbursementResult] = useState<DisbursementBatchRecord | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Trigger kalkulasi AI HRD saat pindah ke step 2
  const handleProceedToAnalysis = () => {
    if (!budgetForm.budgetAmount || budgetForm.budgetAmount <= 0) {
      showToast('Masukkan nominal saldo yang dikirimkan Manager Lapangan', 'error');
      return;
    }

    const result = analyzeFieldPayroll({
      budget: budgetForm,
      members,
      attendanceRecords,
      compensationList,
      bonRequests,
    });

    setAnalysis(result);
    setStep(2);
  };

  // Eksekusi Payout Mayar setelah Disetujui
  const handleExecuteDisbursement = async () => {
    if (!analysis) return;
    if (!confirmedTruth.approvalAck) {
      showToast('Mohon centang konfirmasi persetujuan penggajian', 'error');
      return;
    }

    setIsExecuting(true);
    try {
      const result = await executeMayarDisbursementBatch({
        orgId,
        budget: budgetForm,
        items: analysis.calculations,
        actorId,
      });

      setDisbursementResult(result);
      setStep(3);
      showToast('⚡ Penggajian berhasil dicairkan ke rekening via Sistem Mayar!', 'success');
      if (onDisbursementCompleted) onDisbursementCompleted();
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengeksekusi pencairan', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col relative overflow-hidden">
        {/* Glow Background Gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-rose-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white leading-tight">
                  AI HRD: Penggajian &amp; Payout Lapangan
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Sistem Mayar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alur otomatis: Saldo Manager Lapangan ➔ AI HRD Pilah &amp; Hitung ➔ Konfirmasi ➔ Pencairan Rekening
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Wizard Indicator */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div
            className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
              step === 1
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 bg-slate-950/40 text-slate-500'
            }`}
          >
            <span className="block text-[10px] uppercase font-black tracking-wider opacity-70">Langkah 1</span>
            1. Saldo Manager Lapangan
          </div>
          <div
            className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
              step === 2
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                : 'border-slate-800 bg-slate-950/40 text-slate-500'
            }`}
          >
            <span className="block text-[10px] uppercase font-black tracking-wider opacity-70">Langkah 2</span>
            2. AI HRD Hitung &amp; Konfirmasi
          </div>
          <div
            className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
              step === 3
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                : 'border-slate-800 bg-slate-950/40 text-slate-500'
            }`}
          >
            <span className="block text-[10px] uppercase font-black tracking-wider opacity-70">Langkah 3</span>
            3. Payout Rekening Mayar
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 relative z-10 no-scrollbar">
          {/* STEP 1: Form Input Saldo dari Manager Lapangan */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                  <Wallet className="w-4 h-4" />
                  <span>Pengiriman Saldo / Anggaran Gaji dari Lapangan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nominal Saldo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">
                      Nominal Saldo yang Dikirim (IDR) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={budgetForm.budgetAmount}
                        onChange={(e) =>
                          setBudgetForm({ ...budgetForm, budgetAmount: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white font-extrabold text-base focus:border-emerald-500"
                        placeholder="Contoh: 15000000"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Total dana yang dialokasikan oleh Manager Lapangan untuk periode ini.
                    </p>
                  </div>

                  {/* Sumber Saldo / Akun */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">Sumber Saldo Dana</label>
                    <select
                      value={budgetForm.sourceAccount}
                      onChange={(e) =>
                        setBudgetForm({ ...budgetForm, sourceAccount: e.target.value as any })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-emerald-500"
                    >
                      <option value="kas_lapangan">Kas Operasional Lapangan (Petty Cash)</option>
                      <option value="mayar_wallet">Saldo Penjualan Mayar (Live Mayar Balance)</option>
                      <option value="bank_transfer">Rekening Bank Operasional Proyek</option>
                      <option value="lainnya">Kas Kantor Pusat</option>
                    </select>
                  </div>

                  {/* Periode Gaji */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">Periode Penggajian</label>
                    <input
                      type="text"
                      value={budgetForm.periodLabel}
                      onChange={(e) => setBudgetForm({ ...budgetForm, periodLabel: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-xs focus:border-emerald-500"
                      placeholder="Contoh: Minggu I November 2026"
                    />
                  </div>

                  {/* Pengirim / Manager Lapangan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">Nama Manager Lapangan</label>
                    <input
                      type="text"
                      value={budgetForm.managerName}
                      onChange={(e) => setBudgetForm({ ...budgetForm, managerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-xs focus:border-emerald-500"
                      placeholder="Nama Site Manager / Mandor Utama"
                    />
                  </div>

                  {/* Catatan Lapangan */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">Catatan Tambahan Manager</label>
                    <textarea
                      rows={2}
                      value={budgetForm.notes}
                      onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:border-emerald-500"
                      placeholder="Misal: Sudah termasuk lembur pengerjaan cor plat lantai 2."
                    />
                  </div>
                </div>
              </div>

              {/* Info Pekerja Terdaftar */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>
                    Terdeteksi <strong>{members.length}</strong> anggota tim &amp; pekerja lapangan di sistem.
                  </span>
                </div>
                <span>Presensi terhubung real-time</span>
              </div>
            </div>
          )}

          {/* STEP 2: AI HRD Menghitung, Memilah & Konfirmasi Kebenaran */}
          {step === 2 && analysis && (
            <div className="space-y-5">
              {/* Comparison Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Saldo Dikirim */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Saldo Dikirim Manager
                  </span>
                  <p className="text-xl font-black text-emerald-400 mt-1">
                    Rp {analysis.summary.budgetSubmitted.toLocaleString('id-ID')}
                  </p>
                  <span className="text-[10px] text-slate-500">{budgetForm.managerName}</span>
                </div>

                {/* Total Kebutuhan Gaji */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Total Gaji Bersih ({analysis.summary.totalEmployees} Pekerja)
                  </span>
                  <p className="text-xl font-black text-white mt-1">
                    Rp {analysis.summary.totalNet.toLocaleString('id-ID')}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Pokok + Lembur - Potongan Kasbon
                  </span>
                </div>

                {/* Status Saldo */}
                <div
                  className={`border rounded-2xl p-4 ${
                    analysis.summary.isSufficient
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-rose-950/40 border-rose-500/40'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Status Kecukupan Saldo
                  </span>
                  <p
                    className={`text-xl font-black mt-1 ${
                      analysis.summary.isSufficient ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {analysis.summary.isSufficient
                      ? `Surplus +Rp ${analysis.summary.budgetVariance.toLocaleString('id-ID')}`
                      : `Defisit -Rp ${Math.abs(analysis.summary.budgetVariance).toLocaleString('id-ID')}`}
                  </p>
                  <span className="text-[10px] font-bold block text-slate-400">
                    {analysis.summary.isSufficient ? 'Saldo Mencukupi ✅' : 'Saldo Kurang ⚠️'}
                  </span>
                </div>
              </div>

              {/* AI HRD Observations & Notes */}
              <div className="bg-gradient-to-r from-rose-950/30 to-purple-950/30 border border-rose-800/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Analisa &amp; Pemilahan AI HRD:</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {analysis.summary.aiObservations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold shrink-0">•</span>
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-rose-800/30 text-xs font-extrabold text-amber-300">
                  💡 {analysis.summary.aiRecommendation}
                </div>
              </div>

              {/* Tabel Rincian Per Karyawan */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs font-black text-slate-300">
                  <span>Rincian Penggajian Lapangan per Pekerja:</span>
                  <span className="text-slate-500 font-medium">{analysis.calculations.length} data diverifikasi</span>
                </div>

                <div className="overflow-x-auto max-h-64 no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Pekerja</th>
                        <th className="py-2.5 px-3">Hadir</th>
                        <th className="py-2.5 px-3">Gaji Pokok</th>
                        <th className="py-2.5 px-3">Lembur</th>
                        <th className="py-2.5 px-3 text-rose-400">Kasbon</th>
                        <th className="py-2.5 px-3 text-emerald-400">Gaji Bersih</th>
                        <th className="py-2.5 px-3">Rekening Mayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {analysis.calculations.map((emp) => (
                        <tr key={emp.memberId} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-bold text-white">{emp.name}</div>
                            <div className="text-[10px] text-slate-400">{emp.position}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-300">{emp.daysPresent} Hari</td>
                          <td className="py-2 px-3 text-slate-300">
                            Rp {emp.grossSalary.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-amber-400">
                            {emp.overtimeBonus > 0 ? `+Rp ${emp.overtimeBonus.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-rose-400">
                            {emp.kasbonDeduction > 0
                              ? `-Rp ${emp.kasbonDeduction.toLocaleString('id-ID')}`
                              : '-'}
                          </td>
                          <td className="py-2 px-3 font-extrabold text-emerald-400">
                            Rp {emp.netSalary.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3">
                            {emp.isBankValid ? (
                              <div className="text-[11px] text-slate-300">
                                <span className="font-bold text-white uppercase">{emp.bankName}</span>{' '}
                                <span className="font-mono text-emerald-400">{emp.bankAccount}</span>
                                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  a/n {emp.bankHolder}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                                Tunai / Rekening Kosong
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Blok Konfirmasi Kebenaran */}
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-amber-500/40 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Konfirmasi Kebenaran Data Penggajian Lapangan:</span>
                </div>
                <p className="text-xs text-slate-300">
                  Untuk keamanan keuangan dan transparansi, mohon verifikasi data sebelum AI HRD mengeksekusi transfer:
                </p>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedTruth.attendanceVerified}
                      onChange={(e) =>
                        setConfirmedTruth({ ...confirmedTruth, attendanceVerified: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Data presensi dan hari kerja telah diverifikasi sesuai laporan mandor lapangan.</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedTruth.deductionsVerified}
                      onChange={(e) =>
                        setConfirmedTruth({ ...confirmedTruth, deductionsVerified: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Potongan kasbon dan tambahan lembur sudah akurat dan disetujui.</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedTruth.approvalAck}
                      onChange={(e) => setConfirmedTruth({ ...confirmedTruth, approvalAck: e.target.checked })}
                      className="w-4 h-4 rounded border-amber-500 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="font-extrabold text-amber-300">
                      Saya selaku Owner / Manager menyetujui AI HRD untuk langsung mencairkan gaji ke rekening karyawan via Sistem Mayar.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Sukses Pencairan & Kirim Slip Gaji */}
          {step === 3 && disbursementResult && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Penggajian Lapangan Berhasil Dieksekusi!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Batch ID Mayar:{' '}
                  <span className="font-mono font-bold text-emerald-400">{disbursementResult.mayarBatchRef}</span>
                </p>
              </div>

              {/* Rangkuman Eksekusi */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Total Dicairkan</span>
                  <span className="font-black text-emerald-400 text-sm">
                    Rp {disbursementResult.totalDisbursed.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Penerima Gaji</span>
                  <span className="font-black text-white text-sm">
                    {disbursementResult.employeeCount} Pekerja
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">Sistem Pembayaran</span>
                  <span className="font-black text-amber-300 text-xs">
                    Mayar Payout &amp; Direct Transfer
                  </span>
                </div>
              </div>

              {/* List Pekerja & Tombol Kirim Slip Gaji WA */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-300">
                  <span>Kirim Slip Gaji Digital ke Pekerja:</span>
                  <span className="text-slate-500 font-medium">WhatsApp / Telegram Ready</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {disbursementResult.items.map((emp) => {
                    const slipText = generateSlipGajiMessage(emp, disbursementResult.periodLabel);
                    const cleanPhone = (emp.phone || '').replace(/[^0-9]/g, '');
                    const waPhone = cleanPhone.startsWith('62')
                      ? cleanPhone
                      : cleanPhone.startsWith('0')
                      ? `62${cleanPhone.slice(1)}`
                      : cleanPhone;

                    const waUrl = waPhone
                      ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(slipText)}`
                      : null;

                    return (
                      <div
                        key={emp.memberId}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{emp.name}</div>
                          <div className="text-[11px] text-emerald-400 font-extrabold">
                            Rp {emp.netSalary.toLocaleString('id-ID')} · {emp.bankName} ({emp.bankAccount})
                          </div>
                        </div>

                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim Slip WA</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(slipText);
                              showToast(`Slip ${emp.name} disalin ke clipboard!`, 'success');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Salin Slip</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0 relative z-10">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProceedToAnalysis}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Proses Saldo &amp; Analisa AI HRD</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Kembali ke Form Saldo
              </button>
              <button
                type="button"
                disabled={isExecuting || !confirmedTruth.approvalAck}
                onClick={handleExecuteDisbursement}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-rose-950 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mentransfer via Sistem Mayar...</span>
                  </>
                ) : (
                  <>
                    <span>Setujui &amp; Cairkan Gaji via Mayar ⚡</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-400">Jurnal pembukuan beban gaji otomatis tercatat.</span>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Tutup &amp; Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
