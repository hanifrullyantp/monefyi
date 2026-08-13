import React from 'react';
import { cn } from '../../lib/cn';

interface SectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  innerClassName?: string;
  background?: 'default' | 'alt' | 'green' | 'dark';
}

export function SectionWrapper({ children, id, className, innerClassName, background = 'default' }: SectionWrapperProps): React.ReactElement {
  const bgs = {
    default: 'bg-slate-950',
    alt: 'bg-slate-900',
    green: 'bg-gradient-to-b from-green-950/30 to-slate-950',
    dark: 'bg-slate-900',
  };
  return (
    <section id={id} className={cn('py-16 md:py-24', bgs[background], className)}>
      <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', innerClassName)}>
        {children}
      </div>
    </section>
  );
}
