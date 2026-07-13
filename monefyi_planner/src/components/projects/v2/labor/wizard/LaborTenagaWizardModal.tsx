import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Hourglass, Calendar, Lightbulb, Database } from 'lucide-react';
import type { MappedRapItem } from '../../../../../lib/migration/planner-mapper';
import type { OrgMember } from '../../../../../types/onboarding';
import type { LaborRateType, LaborSlotDraft, LaborSlotInput } from '../../../../../types/labor';
import { useWizardVariant } from '../../../../../hooks/useWizardVariant';
import { listMembers } from '../../../../../services/memberService';
import { listCompensation } from '../../../../../services/payrollService';
import { createRapItem, updateRapItem, syncProjectBudgetFromRap } from '../../../../../services/rapService';
import {
  loadLaborSlots, replaceLaborSlotsForRap, aggregateSlotsToRap,
} from '../../../../../services/laborAssignmentService';
import { createHrMemberQuick } from '../../../../../services/createHrMemberQuick';
import { getUserAttendance } from '../../../../../services/attendanceService';
import { mapAttendanceToActualSlots } from '../../../../../services/laborAttendanceImport';
import { rateTypeToUnit } from '../../../../../lib/laborCostCalculator';
import { showToast } from '../../../../../store/uiStore';
import { useLaborWizardForm } from './useLaborWizardForm';
import WizardShell from './WizardShell';
import EmployeeSelector from './EmployeeSelector';
import RateCard from './RateCard';
import MultiDatePicker from './MultiDatePicker';

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

const RATE_SUGGESTIONS = [150000, 200000, 250000, 300000];

