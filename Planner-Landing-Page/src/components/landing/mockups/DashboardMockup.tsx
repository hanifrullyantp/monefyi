import { Plus, TrendingUp } from "lucide-react";

const projects = [
  { name: "Villa Ciater", progress: 78, deadline: "15 Feb", team: 4 },
  { name: "Kitchen Set Bpk Rudi", progress: 45, deadline: "22 Feb", team: 2 },
  { name: "Renovasi Ibu Sari", progress: 20, deadline: "5 Mar", team: 3 },
];

export function DashboardMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <span className="font-bold text-slate-900">Proyek Aktif</span>
        <button className="bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1 hover:bg-slate-800 transition-colors">
          <Plus className="w-3 h-3" />
          Baru
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {projects.map((project) => (
          <div key={project.name} className="bg-slate-50 rounded-xl p-4">
            <p className="font-semibold text-slate-900 text-sm">{project.name}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex-1">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 flex-shrink-0 w-10 text-right">
                {project.progress}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Deadline: {project.deadline} · Tim: {project.team} orang
            </p>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-slate-100 mt-5 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-slate-600">Revenue</p>
              <p className="text-lg font-bold text-slate-900 mt-1">Rp 320jt</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-slate-600">Margin bulan ini</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-lg font-bold text-slate-900">35%</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
