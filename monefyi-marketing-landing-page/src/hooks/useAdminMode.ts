import { useAdminAuthContext } from '../context/AdminAuthContext';

/** True when an admin user is in landing edit mode (orange bar + inline editing). */
export function useAdminMode(): boolean {
  const { isEditMode } = useAdminAuthContext();
  return isEditMode;
}
