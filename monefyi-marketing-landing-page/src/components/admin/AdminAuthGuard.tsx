import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAdminAuthContext } from '../../context/AdminAuthContext';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAdminUser, openLogin } = useAdminAuthContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!isAdminUser) openLogin();
  }, [mounted, loading, isAdminUser, openLogin]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-green-500" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Authenticating...</p>
      </div>
    );
  }

  if (!isAdminUser) return null;

  return <>{children}</>;
}
