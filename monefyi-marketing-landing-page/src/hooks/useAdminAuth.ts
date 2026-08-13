import { useAdminAuthContext } from '../context/AdminAuthContext';

/** Legacy hook — backed by Supabase session + admin email list. */
export function useAdminAuth() {
  const { loading, isAdminUser, signIn, signOut } = useAdminAuthContext();

  return {
    isAuth: loading ? null : isAdminUser,
    login: async (email: string, password: string) => {
      const result = await signIn(email, password);
      return result.ok;
    },
    logout: signOut,
  };
}
