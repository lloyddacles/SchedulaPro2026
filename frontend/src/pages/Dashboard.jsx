import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useTerm } from '../context/TermContext';
import { Users, BookOpen, Layers, Activity, PieChart as PieChartIcon, BarChart3, AlertTriangle, Building2, MapPin } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#eab308'];

export default function Dashboard() {
  const { activeTermId } = useTerm();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary', activeTermId],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary', { params: { term_id: activeTermId } });
      return res.data;
    },
    enabled: !!activeTermId
  });

  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div></div>;
  if (error) return <div className="text-red-500 text-center p-10 bg-red-50 rounded-2xl border border-red-100 mt-8">Error loading dashboard</div>;

  const { summary = {}, faculty_loads = [], department_stats = [], unassigned_subjects = [], room_utilization = [] } = data || {};

  const stats = [
    { name: 'Total Faculty', stat: summary?.total_faculty || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Total Subjects', stat: summary?.total_subjects || 0, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Assigned Loads', stat: summary?.total_assigned_loads || 0, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Unassigned Classes', stat: summary?.total_unassigned_subjects || 0, icon: AlertTriangle, color: summary?.total_unassigned_subjects > 0 ? 'text-red-600' : 'text-emerald-600', bg: summary?.total_unassigned_subjects > 0 ? 'bg-red-100' : 'bg-emerald-100' },
  ];

  // Bar chart data preparation (Top 10 to keep it clean natively)
  const barData = faculty_loads.map(f => ({
    name: f.full_name.split(' ')[0] + (f.full_name.split(' ').length > 1 ? ' ' + f.full_name.split(' ').pop()[0] + '.' : ''),
    Assigned: f.total_assigned_hours,
    Max: f.max_teaching_hours
  })).slice(0, 10);

  // Pie chart data
  const pieData = department_stats.map(d => ({
    name: d.department,
    value: d.value
  }));

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Dashboard Overview</h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">Quick insights into the teaching load scheduling system.</p>
        </div>
        <button 
          onClick={() => window.open(`${api.defaults.baseURL}/export/faculty-loads?term_id=${activeTermId}`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700 transition hover:-translate-y-0.5"
        >
          <Layers className="w-5 h-5" /> Export CSV Matrix
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="glass rounded-3xl p-6 shadow-xl border border-white/50 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-500 ${item.bg}`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 truncate">{item.name}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{item.stat}</p>
                </div>
              </div>
              <div className={`p-4 rounded-2xl shadow-sm ${item.bg} ${item.color}`}>
                <item.icon className="w-8 h-8" aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Unassigned Subjects */}
        <div className="glass rounded-[2rem] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-brand-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Unassigned Classes</h2>
          </div>
          {unassigned_subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-slate-500">
              <span className="text-4xl mb-2">🎉</span>
              <p>Everything perfectly assigned!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700/50 text-sm text-gray-400 dark:text-slate-500">
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Program</th>
                    <th className="pb-3 font-semibold text-right">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {unassigned_subjects.map((sub, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-700/30 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-4">
                        <p className="font-bold text-gray-800 dark:text-slate-200">{sub.subject_code}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{sub.subject_name}</p>
                      </td>
                      <td className="py-4 text-sm text-gray-600 dark:text-slate-300">
                        {sub.program_code ? `${sub.program_code} - Yr ${sub.year_level}` : 'General'}
                      </td>
                      <td className="py-4 text-sm text-gray-600 dark:text-slate-300 text-right">
                        {sub.required_hours} hrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Bar Chart */}
        <div className="glass rounded-[2rem] shadow-xl border border-white/40 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Assigned Load vs Capacity</h2>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: 'hsl(var(--foreground-light))'}} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--foreground-light))" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}} 
                  contentStyle={{borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="Assigned" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Max" fill="#e5e7eb" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
         <div className="glass rounded-[2rem] shadow-xl border border-white/40 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-gray-800">Faculty by Department</h2>
          </div>
          <div className="flex-1 min-h-[300px] w-full relative">
            {pieData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">No department data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 overflow-hidden mt-8">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-500" /> Faculty Load Table
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 dark:text-slate-400 uppercase">Faculty Name</th>
                <th className="px-8 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 dark:text-slate-400 uppercase">Department</th>
                <th className="px-8 py-4 text-center text-xs font-semibold tracking-wider text-gray-500 dark:text-slate-400 uppercase">Subjects</th>
                <th className="px-8 py-4 text-center text-xs font-semibold tracking-wider text-gray-500 dark:text-slate-400 uppercase">Total Hours</th>
                <th className="px-8 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 dark:text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
              {faculty_loads.map((f) => {
                const isOverloaded = f.total_assigned_hours > f.max_teaching_hours;
                const ratio = Math.min((f.total_assigned_hours / f.max_teaching_hours) * 100, 100) || 0;
                
                let statusColor = "bg-green-100 text-green-800";
                let statusText = "Optimal";
                let barColor = "bg-green-500";
                
                if (isOverloaded) {
                  statusColor = "bg-red-100 text-red-800";
                  statusText = "Overloaded";
                  barColor = "bg-red-500";
                } else if (f.total_assigned_hours === 0) {
                  statusColor = "bg-gray-100 text-gray-800";
                  statusText = "Unassigned";
                  barColor = "bg-gray-300";
                } else if (f.max_teaching_hours - f.total_assigned_hours <= 3) {
                  statusColor = "bg-yellow-100 text-yellow-800";
                  statusText = "Near Limit";
                  barColor = "bg-yellow-400";
                }

                return (
                  <tr key={f.id} className="hover:bg-white/80 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-gray-900">{f.full_name}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500">{f.department}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900 text-center font-medium">{f.subjects_count}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center gap-3 justify-center">
                        <span className="font-bold text-gray-900 w-12 text-right">
                          {f.total_assigned_hours} / {f.max_teaching_hours}
                        </span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden text-left">
                          <div className={`h-full ${barColor}`} style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {faculty_loads.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-8 py-10 text-center text-gray-500">No faculty data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* Unassigned Subjects Analytics Table */}
        <div className="glass rounded-[2rem] shadow-xl border border-white/40 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/50">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <AlertTriangle className={`w-5 h-5 ${unassigned_subjects.length > 0 ? 'text-red-500' : 'text-emerald-500'}`} /> Unassigned Triggers
             </h2>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Alert Source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Subject Node</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 divide-y divide-gray-50">
                {unassigned_subjects.map(u => (
                  <tr key={u.id} className="hover:bg-red-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded text-xs">Awaiting Load</span>
                       <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                          {u.program_code ? `${u.program_code} - Yr ${u.year_level}` : 'General Subject'}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm font-bold text-gray-900">{u.subject_code}</div>
                       <div className="text-xs text-gray-600">{u.subject_name} • {u.required_hours} hrs</div>
                    </td>
                  </tr>
                ))}
                {unassigned_subjects.length === 0 && (
                   <tr><td colSpan="2" className="px-6 py-10 text-center text-emerald-600 font-bold">100% Core Requirements Mapped. Zero Anomalies.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Facility Utilization Grid */}
        <div className="glass rounded-[2rem] shadow-xl border border-white/40 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/50">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <MapPin className="w-5 h-5 text-amber-500" /> Space Utilization
             </h2>
             <span className="text-xs font-bold text-gray-400">84hr Global Ceiling</span>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Room Matrix</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">Usage Heat</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 divide-y divide-gray-50">
                {room_utilization.map(r => {
                   const ratio = Math.min((r.utilized_hours / 84) * 100, 100) || 0;
                   let heatBar = "bg-emerald-400";
                   if (ratio > 50) heatBar = "bg-amber-400";
                   if (ratio > 80) heatBar = "bg-red-500";
                   return (
                     <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                       <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-extrabold text-gray-900">{r.name}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{r.type} • {r.capacity} pax</div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-1">
                             <div className="font-mono text-xs font-extrabold text-gray-700">{Number(r.utilized_hours).toFixed(1)} hrs</div>
                             <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner max-w-[120px]">
                                <div className={`h-full ${heatBar} transition-all duration-1000`} style={{width: `${ratio}%`}} />
                             </div>
                          </div>
                       </td>
                     </tr>
                   )
                })}
                {room_utilization.length === 0 && (
                   <tr><td colSpan="2" className="px-6 py-10 text-center text-gray-400 italic">No facility properties detected.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
