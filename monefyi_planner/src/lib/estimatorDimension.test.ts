import { describe, expect, it } from 'vitest';
import {
  parseDimensionInput,
  isCabinetAtas,
  isCabinetBawah,
  findCabinetPairIndex,
  applyCabinetPairSync,
} from './estimatorDimension';
import { analyzeEstimationForIntero } from '../services/intero3dService';
import type { EstimationFormDraft, EstimationItemDraft } from '../types/estimator';

describe('parseDimensionInput', () => {
  it('mem-parsing format penjumlahan L 2+2 menjadi total 4m dengan segmen [2, 2]', () => {
    const res = parseDimensionInput('2+2');
    expect(res.total).toBe(4);
    expect(res.expr).toBe('2+2');
    expect(res.segments).toEqual([2, 2]);
    expect(res.isL).toBe(true);
  });

  it('mem-parsing format desimal koma Indonesia 2,4 + 1,8', () => {
    const res = parseDimensionInput('2,4 + 1,8');
    expect(res.total).toBe(4.2);
    expect(res.expr).toBe('2.4+1.8');
    expect(res.segments).toEqual([2.4, 1.8]);
    expect(res.isL).toBe(true);
  });

  it('mem-parsing format perkalian 2x2 sebagai segmen siku 2+2', () => {
    const res = parseDimensionInput('2x2');
    expect(res.total).toBe(4);
    expect(res.expr).toBe('2+2');
    expect(res.segments).toEqual([2, 2]);
    expect(res.isL).toBe(true);
  });

  it('menghapus ukuran L jika diisi total manual langsung (misal "5")', () => {
    const res = parseDimensionInput('5');
    expect(res.total).toBe(5);
    expect(res.expr).toBe('');
    expect(res.segments).toEqual([]);
    expect(res.isL).toBe(false);
  });
});

describe('Cabinet Pair Auto-Mirroring & Independence', () => {
  const sampleItems: EstimationItemDraft[] = [
    {
      name: 'Kitchen Set Atas Finishing HPL',
      category: 'material',
      unit: 'm',
      qty: 0,
      hpp_per_unit: 1800000,
      margin_pct: 30,
      selling_price_per_unit: 2400000,
      item_discount_pct: 0,
      item_discount_amount: 0,
      is_bonus: false,
      included: true,
      total_hpp: 0,
      total_selling: 0,
      total_profit: 0,
      sort_order: 1,
      notes: '',
    },
    {
      name: 'Kitchen Set Bawah Finishing HPL',
      category: 'material',
      unit: 'm',
      qty: 0,
      hpp_per_unit: 2000000,
      margin_pct: 30,
      selling_price_per_unit: 2600000,
      item_discount_pct: 0,
      item_discount_amount: 0,
      is_bonus: false,
      included: true,
      total_hpp: 0,
      total_selling: 0,
      total_profit: 0,
      sort_order: 2,
      notes: '',
    },
  ];

  it('mendeteksi kabinet atas dan kabinet bawah dengan benar', () => {
    expect(isCabinetAtas('Kitchen Set Atas Finishing HPL')).toBe(true);
    expect(isCabinetBawah('Kitchen Set Bawah Finishing HPL')).toBe(true);
    expect(findCabinetPairIndex(sampleItems, 0)).toBe(1);
    expect(findCabinetPairIndex(sampleItems, 1)).toBe(0);
  });

  it('ketika kabinet atas diisi 2+2 (total 4), kabinet bawah otomatis ikut terisi yang sama', () => {
    const { updatedItems, mirroredIndex } = applyCabinetPairSync(
      sampleItems,
      0, // ubah kabinet atas
      4,
      '2+2'
    );

    expect(mirroredIndex).toBe(1);
    expect(updatedItems[1].qty).toBe(4);
    expect(updatedItems[1].dimension_expr).toBe('2+2');
  });

  it('tetap editable dan independen: jika kabinet bawah diubah manual berbeda, kabinet atas tidak dipaksa berubah', () => {
    // Awalnya sama (4m)
    const syncedItems: EstimationItemDraft[] = [
      { ...sampleItems[0], qty: 4, dimension_expr: '2+2' },
      { ...sampleItems[1], qty: 4, dimension_expr: '2+2' },
    ];

    // User mengubah kabinet bawah secara spesifik menjadi 2.5m
    syncedItems[1] = { ...syncedItems[1], qty: 2.5, dimension_expr: '' };

    // Sekarang jika kabinet atas diubah, kabinet bawah TIDAK boleh ikut lagi karena sudah beda
    const { updatedItems, mirroredIndex } = applyCabinetPairSync(
      syncedItems,
      0, // ubah kabinet atas jadi 5m
      5,
      ''
    );

    expect(mirroredIndex).toBeNull();
    expect(updatedItems[1].qty).toBe(2.5); // tetap 2.5m, tidak terganggu!
  });
});

describe('Integrasi 3D Intero dengan Dimensi Segmen L', () => {
  it('membaca segmen L 2.4+1.8 langsung ke dinding belakang (240cm) dan kiri (180cm)', () => {
    const draft: EstimationFormDraft = {
      code: 'EST-TEST',
      title: 'Kitchen Set Siku L',
      customer_name: 'Budi',
      customer_phone: '',
      customer_address: '',
      project_id: null,
      subtotal_hpp: 0,
      overhead_pct: 0,
      margin_pct: 0,
      discount_pct: 0,
      discount_amount: 0,
      adjustments: null,
      tax_pct: 0,
      total_selling_price: 0,
      total_profit: 0,
      notes: '',
      items: [
        {
          id: '1',
          estimation_id: 'est-1',
          pricelist_item_id: null,
          name: 'Kabinet Bawah HPL',
          category: 'material',
          unit: 'm',
          qty: 4.2,
          dimension_expr: '2.4+1.8',
          hpp_per_unit: 0,
          margin_pct: 0,
          selling_price_per_unit: 0,
          item_discount_pct: 0,
          item_discount_amount: 0,
          is_bonus: false,
          included: true,
          total_hpp: 0,
          total_selling: 0,
          total_profit: 0,
          sort_order: 1,
          notes: null,
          created_at: '',
        } as unknown as EstimationItemDraft,
      ],
      image_1_url: null,
      image_1_caption: null,
      image_2_url: null,
      image_2_caption: null,
      image_3_url: null,
      image_3_caption: null,
      pdf_primary_color: null,
      pdf_secondary_color: null,
      pdf_template: 'modern',
      pdf_invoice_template: null,
      status: 'draft',
      updated_at: '',
      created_at: '',
    };

    const proposal = analyzeEstimationForIntero(draft, draft.items as any);
    expect(proposal.shape).toBe('L');
    expect(proposal.lengthsCm.back).toBe(240);
    expect(proposal.lengthsCm.left).toBe(180);
    expect(proposal.totalBaseM).toBe(4.2);
  });
});

