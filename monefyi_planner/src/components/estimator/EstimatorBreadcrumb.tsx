import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
  showBack?: boolean;
  backTo?: string;
};

export default function EstimatorBreadcrumb({ items, showBack = true, backTo = '/app/estimator' }: Props) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 flex-wrap">
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
          aria-label="Kembali ke daftar estimasi"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
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
