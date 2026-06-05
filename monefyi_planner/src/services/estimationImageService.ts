import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import type { EstimationImageDraft } from '../types/estimator';

export const ESTIMATION_IMAGES_BUCKET = 'estimation-images';
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ImageSlot = 1 | 2 | 3;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Format harus JPG, PNG, atau WEBP';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Ukuran maksimal ${formatFileSize(MAX_IMAGE_BYTES)}`;
  }
  return null;
}

export async function compressEstimationImage(
  file: File,
): Promise<{ file: File; beforeBytes: number; afterBytes: number }> {
  const beforeBytes = file.size;
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1920,
    initialQuality: 0.8,
    maxSizeMB: 0.5,
    useWebWorker: true,
    fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  });

  if (compressed.size > MAX_IMAGE_BYTES) {
    throw new Error(`Gambar masih terlalu besar setelah kompresi (${formatFileSize(compressed.size)})`);
  }

  return { file: compressed, beforeBytes, afterBytes: compressed.size };
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function buildImageStoragePath(
  orgId: string,
  estimationId: string,
  slot: ImageSlot,
  mime: string,
): string {
  const ext = extFromMime(mime);
  return `${orgId}/${estimationId}/slot_${slot}-${Date.now()}.${ext}`;
}

export async function uploadEstimationImage(
  orgId: string,
  estimationId: string,
  slot: ImageSlot,
  file: File,
): Promise<string> {
  const path = buildImageStoragePath(orgId, estimationId, slot, file.type);
  const { error } = await supabase.storage
    .from(ESTIMATION_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

export async function deleteEstimationImage(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(ESTIMATION_IMAGES_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(error.message);
}

export async function getSignedImageUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ESTIMATION_IMAGES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Gagal membuat URL gambar');
  return data.signedUrl;
}

export async function getSignedImageUrls(
  paths: Array<string | null | undefined>,
): Promise<Array<string | null>> {
  return Promise.all(
    paths.map(async p => {
      if (!p) return null;
      try {
        return await getSignedImageUrl(p);
      } catch {
        return null;
      }
    }),
  );
}

export function emptyImageDrafts(): EstimationImageDraft[] {
  return [
    { storagePath: null, caption: '', previewUrl: null },
    { storagePath: null, caption: '', previewUrl: null },
    { storagePath: null, caption: '', previewUrl: null },
  ];
}

export function imagesToDbFields(images: EstimationImageDraft[]) {
  return {
    image_1_url: images[0]?.storagePath || null,
    image_1_caption: images[0]?.caption || null,
    image_2_url: images[1]?.storagePath || null,
    image_2_caption: images[1]?.caption || null,
    image_3_url: images[2]?.storagePath || null,
    image_3_caption: images[2]?.caption || null,
  };
}

export async function hydrateImageDrafts(est: {
  image_1_url: string | null;
  image_1_caption: string | null;
  image_2_url: string | null;
  image_2_caption: string | null;
  image_3_url: string | null;
  image_3_caption: string | null;
}): Promise<EstimationImageDraft[]> {
  const paths = [est.image_1_url, est.image_2_url, est.image_3_url];
  const captions = [est.image_1_caption, est.image_2_caption, est.image_3_caption];
  const previews = await getSignedImageUrls(paths);

  return paths.map((storagePath, i) => ({
    storagePath,
    caption: captions[i] || '',
    previewUrl: previews[i],
  }));
}

export async function uploadPendingImages(
  orgId: string,
  estimationId: string,
  images: EstimationImageDraft[],
): Promise<EstimationImageDraft[]> {
  const next = [...images];
  for (let i = 0; i < 3; i++) {
    const img = next[i];
    if (!img.pendingFile) continue;
    const slot = (i + 1) as ImageSlot;
    const path = await uploadEstimationImage(orgId, estimationId, slot, img.pendingFile);
    if (img.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);
    next[i] = { ...img, storagePath: path, pendingFile: undefined };
  }
  return next;
}
