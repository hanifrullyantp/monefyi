import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { BalanceCheckResult } from '../../../lib/migration/balance-sheet';
import { formatRupiah } from '../../../utils/projectUi';

type Props = {
  normalized: NormalizedProjectView;
  balanceCheck: BalanceCheckResult;
  onOpenDiagnosis: () => void;
};

export default function TabV2Keuangan({ normalized, balanceCheck, onOpenDiagnosis }: Props) {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Neraca Project</h3>
          <button
            type="button"
            onClick={onOpenDiagnosis}
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              balanceCheck.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {balanceCheck.isBalanced ? 'Balance' : 'Diagnosa'}
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <Row label="Saldo Kas" value={formatRupiah(normalized.project.saldo)} />
          <Row label="Piutang" value={formatRupiah(normalized.project.budget.piutang)} />
          <Row label="Total Aktiva" value={formatRupiah(normalized.totalAktiva)} />
          <Row label="Dana Masuk" value={formatRupiah(normalized.totalPemasukan)} />
          <Row label="Hutang Vendor" value={formatRupiah(normalized.project.budget.hutang)} />
          <Row label="Pasiva (net)" value={formatRupiah(normalized.totalPasiva)} bold />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold pt-2 border-t' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
