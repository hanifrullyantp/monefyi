/** Proyek terhubung estimasi: prioritas converted → manual link. */
export function resolveEstimationProjectId(input: {
  project_id?: string | null;
  converted_project_id?: string | null;
}): string | null {
  return input.converted_project_id || input.project_id || null;
}
