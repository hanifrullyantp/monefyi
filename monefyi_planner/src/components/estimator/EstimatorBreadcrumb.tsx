import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
  showBack?: boolean;
  backTo?: string;
  /** Handler navigasi kembali — jika tidak ada, fallback ke backTo. */
  onBack?: () => void;
};

export default function EstimatorBreadcrumb({
  items,
  showBack = true,
  backTo = '/app/estimator',
  onBack,
}: Props) {
  const navigate = useNavigate();

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(backTo);
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="relative z-50 flex items-center gap-1.5 text-xs text-slate-500 mb-3 flex-wrap"
    >
      {showBack && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center justify-center min-w-[2.75rem] min-h-[2.75rem] -ml-1 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors shrink-0 touch-manipulation"
          aria-label="Kembali ke daftar estimasi"
        >
          <ArrowLeft className="w-4 h-4 pointer-events-none" />
        </button>
      )}
      <button
        type="button"
        onClick={goBack}
        className="font-semibold hover:text-emerald-600 active:text-emerald-700 transition-colors touch-manipulation"
      >
        Estimator
      </button>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1 min-w-0">
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          {item.href ? (
            <button
              type="button"
              onClick={() => navigate(item.href!)}
              className="font-semibold hover:text-emerald-600 transition-colors truncate max-w-[12rem] touch-manipulation"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-bold text-slate-700 truncate max-w-[14rem]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
