import { supabase } from '../../lib/supabase';
import { recalculateProjectSpent } from '../costService';
import { extraPiutangBeyondContract } from '../../lib/projects/cashIdentity';
import {
  dividendPool,
  emptyDividendConfig,
  parseDividendConfig,
  previewDividend,
  type DividendConfig,
  type DividendPayout,
  type DividendPreviewLine,
} from '../../lib/projects/dividend';
import { normalizePartyKey } from '../../lib/financeV2/partyLedger';
import { loadReceivablesByProject, recordReceivablePayment } from './receivableService';
import { loadPayablesByProject } from './payableService';

export async function loadProjectDividendConfig(projectId: string): Promise<DividendConfig> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('settings')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(error.message);
  const settings = (data?.settings || {}) as Record<string, unknown>;
  return parseDividendConfig(settings.dividend);
}

export async function saveProjectDividendConfig(
  projectId: string,
  config: DividendConfig,
): Promise<DividendConfig> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('settings')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(error.message);
  const settings = { ...((data?.settings || {}) as Record<string, unknown>), dividend: config };
  const { error: updErr } = await supabase
    .from('planner_projects')
    .update({ settings })
    .eq('id', projectId);
  if (updErr) throw new Error(updErr.message);
  return config;
}

export async function buildProjectDividendPreview(input: {
  orgId: string;
  projectId: string;
  received: number;
  spent: number;
  contractValue: number;
  config?: DividendConfig;
}): Promise<{
  config: DividendConfig;
  pool: number;
  ownerPiutang: number;
  extraPiutang: number;
  lines: DividendPreviewLine[];
  pctTotal: number;
  cashOut: number;
}> {
  const config = input.config ?? await loadProjectDividendConfig(input.projectId);
  const [recs, pays] = await Promise.all([
    loadReceivablesByProject(input.orgId, input.projectId),
    loadPayablesByProject(input.orgId, input.projectId),
  ]);
  void pays;
  const totalPiutang = recs.reduce((s, r) => s + Math.max(0, r.amount - r.paid_amount), 0);
  const ownerKeys = new Set(
    config.parties.filter(p => p.isOwner).map(p => normalizePartyKey(p.name)),
  );
  const ownerPiutangByParty: Record<string, number> = {};
  let ownerPiutang = 0;
  for (const rec of recs) {
    const key = normalizePartyKey(rec.debtor_name);
    if (!ownerKeys.has(key)) continue;
    const outstanding = Math.max(0, rec.amount - rec.paid_amount);
    ownerPiutangByParty[key] = (ownerPiutangByParty[key] || 0) + outstanding;
    ownerPiutang += outstanding;
  }
  const extraPiutang = extraPiutangBeyondContract(totalPiutang, input.contractValue, input.received);
  const alreadyPaidCash = config.payouts.reduce((s, p) => s + p.cashPaid, 0);
  const pool = dividendPool({
    received: input.received,
    spent: input.spent,
    totalPiutang,
    ownerPiutang,
    contractValue: input.contractValue,
    alreadyPaidCash,
  });
  const preview = previewDividend({
    pool: pool + alreadyPaidCash,
    parties: config.parties,
    ownerPiutangByParty,
    payouts: config.payouts,
  });
  return {
    config,
    pool: pool + alreadyPaidCash,
    ownerPiutang,
    extraPiutang,
    ...preview,
  };
}

export async function recordDividendPayouts(input: {
  orgId: string;
  projectId: string;
  userId: string;
  received: number;
  spent: number;
  contractValue: number;
}): Promise<DividendConfig> {
  const preview = await buildProjectDividendPreview(input);
  if (preview.pctTotal <= 0) throw new Error('Atur persentase pihak deviden terlebih dahulu.');
  if (Math.abs(preview.pctTotal - 100) > 0.05) {
    throw new Error(`Total persentase harus 100% (sekarang ${preview.pctTotal}%).`);
  }

  const recs = await loadReceivablesByProject(input.orgId, input.projectId);
  const today = new Date().toISOString().slice(0, 10);
  const newPayouts: DividendPayout[] = [...preview.config.payouts];

  for (const line of preview.lines) {
    if (line.remainingCash <= 0 && line.offsetPiutang <= 0) continue;
    if (line.alreadyPaid > 0 && line.remainingCash <= 0) continue;

    let offsetLeft = line.offsetPiutang;
    if (offsetLeft > 0) {
      const ownerRecs = recs.filter(
        r => normalizePartyKey(r.debtor_name) === normalizePartyKey(line.party.name)
          && r.amount > r.paid_amount,
      );
      for (const rec of ownerRecs) {
        if (offsetLeft <= 0) break;
        const take = Math.min(offsetLeft, rec.amount - rec.paid_amount);
        await recordReceivablePayment({
          orgId: input.orgId,
          receivableId: rec.id,
          amount: take,
          notes: `Offset deviden proyek`,
          createdBy: input.userId,
          withJournal: false,
        });
        offsetLeft -= take;
      }
    }

    if (line.remainingCash > 0) {
      const { error } = await supabase.from('planner_cost_realizations').insert({
        project_id: input.projectId,
        date: today,
        description: `Deviden: ${line.party.name}`,
        total_amount: Math.round(line.remainingCash),
        supplier: line.party.name,
        status: 'dividend',
        recorded_by: input.userId,
      });
      if (error) throw new Error(error.message);
    }

    newPayouts.push({
      id: `pay-${Date.now()}-${line.party.id}`,
      partyId: line.party.id,
      partyName: line.party.name,
      shareAmount: line.shareAmount,
      offsetPiutang: line.offsetPiutang,
      cashPaid: line.remainingCash,
      date: today,
      note: line.offsetPiutang > 0 ? 'Termasuk offset piutang owner' : undefined,
    });
  }

  await recalculateProjectSpent(input.projectId);
  return saveProjectDividendConfig(input.projectId, {
    parties: preview.config.parties,
    payouts: newPayouts,
  });
}

export function suggestDefaultParties(names: string[]): DividendConfig {
  const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))];
  if (unique.length === 0) return emptyDividendConfig();
  const sharePct = Math.round((100 / unique.length) * 100) / 100;
  return {
    parties: unique.map((name, i) => ({
      id: `party-${i + 1}`,
      name,
      sharePct: i === unique.length - 1
        ? Math.round((100 - sharePct * (unique.length - 1)) * 100) / 100
        : sharePct,
      isOwner: true,
    })),
    payouts: [],
  };
}
