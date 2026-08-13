import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { GradientText } from './GradientText';
import { Badge } from './Badge';

interface SectionHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  highlight?: React.ReactNode;
  subtitle?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ eyebrow, title, highlight, subtitle, centered = true, className }: SectionHeaderProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn('mb-12 md:mb-16', centered && 'text-center', className)}
    >
      {eyebrow && (
        <Badge variant="green" className="mb-4">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
        {title}{' '}
        {highlight && (
          <GradientText variant="green">
            {highlight}
          </GradientText>
        )}
      </h2>
      {subtitle && (
        <div className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
