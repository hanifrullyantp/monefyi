import { supabase } from '../../lib/supabase';
import { calcMonthlyDepreciation, currentYearMonth } from '../../lib/financeV2AdvancedCalc';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { DepreciationMethod, FixedAsset } from '../../types/financeV2';

function mapAsset(row: Record<string, unknown>): FixedAsset {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    category: (row.category as string) || null,
    purchase_date: (row.purchase_date as string) || null,
    purchase_value: Number(row.purchase_value) || 0,
    current_value: Number(row.current_value) || 0,
    depreciation_method: (row.depreciation_method as DepreciationMethod) || 'straight',
    useful_life_months: row.useful_life_months != null ? Number(row.useful_life_months) : null,
    last_depreciation_month: (row.last_depreciation_month as string) || null,
    notes: (row.notes as string) || null,
    photo_url: (row.photo_url as string) || null,
    created_at: row.created_at as string,
  };
}

export async function loadFixedAssets(orgId: string): Promise<FixedAsset[]> {
  const { data, error } = await supabase
    .from('planner_fixed_assets')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data || []).map(mapAsset);
}

export async function createFixedAsset(input: {
  orgId: string;
  name: string;
  category?: string;
  purchaseDate?: string;
  purchaseValue: number;
  usefulLifeMonths?: number;
  depreciationMethod?: DepreciationMethod;
  notes?: string;
  createdBy?: string;
  withJournal?: boolean;
}): Promise<FixedAsset> {
  if (input.purchaseValue <= 0) throw new Error('Nilai perolehan harus lebih dari 0.');

  const { data, error } = await supabase
    .from('planner_fixed_assets')
    .insert({
      org_id: input.orgId,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      purchase_date: input.purchaseDate || null,
      purchase_value: input.purchaseValue,
      current_value: input.purchaseValue,
      depreciation_method: input.depreciationMethod || 'straight',
      useful_life_months: input.usefulLifeMonths || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const asset = mapAsset(data);

  if (input.withJournal !== false) {
    const aset = await findSystemAccount(input.orgId, 'aset_tetap');
    const kas = await findSystemAccount(input.orgId, 'kas', 'bisnis');
    if (aset && kas) {
      await createJournalEntry({
        orgId: input.orgId,
        description: `Perolehan aset: ${input.name}`,
        referenceType: 'manual',
        referenceId: asset.id,
        createdBy: input.createdBy,
        lines: [
          { accountId: aset.id, debit: input.purchaseValue, credit: 0 },
          { accountId: kas.id, debit: 0, credit: input.purchaseValue },
        ],
      });
    }
  }

  return asset;
}

export async function runDepreciation(input: {
  orgId: string;
  assetId: string;
  createdBy?: string;
}): Promise<FixedAsset> {
  const { data: current, error: selErr } = await supabase
    .from('planner_fixed_assets')
    .select('*')
    .eq('id', input.assetId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const asset = mapAsset(current);
  const month = currentYearMonth();
  if (asset.last_depreciation_month === month) {
    throw new Error('Depresiasi bulan ini sudah dijalankan.');
  }
  if (asset.depreciation_method === 'none' || !asset.useful_life_months) {
    throw new Error('Aset tidak menggunakan depresiasi garis lurus.');
  }

  const amt = calcMonthlyDepreciation(
    asset.purchase_value,
    asset.useful_life_months,
    asset.current_value,
  );
  if (amt <= 0) throw new Error('Tidak ada depresiasi untuk dijalankan.');

  const aset = await findSystemAccount(input.orgId, 'aset_tetap');
  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');
  if (!aset || !laba) throw new Error('Akun aset atau laba tidak ditemukan.');

  await createJournalEntry({
    orgId: input.orgId,
    description: `Depresiasi: ${asset.name}`,
    referenceType: 'depreciation',
    referenceId: asset.id,
    createdBy: input.createdBy,
    lines: [
      { accountId: laba.id, debit: amt, credit: 0 },
      { accountId: aset.id, debit: 0, credit: amt },
    ],
  });

  const { data, error } = await supabase
    .from('planner_fixed_assets')
    .update({
      current_value: Math.max(0, asset.current_value - amt),
      last_depreciation_month: month,
    })
    .eq('id', asset.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAsset(data);
}

export async function deleteFixedAsset(id: string): Promise<void> {
  const { error } = await supabase.from('planner_fixed_assets').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
