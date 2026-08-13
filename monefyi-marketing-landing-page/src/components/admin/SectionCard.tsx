/** src/components/admin/SectionCard.tsx */
import React from 'react';
import { cn } from '../../lib/cn';

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <div className={cn("bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8", className)}>
      {title && <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">{title}</h3>}
      {children}
    </div>
  );
}
