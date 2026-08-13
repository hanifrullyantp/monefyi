import type { SiteSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/initial-site-settings';

/**
 * Deep-merge saved CMS settings with defaults so partial/corrupt localStorage cannot crash the page.
 */
export function mergeSiteSettings(raw: Partial<SiteSettings> | null | undefined): SiteSettings {
  if (!raw || typeof raw !== 'object') return INITIAL_SETTINGS;

  const sections =
    Array.isArray(raw.sections) && raw.sections.length > 0
      ? raw.sections
      : INITIAL_SETTINGS.sections;

  const hero = {
    ...INITIAL_SETTINGS.content.hero,
    ...raw.content?.hero,
    bullets:
      raw.content?.hero?.bullets?.length
        ? raw.content.hero.bullets
        : INITIAL_SETTINGS.content.hero.bullets,
    trustBadges:
      raw.content?.hero?.trustBadges?.length
        ? raw.content.hero.trustBadges
        : INITIAL_SETTINGS.content.hero.trustBadges,
    cta: {
      ...INITIAL_SETTINGS.content.hero.cta,
      ...raw.content?.hero?.cta,
    },
  };

  return {
    ...INITIAL_SETTINGS,
    ...raw,
    general: { ...INITIAL_SETTINGS.general, ...raw.general },
    branding: { ...INITIAL_SETTINGS.branding, ...raw.branding },
    marketing: { ...INITIAL_SETTINGS.marketing, ...raw.marketing },
    announcement: { ...INITIAL_SETTINGS.announcement, ...raw.announcement },
    socials: { ...INITIAL_SETTINGS.socials, ...raw.socials },
    content: {
      ...INITIAL_SETTINGS.content,
      ...raw.content,
      hero,
      headers: { ...INITIAL_SETTINGS.content.headers, ...raw.content?.headers },
      footer: { ...INITIAL_SETTINGS.content.footer, ...raw.content?.footer },
      painPoints:
        raw.content?.painPoints?.length
          ? raw.content.painPoints
          : INITIAL_SETTINGS.content.painPoints,
      howItWorks:
        raw.content?.howItWorks?.length
          ? raw.content.howItWorks
          : INITIAL_SETTINGS.content.howItWorks,
      features:
        raw.content?.features?.length
          ? raw.content.features
          : INITIAL_SETTINGS.content.features,
      transformation:
        raw.content?.transformation?.length
          ? raw.content.transformation
          : INITIAL_SETTINGS.content.transformation,
      testimonials:
        raw.content?.testimonials?.length
          ? raw.content.testimonials
          : INITIAL_SETTINGS.content.testimonials,
      faq: raw.content?.faq?.length ? raw.content.faq : INITIAL_SETTINGS.content.faq,
      pricing: raw.content?.pricing ?? INITIAL_SETTINGS.content.pricing,
      guarantee:
        raw.content?.guarantee?.length
          ? raw.content.guarantee
          : INITIAL_SETTINGS.content.guarantee,
    },
    sections,
    media: { ...INITIAL_SETTINGS.media, ...raw.media },
  };
}
