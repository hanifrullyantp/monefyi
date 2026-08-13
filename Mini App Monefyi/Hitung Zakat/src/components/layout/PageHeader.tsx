'use client';

import Link from 'next/link';
import { Container } from './Container';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatRupiah } from '@/lib/formatters';
import { getNisabInRupiah } from '@/data/nisab';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  showNisab?: boolean;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  showNisab = true,
  backHref = '/',
}: PageHeaderProps) {
  const nisab = getNisabInRupiah();

  return (
    <div className="bg-gradient-to-b from-green-950 to-slate-950 border-b border-green-500/10">
      <Container className="py-8 md:py-12">
        {/* Back Link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>

        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {title}
            </h1>
            <p className="text-green-100/70 text-lg">{description}</p>
          </div>

          {/* Nisab Badge */}
          {showNisab && (
            <div className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <p className="text-xs text-green-400 uppercase tracking-wider mb-1">
                Nisab saat ini
              </p>
              <p className="text-lg font-bold text-white">
                {formatRupiah(nisab)}
              </p>
              <p className="text-xs text-green-100/50">= 85 gram emas</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

// Wrapper for creating icon element
export function PageHeaderIcon({ children }: { children: ReactNode }) {
  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
      {children}
    </div>
  );
}
