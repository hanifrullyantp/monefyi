export const FREE_ESTIMATOR_WATERMARK = 'Dibuat dengan Estimator · estimator.monefyi.com';

export type PdfPlanPolicy = {
  /** Paket gratis selalu membawa watermark Estimator. */
  forceWatermark: boolean;
  /** Logo, tanda tangan, dan cap hanya untuk Estimator Pro / Planner Pro / Enterprise. */
  allowCustomBranding: boolean;
};

export function pdfPlanPolicyFromEntitlement(snapshot: {
  isFree: boolean;
  isEstimatorPro: boolean;
  isPro: boolean;
  isEnterprise: boolean;
}): PdfPlanPolicy {
  return {
    forceWatermark: snapshot.isFree,
    allowCustomBranding: snapshot.isEstimatorPro || snapshot.isPro || snapshot.isEnterprise,
  };
}
