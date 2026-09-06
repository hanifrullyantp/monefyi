import { buildPartyAccounts, findPartyAccount, type PartyAccount } from '../../lib/financeV2/partyLedger';
import { loadPayables, loadPayablesByProject } from './payableService';
import { loadReceivables, loadReceivablesByProject } from './receivableService';

export async function loadOrgPartyLedger(orgId: string): Promise<PartyAccount[]> {
  const [receivables, payables] = await Promise.all([
    loadReceivables(orgId),
    loadPayables(orgId),
  ]);
  return buildPartyAccounts({ receivables, payables });
}

export async function loadProjectPartyLedger(orgId: string, projectId: string): Promise<PartyAccount[]> {
  const [receivables, payables] = await Promise.all([
    loadReceivablesByProject(orgId, projectId),
    loadPayablesByProject(orgId, projectId),
  ]);
  return buildPartyAccounts({ receivables, payables });
}

export async function loadPartyAccount(
  orgId: string,
  partyName: string,
  projectId?: string,
): Promise<PartyAccount | null> {
  const accounts = projectId
    ? await loadProjectPartyLedger(orgId, projectId)
    : await loadOrgPartyLedger(orgId);
  return findPartyAccount(accounts, partyName);
}
