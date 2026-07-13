/** Enable wizard modal (default on). Set localStorage useLaborWizard='0' to use legacy modal. */
export function shouldUseLaborWizard(): boolean {
  if (typeof window === 'undefined') return true;
  if (import.meta.env.VITE_LABOR_WIZARD === 'false') return false;
  return localStorage.getItem('useLaborWizard') !== '0';
}

export function setUseLaborWizard(enabled: boolean) {
  localStorage.setItem('useLaborWizard', enabled ? '1' : '0');
}
