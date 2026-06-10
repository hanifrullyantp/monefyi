import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Beranda
        </Link>
        <h1 className="text-2xl font-black text-slate-900 mb-4">{title}</h1>
        <div className="bg-white rounded-2xl border p-6 text-sm text-slate-600 leading-relaxed space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Kebijakan Privasi">
      <p>Monefyi Planner mengumpulkan data akun (email, nama) dan data proyek yang Anda input untuk keperluan operasional aplikasi.</p>
      <p>Data disimpan di Supabase dengan enkripsi transit. Kami tidak menjual data pribadi kepada pihak ketiga.</p>
      <p>Hubungi tim Monefyi untuk permintaan penghapusan data akun.</p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Syarat & Ketentuan">
      <p>Dengan menggunakan Monefyi Planner, Anda setuju menggunakan layanan secara legal dan bertanggung jawab atas data proyek yang dimasukkan.</p>
      <p>Layanan disediakan &quot;sebagaimana adanya&quot;. Fitur beta dapat berubah tanpa pemberitahuan sebelumnya.</p>
    </LegalShell>
  );
}

export function ContactPage() {
  return (
    <LegalShell title="Kontak">
      <p>Email: <a href="mailto:hello@monefyi.com" className="text-emerald-600 font-medium">hello@monefyi.com</a></p>
      <p>Untuk demo enterprise atau integrasi kustom, sertakan nama perusahaan dan jumlah proyek aktif.</p>
    </LegalShell>
  );
}
