import { useState, useEffect, useCallback } from 'react';

export function useAdminAuth() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('monefyi_admin_auth');
    if (auth === 'true') {
      setIsAuth(true);
    } else {
      setIsAuth(false);
    }
  }, []);

  const login = useCallback((password: string): boolean => {
    if (password === 'monefyi2026') {
      localStorage.setItem('monefyi_admin_auth', 'true');
      setIsAuth(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('monefyi_admin_auth');
    setIsAuth(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  }, []);

  return { isAuth, login, logout };
}
