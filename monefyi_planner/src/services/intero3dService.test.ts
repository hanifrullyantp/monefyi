import { describe, expect, it } from 'vitest';
import { decompressFromEncodedURIComponent } from 'lz-string';
import {
  analyzeEstimationForIntero,
  buildInteroProjectData,
  generateInteroLaunchUrl,
} from './intero3dService';
import { isSuperAdminHanif, SUPER_ADMIN_LAUNCH_ALERT_EMAIL } from '../lib/estimatorLaunchPromo';
import type { EstimationFormDraft, EstimationItem } from '../types/estimator';

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

describe('analyzeEstimationForIntero & buildInteroProjectData', () => {
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
    adjustments: null,
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
    ] as EstimationItem[],
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
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

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

  it('membangun ProjectData Intero yang valid dan dapat di-render', () => {
    const proposal = analyzeEstimationForIntero(dummyDraft, dummyDraft.items);
    const project = buildInteroProjectData(dummyDraft, proposal);

    expect(project.projectName).toBe(dummyDraft.title);
    expect(project.walls.length).toBe(2); // Dinding kiri & belakang untuk bentuk L
    expect(project.cabinets.length).toBeGreaterThan(0);
    // Memastikan terdapat kabinet bawah dan kabinet atas
    const hasBase = project.cabinets.some(c => c.type === 'base' || c.type === 'corner_base' || c.type === 'sink_base');
    const hasWall = project.cabinets.some(c => c.type === 'wall' || c.type === 'corner_wall' || c.type === 'hood');
    expect(hasBase).toBe(true);
    expect(hasWall).toBe(true);
  });

  it('mengompresi data ke URL Hash #s=edit.<lz-string> yang dapat di-decompress kembali', () => {
    const proposal = analyzeEstimationForIntero(dummyDraft, dummyDraft.items);
    const project = buildInteroProjectData(dummyDraft, proposal);
    const url = generateInteroLaunchUrl(project, 'https://3d.intero.id');

    expect(url.startsWith('https://3d.intero.id/#s=edit.')).toBe(true);
    const hashPart = url.split('#s=edit.')[1];
    expect(hashPart).toBeDefined();

    // Verifikasi round-trip decompress sama persis dengan yang dilakukan oleh 3D Intero
    const decompressedJson = decompressFromEncodedURIComponent(hashPart);
    expect(decompressedJson).not.toBeNull();
    const parsed = JSON.parse(decompressedJson!);
    expect(parsed.projectName).toBe(dummyDraft.title);
    expect(parsed.cabinets.length).toBe(project.cabinets.length);
  });
});

