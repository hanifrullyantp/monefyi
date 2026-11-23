import PaymentSuccessModal from './PaymentSuccessModal';
import PaymentFailureModal from './PaymentFailureModal';
import { markPostPurchaseBanner } from './PostPurchaseBanner';
import { usePaymentReturn } from '../../hooks/usePaymentReturn';
import { invalidateEntitlementCache } from '../../hooks/useEntitlement';

export default function PaymentReturnHandler() {
  const { modal, dismiss, goPricelist, goNewEstimation, goDashboard } = usePaymentReturn();

  if (modal?.kind === 'success') {
    return (
      <PaymentSuccessModal
        open
        product={modal.product}
        onClose={() => {
          markPostPurchaseBanner(modal.product);
          invalidateEntitlementCache();
          dismiss();
        }}
        onSetupPricelist={goPricelist}
        onNewEstimation={goNewEstimation}
        onGoDashboard={goDashboard}
      />
    );
  }

  if (modal?.kind === 'failure') {
    return <PaymentFailureModal open onClose={dismiss} />;
  }

  return null;
}
