import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Halaman pengaturan Estimator dialihkan secara otomatis ke Hub Pengaturan Terpadu
 * di /app?tab=settings&st=estimator untuk mencegah duplikasi menu & pengaturan.
 */
export default function EstimatorSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (tab === 'telegram' || tab === 'bot') {
      navigate('/app?tab=settings&st=koordinasi', { replace: true });
    } else {
      navigate('/app?tab=settings&st=estimator', { replace: true });
    }
  }, [navigate, tab]);

  return null;
}
