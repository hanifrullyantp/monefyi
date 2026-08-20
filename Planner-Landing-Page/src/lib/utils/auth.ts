// Auth utilities — simple password-based admin auth

const AUTH_KEY = "monefyi_admin_auth";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 jam

export interface AuthSession {
  authenticated: boolean;
  timestamp: number;
}

export function saveSession(): void {
  if (typeof window === "undefined") return;
  const session: AuthSession = {
    authenticated: true,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    // Cek expired
    if (Date.now() - session.timestamp > SESSION_DURATION) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = getSession();
  return session?.authenticated === true;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_KEY);
}
