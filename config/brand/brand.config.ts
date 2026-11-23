export const BRAND = {
  name: 'froyek',
  displayName: 'froyek',
  tagline: 'Agent for your project',
  domain: 'froyek.com',
  estimatorDomain: 'estimator.froyek.com',
  supportEmail: 'support@froyek.com',
  senderEmail: 'noreply@froyek.com',
  urls: {
    marketing: 'https://froyek.com',
    app: 'https://froyek.com',
    estimator: 'https://estimator.froyek.com',
  },
  colors: {
    forest: '#0A3A2E',
    white: '#FFFFFF',
    foldOpacity: 0.3,
  },
  themeColor: '#0A3A2E',
  markPolygon: {
    fold: '254.5,531 306,600.5 0,685',
    upper: '0,440 757,0 589,338 0,685',
    lower: '0,685 307,599 307,897',
  },
} as const;

export type BrandConfig = typeof BRAND;
export default BRAND;

