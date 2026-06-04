import { useEffect } from 'react';
import { useBootstrap } from '../hooks/useBootstrap';
import { initRuntimeTracer, destroyRuntimeTracer } from '../services/runtimeTracer';

/** Initializes Supabase auth on all routes (including public landing). */
export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useBootstrap();

  useEffect(() => {
    initRuntimeTracer();
    return () => destroyRuntimeTracer();
  }, []);

  return <>{children}</>;
}
