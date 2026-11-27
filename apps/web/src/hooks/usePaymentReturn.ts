import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cleanPaymentQueryFromUrl, readPaymentReturnStatus } from '../lib/checkout';
import { resolvePaymentProvider } from '../lib/paymentProvider';
import { analytics } from '../lib/analytics/events';
import { invalidateEntitlementCache } from '../hooks/useEntitlement';

type PaymentModalState =
  | { kind: 'success'; product: 'estimator' | 'pro' }
  | { kind: 'failure' }
  | null;

export function usePaymentReturn() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<PaymentModalState>(null);

  useEffect(() => {
    const status = readPaymentReturnStatus();
    if (!status) return;

    invalidateEntitlementCache();

    if (status === 'success') {
      const product = window.location.pathname.includes('/finance')
        ? 'pro'
        : 'estimator';
      const paymentProvider = resolvePaymentProvider();
      if (product === 'pro') {
        analytics.proPurchased({ paymentProvider });
      } else {
        analytics.estimatorPurchased({ product: 'estimator', paymentProvider });
      }
      try {
        const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
        const dedupKey = `froyek_purchase_fbq_${product}`;
        if (fbq && !sessionStorage.getItem(dedupKey)) {
          sessionStorage.setItem(dedupKey, '1');
          const fallbackValue = product === 'pro' ? 199000 : 99000;
          fbq('track', 'Purchase', {
            content_name: product === 'pro' ? 'Estimator PRO' : 'Estimator Standard',
            content_ids: [product],
            value: fallbackValue,
            currency: 'IDR',
            num_items: 1,
          });
        }
      } catch {
        // Non-blocking
      }
      setModal({ kind: 'success', product });
    } else {
      setModal({ kind: 'failure' });
    }
    cleanPaymentQueryFromUrl();
  }, []);

  const dismiss = () => setModal(null);

  const goPricelist = () => {
    dismiss();
    navigate('/app/estimator/pricelist');
  };

  const goNewEstimation = () => {
    dismiss();
    navigate('/app/estimator/new');
  };

  const goDashboard = () => {
    const target = modal?.kind === 'success' && modal.product === 'estimator'
      ? '/app/estimator'
      : '/app';
    dismiss();
    navigate(target);
  };

  return { modal, dismiss, goPricelist, goNewEstimation, goDashboard, goEstimator: goDashboard };
}
