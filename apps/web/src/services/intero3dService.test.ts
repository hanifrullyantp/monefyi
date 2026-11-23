import { describe, expect, it } from 'vitest';
import { decompressFromEncodedURIComponent } from 'lz-string';
import {
  analyzeEstimationForIntero,
  buildInteroWizardLaunch,
  generateInteroLaunchUrl,
} from './intero3dService';
import { isSuperAdminHanif, SUPER_ADMIN_LAUNCH_ALERT_EMAIL } from '../lib/estimatorLaunchPromo';
import type { EstimationFormDraft, EstimationItem, EstimationItemDraft } from '../types/estimator';

describe('isSuperAdminHanif', () => {
  it('memberikan akses untuk email resmi Super Admin Hanif', () => {
    expect(isSuperAdminHanif(SUPER_ADMIN_LAUNCH_ALERT_EMAIL)).toBe(true);
    expect(isSuperAdminHanif('HANIF.RULLYANT@GMAIL.COM')).toBe(true);
  });

  it('memberikan akses untuk user Hanif dengan peran platform admin', () => {
    expect(isSuperAdminHanif('hanif@monefyi.com', 'admin')).toBe(true);
    expect(isSuperAdminHanif('hanif@monefyi.com', 'super_admin')).toBe(true);
  });

  it('menolak akses untuk user umum dan non-hanif', () => {
    expect(isSuperAdminHanif('budi@example.com', 'member')).toBe(false);
    expect(isSuperAdminHanif('andi@monefyi.com', 'admin')).toBe(false);
    expect(isSuperAdminHanif(null)).toBe(false);
    expect(isSuperAdminHanif('')).toBe(false);
  });
});

describe('analyzeEstimationForIntero & buildInteroWizardLaunch', () => {
  const dummyDraft: EstimationFormDraft = {
    code: 'EST-2026-001',
    title: 'Kitchen Set Minimalis Sudut L',
    customer_name: 'Pak Budi',
    customer_phone: '08123456789',
    customer_address: 'Jakarta Selatan',
    project_id: null,
    subtotal_hpp: 15000000,
    overhead_pct: 0,
    margin_pct: 30,
    discount_pct: 0,
    discount_amount: 0,
    adjustments: [],
    tax_pct: 0,
    total_selling_price: 21500000,
    total_profit: 6500000,
    notes: 'Kitchen set bentuk L dengan kompor tanam, wastafel sink, dan kulkas',
    items: [
      {
        id: '1',
        estimation_id: 'est-1',
        pricelist_item_id: null,
        name: 'Kitchen Set Bawah Finishing HPL',
        category: 'material',
        unit: 'm',
        qty: 4,
        hpp_per_unit: 2000000,
        margin_pct: 30,
        selling_price_per_unit: 2600000,
        item_discount_pct: 0,
        item_discount_amount: 0,
        is_bonus: false,
        included: true,
        total_hpp: 8000000,
        total_selling: 10400000,
        total_profit: 2400000,
        sort_order: 1,
        notes: null,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        estimation_id: 'est-1',
        pricelist_item_id: null,
        name: 'Kitchen Set Atas Finishing HPL',
        category: 'material',
        unit: 'm',
        qty: 3,
        hpp_per_unit: 1800000,
        margin_pct: 30,
        selling_price_per_unit: 2340000,
        item_discount_pct: 0,
        item_discount_amount: 0,
        is_bonus: false,
        included: true,
        total_hpp: 5400000,
        total_selling: 7020000,
        total_profit: 1620000,
        sort_order: 2,
        notes: null,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        estimation_id: 'est-1',
        pricelist_item_id: null,
        name: 'Top Table Granit Hitam Nero',
        category: 'material',
        unit: 'm',
        qty: 4,
        hpp_per_unit: 1200000,
        margin_pct: 30,
        selling_price_per_unit: 1560000,
        item_discount_pct: 0,
        item_discount_amount: 0,
        is_bonus: false,
        included: true,
        total_hpp: 4800000,
        total_selling: 6240000,
        total_profit: 1440000,
        sort_order: 3,
        notes: null,
        created_at: new Date().toISOString(),
      },
    ] as unknown as EstimationItemDraft[],
    image_1_url: null,
    image_1_caption: null,
    image_2_url: null,
    image_2_caption: null,
    image_3_url: null,
    image_3_caption: null,
    pdf_primary_color: '#059669',
    pdf_secondary_color: '#1e293b',
    pdf_template: 'modern',
    pdf_invoice_template: 'modern',
    status: 'wa',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  } as unknown as EstimationFormDraft;

  it('mendeteksi bentuk L, appliances, dan material dengan tepat', () => {
    const proposal = analyzeEstimationForIntero(dummyDraft, dummyDraft.items);
    expect(proposal.shape).toBe('L');
    expect(proposal.totalBaseM).toBe(4);
    expect(proposal.totalWallM).toBe(3);
    expect(proposal.detectedAppliances.cooktop).toBe(true);
    expect(proposal.detectedAppliances.sink).toBe(true);
    expect(proposal.material.countertop).toBe('granit_hitam');
    expect(proposal.material.doorMaterial).toBe('HPL');
    // Pembagian panjang sudut L
    expect(proposal.lengthsCm.back).toBeGreaterThan(180);
    expect(proposal.lengthsCm.left).toBeGreaterThan(100);
  });

  it('mengirim wizard tanpa koordinat kabinet, dengan panjang dinding dan peralatan yang terdeteksi', () => {
    const proposal = analyzeEstimationForIntero(dummyDraft, dummyDraft.items);
    const launch = buildInteroWizardLaunch(dummyDraft, proposal);

    expect(launch.kind).toBe('wizard');
    expect(launch.projectName).toBe(dummyDraft.title);
    expect(launch.input.shape).toBe('L');
    expect(launch.input.lengths.back).toBeGreaterThan(180);
    expect(launch.input.sink.enabled).toBe(true);
    expect(launch.input.cooktop.enabled).toBe(true);
    expect(launch.input.fridge.wallId).toBe('left');
    expect(launch.input.options.wallCabinets).toBe(true);
    expect(launch).not.toHaveProperty('cabinets');
  });

  it('dapur lurus 4 m tidak dipaksa menjadi bentuk L', () => {
    const straight = {
      ...dummyDraft,
      title: 'Kitchen Set Bawah Finishing HPL',
      notes: '',
      items: dummyDraft.items.map((item) => item.name.includes('Atas') ? { ...item, included: false } : item),
    };
    const proposal = analyzeEstimationForIntero(straight, straight.items);
    expect(proposal.shape).toBe('I');
    expect(proposal.detectedAppliances.sink).toBe(false);
    expect(proposal.detectedAppliances.cooktop).toBe(false);
  });

  it('mengompresi wizard ke URL Hash #s=edit.<lz-string> yang dapat di-decompress kembali', () => {
    const proposal = analyzeEstimationForIntero(dummyDraft, dummyDraft.items);
    const launch = buildInteroWizardLaunch(dummyDraft, proposal);
    const url = generateInteroLaunchUrl(launch, 'https://3d.intero.id');

    expect(url.startsWith('https://3d.intero.id/#s=edit.')).toBe(true);
    const hashPart = url.split('#s=edit.')[1];
    expect(hashPart).toBeDefined();

    const decompressedJson = decompressFromEncodedURIComponent(hashPart);
    expect(decompressedJson).not.toBeNull();
    const parsed = JSON.parse(decompressedJson!);
    expect(parsed.kind).toBe('wizard');
    expect(parsed.projectName).toBe(dummyDraft.title);
    expect(parsed.input.shape).toBe('L');
  });
});

