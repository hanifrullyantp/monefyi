export const MONEFYI_LOGO_SRC = '/icons/monefyi-logo.png?v=2026-08-13-m';

interface MonefyiLogoProps {
  className?: string;
  alt?: string;
}

export function MonefyiLogo({ className = 'w-9 h-9 rounded-xl object-contain shrink-0', alt = 'Monefyi' }: MonefyiLogoProps) {
  return <img src={MONEFYI_LOGO_SRC} alt={alt} className={className} />;
}
