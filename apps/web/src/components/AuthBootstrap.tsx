import { useEffect } from 'react';
import { useBootstrap } from '../hooks/useBootstrap';
import { initRuntimeTracer, destroyRuntimeTracer } from '../services/runtimeTracer';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { initFcmNativePush } from '../lib/fcmNative';

/** Initializes Supabase auth on all routes (including public landing). */
export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useBootstrap();
  const userId = useAppStore((s) => s.user?.id);

  useEffect(() => {
    initRuntimeTracer();
    return () => destroyRuntimeTracer();
  }, []);

  useEffect(() => {
    if (userId) {
      void initFcmNativePush(userId, supabase);
    }
  }, [userId]);

  return <>{children}</>;
}
