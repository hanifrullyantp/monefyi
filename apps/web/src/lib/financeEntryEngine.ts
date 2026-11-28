import {
  clearEntryEngineStateForTests,
  commitEntry,
  FINANCE_AGENT_INTENTS,
  FINANCE_EVENT_CODES,
  prepareEntry,
  recordFinanceCorrection,
  type AgentNextAction,
  type ClassificationTier,
  type ClosedAccountCandidate,
  type ClosedCandidateSelector,
  type CommitEntryInput,
  type CommitEntryResult,
  type CommittedFinanceEntry,
  type ConfidenceBand,
  type EntityCatalogItem,
  type FinanceAgentIntent,
  type FinanceIntent,
  type OrgFinanceRule,
  type PrepareEntryInput,
  type PrepareEntryResult,
} from '@agent-core/financeEntryEngine';

/**
 * Adapter aplikasi web untuk engine 2-langkah `prepare_entry` / `commit_entry`.
 * Seluruh logika deterministik tetap berada pada sumber tunggal `agent-core/src/financeEntryEngine.ts`.
 */
export function prepareFinanceEntry(input: PrepareEntryInput): PrepareEntryResult {
  return prepareEntry(input);
}

export {
  clearEntryEngineStateForTests,
  commitEntry,
  FINANCE_AGENT_INTENTS,
  FINANCE_EVENT_CODES,
  prepareEntry,
  recordFinanceCorrection,
  type AgentNextAction,
  type ClassificationTier,
  type ClosedAccountCandidate,
  type ClosedCandidateSelector,
  type CommitEntryInput,
  type CommitEntryResult,
  type CommittedFinanceEntry,
  type ConfidenceBand,
  type EntityCatalogItem,
  type FinanceAgentIntent,
  type FinanceIntent,
  type OrgFinanceRule,
  type PrepareEntryInput,
  type PrepareEntryResult,
};
