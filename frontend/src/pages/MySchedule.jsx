import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useScheduleStore from '../store/useScheduleStore';
import { 
  Calendar, Printer, X, ShieldAlert, Sparkles, AlertCircle, 
  TrendingUp, Users, Clock, MapPin, CheckCircle2, RefreshCw, Award, BookOpen, History 
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { generateProfessionalPDF } from '../utils/pdfGenerator';
import MakeUpWizard from '../components/MakeUpWizard';

const WorkloadDetails = ({ workload, percent }) => {
  if (!workload) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
      <div className="glass p-6 rounded-[2rem] border border-white/40 shadow-lg bg-gradient-to-br from-brand-50 to-white dark:from-slate-800 dark:to-slate-900">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-brand-500/10 rounded-2xl">
            <Clock className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-[10px] font-black text-brand-600/50 uppercase tracking-widest">Active Load</span>
        </div>
        <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 font-display tracking-tight">
          {workload.current_load}<span className="text-sm font-bold text-slate-400 ml-2">/ {workload.max_units}</span>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Assigned Teaching Hours</p>
      </div>

      <div className="glass p-6 rounded-[2rem] border border-white/40 shadow-lg bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 md:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Utilization Progress</span>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            percent > 100 ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20' : 
            percent > 80 ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20' : 
            'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20'
          }`}>
            {percent > 100 ? 'Overloaded' : percent > 80 ? 'Near Capacity' : 'Optimal Load'}
          </span>
        </div>
        <div className="h-4 w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden relative">
           <div 
             style={{ width: `${percent}%` }} 
             className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.3)] ${
               percent > 100 ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-brand-500'
             }`} 
           />
        </div>
        <div className="flex justify-between mt-3 px-1">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">0% Availability Used</span>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{percent.toFixed(1)}% Capacity Occupied</span>
        </div>
      </div>
    </div>
  );
};

