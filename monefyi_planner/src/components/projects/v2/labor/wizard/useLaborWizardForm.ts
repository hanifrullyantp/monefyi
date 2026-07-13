import { useCallback, useState } from 'react';
import type { OrgMember } from '../../../../../types/onboarding';
import type { LaborRateType, LaborSlotDraft, LaborSlotKind } from '../../../../../types/labor';

export type LaborWizardStep = 1 | 2 | 3;

export type LaborWizardFormData = {
  member: OrgMember | null;
  position: string;
  rateType: LaborRateType;
  unitRate: string;
  slotKind: LaborSlotKind;
  plannedSlots: Record<string, LaborSlotDraft>;
  actualSlots: Record<string, LaborSlotDraft>;
  rapItemId: string | null;
};

const INITIAL: LaborWizardFormData = {
  member: null,
  position: '',
  rateType: 'daily',
  unitRate: '',
  slotKind: 'planned',
  plannedSlots: {},
  actualSlots: {},
  rapItemId: null,
};

export function useLaborWizardForm(initial?: Partial<LaborWizardFormData>) {
  const [step, setStep] = useState<LaborWizardStep>(1);
  const [data, setData] = useState<LaborWizardFormData>({ ...INITIAL, ...initial });

  const patch = useCallback((p: Partial<LaborWizardFormData>) => {
    setData(prev => ({ ...prev, ...p }));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setData({ ...INITIAL, ...initial });
  }, [initial]);

  const canProceedStep1 = Boolean(data.member?.id || data.member?.profile?.name);
  const canProceedStep2 = (Number(data.unitRate.replace(/\D/g, '')) || 0) > 0;
  const canProceedStep3 = Object.keys(data.plannedSlots).length > 0;

  const canProceed = step === 1 ? canProceedStep1 : step === 2 ? canProceedStep2 : canProceedStep3;

  const next = useCallback(() => setStep(s => (s < 3 ? (s + 1) as LaborWizardStep : s)), []);
  const back = useCallback(() => setStep(s => (s > 1 ? (s - 1) as LaborWizardStep : s)), []);

  return {
    step, setStep, data, patch, reset, next, back, canProceed,
    canProceedStep1, canProceedStep2, canProceedStep3,
  };
}
