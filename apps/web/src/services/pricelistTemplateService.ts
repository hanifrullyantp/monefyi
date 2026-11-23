import { hppFromSellingAndMargin } from '../lib/estimatorCalc';
import { getPricelistTemplate, PRICELIST_TEMPLATES, type PricelistTemplate } from '../lib/data/pricelist-templates';
import {
  bulkImportPricelist,
  type CsvPricelistRow,
} from '../services/pricelistService';
import { analytics } from '../lib/analytics/events';

export { PRICELIST_TEMPLATES, getPricelistTemplate };
export type { PricelistTemplate };

export function templateItemsToCsvRows(template: PricelistTemplate): CsvPricelistRow[] {
  return template.items.map(item => ({
    name: item.name,
    product: item.product,
    category: item.category,
    unit: item.unit,
    default_margin_pct: item.margin,
    selling_price: item.sellPrice,
    base_cost: hppFromSellingAndMargin(item.sellPrice, item.margin),
    notes: null,
  }));
}

export async function importPricelistTemplate(
  orgId: string,
  userId: string,
  templateId: string,
): Promise<number> {
  const template = getPricelistTemplate(templateId);
  if (!template) throw new Error('Template tidak ditemukan');
  const count = await bulkImportPricelist(orgId, userId, templateItemsToCsvRows(template));
  analytics.pricelistTemplateLoaded({ templateId, itemCount: count });
  return count;
}
