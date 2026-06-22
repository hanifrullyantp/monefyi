import { useCallback, useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  compressEstimationImage,
  deleteEstimationImage,
  formatFileSize,
  uploadEstimationImage,
  validateImageFile,
  type ImageSlot,
} from '../../services/estimationImageService';
import type { EstimationImageDraft } from '../../types/estimator';

const CAPTION_SUGGESTIONS = ['Sketsa Desain', 'Foto Lokasi', 'Referensi Hasil'] as const;

interface Props {
  orgId: string;
  estimationId: string | null;
  images: EstimationImageDraft[];
  onChange: (images: EstimationImageDraft[]) => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
}

export default function EstimationImageSlots({
  orgId,
  estimationId,
  images,
  onChange,
  onToast,
}: Props) {
  const fileRefs = useRef<Array<HTMLInputElement | null>>([null, null, null]);
  const [dragOver, setDragOver] = useState<ImageSlot | null>(null);

  const patchSlot = useCallback(
    (slot: ImageSlot, patch: Partial<EstimationImageDraft>) => {
      const idx = slot - 1;
      onChange(images.map((img, i) => (i === idx ? { ...img, ...patch } : img)));
    },
    [images, onChange],
  );

  const processFile = async (slot: ImageSlot, file: File) => {
    const err = validateImageFile(file);
    if (err) {
      onToast?.(err, 'error');
      return;
    }

    patchSlot(slot, { uploading: true, compressInfo: undefined });

    try {
      const { file: compressed, beforeBytes, afterBytes } = await compressEstimationImage(file);
      const previewUrl = URL.createObjectURL(compressed);

      if (!estimationId) {
        patchSlot(slot, {
          pendingFile: compressed,
          previewUrl,
          storagePath: null,
          uploading: false,
          compressInfo: { before: beforeBytes, after: afterBytes },
        });
        onToast?.(`Dikompresi ${formatFileSize(beforeBytes)} → ${formatFileSize(afterBytes)}`, 'success');
        return;
      }

      const oldPath = images[slot - 1].storagePath;
      const path = await uploadEstimationImage(orgId, estimationId, slot, compressed);

      if (oldPath && oldPath !== path) {
        deleteEstimationImage(oldPath).catch(() => {});
      }

      patchSlot(slot, {
        storagePath: path,
        pendingFile: undefined,
        previewUrl,
        uploading: false,
        compressInfo: { before: beforeBytes, after: afterBytes },
      });
      onToast?.('Foto diupload', 'success');
    } catch (e) {
      patchSlot(slot, { uploading: false });
      onToast?.(e instanceof Error ? e.message : 'Gagal upload', 'error');
    }
  };

  const handleDelete = async (slot: ImageSlot) => {
    const idx = slot - 1;
    const img = images[idx];
    if (img.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);

    if (img.storagePath) {
      try {
        await deleteEstimationImage(img.storagePath);
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : 'Gagal hapus file', 'error');
        return;
      }
    }

    patchSlot(slot, {
      storagePath: null,
      previewUrl: null,
      pendingFile: undefined,
      caption: '',
      compressInfo: undefined,
      uploading: false,
    });
    onToast?.('Foto dihapus', 'success');
  };

  const onDrop = (slot: ImageSlot) => (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) processFile(slot, file);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase">Foto Referensi</h3>
        {!estimationId && (
          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Foto diupload ke server saat simpan
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([1, 2, 3] as ImageSlot[]).map(slot => {
          const img = images[slot - 1];
          const isDragging = dragOver === slot;

          return (
            <div key={slot} className="space-y-2">
              <div
                className={`relative aspect-[4/3] rounded-xl border-2 border-dashed overflow-hidden transition-colors ${
                  isDragging ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(slot); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={onDrop(slot)}
              >
                {img.uploading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="text-xs text-slate-500">Mengompresi & upload...</span>
                  </div>
                ) : img.previewUrl ? (
                  <>
                    <img
                      src={img.previewUrl}
                      alt={`Foto ${slot}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDelete(slot)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-rose-600 text-white rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {img.compressInfo && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1">
                        {formatFileSize(img.compressInfo.before)} → {formatFileSize(img.compressInfo.after)}
                      </div>
                    )}
                    {img.pendingFile && !estimationId && (
                      <div className="absolute top-2 left-2 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded">
                        Pending
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[slot - 1]?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors"
                  >
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-xs font-medium">Foto {slot}</span>
                    <span className="text-[10px]">Drag & drop atau klik</span>
                  </button>
                )}
                <input
                  ref={el => { fileRefs.current[slot - 1] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) processFile(slot, file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="flex gap-1 flex-wrap">
                {CAPTION_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patchSlot(slot, { caption: s })}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      img.caption === s
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:border-emerald-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                value={img.caption}
                onChange={e => patchSlot(slot, { caption: e.target.value })}
                placeholder={slot === 1 ? 'Sketsa awal' : slot === 2 ? 'Foto lokasi' : 'Referensi hasil'}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-600 mt-3">
        Maks {formatFileSize(2 * 1024 * 1024)} per file · JPG/PNG/WEBP · Auto-kompresi ke ~500KB
      </p>
    </section>
  );
}
