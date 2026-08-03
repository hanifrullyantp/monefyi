import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BankAccount,
  BankReconciliation,
  BudgetItem,
  ChartAccount,
  CreateJournalInput,
  FinanceAlert,
  FinanceKpis,
  FinancialPeriod,
  JournalEntry,
  JournalLine,
  ReconciliationItem,
  TaxRecord,
} from '../types/finance';
import { buildDefaultChartOfAccounts } from '../data/defaultChartOfAccounts';
import {
  applyBalanceDelta,
  balanceDelta,
  generateEntryNumber,
  getCurrentPeriod,
  isBalanceSheetBalanced,
  validateBalancedEntry,
} from '../lib/financeCalc';
import { buildBalanceSheet, getTotalCash } from '../services/finance/balanceSheetService';
import { buildIncomeStatementFromJournals } from '../services/finance/incomeStatementService';
import { generateId } from '../utils/id';
import { useOfflineStore } from './offlineStore';

interface FinanceState {
  accounts: ChartAccount[];
  journalEntries: JournalEntry[];
  journalLines: JournalLine[];
  bankAccounts: BankAccount[];
  reconciliations: BankReconciliation[];
  reconciliationItems: ReconciliationItem[];
  taxRecords: TaxRecord[];
  financialPeriods: FinancialPeriod[];
  budgetItems: BudgetItem[];
  viewMode: 'live' | 'history';
  historyDate: string;
  initialized: boolean;

  initializeFinance: (tenantId: string) => void;
  createJournal: (input: CreateJournalInput) => JournalEntry | null;
  voidJournal: (journalId: string, reason: string, voidedBy?: string) => JournalEntry | null;
  addAccount: (account: Omit<ChartAccount, 'id' | 'currentBalance'>) => ChartAccount;
  updateAccount: (id: string, updates: Partial<Pick<ChartAccount, 'name' | 'isActive'>>) => void;
  getBalanceSheet: (asOfDate?: string) => ReturnType<typeof buildBalanceSheet>;
  getKpis: () => FinanceKpis;
  getAlerts: () => FinanceAlert[];
  hasJournalForReference: (referenceType: string, referenceId: string, source?: string) => boolean;
  getAccountLedger: (accountId: string) => { journal: JournalEntry; lines: JournalLine[] }[];
  closePeriod: (month: number, year: number, closedBy?: string) => void;
  hydrateFromRemote: (data: Partial<Pick<FinanceState, 'accounts' | 'journalEntries' | 'journalLines'>>) => void;
}

async function queueFinanceMutation(type: string, payload: unknown) {
  try {
    await useOfflineStore.getState().addToQueue(type, payload);
  } catch (err) {
    console.error('Failed to queue finance mutation:', err);
  }
}

