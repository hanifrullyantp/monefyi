import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

const DEFAULT_SHIFT_START = { hour: 8, minute: 0 };
const DEFAULT_SHIFT_END = { hour: 17, minute: 0 };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { h: pad(h), m: pad(m), s: pad(sec) };
}

function todayAt(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

interface WorkerWorkTimerProps {
  checkedIn: boolean;
  checkInAtIso?: string;
  checkOutAtIso?: string;
  checkInTimeLabel?: string;
  checkOutTimeLabel?: string;
  projectName?: string;
  loading?: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  shiftStart?: { hour: number; minute: number };
  shiftEnd?: { hour: number; minute: number };
}

export default function WorkerWorkTimer({
  checkedIn,
  checkInAtIso,
  checkOutAtIso,
  checkInTimeLabel,
  checkOutTimeLabel,
  projectName,
  loading,
  onCheckIn,
  onCheckOut,
  shiftStart = DEFAULT_SHIFT_START,
  shiftEnd = DEFAULT_SHIFT_END,
}: WorkerWorkTimerProps) {
  const showToast = useUiStore(s => s.showToast);
  const [now, setNow] = useState(Date.now());
  const [endNotified, setEndNotified] = useState(false);
  const [overtimeNotifiedMin, setOvertimeNotifiedMin] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const shiftStartDate = useMemo(() => todayAt(shiftStart.hour, shiftStart.minute), [shiftStart]);
  const shiftEndDate = useMemo(() => todayAt(shiftEnd.hour, shiftEnd.minute), [shiftEnd]);

  const checkInMs = checkInAtIso ? new Date(checkInAtIso).getTime() : null;
  const checkOutMs = checkOutAtIso ? new Date(checkOutAtIso).getTime() : null;

  const workedSec = checkInMs && checkedIn ? Math.floor((now - checkInMs) / 1000) : checkInMs && checkOutMs
    ? Math.floor((checkOutMs - checkInMs) / 1000)
    : 0;

  const remainingSec = checkedIn && checkInMs
    ? Math.max(0, Math.floor((shiftEndDate.getTime() - now) / 1000))
    : 0;

  const overtimeSec = checkedIn && now > shiftEndDate.getTime()
    ? Math.floor((now - shiftEndDate.getTime()) / 1000)
    : 0;

  const lateSec = checkInMs && checkInMs > shiftStartDate.getTime()
    ? Math.floor((checkInMs - shiftStartDate.getTime()) / 1000)
    : 0;

  const dayProgressPct = checkedIn
    ? Math.min(100, Math.round((workedSec / (9 * 3600)) * 100))
    : 0;

  const worked = formatHMS(workedSec);
  const remaining = formatHMS(remainingSec);
  const overtime = formatHMS(overtimeSec);

  useEffect(() => {
    if (!checkedIn || document.visibilityState !== 'visible') return;
    if (remainingSec > 0 && remainingSec <= 300 && !endNotified) {
      showToast('⏰ 5 menit lagi jam kerja selesai', 'info');
      setEndNotified(true);
    }
    if (remainingSec === 0 && overtimeSec === 0 && !endNotified) {
      showToast('🎉 Jam kerja selesai! Jangan lupa check out.', 'success');
      setEndNotified(true);
    }
    if (overtimeSec > 0) {
      const otMin = Math.floor(overtimeSec / 60);
      if (otMin >= 30 && otMin - overtimeNotifiedMin >= 30) {
        showToast(`⏰ Lembur ${otMin} menit`, 'info');
        setOvertimeNotifiedMin(otMin);
      }
    }
  }, [checkedIn, remainingSec, overtimeSec, endNotified, overtimeNotifiedMin, showToast]);

  if (!checkedIn && !checkOutAtIso) {
    return (
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
        <div className="text-white/80 text-sm mb-1">Status Hari Ini</div>
        <div className="font-bold text-lg mb-1">○ Belum Check In</div>
        <p className="text-sm text-indigo-100 mb-4">
          Jam kerja dimulai: {pad(shiftStart.hour)}:{pad(shiftStart.minute)}
        </p>
        <button
          type="button"
          onClick={onCheckIn}
          disabled={loading}
          className="w-full py-3.5 bg-white text-indigo-700 font-black rounded-xl disabled:opacity-60"
        >
          🟢 CHECK IN SEKARANG
        </button>
      </div>
    );
  }

  if (checkOutAtIso && !checkedIn) {
    const total = formatHMS(workedSec);
    return (
      <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-600 to-slate-700 text-white space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold">SELESAI BEKERJA ✅</span>
        </div>
        <div className="text-sm space-y-1 text-slate-200">
          <div>Check in: {checkInTimeLabel || '—'}</div>
          <div>Check out: {checkOutTimeLabel || '—'}</div>
          <div className="font-mono font-bold text-white pt-2">
            Total: {total.h} jam {total.m} menit
          </div>
        </div>
      </div>
    );
  }

  const isOvertime = overtimeSec > 0;
  const isLate = lateSec > 0;

  return (
    <div
      className={`rounded-2xl p-5 text-white space-y-4 ${
        isOvertime
          ? 'bg-gradient-to-br from-amber-500 to-orange-600'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm uppercase tracking-wide">
          {isOvertime ? 'LEMBUR 🟡' : isLate ? 'TERLAMBAT 🟡' : 'SEDANG BEKERJA 🟢'}
        </span>
      </div>

      {isLate && !isOvertime && (
        <p className="text-sm text-amber-100">
          Terlambat {Math.floor(lateSec / 60)} menit (dari {pad(shiftStart.hour)}:{pad(shiftStart.minute)})
        </p>
      )}

      <div className="bg-white/15 rounded-xl p-4 text-center">
        <div className="text-xs text-white/80 uppercase tracking-wider mb-2">Sudah bekerja</div>
        <div className="font-mono text-4xl font-black tracking-tight">
          {worked.h}<span className="text-lg opacity-70">:</span>{worked.m}
          <span className="text-lg opacity-70">:</span>{worked.s}
        </div>
        <div className="text-[10px] text-white/70 mt-1">jam · menit · detik</div>
      </div>

      {!isOvertime ? (
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-xs text-white/80 uppercase tracking-wider mb-2">Sisa waktu kerja</div>
          <div className="font-mono text-3xl font-black">
            {remaining.h}<span className="opacity-70">:</span>{remaining.m}
            <span className="opacity-70">:</span>{remaining.s}
          </div>
        </div>
      ) : (
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-xs text-white/80 uppercase tracking-wider mb-2">Waktu lembur</div>
          <div className="font-mono text-3xl font-black">
            {overtime.h}<span className="opacity-70">:</span>{overtime.m}
            <span className="opacity-70">:</span>{overtime.s}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs mb-1 text-white/80">
          <span>Progress hari ini</span>
          <span>{dayProgressPct}%</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${dayProgressPct}%` }} />
        </div>
      </div>

      {checkInTimeLabel && (
        <p className="text-xs text-white/80">Check in: {checkInTimeLabel} · Jam kerja {pad(shiftStart.hour)}:{pad(shiftStart.minute)} – {pad(shiftEnd.hour)}:{pad(shiftEnd.minute)}</p>
      )}

      {projectName && (
        <div className="flex items-center gap-2 text-sm text-emerald-100">
          <MapPin className="w-4 h-4 shrink-0" /> {projectName}
        </div>
      )}

      <button
        type="button"
        onClick={onCheckOut}
        disabled={loading}
        className="w-full py-3.5 bg-white text-rose-600 font-black rounded-xl disabled:opacity-60"
      >
        🔴 CHECK OUT
      </button>
    </div>
  );
}
