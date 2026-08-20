// Type definitions untuk settings

export interface SeoSettings {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  twitterCard: string;
  canonicalUrl: string;
  googleAnalyticsId: string;
  fbPixelId: string;
  gtmId: string;
  jsonLd: string;
}

export interface GlobalSettings {
  siteName: string;
  siteUrl: string;
  logoText: string;
  primaryColor: string;
  adminEmail: string;
  maintenanceMode: boolean;
}

export interface AppSettings {
  global: GlobalSettings;
  seo: SeoSettings;
}
