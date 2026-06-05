import type { TCreatedPdf } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import vfs from 'pdfmake/build/vfs_fonts';

let initialized = false;

export function initPdfMake(): typeof pdfMake {
  if (!initialized) {
    const vfsData = (vfs as { default?: Record<string, string> }).default ?? (vfs as Record<string, string>);
    pdfMake.addVirtualFileSystem(vfsData);
    pdfMake.addFonts({
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    });
    initialized = true;
  }
  return pdfMake;
}

export async function pdfToBlob(pdf: TCreatedPdf): Promise<Blob> {
  const buffer = await pdf.getBuffer();
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return new Blob([new Uint8Array(view)], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
