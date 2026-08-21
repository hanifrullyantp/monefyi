// Tipe data untuk konten landing page

export interface NavbarContent {
  logo: string;
  logoImage?: string;
  menuItems: { label: string; href: string }[];
  ctaText: string;
  ctaHref: string;
}

export interface HeroContent {
  badge: string;
  headline: string;
  headlineHighlight: string;
  subheadline: string;
  painParagraph: string;
  quickPoints: string[];
  ctaPrimary: string;
  ctaSecondary: string;
  trustIndicators: string[];
  dashboardImage?: string;
}

export interface StepItem {
  number: string;
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  problem: string;
  solution: string;
  exampleBox?: string;
  importantPoints?: string[];
  results: string[];
  summary: string;
}

export interface ThreeStepContent {
  badge: string;
  title: string;
  subtitle: string;
  steps: StepItem[];
}

export interface TransitionContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  ctaText: string;
}

export interface RelatableContent {
  badge: string;
  title: string;
  subtitle: string;
  items: string[];
  counterMessages: {
    low: string;
    mid: string;
    high: string;
  };
  ctaText: string;
}

export interface CalculatorContent {
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  featured?: boolean;
}

export interface FeaturesContent {
  badge: string;
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

export interface ScenarioItem {
  time: string;
  situation: string;
  without: string;
  with: string;
}

export interface TransformationContent {
  badge: string;
  title: string;
  subtitle: string;
  scenarios: ScenarioItem[];
}

export interface TestimonialMilestone {
  period: string;
  title: string;
  description: string;
}

export interface FeaturedTestimonial {
  name: string;
  title: string;
  info: string;
  storyTitle: string;
  pastSection: string;
  pastHighlight: string;
  turningPoint: string;
  turningPointAttribution: string;
  milestones: TestimonialMilestone[];
  newLife: string;
  newLifeHighlight: string;
  bigQuote: string;
  ctaText: string;
}

export interface TestimonialCard {
  name: string;
  type: string;
  storyTitle: string;
  quote: string;
  pain: string;
  result: string;
  rating: number;
}

export interface TestimonialStat {
  value: string;
  label: string;
}

export interface TestimonialContent {
  badge: string;
  title: string;
  subtitle: string;
  featured: FeaturedTestimonial;
  others: TestimonialCard[];
  stats: TestimonialStat[];
  closingQuote: string;
  closingAttribution: string;
}

export interface ComparisonRow {
  feature: string;
  excel: string;
  trello: string;
  appPM: string;
  monefyi: string;
}

export interface ComparisonContent {
  badge: string;
  title: string;
  subtitle: string;
  rows: ComparisonRow[];
  note: string;
}

export interface FreeTool {
  icon: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
}

export interface FreeToolsContent {
  badge: string;
  title: string;
  subtitle: string;
  tools: FreeTool[];
  note: string;
}

export interface UrgencyContent {
  badge: string;
  title: string;
  subtitle: string;
  totalSlots: number;
  usedSlots: number;
  normalPrice: string;
  launchPrice: string;
  bonusText: string;
  limitedBadge: string;
}

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingMilestone {
  period: string;
  description: string;
}

export interface PricingCard {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  originalPrice?: string;
  price: string;
  pricePeriod: string;
  priceNote?: string;
  savingsBadge?: string;
  whyChoose: string[];
  features: PricingFeature[];
  milestones?: PricingMilestone[];
  targetUsers?: string[];
  ctaText: string;
  highlighted: boolean;
  darkBg?: boolean;
}

export interface ComparisonTableRow {
  group: string;
  feature: string;
  estimator: string;
  lifetime: string;
  pro?: string;
}

export interface PricingRecommendation {
  situation: string;
  plan: string;
  reason: string;
}

export interface PricingContent {
  badge: string;
  title: string;
  subtitle: string;
  cards: PricingCard[];
  comparisonRows: ComparisonTableRow[];
  recommendations: PricingRecommendation[];
  miniQuestions: { question: string; answer: string }[];
  lynkCheckoutUrls?: {
    estimator_standard?: string;
    estimator_pro?: string;
    planner_pro?: string;
  };
}

export interface GuaranteeContent {
  title: string;
  paragraph: string;
  checkpoints: string[];
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface FAQContent {
  badge: string;
  title: string;
  subtitle: string;
  categories: string[];
  items: FAQItem[];
}

export interface FinalCTAContent {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trustItems: string[];
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterContent {
  tagline: string;
  email: string;
  whatsapp: string;
  instagram: string;
  navLinks: FooterLink[];
  socialLinks: { platform: string; href: string }[];
  disclaimer: string;
  copyright: string;
  madeWith: string;
}

export interface ToastNotification {
  name: string;
  action: string;
  product: string;
  location: string;
  timeAgo: string;
}

export interface ToastConfig {
  enabled: boolean;
  intervalMin: number;
  intervalMax: number;
  autoDismiss: number;
  sound: boolean;
  notifications: ToastNotification[];
}

export interface SiteContent {
  navbar: NavbarContent;
  hero: HeroContent;
  threeStep: ThreeStepContent;
  transition: TransitionContent;
  relatable: RelatableContent;
  calculator: CalculatorContent;
  features: FeaturesContent;
  transformation: TransformationContent;
  testimonial: TestimonialContent;
  comparison: ComparisonContent;
  freeTools: FreeToolsContent;
  urgency: UrgencyContent;
  pricing: PricingContent;
  guarantee: GuaranteeContent;
  faq: FAQContent;
  finalCta: FinalCTAContent;
  footer: FooterContent;
  toast: ToastConfig;
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
}
