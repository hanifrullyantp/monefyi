import { Link } from 'react-router-dom';

export const LOGIN_PATH = '/login';
export const REGISTER_PATH = '/register';
export const REGISTER_LANDING_PATH = `${REGISTER_PATH}?source=landing_page_cta`;

interface AuthLinkProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'button' | 'link';
  to?: string;
}

/** CTA landing → login atau register */
export function LoginLink({
  children,
  className = '',
  variant = 'button',
  to = LOGIN_PATH,
}: AuthLinkProps) {
  if (variant === 'link') {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

/** Shortcut untuk CTA trial / daftar */
export function RegisterLink(props: Omit<AuthLinkProps, 'to'>) {
  return <LoginLink {...props} to={REGISTER_LANDING_PATH} />;
}
