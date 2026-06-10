import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Clock, Wallet, ListTodo } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import MetricMiniCard from '../ui/MetricMiniCard';
import { updateMemberProfile } from '../../services/memberService';
import {
  getUserAttendance,
  getMonthlySummary,
  recordAdminAttendance,
  formatAttendanceTime,
  formatCurrency,
  formatSalaryLabel,
  type AttendanceRecord,
} from '../../services/attendanceService';
import {
  listPayrollEntries,
  listBonRequests,
  monthStartIso,
  type PayrollEntry,
  type BonRequest,
  type MemberCompensation,
} from '../../services/payrollService';
import { loadWorkItemsForOrg, type WorkItem } from '../../services/workItemService';
import { showToast } from '../../store/uiStore';
import type { MemberProfilePatch, OrgMember } from '../../types/onboarding';

type SheetTab = 'info' | 'absensi' | 'payroll' | 'todo';

interface EmployeeDetailSheetProps {
  member: OrgMember | null;
  orgId: string;
  open: boolean;
  canManage: boolean;
  compensation?: MemberCompensation;
  hoursPerDay?: number;
  onClose: () => void;
  onUpdated: () => void;
}

const EMP_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Kontrak' },
  { value: 'daily', label: 'Harian' },
] as const;

export default function EmployeeDetailSheet({
  member,
  orgId,
  open,
  canManage,
  compensation,
  hoursPerDay = 8,
  onClose,
  onUpdated,
}: EmployeeDetailSheetProps) {
  const [tab, setTab] = useState<SheetTab>('info');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MemberProfilePatch>({});
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [monthSummary, setMonthSummary] = useState({
    daysPresent: 0,
    effectiveDays: 0,
    partialDays: [] as { date: string; hoursWorked: number; requiredHours: number; checkIn?: string; checkOut?: string }[],
    totalRecords: 0,
  });
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [bons, setBons] = useState<BonRequest[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [attForm, setAttForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '08:00',
    type: 'check_in' as 'check_in' | 'check_out',
  });

  useEffect(() => {
    if (!member) return;
    setForm({
      position: member.position || '',
      department: member.department || '',
      phone: member.phone || '',
      bio: member.bio || '',
      employee_id: member.employee_id || '',
      address: member.address || '',
      employment_type: member.employment_type || 'full_time',
      bank_name: member.bank_name || '',
      bank_account: member.bank_account || '',
      bank_holder: member.bank_holder || '',
    });
    setTab('info');
  }, [member]);

  useEffect(() => {
    if (!member || !open) return;
    void getMonthlySummary(member.user_id, orgId, hoursPerDay).then(setMonthSummary);
  }, [member, orgId, open, hoursPerDay]);

  const loadTabData = useCallback(async () => {
    if (!member || !open) return;
    setLoadingTab(true);
    try {
      if (tab === 'absensi') {
        const [records, summary] = await Promise.all([
          getUserAttendance(member.user_id, orgId, 60),
          getMonthlySummary(member.user_id, orgId, hoursPerDay),
        ]);
        setAttendance(records);
        setMonthSummary(summary);
      } else if (tab === 'payroll') {
        const [entries, bonList] = await Promise.all([
          listPayrollEntries(orgId),
          listBonRequests(orgId),
        ]);
        setPayroll(entries.filter(e => e.user_id === member.user_id));
        setBons(bonList.filter(b => b.user_id === member.user_id));
      } else if (tab === 'todo') {
        const items = await loadWorkItemsForOrg(orgId);
        setWorkItems(items.slice(0, 20));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat', 'error');
    } finally {
      setLoadingTab(false);
    }
  }, [member, orgId, open, tab, hoursPerDay]);

  useEffect(() => {
    if (tab !== 'info') loadTabData();
  }, [tab, loadTabData]);

  const handleSave = async () => {
    if (!member || !canManage) return;
    setSaving(true);
    try {
      await updateMemberProfile(member.id, form);
      showToast('Profil karyawan disimpan', 'success');
      onUpdated();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminAttendance = async () => {
    if (!member || !canManage) return;
    const recordedAt = new Date(`${attForm.date}T${attForm.time}:00`).toISOString();
    try {
      await recordAdminAttendance({
        org_id: orgId,
        user_id: member.user_id,
        user_name: member.profile?.name,
        type: attForm.type,
        recorded_at: recordedAt,
      });
      showToast('Absensi manual tercatat', 'success');
      loadTabData();
      onUpdated();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat absensi', 'error');
    }
  };

  if (!member) return null;

  const name = member.profile?.name || 'Karyawan';
  const estSalary = formatSalaryLabel(compensation);

  const tabs: { id: SheetTab; label: string; icon: typeof Clock }[] = [
    { id: 'info', label: 'Info', icon: Save },
    { id: 'absensi', label: 'Absensi', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'todo', label: 'Todo', icon: ListTodo },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} height="95vh" title={name}>
      <div className="space-y-4 -mt-2">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl">
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900">{name}</div>
            <div className="text-xs text-slate-500 capitalize">{member.role} · {member.position || member.department || '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricMiniCard label="Hadir bulan ini" value={String(monthSummary.daysPresent || '—')} />
          <MetricMiniCard label="Gaji pokok" value={estSalary} />
        </div>
        {monthSummary.partialDays.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            <div className="font-bold mb-1">{monthSummary.partialDays.length} hari jam kerja kurang ({hoursPerDay}j/hari)</div>
            {monthSummary.partialDays.slice(0, 5).map(d => (
              <div key={d.date}>{d.date}: {d.hoursWorked}j{d.checkIn ? ` · ${d.checkIn}` : ''}{d.checkOut ? `–${d.checkOut}` : ''}</div>
            ))}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-3 text-sm">
            {[
              { key: 'employee_id' as const, label: 'ID Karyawan', placeholder: 'EMP-001' },
              { key: 'position' as const, label: 'Jabatan', placeholder: 'Mandor' },
              { key: 'department' as const, label: 'Departemen', placeholder: 'Lapangan' },
              { key: 'phone' as const, label: 'Telepon', placeholder: '08xx' },
              { key: 'address' as const, label: 'Alamat', placeholder: 'Alamat lengkap' },
            ].map(f => (
              <label key={f.key} className="block">
                <span className="text-xs font-semibold text-slate-500">{f.label}</span>
                <input
                  value={form[f.key] || ''}
                  disabled={!canManage}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="mt-1 w-full border rounded-xl px-3 py-2 disabled:bg-slate-50"
                />
              </label>
            ))}
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Tipe kerja</span>
              <select
                value={form.employment_type || 'full_time'}
                disabled={!canManage}
                onChange={e => setForm(prev => ({ ...prev, employment_type: e.target.value as MemberProfilePatch['employment_type'] }))}
                className="mt-1 w-full border rounded-xl px-3 py-2 disabled:bg-slate-50"
              >
                {EMP_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <div className="pt-2 border-t">
              <div className="text-xs font-bold text-slate-500 mb-2">Rekening bank</div>
              {[
                { key: 'bank_name' as const, label: 'Bank' },
                { key: 'bank_account' as const, label: 'No. rekening' },
                { key: 'bank_holder' as const, label: 'Atas nama' },
              ].map(f => (
                <label key={f.key} className="block mb-2">
                  <span className="text-xs text-slate-500">{f.label}</span>
                  <input
                    value={form[f.key] || ''}
                    disabled={!canManage}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="mt-1 w-full border rounded-xl px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
              ))}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            )}
          </div>
        )}

        {tab !== 'info' && loadingTab && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        )}

        {tab === 'absensi' && !loadingTab && (
          <div className="space-y-4">
            {canManage && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-600">Input manual (admin)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={attForm.date} onChange={e => setAttForm(p => ({ ...p, date: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
                  <input type="time" value={attForm.time} onChange={e => setAttForm(p => ({ ...p, time: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
                  <select value={attForm.type} onChange={e => setAttForm(p => ({ ...p, type: e.target.value as 'check_in' | 'check_out' }))} className="border rounded-lg px-2 py-1.5 text-sm col-span-2">
                    <option value="check_in">Check-in</option>
                    <option value="check_out">Check-out</option>
                  </select>
                </div>
                <button type="button" onClick={handleAdminAttendance} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                  Catat absensi
                </button>
              </div>
            )}
            <div className="space-y-2">
              {attendance.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada riwayat absensi.</p>
              ) : attendance.slice(0, 15).map(r => (
                <div key={r.id} className="flex justify-between text-sm py-2 border-b border-slate-50">
                  <span className={r.type === 'check_in' ? 'text-emerald-700' : 'text-slate-600'}>
                    {r.type === 'check_in' ? 'Masuk' : 'Keluar'}
                    {r.note === 'admin_manual' && <span className="text-[10px] ml-1 text-amber-600">(manual)</span>}
                    {r.is_offsite && <span className="text-[10px] ml-1 text-rose-600">(luar lokasi)</span>}
                  </span>
                  <span className="text-slate-500">{formatAttendanceTime(r.timestamp)} · {r.timestamp.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'payroll' && !loadingTab && (
          <div className="space-y-3">
            {compensation && (
              <div className="bg-emerald-50 rounded-xl p-3 text-sm">
                <div className="font-bold text-emerald-800">Kompensasi aktif</div>
                <div className="text-emerald-700 mt-1">
                  Tipe: {compensation.salary_type === 'daily' ? 'Harian' : 'Bulanan'} · {formatSalaryLabel(compensation)}
                </div>
              </div>
            )}
            <div className="text-xs font-bold text-slate-500">Slip bulan ini</div>
            {payroll.filter(p => p.period_month === monthStartIso()).length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada payroll bulan ini.</p>
            ) : payroll.filter(p => p.period_month === monthStartIso()).map(p => (
              <div key={p.id} className="flex justify-between text-sm bg-white border rounded-xl p-3">
                <span>{p.status}</span>
                <span className="font-bold">{formatCurrency(p.net_amount)}</span>
              </div>
            ))}
            {bons.length > 0 && (
              <>
                <div className="text-xs font-bold text-slate-500 pt-2">Bon / advance</div>
                {bons.slice(0, 5).map(b => (
                  <div key={b.id} className="flex justify-between text-sm py-1">
                    <span className="capitalize">{b.status}</span>
                    <span>{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'todo' && !loadingTab && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">{workItems.length} work item aktif di organisasi (semua proyek).</p>
            {workItems.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada work item.</p>
            ) : workItems.map(wi => (
              <div key={wi.id} className="text-sm py-2 border-b border-slate-50">
                <div className="font-medium">{wi.name}</div>
                <div className="text-xs text-slate-400">{wi.planned_end?.slice(0, 10)} · {wi.progress_pct ?? 0}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
