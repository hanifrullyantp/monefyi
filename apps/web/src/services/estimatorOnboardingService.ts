import { loadEstimations } from './estimatorService';
import { loadPdfSettings } from './pdfSettingsService';
import { loadPricelistItems } from './pricelistService';
import { isEstimatorOnboardingCompleted } from '../lib/estimatorOnboarding';

export async function shouldShowEstimatorOnboarding(
  userId: string,
  orgId: string,
  orgName: string,
): Promise<boolean> {
  if (isEstimatorOnboardingCompleted(userId)) return false;

  const [estimations, pricelist, settings] = await Promise.all([
    loadEstimations(orgId),
    loadPricelistItems(orgId),
    loadPdfSettings(orgId, orgName),
  ]);

  if (estimations.length > 0) return false;
  if (pricelist.length > 0) return false;

  const companyConfigured =
    Boolean(settings.phone?.trim()) ||
    Boolean(settings.address?.trim()) ||
    Boolean(settings.logo_url) ||
    Boolean(
      settings.company_name?.trim() &&
      settings.company_name.trim() !== orgName.trim(),
    );

  if (companyConfigured) return false;

  return true;
}
