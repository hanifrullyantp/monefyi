import { useState } from 'react';
import { useWizardVariant } from '../../hooks/useWizardVariant';
import StepIndicator from '../../components/projects/v2/labor/wizard/StepIndicator';
import RateCard from '../../components/projects/v2/labor/wizard/RateCard';
import SummaryCard from '../../components/projects/v2/labor/wizard/SummaryCard';
import { Clock, Hourglass, Calendar } from 'lucide-react';
import '../../styles/modal-wizard-tenaga.css';

/** Dev-only showcase for wizard subcomponents */
export default function WizardTenagaDemo() {
  const variant = useWizardVariant();
  const [step, setStep] = useState(1);
  const [rate, setRate] = useState<'daily' | 'hourly' | 'monthly'>('daily');

  if (!import.meta.env.DEV) {
    return <p className="p-8 text-slate-500">Demo hanya tersedia di development.</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-black">Wizard Tenaga — Component Demo</h1>
      <p className="text-sm text-slate-500">Variant: <strong>{variant}</strong></p>

      <section className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold mb-4">StepIndicator</h2>
        <StepIndicator currentStep={step} variant={variant} />
        <div className="flex gap-2 mt-4">
          <button type="button" className="px-3 py-1 border rounded-lg text-sm" onClick={() => setStep(s => Math.max(1, s - 1))}>−</button>
          <button type="button" className="px-3 py-1 border rounded-lg text-sm" onClick={() => setStep(s => Math.min(3, s + 1))}>+</button>
        </div>
      </section>

      <section className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold mb-4">RateCard</h2>
        <div className="wz-rate-grid">
          <RateCard icon={Clock} title="HARIAN" description="per hari" active={rate === 'daily'} onClick={() => setRate('daily')} variant={variant} />
          <RateCard icon={Hourglass} title="JAM" description="per jam" active={rate === 'hourly'} onClick={() => setRate('hourly')} variant={variant} />
          <RateCard icon={Calendar} title="BULANAN" description="per bulan" active={rate === 'monthly'} onClick={() => setRate('monthly')} variant={variant} />
        </div>
      </section>

      <section className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold mb-4">SummaryCard</h2>
        <SummaryCard days={8} hours={64} total={1600000} mode="planned" variant={variant} />
      </section>

      <p className="text-xs text-slate-400">
        Preview HTML: <a href="/preview-wizard-tenaga-desktop.html" className="text-blue-600 underline">Desktop</a>
        {' · '}
        <a href="/preview-wizard-tenaga-mobile.html" className="text-blue-600 underline">Mobile</a>
      </p>
    </div>
  );
}
