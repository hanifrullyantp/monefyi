import { themeQuartz } from 'ag-grid-community';

export const gridThemeLight = themeQuartz.withParams({
  accentColor: '#4f46e5',
  borderRadius: 8,
  fontFamily: 'inherit',
  headerHeight: 44,
  rowHeight: 44,
  spacing: 6,
  wrapperBorder: true,
});

export const gridThemeDark = themeQuartz.withParams({
  accentColor: '#818cf8',
  backgroundColor: '#0f172a',
  foregroundColor: '#e2e8f0',
  chromeBackgroundColor: '#1e293b',
  borderColor: '#334155',
  headerBackgroundColor: '#1e293b',
  oddRowBackgroundColor: '#0f172a',
  borderRadius: 8,
  fontFamily: 'inherit',
  headerHeight: 44,
  rowHeight: 44,
  spacing: 6,
  wrapperBorder: true,
});
