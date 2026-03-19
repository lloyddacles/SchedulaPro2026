import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Printer, X, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MySchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSch, setSelectedSch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reqType, setReqType] = useState('DROP');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const { data: schedules = [], isLoading } = useQuery({ 
    queryKey: ['my-schedules', user?.faculty_id], 
    queryFn: async () => {
      const res = await api.get('/schedules', { params: { faculty_id: user?.faculty_id } });
      return res.data;
    },
    enabled: !!user?.faculty_id
  });

  const handlePrint = () => window.print();

  const getHexColor = (str) => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#eab308'];
    let hash = 0;
    if (str) { for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
  };

  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  
  const fcEvents = schedules.map(sch => ({
       id: sch.id.toString(),
       title: `${sch.subject_code}\n${sch.subject_name}\nRoom: ${sch.room}`,
       daysOfWeek: [dayMap[sch.day_of_week]],
       startTime: sch.start_time,
       endTime: sch.end_time,
       backgroundColor: getHexColor(sch.subject_code),
       borderColor: getHexColor(sch.subject_code),
       extendedProps: { raw: sch }
  }));

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post('/requests', payload),
    onSuccess: () => {
      setIsModalOpen(false);
      alert("Swap/Drop configuration successfully dispatched to the Administrator Queue.");
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed dependency mapping.");
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
    if (!reason.trim()) { setErrorMsg('Explicit justification parameters required.'); return; }
    submitMutation.mutate({ schedule_id: selectedSch.id, faculty_id: selectedSch.faculty_id, request_type: reqType, reason_text: reason });
  };

  return (
    <div className="space-y-6 pb-10 print:p-0 print:space-y-0 print:block">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">My Schedule</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Your assigned teaching hours and classroom locations.</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition">
          <Printer className="w-5 h-5" /> Print
        </button>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 overflow-hidden print:shadow-none print:border-none print:bg-white print:rounded-none">
        {isLoading ? (
           <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-500"></div></div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-4 print:p-0 transition-colors duration-200">
             <style>{`
               .fc-theme-standard td, .fc-theme-standard th { border-color: #f3f4f6; }
               .fc-timegrid-slot-label-cushion { font-size: 11px; font-weight: 600; color: #6b7280; }
               .fc-col-header-cell-cushion { font-size: 12px; font-weight: 700; color: #374151; padding: 8px 0; }
               .fc-event-main { padding: 4px; font-size: 11px; font-weight: 600; line-height: 1.4; }
             `}</style>
             <FullCalendar
                plugins={[timeGridPlugin]}
                initialView="timeGridWeek"
                headerToolbar={false}
                firstDay={1}
                hiddenDays={[0]}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                allDaySlot={false}
                dayHeaderFormat={{ weekday: 'long' }}
                events={fcEvents}
                eventClick={handleEventClick}
                editable={false}
                height="800px"
                expandRows={true}
                slotDuration="00:30:00"
             />
          </div>
        )}
      </div>

      {isModalOpen && selectedSch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/60 backdrop-blur-md animate-fade-in print:hidden">
           <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                    <ShieldAlert className="w-6 h-6 text-brand-500" />
                    Official Change Request
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-5">
                 {errorMsg && (
                   <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                     <AlertCircle className="w-5 h-5 flex-shrink-0" /> <span className="font-bold">{errorMsg}</span>
                   </div>
                 )}
                 <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">{selectedSch.section_id !== 1 ? `${selectedSch.program_code}-${selectedSch.year_level}${selectedSch.section_name}` : 'Unassigned Cohort'}</p>
                    <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">{selectedSch.subject_code}</h4>
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-300 truncate">{selectedSch.day_of_week} ({selectedSch.start_time} - {selectedSch.end_time})</p>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Request Type</label>
                    <div className="flex gap-4">
                       <label className={`flex-1 border-2 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all font-bold ${reqType === 'DROP' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                          <input type="radio" value="DROP" checked={reqType === 'DROP'} onChange={(e)=>setReqType(e.target.value)} className="hidden"/> Drop Load
                       </label>
                       <label className={`flex-1 border-2 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all font-bold ${reqType === 'SWAP' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                          <input type="radio" value="SWAP" checked={reqType === 'SWAP'} onChange={(e)=>setReqType(e.target.value)} className="hidden"/> Substitute Swap
                       </label>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Detailed Justification</label>
                    <textarea value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl p-4 min-h-[120px] bg-gray-50 dark:bg-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-brand-500 focus:border-brand-500 outline-none font-medium text-sm transition-all shadow-sm" placeholder="Enter explicit constraints requiring this structural modification..."></textarea>
                 </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3 flex-wrap">
                 <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm w-full sm:w-auto">Cancel Interaction</button>
                 <button onClick={handleCommitRequest} disabled={submitMutation.isPending} className="flex justify-center items-center gap-2 px-6 py-2.5 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 w-full sm:w-auto">
                    {submitMutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Sparkles className="w-5 h-5"/> Submit Dispatch Ticket</>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
