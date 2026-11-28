import type { RapBreakdown } from '../data/types';

/** The print document, CSV and on-screen recap all display the same ledger. */
export function priceRows(p: RapBreakdown): [string, number][] {
  return [
    ['Biaya langsung', p.direct],
    ['Biaya tak langsung', p.indirect],
    ['Kontingensi', p.contingency],
    ['RAP (modal)', p.rap],
    ['Overhead', p.overhead],
    ['Profit', p.profit],
    ['Harga jual sebelum PPN', p.sellingPrice],
    [p.ppnEnabled ? 'PPN' : 'PPN (nonaktif)', p.ppn],
    ['Total dibayar pembeli', p.total],
  ];
}