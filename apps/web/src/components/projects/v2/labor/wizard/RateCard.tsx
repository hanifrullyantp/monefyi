import type { LucideIcon } from 'lucide-react';
import type { WizardVariant } from '../../../../../hooks/useWizardVariant';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  variant: WizardVariant;
};

export default function RateCard({ icon: Icon, title, description, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wz-rate-card${active ? ' active' : ''}`}
    >
      <Icon className="w-8 h-8 sm:w-6 sm:h-6" />
      <span className="wz-rate-title">{title}</span>
      <span className="wz-rate-desc">{description}</span>
    </button>
  );
}
