import { cn } from '../../utils/cn';

const AVATAR_PALETTE = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-coral-600',
] as const;

/** Hash nama tamu ke warna bg konsisten */
export function hashNameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Ambil inisial dari nama (max 2 huruf) */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface GuestAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';

/**
 * Avatar tamu dengan fallback inisial berwarna hash-based.
 */
export default function GuestAvatar({
  name,
  photoUrl,
  size = 'md',
  className,
}: GuestAvatarProps) {
  const initials = getInitials(name);
  const bgColor = hashNameToColor(name);

  return (
    <Avatar
      className={cn(sizeMap[size], className)}
      aria-label={`Avatar ${name}`}
    >
      {photoUrl ? (
        <AvatarImage src={photoUrl} alt={name} />
      ) : null}
      <AvatarFallback className={cn('text-white', bgColor)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
