import { z } from "zod";

export const ADMIN_FILL = "[ISI DI ADMIN]";

export const planIdSchema = z.enum([
  "estimator_standard",
  "estimator_pro",
  "pro",
  "enterprise",
]);

export const froyekPlanSchema = z.object({
  id: planIdSchema,
  name: z.string().min(1),
  priceLabel: z.string().min(1),
  period: z.string().min(1),
  summary: z.string().min(1),
  points: z.array(z.string().min(1)).min(1),
  cta: z.string().min(1),
  contactOnly: z.boolean(),
});

export const toastRuleSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["success", "info", "warning", "error"]),
  trigger: z.enum([
    "calculator_done",
    "idle_pricing",
    "exit_intent",
    "progress_saved",
    "payment_ok",
    "payment_fail",
  ]),
  message: z.string().min(1),
  href: z.string().optional().default(""),
  maxShows: z.number().int().positive(),
  placement: z.enum(["top", "bottom"]),
});

export const recommendRuleSchema = z.object({
  id: z.string().min(1),
  planId: planIdSchema,
  reason: z.string().min(1),
  when: z.object({
    role: z.string().optional(),
    team: z.string().optional(),
    problem: z.string().optional(),
    feature: z.string().optional(),
  }),
});

export const promoSchema = z.object({
  code: z.string().min(1),
  planId: planIdSchema,
  amount: z.number().int().positive(),
  note: z.string(),
});

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const froyekContentSchema = z.object({
  locale: z.literal("id"),
  localeEn: z.record(z.string()).default({}),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    ogImage: z.string(),
  }),
  branding: z.object({
    name: z.string(),
    logoSrc: z.string(),
    primary: z.string(),
    primaryDark: z.string(),
    ink: z.string(),
    muted: z.string(),
    surface: z.string(),
    radius: z.string(),
    contactEmail: z.string(),
    whatsapp: z.string(),
    socials: z.array(linkSchema),
  }),
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string(),
    href: z.string(),
  }),
  navbar: z.object({
    loginLabel: z.string(),
    openAppLabel: z.string(),
    ctaLabel: z.string(),
    ctaHref: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    titleAlt: z.string(),
    subtitle: z.string(),
    cta: z.string(),
    ctaAlt: z.string(),
    secondary: z.string(),
  }),
  problem: z.object({
    title: z.string(),
    scenes: z.array(z.object({ title: z.string(), body: z.string() })).min(1),
  }),
  beforeAfter: z.object({
    title: z.string(),
    rows: z.array(z.object({ before: z.string(), after: z.string() })).min(1),
  }),
  demo: z.object({
    title: z.string(),
    note: z.string(),
    prompt: z.string(),
    reply: z.string(),
    cta: z.string(),
  }),
  features: z.object({
    title: z.string(),
    groups: z.array(z.object({
      title: z.string(),
      items: z.array(z.object({
        title: z.string(),
        body: z.string(),
        available: z.boolean(),
      })),
    })),
  }),
  calculator: z.object({
    title: z.string(),
    intro: z.string(),
    hoursLabel: z.string(),
    rateLabel: z.string(),
    leakLabel: z.string(),
    resultLabel: z.string(),
  }),
  personas: z.object({
    title: z.string(),
    items: z.array(z.object({ role: z.string(), body: z.string() })).min(1),
  }),
  proof: z.object({
    title: z.string(),
    quotes: z.array(z.object({ quote: z.string(), name: z.string(), role: z.string() })),
    logos: z.array(z.object({ name: z.string(), src: z.string(), alt: z.string() })),
  }),
  steps: z.object({
    title: z.string(),
    items: z.array(z.object({ title: z.string(), body: z.string() })).length(3),
  }),
  trust: z.object({
    title: z.string(),
    items: z.array(z.object({ title: z.string(), body: z.string() })).min(1),
  }),
  comparison: z.object({
    title: z.string(),
    columns: z.array(z.string()).min(2),
    rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })),
  }),
  pricing: z.object({
    title: z.string(),
    helpCta: z.string(),
    plans: z.array(froyekPlanSchema).min(1),
  }),
  faq: z.object({
    title: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
  finalCta: z.object({
    title: z.string(),
    body: z.string(),
    cta: z.string(),
  }),
  footer: z.object({
    blurb: z.string(),
    columns: z.array(z.object({ title: z.string(), links: z.array(linkSchema) })),
  }),
  wizard: z.object({
    title: z.string(),
    rules: z.array(recommendRuleSchema),
  }),
  toasts: z.array(toastRuleSchema),
  promos: z.array(promoSchema),
  sectionOrder: z.array(z.string()).min(1),
  sectionVisibility: z.record(z.boolean()),
});

export type FroyekContent = z.infer<typeof froyekContentSchema>;
export type FroyekPlanId = z.infer<typeof planIdSchema>;
export type RecommendRule = z.infer<typeof recommendRuleSchema>;
export type PromoCode = z.infer<typeof promoSchema>;
export type ToastRule = z.infer<typeof toastRuleSchema>;

export function isPlaceholder(value: string | undefined | null): boolean {
  const text = (value || "").trim();
  return text.length === 0 || text.includes(ADMIN_FILL);
}

export function visibleQuotes(content: FroyekContent) {
  return content.proof.quotes.filter(
    (item) => !isPlaceholder(item.quote) && !isPlaceholder(item.name),
  );
}
