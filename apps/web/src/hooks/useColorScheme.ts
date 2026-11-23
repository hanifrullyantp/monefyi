import { useEffect, useState } from 'react';

const STORAGE_KEY = 'monefyi-theme';

export function useColorScheme() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Light-first UI — dark hanya jika user eksplisit memilih (hindari teks pudar di kartu putih).
    const enableDark = localStorage.getItem(STORAGE_KEY) === 'dark';
    document.documentElement.classList.toggle('dark', enableDark);
    setDark(enableDark);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    setDark(next);
  };

  return { dark, toggle };
}
