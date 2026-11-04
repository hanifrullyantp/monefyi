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

  const goEstimator = () => {
    dismiss();
    navigate('/app/estimator');
  };

  return { modal, dismiss, goPricelist, goNewEstimation, goEstimator };
}
