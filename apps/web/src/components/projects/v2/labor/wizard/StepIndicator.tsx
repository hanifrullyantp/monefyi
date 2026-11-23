import { Check } from 'lucide-react';
import type { WizardVariant } from '../../../../../hooks/useWizardVariant';

const STEPS = [
  { id: 1, label: 'Pilih Pekerja', short: 'Pekerja' },
  { id: 2, label: 'Atur Tarif', short: 'Tarif' },
  { id: 3, label: 'Pilih Jadwal', short: 'Jadwal' },
] as const;

type Props = {
  currentStep: number;
  variant: WizardVariant;
};

export default function StepIndicator({ currentStep, variant }: Props) {
  const isMobile = variant === 'mobile';
  const progress = (currentStep / 3) * 100;

  return (
    <div>
      <div className="wz-steps">
        {STEPS.map(s => {
          const done = currentStep > s.id;
          const active = currentStep === s.id;
          return (
            <div
              key={s.id}
              className={`wz-step-item${active ? ' active' : ''}${done ? ' done' : ''}`}
            >
              <div className="wz-step-circle">
                {done ? <Check className={isMobile ? 'w-3 h-3' : 'w-[18px] h-[18px]'} /> : s.id}
              </div>
              <span className="wz-step-label">{isMobile ? s.short : s.label}</span>
            </div>
          );
        })}
      </div>
      <div className="wz-progress">
        <div className="wz-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