export default function MySchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSch, setSelectedSch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'advisory' ? 'advisory' : 'personal';

  const [reqType, setReqType] = useState('DROP');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardSch, setWizardSch] = useState(null);
  
  // Advisory View states
  const [viewType, setViewType] = useState(initialView); // 'personal' | 'advisory'
  const [selectedAdvisoryId, setSelectedAdvisoryId] = useState(null);
  
  const { activeTermId, socket, isConnected, terms } = useScheduleStore();

  const { data: advisorySections = [] } = useQuery({
    queryKey: ['my-advisory-sections'],
    queryFn: async () => (await api.get('/sections/advisory')).data,
    enabled: !!user?.faculty_id
  });

  // Set default advisory section once loaded
  useEffect(() => {
    if (advisorySections.length > 0 && !selectedAdvisoryId) {
      setSelectedAdvisoryId(advisorySections[0].id);
    }
  }, [advisorySections, selectedAdvisoryId]);

  const { data: schedules = [], isLoading } = useQuery({ 
    queryKey: ['my-schedules', user?.faculty_id, activeTermId, viewType, selectedAdvisoryId], 
    queryFn: async () => {
      const params = { term_id: activeTermId };
      if (viewType === 'personal') {
        params.faculty_id = user?.faculty_id;
      } else {
        params.section_id = selectedAdvisoryId;
      }
      
      const res = await api.get('/schedules', { params });
      return res.data;
    },
    enabled: !!activeTermId && (viewType === 'personal' ? !!user?.faculty_id : !!selectedAdvisoryId)
  });

  const { data: workloads = [] } = useQuery({
    queryKey: ['my-workload', activeTermId],
    queryFn: async () => (await api.get('/reports/faculty-workloads', { params: { term_id: activeTermId }})).data,
    enabled: !!activeTermId
  });

  const { data: specializations = [], isLoading: loadingSpec } = useQuery({
    queryKey: ['my-specializations'],
    queryFn: async () => (await api.get('/faculty/me/specializations')).data,
    enabled: !!user?.faculty_id && viewType === 'specializations'
  });

  const { data: loadHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['my-load-history'],
    queryFn: async () => (await api.get('/faculty/me/loads')).data,
    enabled: !!user?.faculty_id && viewType === 'history'
  });

  // Group load history by term
  const loadsByTerm = React.useMemo(() => {
    const grouped = {};
    loadHistory.forEach(load => {
      if (!grouped[load.term_id]) {
        grouped[load.term_id] = { term_name: load.term_name, term_id: load.term_id, loads: [] };
      }
      grouped[load.term_id].loads.push(load);
    });
    return Object.values(grouped);
  }, [loadHistory]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const handleUpdate = () => queryClient.invalidateQueries(['my-schedules']);
    socket.on('schedule_updated', handleUpdate);
    return () => socket.off('schedule_updated', handleUpdate);
  }, [socket, isConnected, queryClient]);

  const myWorkload = workloads.find(w => w.id === user?.faculty_id);
  const utilizedPercent = myWorkload && myWorkload.max_units > 0 
    ? Math.min((myWorkload.current_load / myWorkload.max_units) * 100, 100) 
    : 0;

  const handlePrint = () => {
    let termName = terms.find(t => t.id === activeTermId)?.name || 'Active Term';
    if (!termName.includes('A.Y.') && !termName.includes('202')) {
        termName = `${termName} A.Y. 2026-2027`;
    }
    
    const campusName = myWorkload?.campus_name || 'Main Campus';
    const institutionName = useScheduleStore.getState().systemSettings.institution_name || 'Institution';
    
    let title = `Schedule for ${user?.full_name || 'Instructor'}`;
    if (viewType === 'advisory') {
        const sect = advisorySections.find(s => s.id === selectedAdvisoryId);
        title = `Class Schedule: ${sect ? `${sect.program_code} ${sect.year_level}${sect.name}` : 'Advisory Class'}`;
    }

    generateProfessionalPDF(schedules, title, termName, campusName, institutionName);
  };

  const getProgramColor = (programCode) => {
    const code = (programCode || '').toUpperCase();
    if (code.includes('BSTM')) return { bg: '#7c3aed', border: '#6d28d9' };
    if (code.includes('BSAIS') || code.includes('BSA')) return { bg: '#eab308', border: '#ca8a04' };
    if (code.includes('BSIS')) return { bg: '#1e3a8a', border: '#1e40af' };
    if (code.includes('BSE')) return { bg: '#7f1d1d', border: '#991b1b' };
    if (code.includes('BSCRIM')) return { bg: '#f97316', border: '#ea580c' };
    return { bg: '#10b981', border: '#059669' };
  };

  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  
  const fcEvents = schedules.map(sch => {
    const colors = getProgramColor(sch.program_code);
    return {
      id: sch.id.toString(),
      title: sch.subject_code,
      daysOfWeek: [dayMap[sch.day_of_week]],
      startTime: sch.start_time,
      endTime: sch.end_time,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      extendedProps: { raw: sch }
    };
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post('/requests', payload),
    onSuccess: () => {
      setIsModalOpen(false);
      alert("Change request successfully dispatched to the Administrator Queue.");
    },
    onError: (err) => {
      const data = err.response?.data;
      // Show specific validation field errors if available
      if (data?.errors?.length > 0) {
        setErrorMsg(data.errors.map((e) => e.message).join(' · '));
      } else {
        setErrorMsg(data?.message || 'Failed to submit request.');
      }
    }
  });

  const handleEventClick = (info) => {
    setSelectedSch(info.event.extendedProps.raw);
    setReqType('DROP');
    setReason('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCommitRequest = () => {
    if (!reason.trim()) { setErrorMsg('Detailed justification parameter required.'); return; }
    submitMutation.mutate({ 
      schedule_id: selectedSch.id, 
      faculty_id: user.faculty_id, 
      request_type: reqType, 
      reason_text: reason 
    });
  };

  const renderEventContent = (eventInfo) => {
    const sch = eventInfo.event.extendedProps.raw;
    return (
      <div className="flex flex-col h-full w-full p-1 text-center justify-center gap-0.5 overflow-hidden">
        <div className="font-black text-[10px] uppercase leading-none">{sch.subject_code}</div>
        <div className="font-bold text-[8px] opacity-90 truncate">{sch.program_code}-{sch.year_level}{sch.section_name}</div>
        <div className="flex items-center justify-center gap-1 text-[8px] font-black bg-black/10 rounded mt-1">
          <MapPin className="w-2 h-2" /> {sch.room}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-0 print:block">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight">Active Schedule</h1>
          <p className="mt-1 text-slate-500 font-medium">Official institutional load and venue assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
             <button 
              onClick={() => setViewType('personal')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewType === 'personal' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
             >
               My Load
             </button>
             {advisorySections.length > 0 && (
               <button 
                onClick={() => setViewType('advisory')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewType === 'advisory' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
               >
                 Advisory
               </button>
             )}
             <button 
              onClick={() => setViewType('specializations')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewType === 'specializations' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
             >
               Specialization
             </button>
             <button 
              onClick={() => setViewType('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewType === 'history' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
             >
               Load History
             </button>
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all">
            <Printer className="w-5 h-5" /> Print Copy
          </button>
        </div>
      </div>

      {viewType === 'personal' ? (
        <WorkloadDetails workload={myWorkload} percent={utilizedPercent} />
      ) : viewType === 'advisory' ? (
        <div className="glass p-6 rounded-[2.5rem] border border-white/40 shadow-lg bg-indigo-50/30 dark:bg-slate-800/30 mb-8 animate-fade-in">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-500/20">
                    <Users className="w-7 h-7" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest leading-none mb-1">Current Advisory Context</p>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white font-display">
                       {advisorySections.find(s => s.id === selectedAdvisoryId)?.program_code} {advisorySections.find(s => s.id === selectedAdvisoryId)?.year_level}{advisorySections.find(s => s.id === selectedAdvisoryId)?.name}
                    </h2>
                 </div>
              </div>
              
              {advisorySections.length > 1 && (
                <div className="flex items-center gap-3">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Section:</span>
                   <select 
                    value={selectedAdvisoryId} 
                    onChange={(e) => setSelectedAdvisoryId(Number(e.target.value))}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-brand-500/10 min-w-[150px]"
                   >
                     {advisorySections.map(s => (
                       <option key={s.id} value={s.id}>{s.name} ({s.program_code})</option>
                     ))}
                   </select>
                </div>
              )}
           </div>
        </div>
      ) : null}

      {viewType !== 'specializations' && (
        <div className="flex items-center gap-3 px-5 py-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[1.5rem] text-sm text-blue-700 dark:text-blue-400 print:hidden shadow-sm mb-6">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium"><strong>Verified Blocks Only.</strong> Assignments still pending administrative review are hidden until approved by the Program Head.</span>
        </div>
      )}

      {viewType === 'specializations' ? (
        <div className="animate-fade-in">
          {loadingSpec ? (
             <div className="flex justify-center items-center h-40"><RefreshCw className="animate-spin h-8 w-8 text-brand-600" /></div>
          ) : specializations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specializations.map((spec) => (
                <div key={spec.id} className="glass p-6 rounded-[2rem] border border-white/40 shadow-xl bg-white/40 dark:bg-slate-800/40 hover:scale-[1.02] transition-all group">
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform">
                        <Award className="w-7 h-7" />
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Accredited</span>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{spec.code}</p>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white font-display leading-tight">{spec.name}</h3>
                   </div>
                   <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <BookOpen className="w-4 h-4 text-brand-500" />
                        {spec.units} Units
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{spec.department || 'General Education'}</span>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-12 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4 bg-white/10">
               <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
                 <ShieldAlert className="w-12 h-12 text-slate-300" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Professional Portfolio Empty</h3>
                  <p className="text-slate-500 max-w-sm mt-1">Visit Academic Affairs to register your subject specializations and institutional accreditations.</p>
               </div>
            </div>
          )}
        </div>
      ) : viewType === 'history' ? (
        <div className="animate-fade-in space-y-6">
          {loadingHistory ? (
            <div className="flex justify-center items-center h-40"><RefreshCw className="animate-spin h-8 w-8 text-brand-600" /></div>
          ) : loadsByTerm.length > 0 ? (
            loadsByTerm.map((termGroup) => {
              const isActiveTerm = termGroup.term_id === activeTermId;
              const totalHours = termGroup.loads.reduce((sum, l) => sum + Number(l.required_hours || 0), 0);
              return (
                <div key={termGroup.term_id} className={`glass rounded-[2rem] border shadow-xl overflow-hidden ${isActiveTerm ? 'border-brand-500/30 bg-white/40 dark:bg-slate-800/40' : 'border-white/30 bg-white/20 dark:bg-slate-900/20'}`}>
                  <div className={`px-6 py-4 flex items-center justify-between ${isActiveTerm ? 'bg-brand-500/10' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                    <div className="flex items-center gap-3">
                      <History className={`w-5 h-5 ${isActiveTerm ? 'text-brand-600' : 'text-slate-400'}`} />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{termGroup.term_name}</h3>
                      {isActiveTerm && <span className="px-2 py-0.5 bg-brand-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Current</span>}
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest ${isActiveTerm ? 'text-brand-600' : 'text-slate-400'}`}>{totalHours} hrs total</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700">
                          <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Code</th>
                          <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Name</th>
                          <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Section</th>
                          <th className="text-center px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours</th>
                          <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {termGroup.loads.map((load) => (
                          <tr key={load.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-3 font-black text-slate-900 dark:text-white">{load.subject_code}</td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">{load.subject_name}</td>
                            <td className="px-3 py-3 text-slate-500">{load.program_code} {load.year_level} {load.section_name}</td>
                            <td className="px-3 py-3 text-center font-black text-brand-600">{load.required_hours}</td>
                            <td className="px-6 py-3">
                              {load.evaluation_rating ? (
                                <div>
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    load.evaluation_rating === 'Excellent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : load.evaluation_rating === 'Satisfactory' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                    {load.evaluation_rating}
                                  </span>
                                  {load.evaluation_notes && (
                                    <p className="mt-1 text-[10px] text-slate-500 max-w-[200px] line-clamp-2" title={load.evaluation_notes}>"{load.evaluation_notes}"</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No rating yet</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass p-12 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4">
              <History className="w-16 h-16 text-slate-200 dark:text-slate-700" />
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">No Teaching History Found</h3>
                <p className="text-slate-500 mt-1 max-w-sm">Your teaching load records from previous semesters will appear here once they are archived.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-[2.5rem] shadow-xl border border-white/40 overflow-hidden print:hidden">
          {isLoading ? (
             <div className="flex justify-center items-center h-40"><RefreshCw className="animate-spin h-8 w-8 text-brand-600" /></div>
          ) : (
            <div className="bg-slate-900 rounded-[2.5rem] p-6 relative overflow-hidden group">
               {/* Background Glow matching Master Schedule */}
               <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
  
               <style>{`
                 .fc-theme-standard td, .fc-theme-standard th { border-color: #334155; }
                 .fc-timegrid-slot-label-cushion { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
                 .fc-col-header-cell-cushion { font-size: 11px; font-weight: 900; color: #f8fafc; padding: 12px 0; text-transform: uppercase; letter-spacing: 0.05em; }
                 .fc-event { border-radius: 8px !important; border: none !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                 .fc-timegrid-slot { height: 3.5rem !important; }
                 .fc-scrollgrid { border: none !important; }
               `}</style>
               <FullCalendar
                  plugins={[timeGridPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={false}
                  firstDay={1}
                  hiddenDays={[0]}
                  slotMinTime="07:00:00"
                  slotMaxTime="22:00:00"
                  allDaySlot={false}
                  dayHeaderFormat={{ weekday: 'long' }}
                  slotLabelFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                  eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                  events={fcEvents}
                  eventClick={handleEventClick}
                  eventContent={renderEventContent}
                  editable={false}
                  height="auto"
                  slotDuration="00:30:00"
               />
            </div>
          )}
        </div>
      )}

      {isModalOpen && selectedSch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in print:hidden">
           <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-white/20">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">Change Request</h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-6">
                 {errorMsg && (
                   <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100 flex items-center gap-2">
                     <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span className="font-bold">{errorMsg}</span>
                   </div>
                 )}
                 <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 left-0 w-2 h-full bg-brand-500"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Load</p>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white font-display italic tracking-tight mb-2 underline">{selectedSch.subject_code}</h4>
                    <div className="flex flex-wrap gap-4 mt-4">
                       <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide"><MapPin className="w-4 h-4" /> {selectedSch.room}</span>
                       <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide"><Calendar className="w-4 h-4" /> {selectedSch.day_of_week}</span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={()=>setReqType('DROP')} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs border-2 transition-all ${reqType === 'DROP' ? 'bg-brand-600 text-white border-brand-600 shadow-xl shadow-brand-500/20' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-700'}`}>Drop Load</button>
                    <button onClick={()=>setReqType('SWAP')} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs border-2 transition-all ${reqType === 'SWAP' ? 'bg-brand-600 text-white border-brand-600 shadow-xl shadow-brand-500/20' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-700'}`}>Sub Swap</button>
                 </div>

                 <button 
                   onClick={() => {
                     setWizardSch(selectedSch);
                     setIsModalOpen(false);
                     setIsWizardOpen(true);
                   }}
                   className="w-full py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black uppercase tracking-widest text-xs border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
                 >
                   <Sparkles className="w-4 h-4 group-hover:animate-pulse text-brand-500" />
                   Intelligent Make-up Finder
                 </button>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Justification</label>
                    <textarea value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] p-5 min-h-[140px] bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-brand-500 font-bold text-sm transition-all" placeholder="Enter explicit constraints requiring this structural modification..."></textarea>
                 </div>
              </div>
              <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700/50 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 tracking-widest uppercase text-xs hover:text-slate-600 transition-colors">Abort</button>
                 <button onClick={handleCommitRequest} disabled={submitMutation.isPending} className="flex-3 py-4 bg-brand-600 text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all flex justify-center items-center gap-2">
                    {submitMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Dispatch Ticket</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {isWizardOpen && wizardSch && (
        <MakeUpWizard 
          schedule={wizardSch} 
          onClose={() => setIsWizardOpen(false)} 
        />
      )}
    </div>
  );
}
