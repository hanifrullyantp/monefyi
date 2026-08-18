import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from './estimationImageService';

export const COMPANY_ASSETS_BUCKET = 'company-assets';

export async function compressCompanyImage(
  file: File,
  maxWidthOrHeight: number,
): Promise<File> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const compressed = await imageCompression(file, {
    maxWidthOrHeight,
    initialQuality: 0.8,
    maxSizeMB: 0.5,
    useWebWorker: true,
    fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  });

  if (compressed.size > MAX_IMAGE_BYTES) {
    throw new Error('Gambar masih terlalu besar setelah kompresi (maks 2MB)');
  }
  return compressed;
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadCompanyAsset(
  orgId: string,
  kind: 'logo' | 'signature',
  file: File,
): Promise<string> {
  const maxDim = kind === 'logo' ? 400 : 300;
  const compressed = await compressCompanyImage(file, maxDim);
  const ext = extFromMime(compressed.type);
  const path = `${orgId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(COMPANY_ASSETS_BUCKET)
    .upload(path, compressed, { upsert: true, contentType: compressed.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(COMPANY_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteCompanyAssetByUrl(url: string): Promise<void> {
  if (!url) return;
  const marker = `/object/public/${COMPANY_ASSETS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  const { error } = await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
