import { describe, expect, it, vi, beforeEach } from 'vitest';
import { updateEstimation } from './estimatorService';
import type { EstimationFormDraft } from '../types/estimator';
import { supabase } from '../lib/supabase';

// Mock supabase
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('Estimator - Edit & Project Price Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows updating an estimation even if its status is converted and syncs to project', async () => {
    const mockEstimationId = 'est-123';
    const mockProjectId = 'proj-999';

    // Mock existing converted estimation
    const existingEstimation = {
      id: mockEstimationId,
      code: 'EST-001',
      title: 'Kitchen Set Minimalis',
      status: 'converted',
      converted_project_id: mockProjectId,
      items: [],
      images: [],
      adjustments: [],
      billing_config: null,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    };

    const mockProject = {
      id: mockProjectId,
      name: 'Proyek Kitchen Set',
      settings: {
        contract_value: 20_000_000,
      },
      total_budget: 15_000_000,
    };

    const updatedDraft: EstimationFormDraft = {
      code: 'EST-001',
      title: 'Kitchen Set Minimalis (Revisi)',
      customer_name: 'Pak Budi',
      customer_phone: '08123456789',
      status: 'converted',
      project_id: mockProjectId,
      overhead_pct: 0,
      discount_pct: 0,
      discount_amount: 0,
      adjustments: [],
      tax_pct: 0,
      items: [
        {
          id: 'item-1',
          name: 'Kabinet Bawah Multiplek',
          category: 'kitchen',
          unit: 'm1',
          qty: 5,
          hpp_per_unit: 2_000_000,
          margin_pct: 33.33,
          selling_price_per_unit: 3_000_000,
          item_discount_pct: 0,
          item_discount_amount: 0,
          is_bonus: false,
          included: true,
          total_hpp: 10_000_000,
          total_selling: 15_000_000,
          total_profit: 5_000_000,
          sort_order: 0,
          notes: '',
        },
      ],
      images: [],
      pdf_template: 'modern',
      pdf_invoice_template: 'modern',
      billing_config: {
        milestones: [],
        billing_discount_amount: 0,
        billing_bonus_note: '',
        payments: [],
      },
    } as unknown as EstimationFormDraft;

    let updatedProjectSettings: any = null;

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'planner_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existingEstimation, error: null }),
          single: vi.fn().mockResolvedValue({
            data: { ...existingEstimation, ...updatedDraft, total_selling_price: 15_000_000 },
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'planner_estimation_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'planner_projects') {
        const queryBuilder: any = {
          select: vi.fn().mockImplementation(() => queryBuilder),
          is: vi.fn().mockImplementation(() => queryBuilder),
          or: vi.fn().mockImplementation(() => queryBuilder),
          eq: vi.fn().mockImplementation(() => queryBuilder),
          then: (resolve: any) => resolve({ data: [mockProject], error: null }),
          update: vi.fn().mockImplementation((payload: any) => {
            updatedProjectSettings = payload.settings;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
        return queryBuilder;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    // Execute updateEstimation on converted estimation
    const result = await updateEstimation(mockEstimationId, updatedDraft);

    // Verify it didn't throw and succeeded
    expect(result).toBeDefined();

    // Verify linked project settings were updated with the new contract value
    expect(updatedProjectSettings).toBeDefined();
    expect(updatedProjectSettings.contract_value).toBe(15_000_000);
  });
});
