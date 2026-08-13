import { useState, useEffect } from 'react';

const STORAGE_KEY = 'monefyi_lp_exit_shown';

export function useExitIntent(): { triggered: boolean; dismiss: () => void } {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const alreadyShown = localStorage.getItem(STORAGE_KEY) === 'true';
    if (alreadyShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent < 50) {
          setTriggered(true);
          localStorage.setItem(STORAGE_KEY, 'true');
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  const dismiss = () => setTriggered(false);

  return { triggered, dismiss };
}
