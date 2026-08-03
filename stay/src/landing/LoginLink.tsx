import { Link } from 'react-router-dom';

/** All landing CTAs point to the STAY login page */
export const LOGIN_PATH = '/login';

interface LoginLinkProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'button' | 'link';
}

export function LoginLink({ children, className = '', variant = 'button' }: LoginLinkProps) {
  if (variant === 'link') {
    return (
      <Link to={LOGIN_PATH} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to={LOGIN_PATH} className={className}>
      {children}
    </Link>
  );
}
