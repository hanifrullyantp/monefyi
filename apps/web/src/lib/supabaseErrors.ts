import type { PostgrestError } from '@supabase/supabase-js';

/** Throw if Supabase mutation failed — avoids silent failures in UI. */
export function assertNoDbError(error: PostgrestError | null, fallback = 'Operasi database gagal'): void {
  if (error) throw new Error(error.message || fallback);
}
