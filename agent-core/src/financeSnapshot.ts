/**
 * Builder output ringkas <= 400 token untuk tool `get_finance_snapshot`.
 * Semua nominal adalah bilangan bulat rupiah dari buku besar financeV2.
 */

export type SnapshotKind = 'ringkasan' | 'laba_rugi' | 'neraca' | 'arus_kas';

export type WalletInput = {
  id: string;
  name: string;
  balance: number;
};

export type ProjectProfitInput = {
  id: string;
  name: string;
  revenue: number;
  hpp: number;
  profit: number;
  rapUsagePct: number;
};

export type FinanceSnapshotInput = {
  asOf: string;
  monthLabel: string;
  kind?: SnapshotKind;
  projectId?: string;
  wallets: WalletInput[];
  receivableTotal: number;
  receivableDue: number;
  retentionTotal: number;
  payableTotal: number;
  payableDue: number;
  monthRevenue: number;
  monthHpp: number;
  monthGrossProfit: number;
  monthOpexActual: number;
  monthOpexPlanned: number;
  monthNetProfit: number;
  projects: ProjectProfitInput[];
  balanceSheet?: {
    totalAktiva: number;
    totalPasiva: number;
    isBalanced: boolean;
    labaDitahan: number;
    asetTetap: number;
  };
  cashFlow?: {
    opening: number;
    inflows: number;
    outflows: number;
    closing: number;
  };
};

export type CompactFinanceSnapshot = {
  as_of: string;
  kind: SnapshotKind;
  summary: string;
  cash?: {
    total: number;
    count: number;
    top: Array<{ id: string; n: string; b: number }>;
  };
  debt?: {
    ar: number;
    ar_due: number;
    ret: number;
    ap: number;
    ap_due: number;
  };
  month?: {
    m: string;
    rev: number;
    gp: number;
    opx_act: number;
    opx_plan: number;
    net: number;
  };
  projects?: {
    total: number;
    items: Array<{ id: string; n: string; net: number; rap_pct: number }>;
  };
  neraca?: {
    aktiva: number;
    pasiva: number;
    balanced: boolean;
    laba_ditahan: number;
    aset_tetap: number;
  };
  cashflow?: {
    open: number;
    inflow: number;
    outflow: number;
    close: number;
  };
};

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) : id;
}

