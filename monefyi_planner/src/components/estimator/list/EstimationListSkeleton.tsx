export default function EstimationListSkeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"
        >
          <div className="flex justify-between mb-3">
            <div className="h-5 w-28 bg-slate-200 rounded-md" />
            <div className="h-8 w-8 bg-slate-100 rounded-full" />
          </div>
          <div className="h-6 w-3/4 bg-slate-200 rounded-md mb-2" />
          <div className="h-4 w-1/2 bg-slate-100 rounded-md mb-4" />
          <div className="grid grid-cols-2 gap-4 py-3 border-t border-slate-100">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-md mt-3" />
        </div>
      ))}
    </div>
  );
}
