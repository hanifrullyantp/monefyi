import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'admin' | 'user' | null;

export function useAuth() {
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('monefyi_user_role') as UserRole;
  });

  const login = useCallback((newRole: UserRole) => {
    if (!newRole) return;
    localStorage.setItem('monefyi_user_role', newRole);
    setRole(newRole);
    
    if (newRole === 'admin') {
      const url = new URL(window.location.href);
      url.searchParams.set('admin_mode', 'true');
      window.history.replaceState({}, '', url.toString());
    }
    
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('admin-mode-change'));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('monefyi_user_role');
    setRole(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('admin_mode');
    window.history.replaceState({}, '', url.toString());
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('admin-mode-change'));
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem('monefyi_user_role') as UserRole;
      if (stored !== role) setRole(stored);
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('admin-mode-change', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('admin-mode-change', handleSync);
    };
  }, [role]);

  return { role, login, logout, isAdmin: role === 'admin', isLoggedIn: !!role };
}
