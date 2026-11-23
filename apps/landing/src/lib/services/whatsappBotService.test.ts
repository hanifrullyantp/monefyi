import { describe, expect, it } from 'vitest';
import {
  handleIncomingWAMessage,
  normalizeWAPhone,
  DEFAULT_WA_BOT_CONFIG,
  type WABotConfig,
} from './whatsappBotService';

describe('WhatsApp Bot Service (CS & Koordinasi Karyawan)', () => {
  const dummyConfig: WABotConfig = {
    ...DEFAULT_WA_BOT_CONFIG,
    ownerPhone: '62811111111',
    employees: [
      {
        id: 'emp-fin',
        name: 'Mbak Rina (Finance)',
        phone: '6281234567801',
        role: 'finance',
        active: true,
      },
      {
        id: 'emp-man',
        name: 'Pak Joko (Mandor)',
        phone: '6281234567802',
        role: 'mandor',
        active: true,
      },
    ],
  };

  it('normalisasi nomor WhatsApp ke format internasional 628xxx', () => {
    expect(normalizeWAPhone('081234567890')).toBe('6281234567890');
    expect(normalizeWAPhone('+6281234567890')).toBe('6281234567890');
    expect(normalizeWAPhone('6281234567890')).toBe('6281234567890');
  });

  it('mengenali pesan dari Finance dan membalas perintah keuangan', () => {
    const res = handleIncomingWAMessage('081234567801', '#cek-kasbon', dummyConfig);
    expect(res.senderType).toBe('employee');
    expect(res.employeeRole).toBe('finance');
    expect(res.replyText).toContain('Rekap Kasbon Pending');
  });

  it('mengenali pesan dari Mandor dan mencatat laporan opname progres', () => {
    const res = handleIncomingWAMessage(
      '081234567802',
      '#opname 85% Kitchen Set Budi pemasangan kabinet selesai',
      dummyConfig
    );
    expect(res.senderType).toBe('employee');
    expect(res.employeeRole).toBe('mandor');
    expect(res.replyText).toContain('Laporan Opname Progres Diterima');
  });

  it('menjawab pertanyaan calon customer umum lewat CS (Mbak Esti)', () => {
    const res = handleIncomingWAMessage(
      '08999999999',
      'Halo Mbak Esti, saya mau tanya cara bikin PDF penawaran di HP',
      dummyConfig
    );
    expect(res.senderType).toBe('customer');
    expect(res.replyText.toLowerCase()).toContain('penawaran');
    expect(res.escalationRequired).toBeFalsy();
  });

  it('mendeteksi pertanyaan nego/diskon sulit dan menandai eskalasi ke owner', () => {
    const res = handleIncomingWAMessage(
      '08999999999',
      'Halo apakah ada diskon khusus untuk kantor kami?',
      dummyConfig
    );
    expect(res.senderType).toBe('customer');
    expect(res.escalationRequired).toBe(true);
    expect(res.replyText).toContain('izin teruskan langsung');
  });
});

