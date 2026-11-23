/** Fetch image URL and return data URI for pdfmake embedding. */
export async function urlToDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUri(blob);
  } catch {
    return null;
  }
}

export function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function fileToDataUri(file: File): Promise<string> {
  return blobToDataUri(file);
}
