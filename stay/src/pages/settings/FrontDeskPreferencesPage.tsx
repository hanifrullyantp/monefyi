import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, RotateCcw, Volume2, Zap, Keyboard, Palette, Bell } from 'lucide-react';
import {
  useFrontDeskPreferencesStore,
  type FrontDeskPreferences,
} from '../../stores/frontDeskPreferencesStore';
import { getFrontDeskAnalyticsSummary } from '../../utils/frontDeskAnalytics';
import {
  getNotificationPermission,
  getNotificationStatus,
  isNotificationSupported,
  requestNotificationPermission,
  sendTestNotification,
} from '../../services/pwa/pushNotification';
import { cn } from '../../utils/cn';
import Button from '../../components/ui/Button';

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}

function ToggleRow({ icon, label, description, checked, onChange, testId }: ToggleRowProps) {
  return (
    <label
      className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      data-testid={testId}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 dark:text-white">{label}</p>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}

/**
 * Pengaturan UX Front Desk — animasi, suara, shortcuts, dark mode.
 */
export default function FrontDeskPreferencesPage() {
  const navigate = useNavigate();
  const prefs = useFrontDeskPreferencesStore();
  const analytics = getFrontDeskAnalyticsSummary();
  const notifStatus = getNotificationStatus();
  const permission = getNotificationPermission();
  const [testResult, setTestResult] = useState<string | null>(null);

  const permissionLabel =
    permission === 'granted'
      ? 'Diizinkan'
      : permission === 'denied'
        ? 'Ditolak browser'
        : permission === 'unsupported'
          ? 'Tidak didukung'
          : 'Belum diminta';

  const handleOsNotificationsToggle = async (next: boolean) => {
    if (next) {
      const result = await requestNotificationPermission();
      if (!result.granted) {
        return;
      }
    }
    prefs.setPreference('osNotificationsEnabled', next);
  };

  const set = <K extends keyof FrontDeskPreferences>(key: K, value: FrontDeskPreferences[K]) => {
    prefs.setPreference(key, value);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="frontdesk-preferences-page">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/front-desk')}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700"
          aria-label="Kembali ke Front Desk"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Preferensi Front Desk
          </h1>
          <p className="text-sm text-slate-500">Sesuaikan pengalaman kerja harian Anda</p>
        </div>
      </div>

      <div className="space-y-3">
        <ToggleRow
          icon={<Zap className="h-5 w-5" />}
          label="Animasi UI"
          description="Stagger grid, transisi view, dan efek micro-interaction"
          checked={prefs.animationsEnabled}
          onChange={(v) => set('animationsEnabled', v)}
          testId="pref-animations"
        />
        <ToggleRow
          icon={<Volume2 className="h-5 w-5" />}
          label="Efek Suara"
          description="Notifikasi ting, success, error, dan click"
          checked={prefs.soundsEnabled}
          onChange={(v) => set('soundsEnabled', v)}
          testId="pref-sounds"
        />
        <ToggleRow
          icon={<Keyboard className="h-5 w-5" />}
          label="Keyboard Shortcuts"
          description="N, S, F, 1/2/3, Esc, ?, Cmd+K"
          checked={prefs.keyboardShortcutsEnabled}
          onChange={(v) => set('keyboardShortcutsEnabled', v)}
          testId="pref-keyboard"
        />
        <ToggleRow
          icon={<Moon className="h-5 w-5" />}
          label="Dark Mode"
          description="Tema gelap untuk shift malam"
          checked={prefs.darkMode}
          onChange={(v) => set('darkMode', v)}
          testId="pref-dark-mode"
        />
        <ToggleRow
          icon={<Bell className="h-5 w-5" />}
          label="Notifikasi Push"
          description="Popup sistem saat ada booking, pembayaran, atau tugas urgent"
          checked={prefs.osNotificationsEnabled}
          onChange={(v) => void handleOsNotificationsToggle(v)}
          testId="pref-os-notifications"
        />
      </div>

      {isNotificationSupported() && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="font-bold text-slate-800 dark:text-white">Status Izin Notifikasi</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {permissionLabel}
            {notifStatus.swRegistered ? ' · Service worker aktif' : ' · Service worker belum aktif'}
          </p>
          {permission === 'denied' && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Buka pengaturan browser → Site settings → Notifications → izinkan untuk situs ini.
            </p>
          )}
          {permission === 'granted' && prefs.osNotificationsEnabled && (
            <Button
              variant="outline"
              className="mt-3 w-full min-h-[44px] rounded-xl"
              onClick={async () => {
                const r = await sendTestNotification();
                setTestResult(
                  r.sent
                    ? 'Notifikasi test terkirim.'
                    : `Gagal: ${r.skipped || r.error || 'unknown'}`
                );
              }}
            >
              Kirim Notifikasi Test
            </Button>
          )}
          {testResult && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{testResult}</p>
          )}
        </div>
      )}

      {prefs.soundsEnabled && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Volume Suara
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(prefs.soundVolume * 100)}
              onChange={(e) => set('soundVolume', Number(e.target.value) / 100)}
              className="w-40 accent-emerald-500"
              aria-label="Volume suara"
            />
          </label>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
          <Palette className="h-4 w-4" />
          Analytics Lokal (privasi)
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">View favorit</dt>
            <dd className="font-bold text-slate-800 dark:text-white">
              {Object.entries(analytics.viewModeCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Waktu di panel</dt>
            <dd className="font-bold text-slate-800 dark:text-white">
              {analytics.avgPanelDurationMs > 0
                ? `${Math.round(analytics.avgPanelDurationMs / 1000)}s`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Aksi terpopuler</dt>
            <dd className="font-bold text-slate-800 dark:text-white">
              {Object.entries(analytics.actionCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Error rate</dt>
            <dd className="font-bold text-slate-800 dark:text-white">
              {(analytics.errorRate * 100).toFixed(0)}%
            </dd>
          </div>
        </dl>
      </div>

      <Button
        variant="outline"
        icon={<RotateCcw className="h-4 w-4" />}
        className="w-full min-h-[48px] rounded-xl"
        onClick={() => prefs.resetPreferences()}
      >
        Reset ke Default
      </Button>
    </div>
  );
}
