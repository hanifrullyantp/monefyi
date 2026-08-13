import { Receipt } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-slate-500 leading-relaxed">
          Perhitungan estimasi berdasarkan PMK 168/2023 (TER). Konsultasikan dengan HR/pajak
          untuk angka resmi slip gaji.
        </p>
        <p className="text-xs text-slate-600 mt-2">
          &copy; {new Date().getFullYear()} Monefyi · Bonus Lite senilai Rp 199.000
        </p>
      </div>
    </footer>
  );
}
