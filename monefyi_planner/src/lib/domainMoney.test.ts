import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  firstRupiah,
  orgToday,
  parseCostCommand,
  parseRupiah,
} from '../../../packages/domain/src/money';
import {
  assertContextSize,
  assertParseInput,
  assertProjectId,
  quotaDecision,
} from '../../../my-supabase-project/supabase/functions/_shared/plannerGate';
import { orgToday as edgeOrgToday } from '../../../my-supabase-project/supabase/functions/_shared/orgDate';
import { parseCommand } from './commandParser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('parseRupiah - ungkapan nominal', () => {
  it('65 ribu, 65rb, dan 65k menjadi 65000', () => {
    expect(parseRupiah('65 ribu').amount).toBe(65_000);
    expect(parseRupiah('65rb').amount).toBe(65_000);
    expect(parseRupiah('65k').amount).toBe(65_000);
    expect(parseRupiah('65k').needsReview).toBe(false);
  });

  it('1,5 juta dan 1,5jt menjadi 1500000', () => {
    expect(parseRupiah('1,5 juta')).toMatchObject({ ok: true, amount: 1_500_000, needsReview: false });
    expect(parseRupiah('1,5jt').amount).toBe(1_500_000);
    expect(parseRupiah('1.5 juta').amount).toBe(1_500_000);
  });

  it('2 juta 500 ribu menjadi 2500000', () => {
    expect(parseRupiah('2 juta 500 ribu').amount).toBe(2_500_000);
  });

  it('pemisah ribuan Indonesia', () => {
    expect(parseRupiah('1.500.000').amount).toBe(1_500_000);
    expect(parseRupiah('Rp 65.000').amount).toBe(65_000);
    expect(parseRupiah('65000').amount).toBe(65_000);
  });

  it('k di dalam kata bukan pengali', () => {
    expect(firstRupiah('beli semen 10 sak 65000').amount).toBe(65_000);
    expect(firstRupiah('bayar tukang 1.500.000').amount).toBe(1_500_000);
    expect(firstRupiah('beli cat 2 kaleng 150000').amount).toBe(150_000);
  });

  it('angka ambigu ditandai needsReview', () => {
    expect(parseRupiah('1.5').needsReview).toBe(true);
    expect(parseRupiah('1,500').needsReview).toBe(true);
    expect(parseRupiah('bukan angka').ok).toBe(false);
  });
});

describe('parseCostCommand - regresi lapangan', () => {
  it('beli semen 10 sak 65000 = 10 x 65000', () => {
    expect(parseCostCommand('beli semen 10 sak 65000')).toMatchObject({
      item: 'semen',
      qty: 10,
      unit: 'sak',
      unitPrice: 65_000,
      total: 650_000,
      needsReview: false,
    });
  });

  it('bayar tukang 1.500.000 tetap 1500000', () => {
    expect(parseCostCommand('bayar tukang 1.500.000')).toMatchObject({
      item: 'tukang',
      total: 1_500_000,
      needsReview: false,
    });
  });

  it('bayar tukang 1,5 juta = 1500000', () => {
    expect(parseCostCommand('bayar tukang 1,5 juta')).toMatchObject({
      item: 'tukang',
      total: 1_500_000,
      needsReview: false,
    });
  });

  it('beli cat 2 kaleng 150000 = 300000', () => {
    expect(parseCostCommand('beli cat 2 kaleng 150000')).toMatchObject({
      item: 'cat',
      qty: 2,
      unit: 'kaleng',
      unitPrice: 150_000,
      total: 300_000,
      needsReview: false,
    });
  });

  it('satuan ember, galon, dus, set, titik, hari, orang, m2', () => {
    expect(parseCostCommand('beli cat 2 ember 150000')?.total).toBe(300_000);
    expect(parseCostCommand('beli thinner 1 galon 80000')?.unit).toBe('galon');
    expect(parseCostCommand('beli keramik 3 dus 250000')?.qty).toBe(3);
    expect(parseCostCommand('bayar borongan 1 set 2500000')?.total).toBe(2_500_000);
    expect(parseCostCommand('beli lampu 4 titik 75000')?.unit).toBe('titik');
    expect(parseCostCommand('bayar mandor 2 hari 200000')?.total).toBe(400_000);
    expect(parseCostCommand('bayar tukang 3 orang 150000')?.unit).toBe('orang');
    expect(parseCostCommand('beli granit 5 m2 350000')?.unit).toBe('m2');
  });
});

describe('parseCommand memakai parseRupiah', () => {
  it('regresi semen tidak menjadi 650 juta', () => {
    const result = parseCommand('beli semen 10 sak 65000');
    expect(result.intent).toBe('record_cost');
    expect(result.params.total).toBe(650_000);
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('catat semen 10 sak 65000', () => {
    expect(parseCommand('catat semen 10 sak 65000').params.total).toBe(650_000);
  });

  it('terima 1,5 juta tidak menjadi 15 juta', () => {
    const result = parseCommand('terima 1,5 juta dp proyek rumah');
    expect(result.intent).toBe('record_income');
    expect(result.params.total).toBe(1_500_000);
  });
});

describe('orgToday', () => {
  it('00.30 WIB masih tanggal lokal, bukan UTC kemarin', () => {
    const instant = new Date('2026-11-03T17:30:00.000Z');
    expect(orgToday('Asia/Jakarta', instant)).toBe('2026-11-04');
    expect(edgeOrgToday('Asia/Jakarta', instant)).toBe('2026-11-04');
  });

  it('23.30 WIB belum berganti hari', () => {
    const instant = new Date('2026-11-03T16:30:00.000Z');
    expect(orgToday('Asia/Jakarta', instant)).toBe('2026-11-03');
  });
});

describe('gerbang input', () => {
  it('menolak input kosong, bukan teks, dan terlalu panjang', () => {
    expect(assertParseInput('').ok).toBe(false);
    expect(assertParseInput(12).ok).toBe(false);
    expect(assertParseInput('beli semen').ok).toBe(true);
    const huge = assertParseInput('a'.repeat(4001));
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.error.code).toBe('input_terlalu_panjang');
  });

  it('menolak id proyek yang bukan uuid', () => {
    expect(assertProjectId('proyek-rumah').ok).toBe(false);
    expect(assertProjectId('a1111111-2222-4333-8444-555555555501').ok).toBe(true);
  });

  it('kuota harian menolak setelah batas', () => {
    expect(quotaDecision(29, 30)).toEqual({ ok: true, next: 30 });
    expect(quotaDecision(30, 30).ok).toBe(false);
  });

  it('konteks besar ditolak', () => {
    expect(assertContextSize({ notes: 'x'.repeat(9000) }).ok).toBe(false);
  });
});

describe('repo tidak menyimpan kata sandi bypass', () => {
  const files = [
    'planner/js/config.js',
    'planner/public/js/config.js',
    'planner/README.md',
    'planner/index.html',
    'my-supabase-project/supabase/migrations/20260524120000_planner_seed_auth_email_users.sql',
  ];

  it('tidak memuat kata sandi yang pernah di-hardcode', () => {
    for (const file of files) {
      const p = resolve(root, file);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, 'utf8');
      expect(text, file).not.toMatch(/PlannerBypass2026/);
      expect(text, file).not.toMatch(/bypassPassword/);
      expect(text, file).not.toMatch(/88888888/);
    }
  });
});
