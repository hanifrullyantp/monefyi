import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { isRabEnabled, isRabSuperAdmin } from '../../lib/rab';
import AhspImport from './AhspImport';

function RabDashboard() {
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">RAB — Rencana Anggaran Biaya</h1>
          <p className="text-slate-600 text-sm mt-1">
            Modul Estimator RAB Rumah hanya tersedia untuk super admin terverifikasi.
          </p>
        </div>
        <a
          href="/app/rab/ahsp-import"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#157F5F] text-white rounded-lg text-sm font-medium hover:bg-[#0E6B4E] transition"
        >
          Buka AhspImport →
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-[#E5EAE8] shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Katalog AHSP</h2>
          <p className="text-slate-600 text-sm mb-4">
            Verifikasi analisis harga satuan dari SE 47/SE/Dk/2026 Lampiran VI sebelum digunakan dalam RAB.
          </p>
          <a
            href="/app/rab/ahsp-import"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#157F5F] text-white rounded-lg text-sm font-medium hover:bg-[#0E6B4E] transition"
          >
            Buka AhspImport →
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg border border-[#E5EAE8] shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Proyek RAB</h2>
          <p className="text-slate-600 text-sm mb-4">
            Kelola proyek RAB, versi, dan skenario perhitungan biaya konstruksi.
          </p>
          <p className="text-xs text-slate-400 italic">Fitur proyek RAB akan tersedia setelah migrasi data selesai.</p>
        </div>
      </div>
    </div>
  );
}

export default function RabPage() {
  const { user, emailVerified } = useAppStore();
  const location = useLocation();

  if (!isRabEnabled()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-slate-900">Fitur RAB belum diaktifkan</h2>
          <p className="text-sm text-slate-500 mt-2">
            Fitur Estimator RAB Rumah belum dinyalakan di produksi.
          </p>
        </div>
      </div>
    );
  }

  if (!isRabSuperAdmin(user?.email, emailVerified)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-slate-900">Akses ditolak</h2>
          <p className="text-sm text-slate-500 mt-2">
            Halaman RAB hanya tersedia untuk super admin terverifikasi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<RabDashboard />} />
      <Route path="ahsp-import" element={<AhspImport />} />
      <Route path="*" element={<Navigate to="/app/rab" replace />} />
    </Routes>
  );
}