function shortName(name: string, maxLen = 22): string {
  const trimmed = String(name || '').trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1)}…` : trimmed;
}

function roundIdr(n: number): number {
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Estimasi konservatif jumlah token JSON (~3.5 karakter/token agar lolos di tokenizer GPT/Gemini/Claude). */
export function estimateJsonTokens(value: unknown): number {
  const json = JSON.stringify(value);
  return Math.ceil(json.length / 3.5);
}

export function buildFinanceSnapshot(input: FinanceSnapshotInput): CompactFinanceSnapshot {
  const kind: SnapshotKind = input.kind || 'ringkasan';
  const totalCash = roundIdr(input.wallets.reduce((s, w) => s + w.balance, 0));
  const filteredProjects = input.projectId
    ? input.projects.filter((p) => p.id === input.projectId)
    : input.projects;

  const topWallets = [...input.wallets]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map((w) => ({ id: shortId(w.id), n: shortName(w.name), b: roundIdr(w.balance) }));

  const topProjects = [...filteredProjects]
    .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
    .slice(0, 5)
    .map((p) => ({
      id: shortId(p.id),
      n: shortName(p.name),
      net: roundIdr(p.profit),
      rap_pct: Math.round((p.rapUsagePct || 0) * 10) / 10,
    }));

  if (kind === 'laba_rugi') {
    const rev = input.projectId
      ? roundIdr(filteredProjects.reduce((s, p) => s + p.revenue, 0))
      : roundIdr(input.monthRevenue);
    const gp = input.projectId
      ? roundIdr(filteredProjects.reduce((s, p) => s + p.profit, 0))
      : roundIdr(input.monthGrossProfit);
    return {
      as_of: input.asOf,
      kind,
      summary: `L/R ${input.monthLabel}: omzet Rp${rev.toLocaleString('id-ID')}, kotor Rp${gp.toLocaleString('id-ID')}, bersih Rp${roundIdr(input.monthNetProfit).toLocaleString('id-ID')}.`,
      month: {
        m: input.monthLabel,
        rev,
        gp,
        opx_act: roundIdr(input.monthOpexActual),
        opx_plan: roundIdr(input.monthOpexPlanned),
        net: roundIdr(input.monthNetProfit),
      },
      projects: { total: filteredProjects.length, items: topProjects },
    };
  }

  if (kind === 'neraca') {
    const bs = input.balanceSheet || {
      totalAktiva: totalCash + input.receivableTotal + input.retentionTotal,
      totalPasiva: input.payableTotal,
      isBalanced: true,
      labaDitahan: 0,
      asetTetap: 0,
    };
    return {
      as_of: input.asOf,
      kind,
      summary: `Neraca ${input.asOf}: aktiva Rp${roundIdr(bs.totalAktiva).toLocaleString('id-ID')}, pasiva Rp${roundIdr(bs.totalPasiva).toLocaleString('id-ID')} (${bs.isBalanced ? 'seimbang' : 'selisih'}).`,
      cash: { total: totalCash, count: input.wallets.length, top: topWallets },
      debt: {
        ar: roundIdr(input.receivableTotal),
        ar_due: roundIdr(input.receivableDue),
        ret: roundIdr(input.retentionTotal),
        ap: roundIdr(input.payableTotal),
        ap_due: roundIdr(input.payableDue),
      },
      neraca: {
        aktiva: roundIdr(bs.totalAktiva),
        pasiva: roundIdr(bs.totalPasiva),
        balanced: bs.isBalanced,
        laba_ditahan: roundIdr(bs.labaDitahan),
        aset_tetap: roundIdr(bs.asetTetap),
      },
    };
  }

  if (kind === 'arus_kas') {
    const cf = input.cashFlow || { opening: 0, inflows: 0, outflows: 0, closing: totalCash };
    return {
      as_of: input.asOf,
      kind,
      summary: `Arus kas ${input.monthLabel}: masuk Rp${roundIdr(cf.inflows).toLocaleString('id-ID')}, keluar Rp${roundIdr(cf.outflows).toLocaleString('id-ID')}, saldo akhir Rp${roundIdr(cf.closing).toLocaleString('id-ID')}.`,
      cash: { total: totalCash, count: input.wallets.length, top: topWallets },
      cashflow: {
        open: roundIdr(cf.opening),
        inflow: roundIdr(cf.inflows),
        outflow: roundIdr(cf.outflows),
        close: roundIdr(cf.closing),
      },
    };
  }

  return {
    as_of: input.asOf,
    kind: 'ringkasan',
    summary: `Kas Rp${totalCash.toLocaleString('id-ID')}, piutang Rp${roundIdr(input.receivableTotal).toLocaleString('id-ID')}, hutang Rp${roundIdr(input.payableTotal).toLocaleString('id-ID')}, laba bersih ${input.monthLabel} Rp${roundIdr(input.monthNetProfit).toLocaleString('id-ID')}.`,
    cash: { total: totalCash, count: input.wallets.length, top: topWallets },
    debt: {
      ar: roundIdr(input.receivableTotal),
      ar_due: roundIdr(input.receivableDue),
      ret: roundIdr(input.retentionTotal),
      ap: roundIdr(input.payableTotal),
      ap_due: roundIdr(input.payableDue),
    },
    month: {
      m: input.monthLabel,
      rev: roundIdr(input.monthRevenue),
      gp: roundIdr(input.monthGrossProfit),
      opx_act: roundIdr(input.monthOpexActual),
      opx_plan: roundIdr(input.monthOpexPlanned),
      net: roundIdr(input.monthNetProfit),
    },
    projects: { total: filteredProjects.length, items: topProjects },
  };
}

