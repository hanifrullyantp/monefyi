export type ColorVariant = 'green' | 'gold' | 'red' | 'blue' | 'purple' | 'white' | 'slate' | 'amber';
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconVariant = 'default' | 'gradient' | 'glow' | 'outlined' | 'filled' | 'glass';

export interface Testimonial {
  id: string;
  avatar: string;
  name: string;
  role: string;
  age: number;
  quote: string;
  beforeAfter?: { before: string; after: string };
  rating: number;
}

export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: ColorVariant;
  size: 'big' | 'small';
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline?: string;
  badge?: string;
  badgeColor?: ColorVariant;
  price: {
    amount: number;
    display: string;
    period: string;
    note?: string;
    originalAmount?: number;
    savingsText?: string;
  };
  features: { included: boolean; text: string; highlight?: boolean }[];
  cta: {
    label: string;
    subtext: string;
    variant: string;
    href: string;
  };
  highlighted: boolean;
  whyChoose?: any;
  impact?: any;
  bonusHighlight?: any;
  urgency?: any;
  trust?: any;
}

export interface UserData {
  nama: string;
  noHp: string;
  domisili: string;
  tanggalLahir: string;
}

export type CheckoutStep = 'data' | 'upsell' | 'payment';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface ComparisonRow {
  feature: string;
  excel: boolean | string;
  bankApp: boolean | string;
  other: boolean | string;
  monefyi: boolean | string;
}

export interface BonusApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: ColorVariant;
  value: number;
}

export interface HeroScreen {
  id: string;
  label: string;
}

export interface SiteSettings {
  general: {
    siteName: string;
    tagline: string;
    description: string;
    supportEmail: string;
    whatsappNumber: string;
  };
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    accentColor: string;
  };
  marketing: {
    fbPixelId: string;
    googleAnalyticsId: string;
  };
  announcement: {
    active: boolean;
    text: string;
  };
  socials: {
    instagram: string;
    twitter: string;
    youtube: string;
    tiktok: string;
  };
  content: {
    hero: any;
    painPoints: any;
    howItWorks: any;
    features: any;
    transformation: any;
    testimonials: any;
    faq: any;
    pricing: any;
    headers: Record<string, { eyebrow: string; title: string; highlight: string; subtitle: string }>;
    footer: any;
  };
  sections: {
    id: string;
    label: string;
    active: boolean;
    order: number;
  }[];
  media: Record<string, { type: 'image' | 'video'; url: string }>;
  leads: any[];
}
