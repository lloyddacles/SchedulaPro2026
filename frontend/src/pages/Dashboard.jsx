import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import { useAuth } from '../context/AuthContext';
import {
  Users, BookOpen, Layers, Activity, BarChart3, AlertTriangle,
  Building2, ShieldAlert, Download, CheckCircle2, Clock, Zap,
  TrendingUp, UserCheck, AlertCircle, RefreshCw, Calendar
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#eab308', '#f97316'];
const STATUS_CONFIG = {
  unassigned: { label: 'Unassigned', color: '#94a3b8', bg: 'bg-gray-100 dark:bg-slate-800/50', text: 'text-gray-500 dark:text-slate-400' },
  part_load:  { label: 'Underloaded', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
  full_load:  { label: 'Full Load',  color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  overload:   { label: 'Overload',   color: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
};

function StatCard({ name, stat, icon: Icon, color, bg, sub }) {
  return (
    <motion.div variants={itemVariants} className="glass group p-6 rounded-[2rem] shadow-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{name}</p>
          <p className={`text-4xl font-black ${color} tracking-tight truncate`}>{stat}</p>
        </div>
        <div className={`p-4 rounded-2xl ${bg} ${color} transition-transform group-hover:rotate-12`}>
          <Icon className="w-6 h-6" strokeWidth={2.5} />
        </div>
      </div>
      {sub && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/50">
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{sub}</p>
        </div>
      )}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title, badge, badgeColor }) {
  return (
    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 ${iconColor}`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">{title}</h2>
      </div>
      {badge && (
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ${badgeColor || 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { activeTermId, socket, isConnected } = useScheduleStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHead = ['admin', 'program_head'].includes(user?.role);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboardSummary', activeTermId, user?.campus_id],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary', { params: { term_id: activeTermId, campus_id: user?.campus_id } });
      return res.data;
    },
    enabled: !!activeTermId
  });

  const { data: advisorySections = [] } = useQuery({
    queryKey: ['my-advisory-sections'],
    queryFn: async () => (await api.get('/sections/advisory')).data,
    enabled: !!user?.faculty_id
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries(['dashboardSummary']);
    };

    socket.on('schedule_updated', handleUpdate);
    socket.on('load_updated', handleUpdate);

    return () => {
      socket.off('schedule_updated', handleUpdate);
      socket.off('load_updated', handleUpdate);
    };
  }, [socket, isConnected, queryClient]);

  if (!activeTermId) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-400 dark:text-slate-500">
      <Layers className="w-16 h-16 opacity-30" />
      <div className="text-center">
        <p className="text-xl font-bold text-gray-500 dark:text-slate-400">No Active Term Selected</p>
        <p className="text-sm mt-1 text-gray-400 dark:text-slate-500">Select or create an academic term in the top navigation bar.</p>
      </div>
    </div>
  );
  if (isLoading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="text-red-600 text-center p-10 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 mt-8">
      Failed to load dashboard data.
    </div>
  );

  const {
    summary = {},
    faculty_loads = [],
    department_stats = [],
    unassigned_subjects = [],
    room_utilization = [],
    conflicts = { faculty: [], rooms: [] },
    load_status_breakdown = {},
    employment_breakdown = []
  } = data || {};

  const totalConflicts = (conflicts.faculty?.length || 0) + (conflicts.rooms?.length || 0);
  // Count pending_review from load_status_breakdown is not tracked there; add a separate derive:
  // We'll use a direct count from faculty_loads if available, or rely on backend summary
  const pendingCount = data?.summary?.pending_approval_count ?? 0;

  // ── Chart data ──────────────────────────────────────────────────
  const barData = faculty_loads
    .filter(f => Number(f.total_assigned_hours) > 0)
    .sort((a, b) => Number(b.total_assigned_hours) - Number(a.total_assigned_hours))
    .slice(0, 12)
    .map(f => ({
      name: f.full_name.split(' ').map(w => w[0]).join('').slice(0, 4), // initials
      fullName: f.full_name,
      Units: Number(f.total_assigned_hours),
    }));

  const deptPieData = department_stats.map(d => ({ name: d.department, value: Number(d.value) }));

  const loadStatusData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: load_status_breakdown[key] || 0,
    fill: cfg.color,
  }));

  const empData = employment_breakdown.map(e => ({ name: e.type, value: Number(e.count) }));

  // Institutional Color Way Mapping
  const getProgramColor = (programName) => {
    const name = (programName || '').toUpperCase();
    // Check by college name or code
    if (name.includes('COMPUTER') || name.includes('BSIS') || name.includes('CCS')) return '#3b82f6'; // Deep Blue
    if (name.includes('BUSINESS') || name.includes('BSTM') || name.includes('HM') || name.includes('CBM')) return '#8b5cf6'; // Vivid Purple
    if (name.includes('CRIMINAL') || name.includes('BSCRIM') || name.includes('CCJ')) return '#f59e0b'; // Amber Orange
    if (name.includes('EDUCATION') || name.includes('BSE') || name.includes('CED')) return '#ef4444'; // Soft Red
    if (name.includes('ACCOUNTANCY') || name.includes('BSA') || name.includes('BSAIS')) return '#10b981'; // Emerald Green
    if (name.includes('SHS') || name.includes('SENIOR')) return '#ec4899'; // Pink
    
    // Fallback based on specific keywords
    if (name.includes('BSTM')) return '#7c3aed'; 
    if (name.includes('BSAIS') || name.includes('BSA')) return '#eab308';
    if (name.includes('BSIS')) return '#1e3a8a';
    if (name.includes('BSE')) return '#7f1d1d';
    if (name.includes('BSCRIM')) return '#f97316';
    
    // Generate a color based on string if not matched
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`; 
  };

  // ── Load Status Summary numbers ──────────────────────────────────
  const totalFacultyInTerm = faculty_loads.length;
  const assignedCount = totalFacultyInTerm - (load_status_breakdown.unassigned || 0);
  const assignmentRate = totalFacultyInTerm > 0
    ? Math.round((assignedCount / totalFacultyInTerm) * 100)
    : 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 pb-12">

      {/* ── Page Header: Compact & Actionable ──────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Dashboard</h1>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 dark:bg-slate-800/80 rounded-full border border-gray-100 dark:border-slate-700/50">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}`} />
               <span className="text-[9px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                 {isConnected ? 'Live Sync' : 'Offline'}
               </span>
             </div>
             <p className="text-sm text-gray-400 dark:text-slate-500 font-medium">Real-time metrics for current academic term</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-2xl font-black shadow-sm border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-sm group ${isRefetching ? 'opacity-75' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 transition-transform ${isRefetching ? 'animate-spin text-brand-500' : 'text-gray-400 group-hover:rotate-180'}`} /> 
            Sync
          </button>
          <button
            onClick={async () => {
              try {
                const res = await api.get(`/export/faculty-loads`, { params: { term_id: activeTermId, campus_id: user?.campus_id } });
                const rows = res.data;
                if (!rows || rows.length === 0) return alert("No data available for export.");
                
                const headers = ["Faculty", "Department", "Type", "Max Hrs", "Subject Code", "Subject Name", "Units", "Section", "Status"];
                const csvContent = [
                  headers.join(","),
                  ...rows.map(r => [
                    `"${r.full_name}"`,
                    `"${r.department}"`,
                    `"${r.employment_type}"`,
                    r.max_teaching_hours,
                    `"${r.subject_code}"`,
                    `"${r.subject_name}"`,
                    r.required_hours,
                    `"${r.program} ${r.year_level}${r.section}"`,
                    `"${r.load_status}"`
                  ].join(","))
                ].join("\n");

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Faculty_Loads_Report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (err) {
                console.error("Export failed:", err);
                alert("Critical failure during report generation. Verify system connectivity.");
              }
            }}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Advisory Quick Access Card */}
      {advisorySections.length > 0 && (
         <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group overflow-hidden glass p-8 rounded-[3rem] border border-brand-200 shadow-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white"
         >
            {/* Abstract Background Design */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-brand-400/20 rounded-full blur-2xl group-hover:translate-x-20 transition-transform duration-1000" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
               <div className="flex items-start gap-6">
                  <div className="p-5 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30 shadow-xl group-hover:rotate-6 transition-transform">
                     <Users className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20">Active Assignment</span>
                        <Zap className="w-3.5 h-3.5 text-brand-300 animate-pulse" />
                     </div>
                     <h2 className="text-3xl lg:text-4xl font-black font-display tracking-tight leading-none">
                        Advisory Class: <span className="underline decoration-brand-300 underline-offset-8 decoration-4">{advisorySections[0].program_code} {advisorySections[0].year_level}{advisorySections[0].name}</span>
                     </h2>
                     <p className="text-sm font-medium text-brand-100 max-w-lg mt-4">
                        A new specialized "Advisory" view is now available in your schedule terminal. Monitor your section's weekly academic progression and facility occupancy in real-time.
                     </p>
                  </div>
               </div>
               
               <Link 
                to="/my-schedule?view=advisory" 
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-brand-700 rounded-3xl font-black shadow-2xl shadow-black/10 hover:bg-brand-50 hover:scale-105 transition-all text-sm group"
               >
                  <Calendar className="w-5 h-5 text-brand-600 group-hover:rotate-12 transition-transform" />
                  Launch Section Terminal
               </Link>
            </div>
         </motion.div>
      )}

      {/* ── Top KPIs: Optimized Grid ─────────────────────────── */}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${isHead ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-4`}>
        <StatCard name="Faculty" stat={summary.total_faculty ?? 0} icon={Users} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard name="Subjects" stat={summary.total_subjects ?? 0} icon={BookOpen} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20" />
        <StatCard name="Assigned" stat={summary.total_assigned_loads ?? 0} icon={Layers} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
        <StatCard 
          name="Scheduled" 
          stat={summary.total_schedule_blocks ?? 0} 
          icon={Activity} 
          color="text-emerald-600" 
          bg="bg-emerald-50 dark:bg-emerald-900/20" 
          sub={`${summary.total_mapped_loads ?? 0} mapped`}
        />
        <StatCard
          name="Unassigned"
          stat={summary.total_unassigned_subjects ?? 0}
          icon={AlertTriangle}
          color={(summary.total_unassigned_subjects ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}
          bg={(summary.total_unassigned_subjects ?? 0) > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}
          sub={(summary.total_unassigned_subjects ?? 0) === 0 ? 'Clean ✓' : 'Assign needed'}
        />
        <StatCard
          name="Conflicts"
          stat={totalConflicts}
          icon={ShieldAlert}
          color={totalConflicts > 0 ? 'text-amber-600' : 'text-emerald-600'}
          bg={totalConflicts > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}
          sub={`${conflicts.faculty.length}F, ${conflicts.rooms.length}R`}
        />
        {isHead && (
          <StatCard
            name="Approvals"
            stat={pendingCount}
            icon={Clock}
            color={pendingCount > 0 ? 'text-orange-600' : 'text-gray-400'}
            bg={pendingCount > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-slate-800/10'}
            sub={pendingCount === 0 ? 'All Reviewed ✓' : 'Pending Action'}
          />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Content: Distribution & Detailed Charts (8 cols) ── */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Institutional Distribution Insights */}
          <motion.div variants={itemVariants} className="glass rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 overflow-hidden">
            <SectionHeader icon={TrendingUp} iconColor="text-brand-500" title="Institutional Metrics & Distribution" />
            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Assignment Rate Radial */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white/50 dark:bg-slate-800/40 rounded-[2rem] border border-white/40 dark:border-slate-700/30">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6">Assignment Rate</p>
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={12} data={[{ value: assignmentRate, fill: assignmentRate === 100 ? '#10b981' : assignmentRate > 60 ? '#3b82f6' : '#f59e0b' }]} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgba(0,0,0,0.05)' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{assignmentRate}<small className="text-xl">%</small></span>
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase">Coverage</span>
                  </div>
                </div>
                <p className="mt-6 text-xs font-bold text-gray-500 dark:text-slate-400">{assignedCount} / {totalFacultyInTerm} Faculty Mapped</p>
              </div>

              {/* Employment Breakdown & Load Status Mix */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                <div className="flex flex-col h-full bg-white/50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-white/40 dark:border-slate-700/30">
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Employment Mix</p>
                  <div className="flex-1 min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={empData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none">
                          {empData.map((entry, index) => {
                            let color = '#3b82f6'; // Regular
                            if (entry.name === 'Contractual') color = '#8b5cf6';
                            if (entry.name === 'Probationary') color = '#a78bfa';
                            if (entry.name === 'Part-time') color = '#ec4899';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '15px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex flex-col h-full bg-white/50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-white/40 dark:border-slate-700/30">
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Faculty Load Distribution</p>
                  <div className="flex-1 min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={loadStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none">
                          {loadStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '15px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Faculty Load Capacity Bar */}
            <div className="border-t border-gray-100 dark:border-slate-800/50 p-8 pt-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">High Capacity Faculty Units</p>
                <span className="text-[10px] font-black text-gray-400 px-3 py-1 bg-gray-50 dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700/50 uppercase">Top 12 Performers</span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb40" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      formatter={(val, name, props) => [`${val} Assigned Units`, props.payload.fullName]}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="Units" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.Units > 24 ? '#f43f5e' : entry.Units === 24 ? '#3b82f6' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Department Breakdown - Larger Visual */}
          <motion.div variants={itemVariants} className="glass rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 overflow-hidden">
            <SectionHeader icon={Building2} iconColor="text-indigo-500" title="Departmental Data Distribution" />
            <div className="p-8 h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={deptPieData} 
                    cx="50%" cy="50%" 
                    innerRadius={80} outerRadius={120} 
                    paddingAngle={6} 
                    dataKey="value" 
                    stroke="none"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {deptPieData.map((d, i) => <Cell key={i} fill={getProgramColor(d.name)} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', fontSize: '12px' }} />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '30px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ── Right Content: Status Breakdown & Alerts (4 cols) ── */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Quick Status Breakdown Cards */}
          <motion.div variants={itemVariants} className="glass rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 p-6">
            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 px-2">Load Integrity Summary</p>
            <div className="flex flex-col gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = load_status_breakdown[key] || 0;
                const pct = totalFacultyInTerm > 0 ? Math.round((count / totalFacultyInTerm) * 100) : 0;
                return (
                  <div key={key} className={`rounded-[1.5rem] p-5 ${cfg.bg} border border-transparent hover:border-white/40 dark:hover:border-slate-600 transition-all flex items-center justify-between group`}>
                    <div className="flex items-center gap-4">
                       <div className={`w-3 h-3 rounded-full ${cfg.text.replace('text', 'bg')}`} />
                       <div>
                         <span className="block text-sm font-black text-gray-800 dark:text-slate-100 uppercase tracking-tighter leading-none mb-1">{cfg.label}</span>
                         <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{pct}% of Faculty Pool</span>
                       </div>
                    </div>
                    <span className={`text-3xl font-black ${cfg.text} tracking-tighter group-hover:scale-110 transition-transform`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Conflict Alerts Sidebar */}
          <motion.div variants={itemVariants} className="glass rounded-[2.5rem] shadow-xl border border-red-100/30 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-900/10 overflow-hidden">
            <SectionHeader
              icon={ShieldAlert}
              iconColor={totalConflicts > 0 ? 'text-rose-500' : 'text-emerald-500'}
              title="Conflict Watch"
              badge={totalConflicts > 0 ? `${totalConflicts} Active` : 'Secure ✓'}
              badgeColor={totalConflicts > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}
            />
            <div className="px-6 py-4 divide-y divide-rose-100 dark:divide-rose-900/20 max-h-[400px] overflow-y-auto">
              {totalConflicts === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 dark:text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/50" />
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-500/60">No Collisions Detected</p>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {conflicts.faculty?.map((c, i) => (
                    <div key={`f-${i}`} className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      <div className="flex items-center gap-2 mb-2">
                         <UserCheck className="w-3.5 h-3.5 text-rose-500" />
                         <span className="text-[10px] font-black text-rose-500 uppercase">Faculty Collision</span>
                      </div>
                      <p className="text-sm font-black text-gray-800 dark:text-white mb-1">{c.faculty_name}</p>
                      <p className="text-[10px] font-bold text-gray-400 mb-2">{c.subject_a} ↔ {c.subject_b}</p>
                      <div className="flex items-center justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-800/50 px-2 py-1 rounded-full">
                        <span>{c.day_of_week}</span>
                        <span>{c.start_time}-{c.end_time}</span>
                      </div>
                    </div>
                  ))}
                  {conflicts.rooms?.map((c, i) => (
                    <div key={`r-${i}`} className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      <div className="flex items-center gap-2 mb-2">
                         <Building2 className="w-3.5 h-3.5 text-orange-500" />
                         <span className="text-[10px] font-black text-orange-500 uppercase">Room Double Book</span>
                      </div>
                      <p className="text-sm font-black text-gray-800 dark:text-white mb-1">{c.room}</p>
                      <p className="text-[10px] font-bold text-gray-400 mb-2">{c.subject_a} ↔ {c.subject_b}</p>
                      <div className="flex items-center justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-800/50 px-2 py-1 rounded-full">
                        <span>{c.day_of_week}</span>
                        <span>{c.start_time}-{c.end_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {totalConflicts > 0 && <div className="p-4 border-t border-rose-100 dark:border-rose-900/20 bg-rose-50/50 dark:bg-rose-900/20 text-center"><span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em] animate-pulse">Action Required Promptly</span></div>}
          </motion.div>

          {/* Room Utilization Micro-Panel */}
          <motion.div variants={itemVariants} className="glass rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 overflow-hidden">
            <SectionHeader icon={Building2} iconColor="text-amber-500" title="Space Efficiency" />
            <div className="px-6 py-4 space-y-3 max-h-[300px] overflow-y-auto">
              {room_utilization.map((r, i) => {
                const hrs = Number(r.utilized_hours);
                const ratio = Math.min((hrs / 84) * 100, 100);
                const barC = ratio > 80 ? 'bg-rose-500' : ratio > 50 ? 'bg-amber-400' : 'bg-emerald-500';
                return (
                  <div key={i} className="space-y-1.5 p-3 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all border border-transparent hover:border-white/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-800 dark:text-slate-200">{r.name}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase">{hrs.toFixed(1)}h</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200/50 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barC} shadow-[0_0_8px] ${barC.replace('bg-', 'shadow-')}/20`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Main Detail Tables/Views ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Detail Load Table: Large Span */}
        <motion.div variants={itemVariants} className="xl:col-span-3 glass rounded-[3rem] shadow-2xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 overflow-hidden">
          <SectionHeader icon={BarChart3} iconColor="text-brand-500" title="Detailed Faculty Load Matrix"
            badge={`${faculty_loads.length} Members`}
            badgeColor="bg-brand-500 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-brand-500/20" />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100/50 dark:divide-slate-700/50">
              <thead className="bg-gray-50/60 dark:bg-slate-900/60">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Faculty Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] hidden sm:table-cell text-center">Load Mix</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Unit Thresholds</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50 dark:divide-slate-700/30">
                {faculty_loads.map((f) => {
                  const assigned = Number(f.total_assigned_hours);
                  const FULL_LOAD = 24;
                  const pct = Math.min((assigned / FULL_LOAD) * 100, 100);
                  let key, barColor;
                  if (assigned === 0)        { key = 'unassigned'; barColor = '#94a3b8'; }
                  else if (assigned > FULL_LOAD) { key = 'overload';  barColor = '#f43f5e'; }
                  else if (assigned === FULL_LOAD){ key = 'full_load'; barColor = '#3b82f6'; }
                  else if (FULL_LOAD - assigned <= 3) { key = 'part_load'; barColor = '#eab308'; }
                  else                       { key = 'part_load'; barColor = '#10b981'; }
                  const cfg = STATUS_CONFIG[key];

                  return (
                    <tr key={f.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-all duration-300 group">
                      <td className="px-8 py-5">
                        <div className="font-black text-gray-900 dark:text-white text-base tracking-tight group-hover:text-brand-500 transition-colors">{f.full_name}</div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{f.department || 'Not Categorized'}</div>
                      </td>
                      <td className="px-8 py-5 hidden sm:table-cell text-center">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs font-black text-gray-700 dark:text-slate-200">{f.subjects_count} Subjects</span>
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-black text-gray-800 dark:text-slate-200">{assigned}<span className="text-gray-400 font-bold"> units</span></span>
                            <span className="text-[10px] font-black text-gray-400 uppercase">{Math.round(pct)}% Filled</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full rounded-full transition-all duration-1000 group-hover:brightness-110" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${cfg.bg} ${cfg.text} border border-transparent group-hover:border-current transition-all`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Unassigned Subjects Sidebar */}
        <motion.div variants={itemVariants} className="glass rounded-[3rem] shadow-2xl border border-rose-100/30 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-900/10 overflow-hidden flex flex-col">
          <SectionHeader
            icon={AlertCircle}
            iconColor={unassigned_subjects.length > 0 ? 'text-rose-500' : 'text-emerald-500'}
            title="Assignment Delta"
          />
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[400px]">
            {unassigned_subjects.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400 dark:text-slate-500 p-8 text-center">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] text-emerald-500">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest">Full Convergence Achieved</p>
                <p className="text-[10px] font-bold opacity-60">All subjects have faculty mandates</p>
              </div>
            ) : (
              unassigned_subjects.map((sub, i) => (
                <div key={i} className="p-5 bg-white/70 dark:bg-slate-900/70 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 hover:scale-[1.02] transition-transform shadow-sm group">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-lg">Pending Mapping</span>
                      <span className="text-xs font-black text-gray-900 dark:text-white uppercase group-hover:text-rose-500 transition-colors">{sub.subject_code}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 line-clamp-2">{sub.subject_name}</p>
                    <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-100/50 dark:border-slate-800/50">
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {sub.required_hours}h</span>
                       <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {sub.program_code} Y{sub.year_level}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {unassigned_subjects.length > 0 && (
             <div className="p-6 bg-white/40 dark:bg-slate-900/40 border-t border-rose-100 dark:border-rose-900/20">
               <button className="w-full py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2">
                 <Zap className="w-3.5 h-3.5" /> Automate Final Mapping
               </button>
              </div>
           )}
        </motion.div>
      </div>

    </motion.div>
  );
}
