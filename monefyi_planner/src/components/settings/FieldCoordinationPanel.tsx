import { useEffect, useState, useMemo } from 'react';
import {
  Send,
  Bot,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Bell,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { listMembers } from '../../services/memberService';
import type { OrgMember } from '../../types/onboarding';
import {
  loadTelegramConfig,
  saveTelegramConfig,
  testTelegramBot,
  loadFieldMemberContacts,
  saveFieldMemberContacts,
  loadProactiveTriggers,
  dispatchProactiveAIOutreach,
  type TelegramConfig,
  type FieldMemberContact,
  type ProactiveTriggerRecord,
} from '../../services/telegramService';
import { showToast } from '../../store/uiStore';

export default function FieldCoordinationPanel() {
  const { tenant } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'telegram' | 'logs'>('members');

  // Telegram Config State
  const [teleConfig, setTeleConfig] = useState<TelegramConfig>(() => loadTelegramConfig());
  const [testingBot, setTestingBot] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Field Team Contacts State
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [contacts, setContacts] = useState<Record<string, FieldMemberContact>>(() => loadFieldMemberContacts());

  // Proactive Outreach Logs
  const [triggerLogs, setTriggerLogs] = useState<ProactiveTriggerRecord[]>(() => loadProactiveTriggers());
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const orgId = tenant?.id;

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLoadingMembers(true);
    listMembers(orgId)
      .then(res => {
        if (!cancelled) {
          setMembers(res);
          // Inisialisasi contact setting untuk setiap member baru
          setContacts(prev => {
            const next = { ...prev };
            for (const m of res) {
              if (!next[m.id]) {
                const isField = m.role === 'worker' || /lapangan|mandor|site|tukang|pelaksana/i.test(m.position || '');
                next[m.id] = {
                  memberId: m.id,
                  userId: m.user_id,
                  name: m.profile?.name || 'Karyawan',
                  role: m.role,
                  position: m.position || (m.role === 'worker' ? 'Tukang / Mandor' : 'Staf Proyek'),
                  phone: m.phone || '',
                  telegramChatId: '',
                  telegramUsername: '',
                  proactiveReminders: {
                    dailyLog: isField,
                    attendance: true,
                    cashbonNotice: true,
                    urgentTasks: isField,
                  },
                };
              }
            }
            saveFieldMemberContacts(next);
            return next;
          });
        }
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const handleSaveTeleConfig = () => {
    saveTelegramConfig(teleConfig);
    showToast('Konfigurasi Telegram disimpan', 'success');
  };

  const handleTestBot = async () => {
    setTestingBot(true);
    setBotTestResult(null);
    const res = await testTelegramBot(teleConfig.botToken);
    setTestingBot(false);
    if (res.ok) {
      setTeleConfig(prev => ({
        ...prev,
        botUsername: res.username || prev.botUsername,
      }));
      saveTelegramConfig({
        ...teleConfig,
        botUsername: res.username || teleConfig.botUsername,
      });
      setBotTestResult({
        ok: true,
        message: `Terhubung ke @${res.username} (${res.name})`,
      });
      showToast('Bot Telegram terverifikasi!', 'success');
    } else {
      setBotTestResult({
        ok: false,
        message: res.error || 'Gagal terhubung ke bot',
      });
    }
  };

  const handleUpdateContact = (memberId: string, patch: Partial<FieldMemberContact>) => {
    setContacts(prev => {
      const existing = prev[memberId];
      if (!existing) return prev;
      const updated = {
        ...existing,
        ...patch,
        proactiveReminders: {
          ...existing.proactiveReminders,
          ...(patch.proactiveReminders || {}),
        },
      };
      const next = { ...prev, [memberId]: updated };
      saveFieldMemberContacts(next);
      return next;
    });
  };

  const handleTriggerNow = async (
    member: FieldMemberContact,
    category: ProactiveTriggerRecord['category'],
    customNote?: string,
  ) => {
    setDispatchingId(`${member.memberId}-${category}`);
    try {
      const res = await dispatchProactiveAIOutreach({
        member,
        category,
        customNote,
      });
      setTriggerLogs(loadProactiveTriggers());
      if (res.ok) {
        showToast(res.summary, 'success');
      } else {
        showToast(res.summary, 'error');
      }
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              Koordinasi Proaktif AI & Integrasi Tim Lapangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur bagaimana AI Manager secara proaktif menghubungi mandor, tukang, dan staf lapangan via Telegram
              berdasarkan jabatan & tugas mereka.
            </p>
          </div>
        </div>

        {/* Sub-tab navigasi */}
        <div className="flex items-center gap-2 border-b border-slate-200 mt-4 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 ${
              activeSubTab === 'members'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Daftar Tim & Pemicu Otomatis ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('telegram')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 ${
              activeSubTab === 'telegram'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Konfigurasi Bot Telegram
            {teleConfig.enabled && teleConfig.botToken && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 ml-1" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 ${
              activeSubTab === 'logs'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Riwayat Pesan AI ({triggerLogs.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DAFTAR ANGGOTA TIM & PENGATURAN PEMICU RELEVANSI JABATAN */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Prinsip Koordinasi AI:</strong> AI menghubungi karyawan secara selektif sesuai perannya.
              Contohnya, <em>Mandor / Site Manager</em> otomatis dimintai laporan opname progres harian, sementara{' '}
              <em>Tukang & Teknisi</em> hanya dikirimi notifikasi absensi dan tugas darurat.
            </div>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              Memuat data personel tim...
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Belum ada anggota tim terdaftar. Tambahkan karyawan di menu HRD terlebih dahulu.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map(m => {
                const c = contacts[m.id];
                if (!c) return null;
                const isField =
                  m.role === 'worker' ||
                  /lapangan|mandor|site|tukang|pelaksana|logistik/i.test(m.position || '');

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isField ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.position || c.role}
                            </span>
                          </div>
                          {m.phone && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {m.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500">Telegram Chat ID:</label>
                          <input
                            value={c.telegramChatId || ''}
                            onChange={e => handleUpdateContact(m.id, { telegramChatId: e.target.value.trim() })}
                            placeholder="Contoh: 12345678"
                            className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-mono w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Centang pemicu proaktif sesuai relevansi jabatan */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Pemicu AI Proaktif untuk Jabatan Ini:
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        <label className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={c.proactiveReminders.dailyLog}
                            onChange={e =>
                              handleUpdateContact(m.id, {
                                proactiveReminders: {
                                  ...c.proactiveReminders,
                                  dailyLog: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-emerald-600"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">Lapor Progres Harian</span>
                            <span className="text-[10px] text-slate-500">Cocok untuk Site Manager & Mandor</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={c.proactiveReminders.attendance}
                            onChange={e =>
                              handleUpdateContact(m.id, {
                                proactiveReminders: {
                                  ...c.proactiveReminders,
                                  attendance: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-emerald-600"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">Pengingat Absensi</span>
                            <span className="text-[10px] text-slate-500">Pagi & sore hari di lokasi</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={c.proactiveReminders.cashbonNotice}
                            onChange={e =>
                              handleUpdateContact(m.id, {
                                proactiveReminders: {
                                  ...c.proactiveReminders,
                                  cashbonNotice: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-emerald-600"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">Notifikasi Kasbon</span>
                            <span className="text-[10px] text-slate-500">Saat disetujui / dicairkan</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={c.proactiveReminders.urgentTasks}
                            onChange={e =>
                              handleUpdateContact(m.id, {
                                proactiveReminders: {
                                  ...c.proactiveReminders,
                                  urgentTasks: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-emerald-600"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">Tugas Lapangan Kritis</span>
                            <span className="text-[10px] text-slate-500">Mendekati batas waktu</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Tombol Uji Pemicu AI Sekarang */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400">Kirim Pesan AI Sekarang:</span>
                      {c.proactiveReminders.dailyLog && (
                        <button
                          type="button"
                          disabled={dispatchingId === `${m.id}-dailyLog`}
                          onClick={() => void handleTriggerNow(c, 'dailyLog')}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 disabled:opacity-50"
                        >
                          {dispatchingId === `${m.id}-dailyLog` ? 'Mengirim…' : 'Minta Progres'}
                        </button>
                      )}
                      {c.proactiveReminders.attendance && (
                        <button
                          type="button"
                          disabled={dispatchingId === `${m.id}-attendance`}
                          onClick={() => void handleTriggerNow(c, 'attendance')}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold border border-blue-200 disabled:opacity-50"
                        >
                          {dispatchingId === `${m.id}-attendance` ? 'Mengirim…' : 'Ingatkan Absensi'}
                        </button>
                      )}
                      {c.proactiveReminders.urgentTasks && (
                        <button
                          type="button"
                          disabled={dispatchingId === `${m.id}-urgentTasks`}
                          onClick={() => void handleTriggerNow(c, 'urgentTasks', 'Pengecekan instalasi & material')}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold border border-amber-200 disabled:opacity-50"
                        >
                          {dispatchingId === `${m.id}-urgentTasks` ? 'Mengirim…' : 'Peringatan Tugas'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: KONFIGURASI INTEGRASI TELEGRAM BOT */}
      {activeSubTab === 'telegram' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Pengaturan Bot Telegram Monefyi</h4>
              <p className="text-xs text-slate-500">
                Hubungkan bot Telegram Anda agar AI bisa mengirim pesan notifikasi & koordinasi dua arah dengan tim.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={teleConfig.enabled}
                onChange={e => setTeleConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded text-emerald-600"
              />
              Aktifkan Integrasi Telegram
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block">
                Telegram Bot Token (dari @BotFather)
              </label>
              <input
                type="password"
                autoComplete="off"
                value={teleConfig.botToken}
                onChange={e => setTeleConfig(prev => ({ ...prev, botToken: e.target.value }))}
                placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Cara buat bot: Buka Telegram &gt; Cari <b>@BotFather</b> &gt; Ketik <code>/newbot</code> &gt; Salin HTTP API
                Token ke kolom ini.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block">Username Bot</label>
                <input
                  value={teleConfig.botUsername || ''}
                  onChange={e => setTeleConfig(prev => ({ ...prev, botUsername: e.target.value.replace(/^@/, '') }))}
                  placeholder="MonefyiAssistantBot"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block">
                  Default Channel / Group Chat ID (Opsional)
                </label>
                <input
                  value={teleConfig.defaultChannelChatId || ''}
                  onChange={e => setTeleConfig(prev => ({ ...prev, defaultChannelChatId: e.target.value }))}
                  placeholder="-100123456789"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {botTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  botTestResult.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {botTestResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{botTestResult.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveTeleConfig}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Simpan Konfigurasi Telegram
              </button>
              <button
                type="button"
                disabled={testingBot || !teleConfig.botToken.trim()}
                onClick={() => void handleTestBot()}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Tes Koneksi Bot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RIWAYAT PESAN KOORDINASI AI */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Riwayat Pesan Proaktif AI</h4>
              <p className="text-xs text-slate-500">
                Pencatatan pesan yang dikirimkan oleh AI General Manager / HRD ke masing-masing personel tim.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTriggerLogs(loadProactiveTriggers())}
              className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-500"
              title="Muat ulang riwayat"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {triggerLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada riwayat pesan proaktif yang dikirim.</p>
          ) : (
            <div className="space-y-2">
              {triggerLogs.map(l => (
                <div key={l.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span>{l.targetMemberName}</span>
                      <span className="text-[10px] font-medium text-slate-500">({l.targetRole})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          l.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'simulated'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.status === 'sent' ? 'Terkirim Telegram' : l.status === 'simulated' ? 'Tercatat Sistem' : 'Gagal'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(l.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px] whitespace-pre-wrap bg-white p-2 rounded-lg border border-slate-100">
                    {l.message.replace(/<[^>]*>/g, '')}
                  </p>
                  {l.error && <p className="text-[10px] text-amber-600">Catatan: {l.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

