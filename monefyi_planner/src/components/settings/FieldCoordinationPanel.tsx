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
  Save,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { listMembers } from '../../services/memberService';
import type { OrgMember } from '../../types/onboarding';
import {
  loadTelegramConfig,
  saveTelegramConfig,
  fetchTelegramConfigFromSupabase,
  testTelegramBot,
  sendTelegramMessage,
  loadFieldMemberContacts,
  saveFieldMemberContacts,
  fetchFieldMemberContactsFromSupabase,
  loadProactiveTriggers,
  fetchProactiveTriggersFromSupabase,
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

  const [savingTele, setSavingTele] = useState(false);
  const [testChatMsg, setTestChatMsg] = useState('Halo dari Monefyi! Bot koordinasi AI berhasil terhubung.');
  const [sendingTestMsg, setSendingTestMsg] = useState(false);

  const orgId = tenant?.id;

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    // 1. Fetch remote telegram config & contacts from Supabase
    fetchTelegramConfigFromSupabase(orgId).then(remoteCfg => {
      if (!cancelled && remoteCfg) setTeleConfig(remoteCfg);
    });
    fetchFieldMemberContactsFromSupabase(orgId).then(remoteContacts => {
      if (!cancelled && remoteContacts) setContacts(remoteContacts);
    });
    fetchProactiveTriggersFromSupabase(orgId).then(remoteLogs => {
      if (!cancelled && remoteLogs) setTriggerLogs(remoteLogs);
    });

    // 2. Load members from DB
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
            void saveFieldMemberContacts(next, orgId);
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

  const handleSaveTeleConfig = async () => {
    setSavingTele(true);
    try {
      await saveTelegramConfig(teleConfig, orgId);
      showToast('Konfigurasi Telegram tersimpan ke Supabase Cloud & sinkron antar-perangkat!', 'success');
    } catch {
      showToast('Gagal menyimpan konfigurasi Telegram ke server', 'error');
    } finally {
      setSavingTele(false);
    }
  };

  const handleTestBot = async () => {
    setTestingBot(true);
    setBotTestResult(null);
    const res = await testTelegramBot(teleConfig.botToken);
    setTestingBot(false);
    if (res.ok) {
      const updatedConfig = {
        ...teleConfig,
        botUsername: res.username || teleConfig.botUsername,
      };
      setTeleConfig(updatedConfig);
      await saveTelegramConfig(updatedConfig, orgId);
      setBotTestResult({
        ok: true,
        message: `Terhubung ke @${res.username} (${res.name})`,
      });
      showToast('Bot Telegram terverifikasi & disimpan ke Supabase!', 'success');
    } else {
      setBotTestResult({
        ok: false,
        message: res.error || 'Gagal terhubung ke bot',
      });
    }
  };

  const handleSendTestMessage = async () => {
    const targetChatId = teleConfig.ownerChatId || teleConfig.defaultChannelChatId;
    if (!teleConfig.botToken || !targetChatId) {
      showToast('Token bot dan Chat ID wajib diisi untuk tes kirim pesan', 'error');
      return;
    }
    setSendingTestMsg(true);
    try {
      const res = await sendTelegramMessage(teleConfig.botToken, targetChatId, testChatMsg);
      if (res.ok) {
        showToast('Pesan berhasil terkirim ke Telegram!', 'success');
      } else {
        showToast(res.error || 'Gagal mengirim pesan ke Telegram', 'error');
      }
    } finally {
      setSendingTestMsg(false);
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
      void saveFieldMemberContacts(next, orgId);
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
          {/* Card Shortcut: AI HRD Penggajian Lapangan & Payout Mayar */}
          <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-500/30 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white">Alokasi Saldo &amp; Penggajian Lapangan via AI HRD</h4>
                <p className="text-[11px] text-slate-300">
                  Manager lapangan kirim saldo ➔ AI HRD hitung gaji &amp; minta konfirmasi kebenaran ➔ Payout langsung ke rekening pekerja dengan sistem Mayar.
                </p>
              </div>
            </div>
            <a
              href="/hr"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950"
            >
              <span>Buka AI HRD di HR</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

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

      {/* SUB-TAB 2: KONFIGURASI INTEGRASI TELEGRAM BOT & TUTORIAL */}
      {activeSubTab === 'telegram' && (
        <div className="space-y-5">
          {/* Form Konfigurasi Bot */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Pengaturan Bot Telegram Monefyi</h4>
                <p className="text-xs text-slate-500">
                  Hubungkan bot Telegram Anda agar AI bisa mengirim notifikasi ke mandor, menerima pesan lapangan, dan meneruskan pertanyaan sulit dari user langsung ke Telegram Owner.
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
                <label className="text-xs font-semibold text-slate-700 block">
                  Telegram Bot Token (dari @BotFather) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={teleConfig.botToken}
                  onChange={e => setTeleConfig(prev => ({ ...prev, botToken: e.target.value }))}
                  placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Username Bot</label>
                  <input
                    value={teleConfig.botUsername || ''}
                    onChange={e => setTeleConfig(prev => ({ ...prev, botUsername: e.target.value.replace(/^@/, '') }))}
                    placeholder="MonefyiAssistantBot"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block">
                    Chat ID Owner (Pribadi Anda) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={teleConfig.ownerChatId || ''}
                    onChange={e => setTeleConfig(prev => ({ ...prev, ownerChatId: e.target.value }))}
                    placeholder="123456789 (ID Angka Anda)"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Menerima eskalasi pertanyaan sulit dari user</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block">
                    Grup/Channel Mandor ID (Opsional)
                  </label>
                  <input
                    value={teleConfig.defaultChannelChatId || ''}
                    onChange={e => setTeleConfig(prev => ({ ...prev, defaultChannelChatId: e.target.value }))}
                    placeholder="-100123456789"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Grup koordinasi lapangan</span>
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
                  disabled={savingTele}
                  onClick={() => void handleSaveTeleConfig()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTele ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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

              {/* Input Tes Kirim Pesan */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">Kirim Pesan Tes ke Telegram Anda</label>
                <div className="flex gap-2">
                  <input
                    value={testChatMsg}
                    onChange={e => setTestChatMsg(e.target.value)}
                    placeholder="Tulis pesan pengujian..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={sendingTestMsg || !teleConfig.botToken.trim()}
                    onClick={() => void handleSendTestMessage()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingTestMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Kirim Tes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TUTORIAL LANGKAH DEMI LANGKAH SETTING TELEGRAM */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 space-y-4 shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <Bot className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  Panduan Lengkap: Cara Membuat &amp; Menghubungkan Bot Telegram (5 Menit)
                </h4>
                <p className="text-xs text-slate-400">
                  Ikuti langkah mudah berikut agar bot Telegram Anda aktif dan siap menerima notifikasi serta eskalasi pesan dari user.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {/* Langkah 1 */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-xs">LANGKAH 1</span>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    Buka @BotFather <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-200 font-semibold">Buat Bot Baru di @BotFather</p>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Buka aplikasi Telegram Anda, cari akun resmi <b>@BotFather</b> (centang biru), lalu kirim perintah: <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">/newbot</code>
                </p>
              </div>

              {/* Langkah 2 */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-700/60 space-y-1.5">
                <span className="font-bold text-emerald-400 text-xs">LANGKAH 2</span>
                <p className="text-slate-200 font-semibold">Tentukan Nama &amp; Username Bot</p>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Ketik nama bot Anda (contoh: <i>Monefyi Proyek Bot</i>), lalu buat username unik yang wajib diakhiri kata <b>bot</b> (contoh: <i>monefyi_proyek_bot</i>).
                </p>
              </div>

              {/* Langkah 3 */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-700/60 space-y-1.5">
                <span className="font-bold text-emerald-400 text-xs">LANGKAH 3</span>
                <p className="text-slate-200 font-semibold">Salin HTTP API Token</p>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  BotFather akan memberikan pesan berisi <b>HTTP API Token</b> (diawali angka panjang seperti <code>7123456789:ABC...</code>). Salin token tersebut dan tempel ke kolom <b>Telegram Bot Token</b> di atas.
                </p>
              </div>

              {/* Langkah 4 */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-xs">LANGKAH 4</span>
                  <a
                    href="https://t.me/getmyid_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    Buka @getmyid_bot <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-200 font-semibold">Dapatkan Chat ID Pribadi Anda</p>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Buka bot <b>@getmyid_bot</b> atau <b>@userinfobot</b> di Telegram, klik <i>Start</i>. Bot akan membalas dengan angka ID Anda (contoh: <code>123456789</code>). Tempelkan angka ini ke kolom <b>Chat ID Owner</b>.
                </p>
              </div>
            </div>

            {/* PENTING */}
            <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl text-xs space-y-1">
              <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                ⚠️ PENTING: Klik "START" di Bot Anda Sendiri!
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Telegram melarang bot mengirim pesan pertama ke seseorang sebelum orang tersebut menekan tombol <b>START</b>. Jadi, setelah membuat bot di BotFather, silakan cari username bot Anda di Telegram (misal <i>@monefyi_proyek_bot</i>), lalu klik <b>Start</b>. Setelah itu, klik tombol <b>"Tes Koneksi Bot"</b> di atas. Pesan tes akan langsung masuk ke Telegram Anda!
              </p>
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

