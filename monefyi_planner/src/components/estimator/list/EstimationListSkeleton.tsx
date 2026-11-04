export default function EstimationListSkeleton() {
  return (
    <div className="px-4 space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="bg-white rounded-[14px] border border-[#E5EAE8] p-4 animate-pulse"
        >
          <div className="flex justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-slate-200 rounded-md" />
              <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-14 bg-slate-200 rounded-md" />
              <div className="h-3 w-10 bg-slate-100 rounded-md ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
