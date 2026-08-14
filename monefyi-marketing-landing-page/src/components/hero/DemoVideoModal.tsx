'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { resolveVideoEmbed } from '../../lib/video-url';

interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  posterUrl?: string;
  title?: string;
}

export function DemoVideoModal({
  open,
  onClose,
  videoUrl,
  posterUrl,
  title = 'Demo Monefyi',
}: DemoVideoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const embed = resolveVideoEmbed(videoUrl);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="aspect-video bg-black">
          {!embed ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm p-8 text-center">
              Video demo belum diatur. Upload di Admin → Media &amp; Demo.
            </div>
          ) : embed.kind === 'file' ? (
            <video
              src={embed.src}
              poster={posterUrl || undefined}
              controls
              autoPlay
              className="w-full h-full"
              playsInline
            />
          ) : (
            <iframe
              src={`${embed.src}?autoplay=1`}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}
