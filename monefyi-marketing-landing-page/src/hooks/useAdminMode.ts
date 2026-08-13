import { useState, useEffect } from 'react';

export function useAdminMode(): boolean {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('admin_mode') === 'true';
  });

  useEffect(() => {
    const checkAdmin = () => {
      const params = new URLSearchParams(window.location.search);
      setIsAdmin(params.get('admin_mode') === 'true');
    };

    window.addEventListener('popstate', checkAdmin);
    window.addEventListener('storage', checkAdmin);
    // Custom event for internal route changes
    window.addEventListener('admin-mode-change', checkAdmin);
    
    return () => {
      window.removeEventListener('popstate', checkAdmin);
      window.removeEventListener('storage', checkAdmin);
      window.removeEventListener('admin-mode-change', checkAdmin);
    };
  }, []);

  return isAdmin;
}
