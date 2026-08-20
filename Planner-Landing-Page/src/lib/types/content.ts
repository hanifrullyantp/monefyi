// Type definitions untuk landing page content

export interface NavItem {
  label: string;
  href: string;
}

export interface NavbarContent {
  logo: string;
  menu: NavItem[];
  cta: { label: string; href: string };
  linksRaw?: string; // For the "label|href" textarea
}

export interface BrandingColors {
  primary: string;
  navy: string;
  navyDeep: string;
  gold: string;
  goldLight: string;
}

export interface GlobalContent {
  siteName: string;
  domain: string;
  colors: BrandingColors;
  googleFont: string;
  logoUrl: string;
  faviconUrl: string;
  navbarCta: string;
  navbarLinksRaw: string;
}

export interface ContactSocialContent {
  whatsapp: string;
  email: string;
  address: string;
  phoneDisplay: string;
  instagram: string;
  socialLinksRaw: string;
  needTypesRaw: string;
  budgetRangesRaw: string;
  waAbandonmentMsg: string;
}

export interface HeroMockupLead {
  name: string;
  project: string;
  estimate: string;
  badge: string;
}

export interface HeroMockupOffer {
  name: string;
  project: string;
  status: string;
}

export interface HeroMockupProject {
  name: string;
  progress: number;
}

export interface HeroMockupFloatingBadge {
  icon: string;
  text: string;
}

export interface HeroMockup {
  dateLabel: string;
  leadCount: number;
  leadExample: HeroMockupLead;
  offerCount: number;
  offerExample: HeroMockupOffer;
  projectCount: number;
  projectExamples: HeroMockupProject[];
  floatingBadges: HeroMockupFloatingBadge[];
}

export interface HeroContent {
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  painParagraph: string;
  boldParts: string[];
  quickPoints: string[];
  ctaText: string;
  ctaTarget: string;
  trustIndicators: string[];
  mockup: HeroMockup;
}

export interface StepBadge {
  label: string;
  color: "blue" | "amber" | "emerald";
  icon: string;
}

export interface StepWhyImportant {
  label: string;
  intro: string;
  points: string[];
}

export interface StepExample {
  label: string;
  content: string;
}

export interface Step {
  number: string;
  badge: StepBadge;
  title: string;
  problem: string;
  solution: string;
  example?: StepExample;
  whyImportant?: StepWhyImportant;
  results: string[];
  intinya: string;
}

export interface ThreeStepContent {
  label: string;
  title: string;
  subtitle: string;
  steps: Step[];
}

export interface TransitionContent {
  title: string;
  paragraphs: string[];
  highlightedText: string;
  ctaText: string;
  ctaTarget: string;
}

export interface RelatableContent {
  label: string;
  title: string;
  subtitle: string;
  problems: string[];
  counterMessages: Record<string, string>;
  ctaText: string;
  ctaTarget: string;
  ctaThreshold: number;
}

export interface ProductMomentFloatingBadge {
  icon: string;
  text: string;
}

export interface ProductMoment {
  number: string;
  label: string;
  title: string;
  description: string;
  points: string[];
  mockupType: "whatsapp" | "estimator" | "dashboard";
  floatingBadge: ProductMomentFloatingBadge;
}

export interface ProductShowcaseContent {
  label: string;
  title: string;
  subtitle: string;
  moments: ProductMoment[];
  closingStatement: string;
}

export interface TestimonialAuthor {
  initial: string;
  name: string;
  title: string;
  duration: string;
}

export interface TestimonialStory {
  opening: string;
  turningPoint: string;
  transformation: string;
  results: string[];
  bigQuote: string;
  closing: string;
}

export interface TestimonialContent {
  label: string;
  bigQuote: string;
  attribution: string;
  story: TestimonialStory;
  author: TestimonialAuthor;
  socialProof: {
    rating: number;
    reviewCount: number;
  };
}

export interface CalculatorFormulas {
  surveiRate: number;
  dealRate: number;
  idealDealRate: number;
}

export interface CalculatorContent {
  label: string;
  title: string;
  subtitle: string;
  inputLabel: string;
  defaultValue: number;
  min: number;
  max: number;
  ticks: number[];
  formulas: CalculatorFormulas;
  resultCards: {
    current: {
      label: string;
      template: string;
      closing: string;
    };
    potential: {
      label: string;
      sub: string;
      potentialLabel: string;
      template: string;
    };
  };
  closingStatement: string;
}

export interface PricingPlanCta {
  text: string;
  variant: "outline" | "primary";
}

export interface PricingPlan {
  id: string;
  label: string;
  name: string;
  description: string;
  price: number;
  priceOriginal?: number;
  priceDisplay: string;
  priceOriginalDisplay?: string;
  priceSubtitle: string;
  features: string[];
  cta: PricingPlanCta;
  recommended: boolean;
  badgeText?: string;
  theme?: "dark" | "light";
}

export interface PricingContent {
  label: string;
  title: string;
  subtitle: string;
  plans: PricingPlan[];
  trustLine: string;
  enterprise: {
    text: string;
    linkText: string;
    linkTarget: string;
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface GuaranteeFaqContent {
  guarantee: {
    title: string;
    description: string;
  };
  faqLabel: string;
  faqs: FAQItem[];
  contactLinks: {
    text: string;
    links: Array<{ text: string; href: string }>;
  };
}

export interface FinalCtaContent {
  title: string;
  description: string;
  ctaPrimary: { text: string; target: string };
  ctaSecondary: { text: string; target: string };
  trustLine: string;
}

export interface FooterSocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface FooterContent {
  logo: string;
  tagline: string;
  contact: {
    label: string;
    email: string;
    phone: string;
  };
  social: {
    label: string;
    links: FooterSocialLink[];
  };
  copyright: string;
  bottomLinks: Array<{ text: string; href: string }>;
}

export interface ToastNotification {
  id: number;
  name: string;
  action: string;
  product: string;
  location: string;
  timeAgo: string;
}

export interface ToastContent {
  enabled: boolean;
  initialDelay: number;
  intervalMin: number;
  intervalMax: number;
  autoDismiss: number;
  sound: boolean;
  soundUrl: string;
  volume: number;
  position: string;
  notifications: ToastNotification[];
}

export interface LandingContent {
  global: GlobalContent;
  contactSocial: ContactSocialContent;
  navbar: NavbarContent;
  hero: HeroContent;
  threeStep: ThreeStepContent;
  transition: TransitionContent;
  relatable: RelatableContent;
  productShowcase: ProductShowcaseContent;
  testimonial: TestimonialContent;
  calculator: CalculatorContent;
  pricing: PricingContent;
  guaranteeFaq: GuaranteeFaqContent;
  finalCta: FinalCtaContent;
  footer: FooterContent;
  toast: ToastContent;
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
}
