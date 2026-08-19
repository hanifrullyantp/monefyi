import type { MouseEvent } from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
  showBack?: boolean;
  backTo?: string;
  /** Dipanggil sebelum navigasi (mis. batalkan auto-save). */
  onBeforeBack?: () => void;
};

export default function EstimatorBreadcrumb({
  items,
  showBack = true,
  backTo = '/app/estimator',
  onBeforeBack,
}: Props) {
  const navigate = useNavigate();

  const handleBack = (e: MouseEvent<HTMLAnchorElement>) => {
    onBeforeBack?.();
    // Fallback jika Link tidak memicu navigasi (nested route / event terblokir).
    e.preventDefault();
    navigate(backTo);
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="relative z-10 flex items-center gap-1.5 text-xs text-slate-500 mb-3 flex-wrap"
    >
      {showBack && (
        <Link
          to={backTo}
          onClick={handleBack}
          className="inline-flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] -ml-1 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
          aria-label="Kembali ke daftar estimasi"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}
      <Link to="/app/estimator" className="font-semibold hover:text-emerald-600 transition-colors">
        Estimator
      </Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-slate-400" />
          {item.href ? (
            <Link to={item.href} className="font-semibold hover:text-emerald-600 transition-colors truncate max-w-[12rem]">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-slate-700 truncate max-w-[14rem]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
