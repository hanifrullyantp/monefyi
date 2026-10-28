const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const ACCEPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Baca & resize gambar untuk media library (data URL, max lebar).
 * @param {File} file
 * @param {number} [maxWidth]
 * @param {number} [quality]
 */
export async function processImageFileForMedia(
  file: File,
  maxWidth = 1600,
  quality = 0.82,
): Promise<{ url: string; name: string; type: string; size: string }> {
  if (!file.type.startsWith("image/") && !ACCEPT_TYPES.has(file.type)) {
    throw new Error("Format tidak didukung. Pakai JPG, PNG, atau WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("File terlalu besar (maks. 5 MB).");
  }

  const url = await readAndResizeToDataUrl(file, maxWidth, quality);
  const approxBytes = Math.round((url.length - url.indexOf(",") - 1) * 0.75);

  return {
    url,
    name: file.name.replace(/\s+/g, "-") || "upload.jpg",
    type: file.type.startsWith("image/") ? file.type : "image/jpeg",
    size: formatFileSize(approxBytes),
  };
}

/**
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} quality
 */
function readAndResizeToDataUrl(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("Gagal membaca file."));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Gambar tidak valid."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const usePng = file.type === "image/png" || file.type === "image/gif";
        const mime = usePng ? "image/png" : "image/jpeg";
        const outQuality = usePng ? undefined : quality;
        resolve(canvas.toDataURL(mime, outQuality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
