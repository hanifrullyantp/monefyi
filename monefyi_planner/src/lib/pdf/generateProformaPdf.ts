import type { NormalizedProjectView } from '../migration/project-normalize';
import type { Project } from '../../store/appStore';
import type { PdfDisplayOptions, PdfSettings } from '../../types/pdfSettings';
import { buildProformaPdfContext, type ProformaPdfInput } from './proformaPdfContext';
import { buildProformaDocumentDefinition } from './proformaPdfTemplate';
import { initPdfMake, pdfToBlob, downloadBlob } from './pdfMakeSetup';

function sanitizeFilenamePart(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || 'Proyek';
}

export function proformaPdfFilename(project: Project): string {
  return `Proforma Invoice ${sanitizeFilenamePart(project.name)}.pdf`;
}

/** Default DP: 30% kontrak jika belum ada pembayaran, else sisa tagihan. */
export function suggestProformaDpAmount(normalized: NormalizedProjectView): number {
  const contract = normalized.project.contractValue || 0;
  if (contract <= 0) return 0;
  if (normalized.totalPemasukan <= 0) {
    return Math.round(contract * 0.3);
  }
  return Math.max(0, normalized.sisaPembayaran);
}

export async function generateProformaPdfBlob(input: ProformaPdfInput): Promise<Blob> {
  const ctx = await buildProformaPdfContext(input);
  const docDef = buildProformaDocumentDefinition(ctx);
  const pdfMake = initPdfMake();
  const pdf = pdfMake.createPdf(docDef);
  return pdfToBlob(pdf);
}

export async function downloadProformaPdf(input: ProformaPdfInput): Promise<void> {
  const blob = await generateProformaPdfBlob(input);
  downloadBlob(blob, proformaPdfFilename(input.project));
}
