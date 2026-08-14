import React from 'react';
import { cn } from '../../lib/cn';

interface GradientTextProps {
  children: React.ReactNode;
  variant?: 'green' | 'gold' | 'purple' | 'blue' | 'red';
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
}

export function GradientText({ children, variant = 'green', className, as: Tag = 'span' }: GradientTextProps): React.ReactElement {
  const gradients = {
    green: 'bg-gradient-to-r from-green-300 to-green-500 bg-clip-text text-transparent',
    gold: 'bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent',
    purple: 'bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent',
    blue: 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent',
    red: 'bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent',
  };
  const gradientClass = cn(gradients[variant], className);

  // bg-clip-text must sit on the same element as the text — nested spans go invisible
  if (React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, {
      className: cn(gradientClass, children.props.className),
    });
  }

  return <Tag className={gradientClass}>{children}</Tag>;
}
