import { useBootstrap } from '../hooks/useBootstrap';

/** Initializes Supabase auth on all routes (including public landing). */
export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useBootstrap();
  return <>{children}</>;
}
