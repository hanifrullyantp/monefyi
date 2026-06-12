import { describe, it, expect } from 'vitest';
import { parseCostText } from './costParser';

const SAMPLE = `Jum'at, 5/6/2026
Duit keluar :
- 63.500 belanja ferum utk mesin las workshop kerjaan aloevera (indra)
- 33.000 ultraflex 3 pcs aloevera (indra)
- 15.000 kunci L utk pasang kabel ground mesin las workhsop (Indra)
- 202.750 listrik workshop (Rully)

Sabtu, 6/6/2026
Duit keluar :
- 129.000 aneka Logam (Rully)
- 70.000 1 tabung bearing router 10 mm workshop (Rully)
- 129.000 2 btg siku 4x4 utk cc Susanti (Rully)
- 850.000 gaji Gustam : 510K kerjaan rangka cc, 340K kerjaan aloevera (Indra)
- 900.000 gaji bang Deris krjaan cc Susanti (Indra)
- 632.500 gaji Tio krjaan cc Susanti (Indra)

Senin, 8/6/2026
Duit keluar :
- 5.000 biaya kekurangan saldo iklan fb (Rully)
- 5.000 biaya kekurangan saldo iklan fb (Rully)
- 25.022 iklan fb (Rully)
- 50.043 iklan fb (Rully)

Selasa, 9/6/2026
Duit keluar :
- 5.000 biaya kekurangan saldo iklan fb (Rully)
- 5.000 biaya kekurangan saldo iklan fb (Rully)
- 14.000 1 pce mata gerinda grid 800 utk aloevera (Indra)
- 32.000 4 m edging kayu pvc cc Susanti (Indra)
- 320.000 4 m kaca film 80% utk aloevera (Indra)
- 52.500 15 lbr amplas utk kerjaan aloevera (Indra)
- 15.000 15 pcs skrup utk kusen aloevera (Indra)
- 25.000 1 pce batu gerinda amplas halus utk aloevera (Indra)

Rabu, 10/6/2026
Duit keluar :
- 22.000 2 pcs mata bor 2.5 mm utk workshop (Indra)
- 18.000 1 pce mata bor 4 mm utk workshop (Indra)`;

describe('parseCostText', () => {
  it('parses user WhatsApp sample with split Gustam line', () => {
    const lines = parseCostText(SAMPLE);
    expect(lines.length).toBe(25);

    const gustam = lines.filter(l => l.item.includes('gaji Gustam'));
    expect(gustam).toHaveLength(2);
    expect(gustam[0].total).toBe(510000);
    expect(gustam[1].total).toBe(340000);
    expect(gustam[0].date).toBe('2026-06-06');
    expect(gustam[0].supplier).toBe('Indra');

    const friday = lines.filter(l => l.date === '2026-06-05');
    expect(friday).toHaveLength(4);
    expect(friday[0].total).toBe(63500);

    const wednesday = lines.filter(l => l.date === '2026-06-10');
    expect(wednesday).toHaveLength(2);

    const total = lines.reduce((s, l) => s + l.total, 0);
    expect(total).toBeGreaterThan(3_400_000);
  });

  it('parses single-line collapsed WhatsApp paste', () => {
    const collapsed = SAMPLE.replace(/\n/g, ' ');
    const lines = parseCostText(collapsed);
    expect(lines.length).toBeGreaterThan(20);
  });
});
