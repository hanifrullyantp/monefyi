import { trackEvent } from './client';
import type { UpgradeModalTrigger } from '../../types/entitlement';

export const analytics = {
  estimatorPurchased(props: { amount?: number; paymentProvider?: string; product?: string }) {
    trackEvent('estimator_purchased', {
      amount: props.amount,
      payment_provider: props.paymentProvider,
      product: props.product,
    });
  },

  proPurchased(props: { amount?: number; paymentProvider?: string }) {
    trackEvent('pro_purchased', {
      amount: props.amount,
      payment_provider: props.paymentProvider,
    });
  },

  onboardingStarted() {
    trackEvent('onboarding_started');
  },

  onboardingCompleted(props: { templateChosen?: string | null; hasLogo: boolean }) {
    trackEvent('onboarding_completed', {
      template_chosen: props.templateChosen,
      has_logo: props.hasLogo,
    });
  },

  onboardingSkipped(props: { stepAtSkip: number }) {
    trackEvent('onboarding_skipped', { step_at_skip: props.stepAtSkip });
  },

  pricelistTemplateLoaded(props: { templateId: string; itemCount: number }) {
    trackEvent('pricelist_template_loaded', {
      template_id: props.templateId,
      item_count: props.itemCount,
    });
  },

  pricelistItemAdded(props: { category?: string; source: 'manual' | 'csv' | 'template' }) {
    trackEvent('pricelist_item_added', {
      category: props.category,
      source: props.source,
    });
  },

  estimationCreated(props: {
    estimationId?: string;
    itemCount: number;
    totalAmount: number;
    fromSmartButton?: boolean;
  }) {
    trackEvent('estimation_created', {
      estimation_id: props.estimationId,
      item_count: props.itemCount,
      total_amount: props.totalAmount,
      from_smart_button: props.fromSmartButton ?? false,
    });
  },

  estimationPdfPreviewed(props: { estimationId?: string }) {
    trackEvent('estimation_pdf_previewed', { estimation_id: props.estimationId });
  },

  estimationPdfDownloaded(props: { estimationId?: string; template?: string }) {
    trackEvent('estimation_pdf_downloaded', {
      estimation_id: props.estimationId,
      template: props.template,
    });
  },

  estimationWaShared(props: { estimationId?: string; shareType: 'text' | 'pdf' }) {
    trackEvent('estimation_wa_shared', {
      estimation_id: props.estimationId,
      share_type: props.shareType,
    });
  },

  estimationStatusChanged(props: {
    estimationId: string;
    from: string;
    to: string;
  }) {
    trackEvent('estimation_status_changed', {
      estimation_id: props.estimationId,
      from: props.from,
      to: props.to,
    });
  },

  estimationAccepted(props: {
    estimationId: string;
    total: number;
    profit: number;
    daysFromCreated: number;
  }) {
    trackEvent('estimation_accepted', {
      estimation_id: props.estimationId,
      total: props.total,
      profit: props.profit,
      days_from_created: props.daysFromCreated,
    });
  },

  estimationRejected(props: { estimationId: string; daysFromSent?: number | null }) {
    trackEvent('estimation_rejected', {
      estimation_id: props.estimationId,
      days_from_sent: props.daysFromSent,
    });
  },

  convertWizardOpened(props: { estimationId: string }) {
    trackEvent('convert_wizard_opened', { estimation_id: props.estimationId });
  },

  convertWizardCompleted(props: {
    estimationId: string;
    projectId: string;
    itemsSelected: number;
  }) {
    trackEvent('convert_wizard_completed', {
      estimation_id: props.estimationId,
      project_id: props.projectId,
      items_selected: props.itemsSelected,
    });
  },

  projectLimitHit(props: { currentCount: number; tier: string }) {
    trackEvent('project_limit_hit', {
      current_count: props.currentCount,
      tier: props.tier,
    });
  },

  upgradeModalShown(trigger: UpgradeModalTrigger | 'milestone_5_estimations') {
    trackEvent('upgrade_modal_shown', { trigger_type: trigger });
  },

  upgradeModalDismissed(trigger: UpgradeModalTrigger | 'milestone_5_estimations') {
    trackEvent('upgrade_modal_dismissed', { trigger_type: trigger });
  },

  upgradeCtaClicked(props: {
    triggerType: UpgradeModalTrigger | 'milestone_5_estimations' | 'pro_feature';
    targetTier: 'estimator' | 'pro';
  }) {
    trackEvent('upgrade_cta_clicked', {
      trigger_type: props.triggerType,
      target_tier: props.targetTier,
    });
  },

  proFeatureClicked(props: { featureName: string }) {
    trackEvent('pro_feature_clicked', { feature_name: props.featureName });
  },
};
