import { supabase } from '../lib/supabase';
import {
  DEFAULT_WHATSAPP_BODY,
  DEFAULT_WHATSAPP_ITEM_LINE,
  parseWhatsAppTemplateJson,
  serializeWhatsAppTemplate,
  type WhatsAppTemplateConfig,
} from '../lib/whatsappQuotationMessage';

const DEFAULT_NAME = 'WhatsApp Penawaran';

export function defaultWhatsAppTemplateConfig(): WhatsAppTemplateConfig {
  return {
    body: DEFAULT_WHATSAPP_BODY,
    itemLine: DEFAULT_WHATSAPP_ITEM_LINE,
    defaultSalutation: 'Pak',
    defaultSubtitle: '',
  };
}

export async function loadWhatsAppTemplate(orgId: string): Promise<WhatsAppTemplateConfig> {
  const { data, error } = await supabase
    .from('planner_quotation_templates')
    .select('template')
    .eq('org_id', orgId)
    .eq('type', 'whatsapp')
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.template) return defaultWhatsAppTemplateConfig();
  return parseWhatsAppTemplateJson(data.template as string);
}

export async function saveWhatsAppTemplate(orgId: string, config: WhatsAppTemplateConfig): Promise<void> {
  const payload = serializeWhatsAppTemplate(config);

  const { data: existing, error: findErr } = await supabase
    .from('planner_quotation_templates')
    .select('id')
    .eq('org_id', orgId)
    .eq('type', 'whatsapp')
    .eq('is_default', true)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);

  if (existing?.id) {
    const { error } = await supabase
      .from('planner_quotation_templates')
      .update({ template: payload, name: DEFAULT_NAME })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('planner_quotation_templates').insert({
    org_id: orgId,
    name: DEFAULT_NAME,
    type: 'whatsapp',
    template: payload,
    is_default: true,
  });
  if (error) throw new Error(error.message);
}
