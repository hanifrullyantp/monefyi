import { config } from '../lib/config';
import { supabase } from '../lib/supabase';

export interface AnalyzeResult {
  evm: {
    pv: number;
    ev: number;
    ac: number;
    spi: number;
    cpi: number;
    eac: number;
    etc: number;
    planned_progress: number;
    actual_progress: number;
  };
  recommendations: Array<{
    type: string;
    severity: string;
    title: string;
    message: string;
    action?: string;
  }>;
}

export async function analyzeProject(projectId: string): Promise<AnalyzeResult | null> {
  const { data, error } = await supabase.functions.invoke(config.fnAnalyze, {
    body: { project_id: projectId },
  });

  if (error) {
    console.warn('planner-analyze failed:', error);
    return null;
  }
  return data as AnalyzeResult;
}
