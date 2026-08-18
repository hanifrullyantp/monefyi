import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
};

export default function EstimatorBreadcrumb({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 mb-3 flex-wrap">
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
