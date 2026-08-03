import type { HTMLAttributes, ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string;
}

interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

interface AvatarFallbackProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string;
}

/** Root avatar container (shadcn-style) */
export function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Avatar image with object-cover */
export function AvatarImage({ className, alt = '', ...props }: AvatarImageProps) {
  return (
    <img
      alt={alt}
      className={cn('aspect-square h-full w-full object-cover', className)}
      {...props}
    />
  );
}

/** Fallback when image unavailable */
export function AvatarFallback({ className, children, ...props }: AvatarFallbackProps) {
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
