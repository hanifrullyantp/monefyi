/** Parse video URL untuk embed / native player */

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function getVimeoEmbedUrl(url: string): string | null {
  if (!url?.includes('vimeo.com')) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:video')) return true;
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

export function resolveVideoEmbed(url: string): { kind: 'youtube' | 'vimeo' | 'file'; src: string } | null {
  if (!url) return null;
  const yt = getYouTubeEmbedUrl(url);
  if (yt) return { kind: 'youtube', src: yt };
  const vimeo = getVimeoEmbedUrl(url);
  if (vimeo) return { kind: 'vimeo', src: vimeo };
  if (isDirectVideoUrl(url)) return { kind: 'file', src: url };
  return null;
}
