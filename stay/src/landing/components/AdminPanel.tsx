import React, { useState } from 'react';
import {
  X, Settings, Palette, Search, BarChart2, Image, Star,
  CreditCard, Bell, FileText, Plug, Scale, Code, Eye,
  Save, RotateCcw, Trash2, Plus, GripVertical
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabId =
  | 'branding' | 'seo' | 'tracking' | 'media' | 'testimoni'
  | 'pricing' | 'toast' | 'form' | 'integrasi' | 'legal'
  | 'advanced' | 'publish';

const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'branding', icon: <Palette className="w-4 h-4" />, label: 'Branding' },
  { id: 'seo', icon: <Search className="w-4 h-4" />, label: 'SEO' },
  { id: 'tracking', icon: <BarChart2 className="w-4 h-4" />, label: 'Tracking' },
  { id: 'media', icon: <Image className="w-4 h-4" />, label: 'Media' },
  { id: 'testimoni', icon: <Star className="w-4 h-4" />, label: 'Testimoni' },
  { id: 'pricing', icon: <CreditCard className="w-4 h-4" />, label: 'Pricing' },
  { id: 'toast', icon: <Bell className="w-4 h-4" />, label: 'Toast' },
  { id: 'form', icon: <FileText className="w-4 h-4" />, label: 'Form & CTA' },
  { id: 'integrasi', icon: <Plug className="w-4 h-4" />, label: 'Integrasi' },
  { id: 'legal', icon: <Scale className="w-4 h-4" />, label: 'Legal' },
  { id: 'advanced', icon: <Code className="w-4 h-4" />, label: 'Advanced' },
  { id: 'publish', icon: <Eye className="w-4 h-4" />, label: 'Publish' },
];

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const Input: React.FC<{ placeholder?: string; defaultValue?: string; type?: string }> = ({ placeholder, defaultValue, type = 'text' }) => (
  <input
    type={type}
    placeholder={placeholder}
    defaultValue={defaultValue}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
  />
);

