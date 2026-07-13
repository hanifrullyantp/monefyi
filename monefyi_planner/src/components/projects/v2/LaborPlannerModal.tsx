import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Loader2, CalendarDays, Download } from 'lucide-react';
import type { MappedRapItem } from '../../../lib/migration/planner-mapper';
import type { OrgMember } from '../../../types/onboarding';
import type { LaborRateType, LaborSlotDraft, LaborSlotKind, LaborSlotInput } from '../../../types/labor';
import { listMembers } from '../../../services/memberService';
import { listCompensation } from '../../../services/payrollService';
import { createRapItem, updateRapItem, syncProjectBudgetFromRap } from '../../../services/rapService';
import {
  loadLaborSlots, replaceLaborSlotsForRap, aggregateSlotsToRap,
} from '../../../services/laborAssignmentService';
import { createHrMemberQuick } from '../../../services/createHrMemberQuick';
import { getUserAttendance } from '../../../services/attendanceService';
import { mapAttendanceToActualSlots } from '../../../services/laborAttendanceImport';
import { rateTypeToUnit } from '../../../lib/laborCostCalculator';
import { formatRupiah } from '../../../utils/projectUi';
import { showToast } from '../../../store/uiStore';
import LaborWorkerPicker from './labor/LaborWorkerPicker';
import LaborCalendarGrid from './labor/LaborCalendarGrid';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  orgId: string;
  orgSlug?: string;
  userId: string;
  userRole?: string;
  sortOffset?: number;
  editItem?: MappedRapItem | null;
  onSaved: () => void | Promise<void>;
};

function defaultDraft(date: string): LaborSlotDraft {
  return {
    work_date: date,
    day_fraction: 1,
    regular_hours: 8,
    overtime_hours: 0,
  };
}

