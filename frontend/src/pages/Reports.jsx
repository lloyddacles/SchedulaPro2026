import React, { useRef, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as ReTooltip
} from 'recharts';
import { 
  Download, Printer, PieChart as PieIcon, BarChart3, Users, Building2, 
  BookOpen, Activity, TrendingUp, Gauge, AlertCircle 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateAnalyticsPDF } from '../utils/pdfGenerator';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#64748b'];

const truncate = (str, n) => (str.length > n ? str.substr(0, n - 1) + '...' : str);

export default function Reports() {
  const { activeTermId, terms } = useScheduleStore();
  const reportRef = useRef(null);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data
  });

  const { data: facultyLoads, isLoading: loadingFac } = useQuery({
    queryKey: ['reportFaculty', activeTermId, selectedDeptId],
    queryFn: async () => (await api.get('/reports/faculty-workloads', { 
      params: { term_id: activeTermId, department_id: selectedDeptId }
    })).data,
    enabled: !!activeTermId
  });

  const { data: roomUtil, isLoading: loadingRoom } = useQuery({
    queryKey: ['reportRooms', activeTermId, selectedDeptId],
    queryFn: async () => (await api.get('/reports/room-utilization', { 
      params: { term_id: activeTermId, department_id: selectedDeptId }
    })).data,
    enabled: !!activeTermId
  });

  const { data: programDist, isLoading: loadingProg } = useQuery({
    queryKey: ['reportPrograms', activeTermId, selectedDeptId],
    queryFn: async () => (await api.get('/reports/program-distribution', { 
      params: { term_id: activeTermId, department_id: selectedDeptId }
    })).data,
    enabled: !!activeTermId
  });

  const { data: overallStats, isLoading: loadingOverall } = useQuery({
    queryKey: ['reportOverall', activeTermId, selectedDeptId],
    queryFn: async () => (await api.get('/reports/overall-stats', { 
      params: { term_id: activeTermId, department_id: selectedDeptId }
    })).data,
    enabled: !!activeTermId
  });

  const isLoading = loadingFac || loadingRoom || loadingProg || loadingOverall;

  const exportPDF = () => {
    const term = terms.find(t => t.id === activeTermId);
    if (!term) return;

    const data = {
      facultyLoads,
      roomUtil,
      programDist,
      overallStats
    };

    const deptName = departments.find(d => d.id == selectedDeptId)?.name || 'All Departments';

    generateAnalyticsPDF(
      data, 
      `${term.name} (${deptName})`, 
      'Main Campus', 
      'CARD-MRI Development Institute, Inc.' 
    );
  };

  const handlePrint = () => window.print();

  // Process data for charts
  const horizontalFaculty = useMemo(() => {
    return (facultyLoads || [])
      .slice(0, 10)
      .map(f => ({ ...f, displayName: f.name }));
  }, [facultyLoads]);

  const horizontalRooms = useMemo(() => {
    return (roomUtil || [])
      .slice(0, 10)
      .map(r => ({ ...r, displayName: r.name }));
  }, [roomUtil]);

  const capacityRatio = (overallStats && overallStats.room_capacity) 
    ? Math.round((Number(overallStats.room_capacity.total_booked_hours) / Number(overallStats.room_capacity.total_capacity_hours)) * 100) 
    : 0;

  // Institutional Color Way Mapping
  const getProgramColor = (programCode) => {
    const code = (programCode || '').toUpperCase();
    if (code.includes('BSTM')) return '#7c3aed'; // Purple
    if (code.includes('BSAIS') || code.includes('BSA')) return '#eab308'; // Yellow
    if (code.includes('BSIS')) return '#1e3a8a'; // Navy Blue
    if (code.includes('BSE')) return '#7f1d1d'; // Maroon
    if (code.includes('BSCRIM')) return '#f97316'; // Orange
    if (code.includes('SHS') || code.includes('TVL') || code.includes('GAS') || code.includes('ABM') || code.includes('STEM') || code.includes('HUMSS')) 
      return '#10b981'; // Green
    return '#64748b'; // Default Slate
  };

  if (!activeTermId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500 gap-4">
        <TrendingUp className="w-16 h-16 opacity-20" />
        <p className="text-xl font-medium">Please select an academic term to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-display tracking-tight flex items-center gap-4">
            <Activity className="w-10 h-10 text-brand-600" /> Administrative Analytics
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-gray-500 dark:text-slate-400 font-medium text-lg">
              System pulse for <span className="text-brand-600 dark:text-brand-400 font-bold">{terms.find(t => t.id === activeTermId)?.name}</span>
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 ml-4 print:hidden">
              <Building2 className="w-4 h-4 text-gray-400" />
              <select 
                value={selectedDeptId} 
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-transparent text-xs font-black text-gray-700 dark:text-white outline-none min-w-[180px] uppercase tracking-tighter"
              >
                <option value="">Global Performance</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={handlePrint} className="glass flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white rounded-2xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition shadow-sm font-bold text-sm">
            <Printer className="w-5 h-5" /> Print Page
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-7 py-3 bg-brand-600 text-white font-black rounded-2xl shadow-xl hover:bg-brand-700 hover:-translate-y-1 transition active:translate-y-0 text-sm">
            <Download className="w-5 h-5" /> Export PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-80 gap-4">
           <div className="w-14 h-14 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <motion.div ref={reportRef} variants={containerVariants} initial="hidden" animate="show" className="space-y-10">
          
          {/* Top Layer: KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              label="Institutional Capacity" 
              value={`${capacityRatio}%`}
              icon={Gauge}
              color="text-blue-600"
              bg="bg-blue-50 dark:bg-blue-900/30"
              sub={`${overallStats?.room_capacity?.total_booked_hours || 0}h / ${overallStats?.room_capacity?.total_capacity_hours || 0}h`}
            />
            <StatCard 
              label="Load Balance" 
              value={overallStats?.overloaded_instructors || 0}
              icon={TrendingUp}
              color="text-emerald-600"
              bg="bg-emerald-50 dark:bg-emerald-900/30"
              sub="Overloaded instructors"
            />
            <StatCard 
              label="Active Faculty" 
              value={overallStats?.active_faculty || 0}
              icon={Users}
              color="text-purple-600"
              bg="bg-purple-50 dark:bg-purple-900/30"
              sub="Instructors with loads"
            />
            <StatCard 
              label="Active Rooms" 
              value={overallStats?.room_capacity?.total_rooms || 0}
              icon={Building2}
              color="text-amber-600"
              bg="bg-amber-50 dark:bg-amber-900/30"
              sub="Available this term"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Faculty Workload - Horizontal */}
            <motion.div variants={itemVariants} className="glass rounded-[2.5rem] p-8 shadow-2xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-brand-500" /> Faculty Load Distribution
                </h3>
              </div>
              <div className="h-[500px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horizontalFaculty} layout="vertical" margin={{ left: 140, right: 40, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="displayName" 
                        type="category" 
                        width={130} 
                        tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}}
                      />
                      <ReTooltip 
                        cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.9)'}}
                      />
                      <Bar dataKey="current_load" name="Hours" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24}>
                        {(facultyLoads || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Number(entry.current_load) > 24 ? '#f97316' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

            {/* Room Utilization - Horizontal */}
            <motion.div variants={itemVariants} className="glass rounded-[2.5rem] p-8 shadow-2xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-emerald-500" /> Room Efficiency
                </h3>
              </div>
              <div className="h-[500px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horizontalRooms} layout="vertical" margin={{ left: 140, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="displayName" 
                        type="category" 
                        width={130} 
                        tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}}
                      />
                      <ReTooltip 
                        cursor={{fill: 'rgba(16, 185, 129, 0.05)'}} 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.9)'}}
                      />
                      <Bar dataKey="value" name="Hours Booked" fill="#10b981" radius={[0, 8, 8, 0]} barSize={24}>
                        {(roomUtil || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Number(entry.value) > 40 ? '#059669' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

            {/* Program Distribution */}
            <motion.div variants={itemVariants} className="glass rounded-[2.5rem] p-8 shadow-2xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 xl:col-span-2">
              <div className="flex items-start md:items-center justify-between mb-8 flex-col md:flex-row gap-4">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <PieIcon className="w-6 h-6 text-purple-500" /> Curricular Demand Breakdown
                </h3>
                <div className="flex flex-wrap gap-2">
                  {programDist?.slice(0, 5).map((p, i) => (
                    <span key={i} className="px-3 py-1 bg-white/50 dark:bg-slate-800/50 rounded-full text-[10px] font-bold text-gray-500 border border-gray-100 dark:border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: getProgramColor(p.name)}} /> {p.name}: {p.value} loads
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="h-[400px] flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                          data={programDist} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={80} 
                          outerRadius={150} 
                          paddingAngle={8} 
                          dataKey="value"
                          stroke="none"
                        >
                          {programDist?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getProgramColor(entry.name)} />
                          ))}
                        </Pie>
                      <ReTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                   {programDist?.map((p, i) => (
                     <div key={i} className="flex flex-col p-4 rounded-2xl bg-white/30 dark:bg-slate-800/20 border-l-4 shadow-sm" style={{borderLeftColor: getProgramColor(p.program_code || p.name)}}>
                        <span className="text-[10px] font-black uppercase text-gray-400 mb-1">{p.program_code || p.name}</span>
                        <span className="text-xl font-black text-gray-800 dark:text-white">{p.total_loads || p.value}</span>
                        <span className="text-[10px] text-gray-400 mt-1 truncate" title={p.description}>{p.description}</span>
                     </div>
                   ))}
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </div>
  );
}


function StatCard({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <motion.div variants={itemVariants} className="glass group p-6 rounded-[2rem] shadow-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
          <p className={`text-4xl font-black ${color} tracking-tight`}>{value}</p>
          <p className="mt-2 text-xs font-bold text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text', 'bg')}`} /> {sub}
          </p>
        </div>
        <div className={`p-4 rounded-2xl ${bg} ${color} shadow-inner group-hover:rotate-12 transition-transform`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </motion.div>
  );
}