export default function LaborTenagaWizardModal({
  open, onClose, projectId, orgId, orgSlug, userId, userRole,
  sortOffset = 0, editItem, onSaved,
}: Props) {
  const variant = useWizardVariant();
  const {
    step, data, patch, next, back, canProceed, setStep,
  } = useLaborWizardForm({ rapItemId: editItem?.plannerId || null });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingHr, setCreatingHr] = useState(false);
  const [importing, setImporting] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [month, setMonth] = useState(() => new Date());

  const canCreateHr = userRole === 'owner' || userRole === 'manager';
  const isEdit = Boolean(editItem?.plannerId);

  const rateNum = Number(data.unitRate.replace(/\D/g, '')) || 0;
  const rateSuffix = data.rateType === 'hourly' ? 'jam' : data.rateType === 'monthly' ? 'bulan' : 'hari';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mems = await listMembers(orgId);
      const filtered = mems.filter(m => m.role === 'worker' || m.role === 'manager' || m.role === 'owner');
      setMembers(filtered);

      if (editItem?.plannerId) {
        const slots = await loadLaborSlots(projectId, editItem.plannerId);
        const planned: Record<string, LaborSlotDraft> = {};
        const actual: Record<string, LaborSlotDraft> = {};
        let member: OrgMember | null = null;
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
          if (s.rate_type) patch({ rateType: s.rate_type });
          if (s.unit_rate) patch({ unitRate: String(s.unit_rate) });
          if (s.member_id) member = filtered.find(m => m.id === s.member_id) || null;
        }
        const memberMatch = member || filtered.find(m =>
          m.profile?.name?.toLowerCase() === editItem.name.toLowerCase(),
        ) || null;
        patch({
          plannedSlots: planned,
          actualSlots: actual,
          rapItemId: editItem.plannerId,
          member: memberMatch,
          position: editItem.name,
        });
        const firstDate = Object.keys(planned)[0] || Object.keys(actual)[0];
        if (firstDate) setMonth(new Date(firstDate));
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, editItem, patch]);

  useEffect(() => {
    if (open) {
      setStep(1);
      if (!editItem?.plannerId) {
        patch({
          member: null,
          position: '',
          unitRate: '',
          plannedSlots: {},
          actualSlots: {},
          rapItemId: null,
          rateType: 'daily',
          slotKind: 'planned',
        });
      }
      void loadData();
    }
  }, [open, editItem?.plannerId, loadData, setStep, patch]);

  useEffect(() => {
    if (!data.member?.id) return;
    const m = data.member;
    if (m.position && !data.position) patch({ position: m.position });
    void listCompensation(orgId).then(comp => {
      const c = comp.find(x => x.member_id === m.id);
      if (!c) return;
      if (c.salary_type === 'daily') {
        patch({ rateType: 'daily', unitRate: String(c.daily_rate || '') });
      } else if (c.hourly_rate && c.hourly_rate > 0) {
        patch({ rateType: 'hourly', unitRate: String(c.hourly_rate) });
      } else if (c.daily_rate > 0) {
        patch({ rateType: 'daily', unitRate: String(c.daily_rate) });
      } else {
        patch({ rateType: 'monthly', unitRate: String(c.monthly_salary || '') });
      }
    });
  }, [data.member?.id, orgId, patch, data.position]);

  const handleCreateHr = async (name: string) => {
    setCreatingHr(true);
    try {
      const res = await createHrMemberQuick({ orgId, name, canDirectCreate: canCreateHr, orgSlug });
      if (res.ok) {
        setMembers(prev => [...prev, res.member]);
        patch({ member: res.member });
        showToast('Karyawan ditambahkan ke HR', 'success');
      } else {
        showToast(res.error, res.fallbackWorkerId ? 'info' : 'error');
      }
    } finally {
      setCreatingHr(false);
    }
  };

  const handleImportAttendance = async () => {
    if (!data.member?.user_id) {
      showToast('Pilih karyawan HR dulu', 'error');
      return;
    }
    setImporting(true);
    try {
      const records = await getUserAttendance(data.member.user_id, orgId, 90);
      const drafts = mapAttendanceToActualSlots(records, projectId, 8, rateNum, data.rateType);
      if (!drafts.length) {
        showToast('Tidak ada absensi untuk proyek ini', 'info');
        return;
      }
      const next: Record<string, LaborSlotDraft> = {};
      for (const d of drafts) next[d.work_date] = d;
      patch({ actualSlots: next, slotKind: 'actual' });
      showToast(`${drafts.length} hari diambil dari absensi HR`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal impor absensi', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    const name = data.member?.profile?.name?.trim();
    if (!name) {
      showToast('Pilih atau tambah karyawan', 'error');
      return;
    }
    if (rateNum <= 0) {
      showToast('Tarif satuan wajib diisi', 'error');
      return;
    }
    if (!Object.keys(data.plannedSlots).length) {
      showToast('Tambahkan minimal 1 tanggal planning', 'error');
      return;
    }

    setSaving(true);
    try {
      const plannedAgg = aggregateSlotsToRap(
        Object.values(data.plannedSlots).map(d => ({
          slot_kind: 'planned' as const,
          rate_type: data.rateType,
          day_fraction: d.day_fraction,
          regular_hours: d.regular_hours,
          overtime_hours: d.overtime_hours,
          unit_rate: rateNum,
        })),
        'planned',
        data.rateType,
        month,
      );

      let itemId = data.rapItemId;
      if (!itemId) {
        const created = await createRapItem({
          project_id: projectId,
          type: 'labor',
          name,
          unit: rateTypeToUnit(data.rateType),
          quantity: plannedAgg.quantity,
          unit_price: plannedAgg.unitPrice || rateNum,
          sort_order: sortOffset,
          updated_by: userId,
          member_id: data.member?.id || null,
          notes: data.position || null,
        });
        itemId = created.id;
      } else {
        await updateRapItem(itemId, {
          name,
          unit: rateTypeToUnit(data.rateType),
          quantity: plannedAgg.quantity,
          unit_price: plannedAgg.unitPrice || rateNum,
          member_id: data.member?.id || null,
          notes: data.position || null,
          updated_by: userId,
        });
      }

      const slotRows: LaborSlotInput[] = [];
      const base = {
        org_id: orgId,
        project_id: projectId,
        rap_item_id: itemId,
        member_id: data.member?.id || null,
        rate_type: data.rateType,
        unit_rate: rateNum,
        created_by: userId,
      };
      for (const d of Object.values(data.plannedSlots)) {
        slotRows.push({ ...base, work_date: d.work_date, slot_kind: 'planned', day_fraction: d.day_fraction, regular_hours: d.regular_hours, overtime_hours: d.overtime_hours, notes: d.notes || null });
      }
      for (const d of Object.values(data.actualSlots)) {
        slotRows.push({ ...base, work_date: d.work_date, slot_kind: 'actual', day_fraction: d.day_fraction, regular_hours: d.regular_hours, overtime_hours: d.overtime_hours, notes: d.notes || null });
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

  const workerRecap = data.member && (
    <div className="wz-worker-recap">
      <span><strong>{data.member.profile?.name}</strong>
        {data.position ? ` · ${data.position}` : ''}
        {step === 3 ? ` · Rp ${rateNum.toLocaleString('id-ID')}/${rateSuffix}` : ''}
      </span>
      <Database className="wz-db-badge w-4 h-4 ml-auto" />
    </div>
  );

  const stepContent = useMemo(() => {
    if (step === 1) {
      return (
        <EmployeeSelector
          members={members}
          selected={data.member}
          onSelect={m => patch({ member: m, position: m.position || '' })}
          onClear={() => patch({ member: null })}
          onCreateHr={handleCreateHr}
          creating={creatingHr}
          canCreateHr={canCreateHr}
          variant={variant}
        />
      );
    }
    if (step === 2) {
      return (
        <div>
          <h2 className="wz-heading">Atur Tarif Pekerja</h2>
          <p className="wz-subheading">Tentukan tipe pembayaran dan nominal</p>
          {workerRecap}
          <div className="mb-2">
            <label className="wz-label-upper">Jabatan</label>
            <input
              className="wz-search"
              style={{ height: 44 }}
              value={data.position}
              onChange={e => patch({ position: e.target.value })}
              placeholder="Tukang batu, Mandor..."
            />
          </div>
          <div className="wz-label-upper">TIPE PEMBAYARAN</div>
          <div className="wz-rate-grid">
            <RateCard icon={Clock} title="HARIAN" description="per hari" active={data.rateType === 'daily'} onClick={() => patch({ rateType: 'daily' as LaborRateType })} variant={variant} />
            <RateCard icon={Hourglass} title="JAM" description="per jam" active={data.rateType === 'hourly'} onClick={() => patch({ rateType: 'hourly' })} variant={variant} />
            <RateCard icon={Calendar} title="BULANAN" description="per bulan" active={data.rateType === 'monthly'} onClick={() => patch({ rateType: 'monthly' })} variant={variant} />
          </div>
          <div className="wz-label-upper">NOMINAL TARIF</div>
          <div className="wz-amount-box">
            <span className="wz-amount-prefix">Rp</span>
            <input
              className="wz-amount-input"
              value={data.unitRate}
              onChange={e => patch({ unitRate: e.target.value })}
              inputMode="numeric"
            />
            <span className="text-slate-500 font-semibold">/ {rateSuffix}</span>
          </div>
          <div className="wz-chips">
            {RATE_SUGGESTIONS.map(v => (
              <button key={v} type="button" className="wz-chip" onClick={() => patch({ unitRate: String(v) })}>
                Rp {(v / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
          <div className="wz-tip-card">
            <Lightbulb className="w-5 h-5 shrink-0" />
            <span>Tip: Rata-rata tukang kayu di area ini Rp 200–250rb/hari</span>
          </div>
        </div>
      );
    }
    return (
      <MultiDatePicker
        variant={variant}
        slotKind={data.slotKind}
        onSlotKindChange={k => patch({ slotKind: k })}
        month={month}
        onMonthChange={setMonth}
        plannedSlots={data.plannedSlots}
        actualSlots={data.actualSlots}
        onPlannedChange={s => patch({
          plannedSlots: typeof s === 'function' ? s(data.plannedSlots) : s,
        })}
        onActualChange={s => patch({
          actualSlots: typeof s === 'function' ? s(data.actualSlots) : s,
        })}
        unitRate={rateNum}
        rateLabel={rateSuffix}
        onImportAttendance={() => void handleImportAttendance()}
        importing={importing}
        showImport={Boolean(data.member?.user_id)}
        workerRecap={workerRecap}
      />
    );
  }, [step, members, data, variant, creatingHr, canCreateHr, workerRecap, rateSuffix, rateNum, month, importing, patch]);

  return (
    <WizardShell
      open={open}
      variant={variant}
      currentStep={step}
      isEdit={isEdit}
      loading={loading}
      saving={saving}
      canProceed={canProceed}
      onClose={onClose}
      onBack={back}
      onNext={next}
      onSave={() => void handleSave()}
      title={isEdit ? 'Kelola Tenaga Kerja' : 'Tambah Tenaga Kerja'}
    >
      <div key={step} className="anim-fade-in-up">{stepContent}</div>
    </WizardShell>
  );
}