export default function LaborPlannerModal({
  open, onClose, projectId, orgId, orgSlug, userId, userRole,
  sortOffset = 0, editItem, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingHr, setCreatingHr] = useState(false);
  const [importing, setImporting] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [position, setPosition] = useState('');
  const [rateType, setRateType] = useState<LaborRateType>('daily');
  const [unitRate, setUnitRate] = useState('');
  const [slotKind, setSlotKind] = useState<LaborSlotKind>('planned');
  const [month, setMonth] = useState(() => new Date());
  const [plannedSlots, setPlannedSlots] = useState<Record<string, LaborSlotDraft>>({});
  const [actualSlots, setActualSlots] = useState<Record<string, LaborSlotDraft>>({});
  const [rapItemId, setRapItemId] = useState<string | null>(editItem?.plannerId || null);

  const canCreateHr = userRole === 'owner' || userRole === 'manager';
  const isEdit = Boolean(editItem?.plannerId);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  const activeSlots = slotKind === 'planned' ? plannedSlots : actualSlots;
  const setActiveSlots = slotKind === 'planned' ? setPlannedSlots : setActualSlots;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mems, comp] = await Promise.all([
        listMembers(orgId),
        listCompensation(orgId),
      ]);
      setMembers(mems.filter(m => m.role === 'worker' || m.role === 'manager' || m.role === 'owner'));

      if (editItem?.plannerId) {
        const slots = await loadLaborSlots(projectId, editItem.plannerId);
        const planned: Record<string, LaborSlotDraft> = {};
        const actual: Record<string, LaborSlotDraft> = {};
        for (const s of slots) {
          const draft: LaborSlotDraft = {
            work_date: s.work_date,
            day_fraction: s.day_fraction,
            regular_hours: s.regular_hours,
            overtime_hours: s.overtime_hours,
            notes: s.notes || undefined,
          };
          if (s.slot_kind === 'planned') planned[s.work_date] = draft;
          else actual[s.work_date] = draft;
          if (s.rate_type) setRateType(s.rate_type);
          if (s.unit_rate) setUnitRate(String(s.unit_rate));
          if (s.member_id) setSelectedMemberId(s.member_id);
        }
        setPlannedSlots(planned);
        setActualSlots(actual);
        setRapItemId(editItem.plannerId);

        const memberMatch = mems.find(m =>
          m.profile?.name?.toLowerCase() === editItem.name.toLowerCase(),
        );
        if (memberMatch) setSelectedMemberId(memberMatch.id);
      } else if (mems.length) {
        setSelectedMemberId(mems[0].id);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, editItem]);

  useEffect(() => {
    if (open) void loadData();
  }, [open, loadData]);

  useEffect(() => {
    if (!selectedMemberId) return;
    const m = members.find(x => x.id === selectedMemberId);
    if (m?.position) setPosition(m.position);

    void listCompensation(orgId).then(comp => {
      const c = comp.find(x => x.member_id === selectedMemberId);
      if (!c) return;
      if (c.salary_type === 'daily') {
        setRateType('daily');
        setUnitRate(String(c.daily_rate || ''));
      } else if (c.hourly_rate && c.hourly_rate > 0) {
        setRateType('hourly');
        setUnitRate(String(c.hourly_rate));
      } else if (c.daily_rate > 0) {
        setRateType('daily');
        setUnitRate(String(c.daily_rate));
      } else {
        setRateType('monthly');
        setUnitRate(String(c.monthly_salary || ''));
      }
    });
  }, [selectedMemberId, members, orgId]);

  const summary = useMemo(() => {
    const rate = Number(unitRate.replace(/\D/g, '')) || 0;
    const plannedList = Object.values(plannedSlots);
    const actualList = Object.values(actualSlots);
    const plannedAgg = aggregateSlotsToRap(
      plannedList.map(d => ({
        slot_kind: 'planned' as const,
        rate_type: rateType,
        day_fraction: d.day_fraction,
        regular_hours: d.regular_hours,
        overtime_hours: d.overtime_hours,
        unit_rate: rate,
      })),
      'planned',
      rateType,
      month,
    );
    const actualAgg = aggregateSlotsToRap(
      actualList.map(d => ({
        slot_kind: 'actual' as const,
        rate_type: rateType,
        day_fraction: d.day_fraction,
        regular_hours: d.regular_hours,
        overtime_hours: d.overtime_hours,
        unit_rate: rate,
      })),
      'actual',
      rateType,
      month,
    );
    return { plannedAgg, actualAgg, rate };
  }, [plannedSlots, actualSlots, rateType, unitRate, month]);

  const handleSelectMember = (m: OrgMember) => {
    setSelectedMemberId(m.id);
    if (m.position) setPosition(m.position);
  };

  const handleCreateManual = async (name: string, phone?: string) => {
    setCreatingHr(true);
    try {
      const res = await createHrMemberQuick({
        orgId,
        name,
        phone,
        canDirectCreate: canCreateHr,
        orgSlug,
      });
      if (res.ok) {
        setMembers(prev => [...prev, res.member]);
        setSelectedMemberId(res.member.id);
        showToast('Karyawan ditambahkan ke HR', 'success');
      } else if (res.fallbackWorkerId) {
        showToast(res.error, 'info');
      } else {
        showToast(res.error, 'error');
      }
    } finally {
      setCreatingHr(false);
    }
  };

  const handleToggleDate = (date: string) => {
    setActiveSlots(prev => {
      if (prev[date]) {
        const next = { ...prev };
        delete next[date];
        return next;
      }
      return { ...prev, [date]: defaultDraft(date) };
    });
  };

  const handleImportAttendance = async () => {
    if (!selectedMember?.user_id) {
      showToast('Pilih karyawan HR dulu', 'error');
      return;
    }
    setImporting(true);
    try {
      const records = await getUserAttendance(selectedMember.user_id, orgId, 90);
      const drafts = mapAttendanceToActualSlots(
        records,
        projectId,
        8,
        summary.rate,
        rateType,
      );
      if (!drafts.length) {
        showToast('Tidak ada absensi untuk proyek ini', 'info');
        return;
      }
      const next: Record<string, LaborSlotDraft> = {};
      for (const d of drafts) next[d.work_date] = d;
      setActualSlots(next);
      setSlotKind('actual');
      showToast(`${drafts.length} hari diambil dari absensi HR`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal impor absensi', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    const name = selectedMember?.profile?.name?.trim();
    if (!name) {
      showToast('Pilih atau tambah karyawan', 'error');
      return;
    }
    const rate = Number(unitRate.replace(/\D/g, '')) || 0;
    if (rate <= 0) {
      showToast('Tarif satuan wajib diisi', 'error');
      return;
    }
    if (!Object.keys(plannedSlots).length) {
      showToast('Tambahkan minimal 1 tanggal planning', 'error');
      return;
    }

    setSaving(true);
    try {
      const plannedAgg = summary.plannedAgg;
      let itemId = rapItemId;

      if (!itemId) {
        const created = await createRapItem({
          project_id: projectId,
          type: 'labor',
          name,
          unit: rateTypeToUnit(rateType),
          quantity: plannedAgg.quantity,
          unit_price: plannedAgg.unitPrice || rate,
          sort_order: sortOffset,
          updated_by: userId,
          member_id: selectedMemberId,
          notes: position || null,
        });
        itemId = created.id;
        setRapItemId(itemId);
      } else {
        await updateRapItem(itemId, {
          name,
          unit: rateTypeToUnit(rateType),
          quantity: plannedAgg.quantity,
          unit_price: plannedAgg.unitPrice || rate,
          member_id: selectedMemberId,
          notes: position || null,
          updated_by: userId,
        });
      }

      const slotRows: LaborSlotInput[] = [];
      const base = {
        org_id: orgId,
        project_id: projectId,
        rap_item_id: itemId,
        member_id: selectedMemberId,
        rate_type: rateType,
        unit_rate: rate,
        created_by: userId,
      };

      for (const d of Object.values(plannedSlots)) {
        slotRows.push({
          ...base,
          work_date: d.work_date,
          slot_kind: 'planned',
          day_fraction: d.day_fraction,
          regular_hours: d.regular_hours,
          overtime_hours: d.overtime_hours,
          notes: d.notes || null,
        });
      }
      for (const d of Object.values(actualSlots)) {
        slotRows.push({
          ...base,
          work_date: d.work_date,
          slot_kind: 'actual',
          day_fraction: d.day_fraction,
          regular_hours: d.regular_hours,
          overtime_hours: d.overtime_hours,
          notes: d.notes || null,
        });
      }

      await replaceLaborSlotsForRap(itemId, slotRows);
      await syncProjectBudgetFromRap(projectId);
      await onSaved();
      showToast(isEdit ? 'Jadwal tenaga diperbarui' : 'Tenaga kerja ditambahkan ke RAP', 'success');
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45">
      <div className="bg-white w-full sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <h2 className="font-black text-slate-900">
              {isEdit ? 'Kelola Tenaga Kerja' : 'Tambah Tenaga Kerja'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <LaborWorkerPicker
              members={members}
              selectedId={selectedMemberId}
              onSelect={handleSelectMember}
              onCreateManual={handleCreateManual}
              creating={creatingHr}
              canCreateHr={canCreateHr}
            />

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Jabatan</label>
                <input
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Tukang batu, Mandor..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tarif</label>
                <div className="flex gap-1">
                  {(['daily', 'hourly', 'monthly'] as const).map(rt => (
                    <button
                      key={rt}
                      type="button"
                      onClick={() => setRateType(rt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border ${
                        rateType === rt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {rt === 'daily' ? 'Hari' : rt === 'hourly' ? 'Jam' : 'Bulan'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Rp / {rateType === 'hourly' ? 'jam' : rateType === 'monthly' ? 'bulan' : 'hari'}
                </label>
                <input
                  value={unitRate}
                  onChange={e => setUnitRate(e.target.value)}
                  placeholder="200000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['planned', 'actual'] as const).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSlotKind(k)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      slotKind === k
                        ? k === 'planned'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {k === 'planned' ? 'Planning' : 'Realisasi'}
                  </button>
                ))}
              </div>
              {slotKind === 'actual' && selectedMember && (
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void handleImportAttendance()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Ambil dari absensi HR
                </button>
              )}
            </div>

            <div className="surface-card p-4">
              <LaborCalendarGrid
                month={month}
                onMonthChange={setMonth}
                slotKind={slotKind}
                slots={activeSlots}
                onToggleDate={handleToggleDate}
                onUpdateSlot={(date, patch) => setActiveSlots(prev => ({
                  ...prev,
                  [date]: { ...prev[date], ...patch },
                }))}
                onRemoveSlot={date => setActiveSlots(prev => {
                  const next = { ...prev };
                  delete next[date];
                  return next;
                })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="surface-inset px-4 py-3 rounded-xl">
                <div className="text-[10px] font-bold text-blue-600 uppercase">Planning</div>
                <div className="text-sm font-black text-slate-800">
                  {summary.plannedAgg.totalDays} hari
                  {summary.plannedAgg.totalOvertimeHours > 0 && ` · ${summary.plannedAgg.totalOvertimeHours}j lembur`}
                </div>
                <div className="text-xs text-slate-500">{formatRupiah(summary.plannedAgg.totalCost)}</div>
              </div>
              <div className="surface-inset px-4 py-3 rounded-xl">
                <div className="text-[10px] font-bold text-rose-600 uppercase">Realisasi</div>
                <div className="text-sm font-black text-slate-800">
                  {summary.actualAgg.totalDays} hari
                  {summary.actualAgg.totalOvertimeHours > 0 && ` · ${summary.actualAgg.totalOvertimeHours}j lembur`}
                </div>
                <div className="text-xs text-slate-500">{formatRupiah(summary.actualAgg.totalCost)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 px-5 py-4 border-t shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan ke RAP
          </button>
        </div>
      </div>
    </div>
  );
}
