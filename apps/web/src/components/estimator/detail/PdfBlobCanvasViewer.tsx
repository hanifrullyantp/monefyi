import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

type Props = {
  blob: Blob;
  title: string;
};

export default function PdfBlobCanvasViewer({ blob, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    const run = async () => {
      setLoading(true);
      setError('');
      if (container) container.innerHTML = '';

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).href;

        const data = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled || !container) return;

        const scale = typeof window !== 'undefined' && window.innerWidth < 640 ? 1.25 : 1.5;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `${title} — halaman ${pageNum}`);
          canvas.className = 'w-full h-auto mx-auto mb-3 shadow-md bg-white rounded-sm';

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas tidak tersedia');
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Gagal menampilkan PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [blob, title]);

  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-slate-200/90 p-2 sm:p-4">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-red-600 text-center">
          {error}
        </div>
      )}
      <div ref={containerRef} className="max-w-3xl mx-auto pb-4" />
    </div>
  );
}