const Toggle2: React.FC<{ label: string; defaultChecked?: boolean }> = ({ label, defaultChecked }) => {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`w-10 h-5.5 rounded-full relative transition-all duration-200 flex items-center ${on ? 'bg-emerald-500' : 'bg-gray-300'}`}
        style={{ height: '22px', width: '40px' }}
      >
        <span className={`absolute w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${on ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  );
};

const tabContent: Record<TabId, React.ReactNode> = {
  branding: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">🎨 Branding & Identitas</h3>
      <Field label="Nama Brand">
        <Input defaultValue="stay." />
      </Field>
      <Field label="Tagline Utama">
        <Input defaultValue="Smart Tenant Accommodation Yield" />
      </Field>
      <Field label="Warna Primary" hint="Warna utama brand">
        <div className="flex gap-2 items-center">
          <input type="color" defaultValue="#10B981" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer" />
          <Input defaultValue="#10B981" />
        </div>
      </Field>
      <Field label="Warna Secondary">
        <div className="flex gap-2 items-center">
          <input type="color" defaultValue="#3B82F6" className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer" />
          <Input defaultValue="#3B82F6" />
        </div>
      </Field>
      <Field label="Font Family">
        <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400">
          <option>Plus Jakarta Sans</option>
          <option>Inter</option>
          <option>Poppins</option>
          <option>Nunito</option>
        </select>
      </Field>
      <Field label="Upload Logo">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 transition-all">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-xs text-gray-500">Drag & drop logo atau klik untuk upload</div>
          <div className="text-xs text-gray-400 mt-0.5">PNG, SVG, max 2MB</div>
        </div>
      </Field>
    </div>
  ),
  seo: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">🔍 Meta & SEO</h3>
      <Field label="Title Tag">
        <Input defaultValue="STAY — Platform Manajemen Penginapan Modern" />
      </Field>
      <Field label="Meta Description">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 resize-none" rows={3} defaultValue="STAY hadir untuk membebaskan pemilik penginapan dari kerumitan manual — semua dalam satu aplikasi." />
      </Field>
      <Field label="Meta Keywords">
        <Input defaultValue="manajemen penginapan, software hotel, booking online, PMS Indonesia" />
      </Field>
      <Field label="Open Graph Title">
        <Input defaultValue="STAY — Kelola Penginapan Tanpa Ribet" />
      </Field>
      <Field label="Open Graph Image">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400">
          <div className="text-xs text-gray-500">Upload OG Image (1200x630px)</div>
        </div>
      </Field>
      <Field label="Canonical URL">
        <Input defaultValue="https://stay.monefyi.com" />
      </Field>
      <Toggle2 label="Index oleh Google" defaultChecked={true} />
      <Toggle2 label="Sitemap otomatis" defaultChecked={true} />
    </div>
  ),
  tracking: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">📊 Tracking & Analytics</h3>
      <Field label="Google Analytics 4 ID" hint="Format: G-XXXXXXXXXX">
        <Input placeholder="G-XXXXXXXXXX" />
      </Field>
      <Field label="Google Tag Manager ID" hint="Format: GTM-XXXXXXX">
        <Input placeholder="GTM-XXXXXXX" />
      </Field>
      <Field label="Facebook Pixel ID">
        <Input placeholder="123456789012345" />
      </Field>
      <Field label="TikTok Pixel ID">
        <Input placeholder="C4XXXXXXXXXXXXXXXX" />
      </Field>
      <Field label="Hotjar Site ID">
        <Input placeholder="1234567" />
      </Field>
      <Field label="Microsoft Clarity ID">
        <Input placeholder="xxxxxxxxxx" />
      </Field>
      <Field label="Custom Head Script">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono resize-none" rows={4} placeholder="<!-- Script custom di <head> -->" />
      </Field>
      <button className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-all">
        🧪 Test Tracking
      </button>
    </div>
  ),
  media: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">🖼️ Icon & Media</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {['🏨', '📊', '💳', '👥', '📱', '🔒', '⭐', '🚀', '💡', '🎯', '📈', '🏆'].map((icon, i) => (
          <button key={i} className="p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl text-xl transition-all">
            {icon}
          </button>
        ))}
      </div>
      <Field label="Upload Custom Icon (SVG)">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400">
          <div className="text-xs text-gray-500">Upload SVG icon</div>
        </div>
      </Field>
      <h4 className="font-semibold text-gray-700 text-sm mb-2 mt-4">📂 Media Library</h4>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-2xl border border-gray-200 cursor-pointer hover:border-emerald-400 transition-all">
            {['🖼️', '📸', '🎨', '🏞️', '🖼️', '📷'][i]}
          </div>
        ))}
      </div>
    </div>
  ),
  testimoni: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">⭐ Testimoni Manager</h3>
      <button className="w-full py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-2 mb-4">
        <Plus className="w-4 h-4" /> Tambah Testimoni
      </button>
      {[
        { name: 'Ibu Sri Hartati', place: 'Villa Kencana, Bandung', active: true },
        { name: 'Pak Herman Wijaya', place: 'Homestay Merapi, Yogyakarta', active: true },
        { name: 'Rina Kusuma', place: 'Guest House Kota Tua, Jakarta', active: true },
      ].map((t, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
          <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700">{t.name[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">{t.name}</div>
            <div className="text-xs text-gray-500 truncate">{t.place}</div>
          </div>
          <div className={`w-2 h-2 rounded-full ${t.active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          <button className="text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  ),
  pricing: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">💰 Pricing Manager</h3>
      {['Starter', 'Profesional', 'Enterprise'].map((plan, i) => (
        <div key={i} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-800 text-sm">{plan}</span>
            <Toggle2 label="Tampilkan" defaultChecked={true} />
          </div>
          <Field label="Nama Paket">
            <Input defaultValue={plan} />
          </Field>
          <Field label="Harga Bulanan">
            <Input defaultValue={i === 0 ? '0' : i === 1 ? '299000' : '799000'} type="number" />
          </Field>
          {i === 1 && <Toggle2 label="Tandai sebagai Populer" defaultChecked={true} />}
        </div>
      ))}
      <Field label="Kupon Promo">
        <div className="flex gap-2">
          <Input placeholder="HEMAT20" />
          <Input placeholder="20" type="number" />
        </div>
      </Field>
    </div>
  ),
  toast: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">🔔 Toast Notification Manager</h3>
      <Toggle2 label="Aktifkan notifikasi" defaultChecked={true} />
      <Toggle2 label="Suara notifikasi" defaultChecked={true} />
      <Field label="Interval kemunculan (detik)" hint="Min 5, Max 60">
        <Input defaultValue="20" type="number" />
      </Field>
      <button className="w-full py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-2 mb-4">
        <Plus className="w-4 h-4" /> Tambah Toast
      </button>
      {['🎉 Ibu Sari baru saja mendaftar', '💰 Villa Emerald menerima booking', '⭐ Homestay Sejuk mendapat ulasan 5 bintang'].map((t, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
          <div className="flex-1 text-sm text-gray-700 truncate">{t}</div>
          <button className="text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  ),
  form: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">📝 Form & CTA</h3>
      <Field label="Teks Tombol CTA Utama">
        <Input defaultValue="Coba Gratis 14 Hari" />
      </Field>
      <Field label="Teks Tombol Secondary">
        <Input defaultValue="Lihat Demo Dashboard" />
      </Field>
      <Field label="Email Lead Dikirim Ke">
        <Input defaultValue="hello@monefyi.com" type="email" />
      </Field>
      <Field label="Webhook URL (Zapier/Make)">
        <Input placeholder="https://hooks.zapier.com/..." />
      </Field>
      <Field label="Pesan Thank You">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" rows={3} defaultValue="Terima kasih! Tim kami akan menghubungi Anda dalam 24 jam." />
      </Field>
      <Toggle2 label="Redirect setelah submit" />
      <Toggle2 label="Kirim email konfirmasi ke user" defaultChecked={true} />
    </div>
  ),
  integrasi: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">🔌 Integrasi</h3>
      {[
        { name: 'Xendit Payment', icon: '💳', connected: true },
        { name: 'WhatsApp Business API', icon: '📱', connected: false },
        { name: 'Resend (Email)', icon: '📧', connected: true },
        { name: 'Airtable CRM', icon: '📊', connected: false },
        { name: 'Zapier', icon: '⚡', connected: false },
        { name: 'Slack', icon: '💬', connected: false },
      ].map((intg, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xl">{intg.icon}</span>
            <div>
              <div className="text-sm font-semibold text-gray-800">{intg.name}</div>
              <div className={`text-xs ${intg.connected ? 'text-emerald-600' : 'text-gray-400'}`}>
                {intg.connected ? '● Terhubung' : '○ Belum terhubung'}
              </div>
            </div>
          </div>
          <button className={`px-3 py-1.5 text-xs font-bold rounded-lg ${intg.connected ? 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
            {intg.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      ))}
    </div>
  ),
  legal: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">📜 Legal & Compliance</h3>
      <Field label="Terms of Service">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none font-mono" rows={5} placeholder="Masukkan teks Syarat & Ketentuan..." />
      </Field>
      <Field label="Privacy Policy">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none font-mono" rows={5} placeholder="Masukkan teks Kebijakan Privasi..." />
      </Field>
      <Toggle2 label="Tampilkan cookie consent banner" defaultChecked={true} />
      <Toggle2 label="GDPR compliance mode" />
      <Field label="Data Retention Period" hint="Berapa lama data disimpan">
        <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
          <option>1 tahun</option>
          <option>2 tahun</option>
          <option>5 tahun</option>
          <option>Selamanya</option>
        </select>
      </Field>
    </div>
  ),
  advanced: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">⚙️ Advanced Settings</h3>
      <Field label="Custom CSS">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none font-mono text-xs" rows={6} placeholder="/* Custom CSS Anda */" />
      </Field>
      <Field label="Custom JavaScript">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none font-mono text-xs" rows={4} placeholder="// Custom JS Anda" />
      </Field>
      <Toggle2 label="Maintenance mode" />
      <Toggle2 label="Cache auto-clear" defaultChecked={true} />
      <Field label="IP Whitelist (staging)" hint="Satu IP per baris">
        <textarea className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none font-mono" rows={3} placeholder="192.168.1.1" />
      </Field>
      <div className="flex gap-2 mt-2">
        <button className="flex-1 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200">🗑️ Clear Cache</button>
        <button className="flex-1 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200">📤 Export Settings</button>
      </div>
    </div>
  ),
  publish: (
    <div>
      <h3 className="font-bold text-gray-800 mb-4">🚀 Preview & Publish</h3>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
        <div className="text-sm font-semibold text-emerald-700 mb-1">✅ Status: Published</div>
        <div className="text-xs text-emerald-600">Terakhir dipublish: 19 Jan 2026, 14:30 WIB</div>
      </div>
      <button className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 mb-3 flex items-center justify-center gap-2">
        <Eye className="w-4 h-4" /> Preview Sebelum Publish
      </button>
      <button className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 mb-4 flex items-center justify-center gap-2">
        🚀 Publish Perubahan
      </button>
      <h4 className="font-semibold text-gray-700 text-sm mb-2">📋 Riwayat Perubahan</h4>
      {[
        { time: '14:30', desc: 'Update pricing section', author: 'Admin' },
        { time: '12:15', desc: 'Tambah testimoni baru', author: 'Admin' },
        { time: '09:45', desc: 'Edit hero headline', author: 'Admin' },
      ].map((h, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg mb-2">
          <div className="text-xs text-gray-400 w-10 flex-shrink-0">{h.time}</div>
          <div className="flex-1 text-xs text-gray-700">{h.desc}</div>
          <button className="text-xs text-emerald-600 hover:underline flex-shrink-0">Revert</button>
        </div>
      ))}
    </div>
  ),
};

const AdminPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('branding');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-[70] flex flex-col admin-panel ${
          isOpen ? 'admin-panel-open' : 'admin-panel-closed'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="font-black text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              Admin Panel
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Ctrl + Shift + A untuk buka/tutup</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-14 bg-gray-50 border-r border-gray-100 flex flex-col py-3 gap-1 overflow-y-auto flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }`}
              >
                {tab.icon}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3 flex items-center gap-1">
              {tabs.find(t => t.id === activeTab)?.icon}
              {tabs.find(t => t.id === activeTab)?.label}
            </div>
            {tabContent[activeTab]}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0 bg-white">
          <button
            onClick={() => {}}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Discard
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Tersimpan! ✓' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;