const DEMO_TENANT = 'tenant-1';

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      accounts: buildDefaultChartOfAccounts(DEMO_TENANT),
      journalEntries: [],
      journalLines: [],
      bankAccounts: [
        { id: 'bank-1', tenantId: DEMO_TENANT, chartAccountId: 'coa-tenant-1-2', bankName: 'BCA', accountNumber: '1234567890', accountHolder: 'STAY Demo', isActive: true },
        { id: 'bank-2', tenantId: DEMO_TENANT, chartAccountId: 'coa-tenant-1-3', bankName: 'Mandiri', accountNumber: '9876543210', accountHolder: 'STAY Demo', isActive: true },
      ],
      reconciliations: [],
      reconciliationItems: [],
      taxRecords: [],
      financialPeriods: [],
      budgetItems: [],
      viewMode: 'live',
      historyDate: new Date().toISOString().split('T')[0],
      initialized: false,

      initializeFinance: (tenantId) => {
        const state = get();
        if (state.initialized && state.accounts.some((a) => a.tenantId === tenantId)) return;
        const accounts = buildDefaultChartOfAccounts(tenantId);
        set({ accounts, initialized: true });
      },

      createJournal: (input) => {
        const check = validateBalancedEntry(input.lines);
        if (!check.ok) {
          console.error('Journal validation failed:', check.message);
          return null;
        }

        const state = get();
        const entryId = generateId('jrn');
        const entryNumber = generateEntryNumber(state.journalEntries.length);
        const entryDate = input.entryDate || new Date().toISOString().split('T')[0];
        const totalAmount = input.lines.reduce((s, l) => s + l.debit, 0);

        const entry: JournalEntry = {
          id: entryId,
          tenantId: input.tenantId,
          entryNumber,
          entryDate,
          description: input.description,
          source: input.source,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          status: 'posted',
          totalAmount,
          createdBy: input.createdBy,
          createdAt: new Date().toISOString(),
        };

        const newLines: JournalLine[] = input.lines.map((l, i) => ({
          id: generateId('jl'),
          journalId: entryId,
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          notes: l.notes,
        }));

        const updatedAccounts = state.accounts.map((acc) => {
          const accountLines = newLines.filter((l) => l.accountId === acc.id);
          if (!accountLines.length) return acc;
          let balance = acc.currentBalance;
          for (const line of accountLines) {
            const delta = balanceDelta(acc.accountType, line.debit, line.credit);
            balance = applyBalanceDelta(balance, delta);
          }
          return { ...acc, currentBalance: balance };
        });

        // Roll revenue/expense into laba periode berjalan
        const labaAccount = updatedAccounts.find((a) => a.code === '3105');
        if (labaAccount) {
          let labaDelta = 0;
          for (const acc of updatedAccounts) {
            const orig = state.accounts.find((a) => a.id === acc.id);
            if (!orig) continue;
            const diff = acc.currentBalance - orig.currentBalance;
            if (acc.accountType === 'pendapatan') labaDelta += diff;
            if (acc.accountType === 'beban') labaDelta -= diff;
          }
          if (labaDelta !== 0) {
            const idx = updatedAccounts.findIndex((a) => a.code === '3105');
            updatedAccounts[idx] = {
              ...updatedAccounts[idx],
              currentBalance: applyBalanceDelta(updatedAccounts[idx].currentBalance, labaDelta),
            };
          }
        }

        set({
          journalEntries: [entry, ...state.journalEntries],
          journalLines: [...newLines, ...state.journalLines],
          accounts: updatedAccounts,
        });

        void queueFinanceMutation('createJournal', { entry, lines: newLines });

        import('../services/api/stayFinanceApi').then(({ syncJournalToApi, syncAccountBalances }) => {
          void syncJournalToApi(entry, newLines);
          void syncAccountBalances(updatedAccounts);
        });

        return entry;
      },

      voidJournal: (journalId, reason, voidedBy) => {
        const state = get();
        const original = state.journalEntries.find((j) => j.id === journalId);
        if (!original || original.status === 'void') return null;

        const origLines = state.journalLines.filter((l) => l.journalId === journalId);
        const reversalInput: CreateJournalInput = {
          tenantId: original.tenantId,
          description: `VOID — ${original.description}`,
          source: 'void',
          referenceType: 'void',
          referenceId: journalId,
          lines: origLines.map((l) => ({
            accountId: l.accountId,
            debit: l.credit,
            credit: l.debit,
            notes: `Void: ${reason}`,
          })),
          createdBy: voidedBy,
        };

        get().createJournal(reversalInput);

        set({
          journalEntries: get().journalEntries.map((j) =>
            j.id === journalId
              ? { ...j, status: 'void' as const, voidReason: reason, voidedAt: new Date().toISOString() }
              : j
          ),
        });

        void queueFinanceMutation('voidJournal', { journalId, reason });
        return original;
      },

      addAccount: (account) => {
        const newAccount: ChartAccount = {
          ...account,
          id: generateId('coa'),
          currentBalance: 0,
        };
        set((s) => ({ accounts: [...s.accounts, newAccount] }));
        void queueFinanceMutation('addAccount', newAccount);
        return newAccount;
      },

      updateAccount: (id, updates) => {
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
        void queueFinanceMutation('updateAccount', { id, updates });
      },

      getBalanceSheet: () => buildBalanceSheet(get().accounts),

      getKpis: () => {
        const { accounts, journalEntries, journalLines } = get();
        const { month, year } = getCurrentPeriod();
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;

        const current = buildIncomeStatementFromJournals(accounts, journalEntries, journalLines, month, year);
        const previous = buildIncomeStatementFromJournals(accounts, journalEntries, journalLines, prevMonth, prevYear);

        const revChange = previous.totalRevenue > 0
          ? Math.round(((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100)
          : 0;
        const expChange = previous.totalOperatingExpenses > 0
          ? Math.round(((current.totalOperatingExpenses - previous.totalOperatingExpenses) / previous.totalOperatingExpenses) * 100)
          : 0;
        const profitChange = previous.netProfit !== 0
          ? Math.round(((current.netProfit - previous.netProfit) / Math.abs(previous.netProfit)) * 100)
          : 0;

        return {
          totalCash: getTotalCash(accounts),
          monthlyRevenue: current.totalRevenue,
          monthlyExpenses: current.totalOperatingExpenses + current.totalCogs,
          netProfit: current.netProfit,
          revenueChange: revChange,
          expenseChange: expChange,
          profitChange,
        };
      },

      getAlerts: () => {
        const alerts: FinanceAlert[] = [];
        const { accounts, journalEntries } = get();
        const bs = buildBalanceSheet(accounts);

        if (!bs.isBalanced) {
          alerts.push({
            id: 'balance-mismatch',
            type: 'danger',
            title: 'Neraca Tidak Seimbang',
            message: `Selisih ${bs.variance.toLocaleString('id-ID')} — segera periksa jurnal.`,
          });
        }

        const piutangTamu = accounts.find((a) => a.code === '1201');
        if (piutangTamu && piutangTamu.currentBalance > 5_000_000) {
          alerts.push({
            id: 'overdue-receivable',
            type: 'warning',
            title: 'Piutang Tamu Tinggi',
            message: `Piutang tamu Rp ${piutangTamu.currentBalance.toLocaleString('id-ID')} — periksa tagihan jatuh tempo.`,
          });
        }

        const hutangPajak = accounts.find((a) => a.code === '2103');
        if (hutangPajak && hutangPajak.currentBalance > 0) {
          alerts.push({
            id: 'tax-due',
            type: 'warning',
            title: 'Pajak Harus Disetor',
            message: `Hutang pajak Rp ${hutangPajak.currentBalance.toLocaleString('id-ID')}.`,
          });
        }

        const totalCash = getTotalCash(accounts);
        if (totalCash < 2_000_000) {
          alerts.push({
            id: 'low-cash',
            type: 'danger',
            title: 'Kas Mendekati Minimum',
            message: `Saldo kas total Rp ${totalCash.toLocaleString('id-ID')}.`,
          });
        }

        const draftCount = journalEntries.filter((j) => j.status === 'draft').length;
        if (draftCount > 0) {
          alerts.push({
            id: 'draft-journals',
            type: 'info',
            title: 'Jurnal Draft',
            message: `${draftCount} jurnal belum diposting.`,
          });
        }

        return alerts;
      },

      hasJournalForReference: (referenceType, referenceId, source) => {
        return get().journalEntries.some(
          (j) =>
            j.referenceType === referenceType &&
            j.referenceId === referenceId &&
            j.status === 'posted' &&
            (!source || j.source === source)
        );
      },

      getAccountLedger: (accountId) => {
        const { journalEntries, journalLines } = get();
        const lines = journalLines.filter((l) => l.accountId === accountId);
        const journalIds = [...new Set(lines.map((l) => l.journalId))];
        return journalIds
          .map((jid) => ({
            journal: journalEntries.find((j) => j.id === jid)!,
            lines: journalLines.filter((l) => l.journalId === jid),
          }))
          .filter((e) => e.journal && e.journal.status === 'posted')
          .sort((a, b) => b.journal.entryDate.localeCompare(a.journal.entryDate));
      },

      closePeriod: (month, year, closedBy) => {
        const period: FinancialPeriod = {
          id: generateId('period'),
          tenantId: get().accounts[0]?.tenantId ?? DEMO_TENANT,
          periodMonth: month,
          periodYear: year,
          status: 'closed',
          closedAt: new Date().toISOString(),
        };
        set((s) => ({ financialPeriods: [...s.financialPeriods, period] }));
        void queueFinanceMutation('closePeriod', { period, closedBy });
      },

      hydrateFromRemote: (data) => {
        set((s) => ({
          accounts: data.accounts ?? s.accounts,
          journalEntries: data.journalEntries ?? s.journalEntries,
          journalLines: data.journalLines ?? s.journalLines,
          initialized: true,
        }));
      },
    }),
    {
      name: 'stay-finance',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        journalEntries: state.journalEntries,
        journalLines: state.journalLines,
        bankAccounts: state.bankAccounts,
        reconciliations: state.reconciliations,
        taxRecords: state.taxRecords,
        financialPeriods: state.financialPeriods,
        budgetItems: state.budgetItems,
        initialized: state.initialized,
      }),
    }
  )
);

/** Run balance check — call after every journal and on page load */
export function runBalanceCheck(): { ok: boolean; variance: number } {
  const accounts = useFinanceStore.getState().accounts;
  const aktiva = accounts.filter((a) => a.accountType === 'aktiva').reduce((s, a) => s + a.currentBalance, 0);
  const pasiva = accounts.filter((a) => a.accountType === 'pasiva').reduce((s, a) => s + a.currentBalance, 0);
  const variance = Math.round((aktiva - pasiva) * 100) / 100;
  return { ok: isBalanceSheetBalanced(aktiva, pasiva), variance };
}
