function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] ${className}`}
    />
  );
}

export default function SkeletonNeraca() {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-2">
        <Shimmer className="h-10 bg-amber-100/60" />
        <Shimmer className="h-10 bg-orange-100/60" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-2 grid grid-cols-5 gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="p-2 grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
      <Shimmer className="h-14" />
    </div>
  );
}

export function SkeletonKpiRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 p-4 space-y-2">
          <div className="h-8 w-8 rounded-xl animate-pulse bg-slate-200" />
          <div className="h-3 w-20 animate-pulse bg-slate-200 rounded" />
          <div className="h-7 w-28 animate-pulse bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}
