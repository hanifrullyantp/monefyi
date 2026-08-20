"use client";
import { PageHeader } from "@/components/admin/PageHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { TrendingUp, Users, Eye, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";

const data = [
  { name: "Jan", leads: 40, closing: 24, revenue: 2400 },
  { name: "Feb", leads: 30, closing: 13, revenue: 1398 },
  { name: "Mar", leads: 20, closing: 98, revenue: 9800 },
  { name: "Apr", leads: 27, closing: 39, revenue: 3908 },
  { name: "May", leads: 18, closing: 48, revenue: 4800 },
  { name: "Jun", leads: 23, closing: 38, revenue: 3800 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Performa leads, closing, dan landing page"
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Visits", value: "2,450", icon: Eye, color: "text-blue-600", trend: "+12.5%", up: true },
          { label: "Total Leads", value: "185", icon: Users, color: "text-emerald-600", trend: "+5.2%", up: true },
          { label: "Closing Rate", value: "14.2%", icon: Target, color: "text-amber-600", trend: "-1.1%", up: false },
          { label: "Revenue", value: "Rp 320jt", icon: TrendingUp, color: "text-purple-600", trend: "+18.4%", up: true },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl bg-slate-50 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.up ? "text-emerald-600" : "text-red-600"}`}>
                {stat.trend}
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leads Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6">Trend Leads & Closing</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="leads" stroke="#10b981" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6">Revenue Monthly (Millions)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
