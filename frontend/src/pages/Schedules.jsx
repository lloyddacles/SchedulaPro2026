import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useTerm } from '../context/TermContext';
import { PlusCircle, Trash2, Calendar, AlertCircle, X, Printer, Download, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Schedules() {
  const queryClient = useQueryClient();
  const { activeTermId } = useTerm();
  const calendarRef = useRef(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [formData, setFormData] = useState({
    teaching_load_id: '', day_of_week: 'Monday', start_time: '08:00', end_time: '09:00', room: ''
  });

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery({ 
    queryKey: ['schedules', activeTermId], 
    queryFn: async () => {
      const res = await api.get('/schedules', { params: { term_id: activeTermId } });
      return res.data;
    },
    enabled: !!activeTermId
  });

  const { data: loads = [] } = useQuery({ 
    queryKey: ['loads', activeTermId], 
    queryFn: async () => (await api.get('/teaching-loads', { params: { term_id: activeTermId } })).data,
    enabled: !!activeTermId
  });

  const { data: faculty = [] } = useQuery({ queryKey: ['faculty'], queryFn: async () => (await api.get('/faculty')).data });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: async () => (await api.get('/sections')).data });
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: async () => (await api.get('/rooms')).data });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: async () => (await api.get('/subjects')).data });
  const { data: blackouts = [] } = useQuery({ queryKey: ['blackouts'], queryFn: async () => (await api.get('/unavailability')).data });

  const createMutation = useMutation({
    mutationFn: (newSchedule) => api.post('/schedules', newSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsModalOpen(false);
    },
    onError: (err) => setError(err.response?.data?.details || err.response?.data?.message || 'Error assigning schedule')
  });

  const updateMutation = useMutation({
    mutationFn: (updatedSchedule) => api.put(`/schedules/${updatedSchedule.id}`, updatedSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setError('');
    },
    onError: (err) => {
      setError(err.response?.data?.details || err.response?.data?.message || 'Error moving schedule block');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] })
  });

  const handleAutoSuggest = () => {
    if (!formData.teaching_load_id) return setError("Please select an Active Cohort & Subject first.");
    if (!formData.room) return setError("Please enter a target Room first to verify room conflicts.");
    
    setError('');
    const load = loads.find(l => l.id === Number(formData.teaching_load_id));
    if (!load) return;

    const durationHours = 1; 

    for (const day of DAYS) {
      for (let timeCode = 7; timeCode <= 21 - durationHours; timeCode += 0.5) {
         const sAttempt = timeCode;
         const eAttempt = timeCode + durationHours;

         const conflict = schedules.find(sch => {
           if (sch.day_of_week !== day) return false;
           
           const parseTime = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
           const sSch = parseTime(sch.start_time);
           const eSch = parseTime(sch.end_time);
           
           if (!(sSch < eAttempt && eSch > sAttempt)) return false;

           const isSameFaculty = sch.faculty_id === load.faculty_id;
           const isSameSection = sch.section_id !== 1 && sch.section_id === load.section_id;
           const isSameRoom = sch.room.toLowerCase() === formData.room.toLowerCase();

           return isSameFaculty || isSameSection || isSameRoom;
           return isSameFaculty || isSameSection || isSameRoom;
         });

         const facultyBlackouts = blackouts.filter(b => b.faculty_id === load.faculty_id && b.day_of_week === day);
         const isBlackedOut = facultyBlackouts.some(b => {
             const parseTimeLocal = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
             const bStart = parseTimeLocal(b.start_time);
             const bEnd = parseTimeLocal(b.end_time);
             return (bStart < eAttempt && bEnd > sAttempt);
         });

         if (!conflict && !isBlackedOut) {
            const formatTime = (t) => {
              const hh = Math.floor(t).toString().padStart(2, '0');
              const mm = (t % 1 === 0.5) ? '30' : '00';
              return `${hh}:${mm}`;
            };
            setFormData({
              ...formData,
              day_of_week: day,
              start_time: formatTime(sAttempt),
              end_time: formatTime(eAttempt)
            });
            return;
         }
      }
    }
    
    setError("No available 1-hour slots found for this Faculty + Section + Room combination in the entire week!");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const load = loads.find(l => l.id === Number(formData.teaching_load_id));
    const room = rooms.find(r => r.name === formData.room);
    if (load && room) {
       const subject = subjects.find(s => s.subject_code === load.subject_code);
       if (subject && subject.room_type && subject.room_type !== 'Any' && subject.room_type !== room.type) {
          setError(`Location Mismatch: ${subject.subject_code} explicitly requires a ${subject.room_type} environment. You mapped it to a ${room.type}.`);
          return;
       }
    }

    createMutation.mutate(formData);
  };

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(calendarRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const filename = selectedFacultyId 
        ? `Schedule_${faculty.find(f => f.id === Number(selectedFacultyId))?.full_name.replace(/ /g, '_')}.pdf` 
        : selectedSectionId 
          ? `Cohort_Schedule_${sections.find(s => s.id === Number(selectedSectionId))?.name}.pdf`
          : 'Master_Schedule.pdf';
      
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 20));
      pdf.save(filename);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to export PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDragStart = (e, sch) => {
    e.dataTransfer.setData('application/json', JSON.stringify(sch));
    setTimeout(() => { e.target.style.opacity = '0.4'; }, 0);
  };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleDrop = async (e, targetDay) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData('application/json');
    if (!payload) return;
    const sch = JSON.parse(payload);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = Math.max(0, e.clientY - rect.top);
    const rawHours = 7 + (offsetY / 80);
    let startHours = Math.round(rawHours * 2) / 2;
    if (startHours < 7) startHours = 7;

    const parseTime = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
    const duration = parseTime(sch.end_time) - parseTime(sch.start_time);
    
    let endHours = startHours + duration;
    if (endHours > 21) { endHours = 21; startHours = 21 - duration; }

    const formatTime = (h) => {
      const hh = Math.floor(h).toString().padStart(2, '0');
      const mm = (h % 1 === 0.5) ? '30' : '00';
      return `${hh}:${mm}`;
    };

    const newStartTime = formatTime(startHours);
    const newEndTime = formatTime(endHours);
    if (sch.day_of_week === targetDay && sch.start_time === newStartTime) return;

    setError('');
    updateMutation.mutate({
      id: sch.id, teaching_load_id: sch.teaching_load_id,
      day_of_week: targetDay, start_time: newStartTime, end_time: newEndTime, room: sch.room
    });
  };

  // Dual filtering mode
  let displayedSchedules = schedules;
  if (selectedFacultyId) {
    displayedSchedules = displayedSchedules.filter(s => s.faculty_id === Number(selectedFacultyId));
  } else if (selectedSectionId) {
    displayedSchedules = displayedSchedules.filter(s => s.section_id === Number(selectedSectionId));
  }

  const getHexColor = (str) => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#eab308'];
    let hash = 0;
    if (str) { for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
  };

  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  
  const fcEvents = [
    ...displayedSchedules.map(sch => ({
       id: sch.id.toString(),
       title: `${sch.subject_code} (${selectedFacultyId ? sch.section_name : sch.faculty_name}) Rm: ${sch.room}`,
       daysOfWeek: [dayMap[sch.day_of_week]],
       startTime: sch.start_time,
       endTime: sch.end_time,
       backgroundColor: getHexColor(sch.faculty_name),
       borderColor: getHexColor(sch.faculty_name),
       extendedProps: { raw: sch }
    })),
    ...(blackouts && !selectedSectionId ? blackouts.filter(b => selectedFacultyId ? b.faculty_id === Number(selectedFacultyId) : true).map(b => ({
       id: 'block-' + b.id,
       title: b.reason,
       daysOfWeek: [dayMap[b.day_of_week]],
       startTime: b.start_time,
       endTime: b.end_time,
       display: 'background',
       backgroundColor: '#9ca3af'
    })) : [])
  ];

  const handleEventDrop = (info) => {
     setError('');
     const oldSch = info.event.extendedProps.raw;
     const newDayMap = { 1:'Monday', 2:'Tuesday', 3:'Wednesday', 4:'Thursday', 5:'Friday', 6:'Saturday' };
     const newDayOfWeek = newDayMap[info.event.start.getDay()];
     
     const padTime = d => d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':00';
     
     updateMutation.mutate({
        id: oldSch.id,
        teaching_load_id: oldSch.teaching_load_id,
        room: oldSch.room,
        day_of_week: newDayOfWeek,
        start_time: padTime(info.event.start),
        end_time: padTime(info.event.end)
     }, {
        onError: (err) => { 
           setError(err.response?.data?.details || err.message);
           info.revert(); 
        }
     });
  };

  return (
    <div className="space-y-6 pb-10 print:p-0 print:space-y-0 print:block">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Schedules <span className="text-sm font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full animate-fade-in">{displayedSchedules.length} blocks</span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Master Drag-and-Drop calendar unified by instructor and cohort overlaps.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Instructor Data</label>
            <select 
              value={selectedFacultyId} 
              onChange={e => { setSelectedFacultyId(e.target.value); setSelectedSectionId(''); }}
              className="bg-transparent border-none text-brand-700 dark:text-brand-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate cursor-pointer"
            >
              <option value="">Master View</option>
              {faculty.map(f => (<option key={f.id} value={f.id}>{f.full_name}</option>))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Cohort Isolation</label>
            <select 
              value={selectedSectionId} 
              onChange={e => { setSelectedSectionId(e.target.value); setSelectedFacultyId(''); }}
              className="bg-transparent border-none text-emerald-700 dark:text-emerald-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate cursor-pointer"
            >
              <option value="">Master View</option>
              {sections.filter(s => s.id !== 1).map(s => (<option key={s.id} value={s.id}>{s.program_code}-{s.year_level}{s.name}</option>))}
            </select>
          </div>

          <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-slate-700 rounded-xl font-bold shadow-sm hover:bg-brand-50 dark:hover:bg-slate-700 transition min-w-[140px]">
            {isGeneratingPDF ? <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div> : <><Download className="w-5 h-5" /> Export PDF</>}
          </button>
          <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition w-auto">
            <Printer className="w-5 h-5" />
          </button>

          <button onClick={() => { setError(''); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5 w-full sm:w-auto">
            <PlusCircle className="w-5 h-5" /> Book Class
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-3 shadow-sm print:hidden animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div ref={calendarRef} className="glass rounded-[2rem] shadow-xl border border-white/40 overflow-hidden print:shadow-none print:border-none print:bg-white print:rounded-none">
        
        <div className="hidden print:block p-6 text-center border-b border-gray-100 dark:border-slate-700">
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
             {selectedFacultyId ? faculty.find(f => f.id === Number(selectedFacultyId))?.full_name + ' Official Schedule' 
               : selectedSectionId ? sections.find(s => s.id === Number(selectedSectionId))?.program_code + '-' + sections.find(s => s.id === Number(selectedSectionId))?.year_level + sections.find(s => s.id === Number(selectedSectionId))?.name + ' Cohort Map'
               : 'Master Academic Calendar'}
           </h1>
           <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Generated by FacultyScheduler 2.0</p>
        </div>

        {isLoadingSchedules ? (
           <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-500"></div></div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-4 print:p-0 transition-colors duration-200">
             <style>{`
               .fc-theme-standard td, .fc-theme-standard th { border-color: #f3f4f6; }
               .fc-timegrid-slot-label-cushion { font-size: 11px; font-weight: 600; color: #6b7280; }
               .fc-col-header-cell-cushion { font-size: 12px; font-weight: 700; color: #374151; padding: 8px 0; }
               .fc-event-main { padding: 3px 5px; font-size: 11px; font-weight: 600; line-height: 1.3; }
               .fc-bg-event { opacity: 0.15; repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px); }
             `}</style>
             <FullCalendar
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={false}
                firstDay={1}
                hiddenDays={[0]}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                allDaySlot={false}
                dayHeaderFormat={{ weekday: 'long' }}
                events={fcEvents}
                editable={true}
                eventDrop={handleEventDrop}
                eventClick={(info) => {
                   if (info.event.display !== 'background' && window.confirm('Permanently delete this mapped class block?')) {
                      deleteMutation.mutate(Number(info.event.id));
                   }
                }}
                height="800px"
                expandRows={true}
                slotDuration="00:30:00"
             />
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 my-8 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 flex-none">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" /> Map Cohort Space
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto min-h-0">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Select Active Cohort & Subject Limit</label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm font-medium"
                  value={formData.teaching_load_id}
                  onChange={e => setFormData({...formData, teaching_load_id: e.target.value})}
                  required
                >
                  <option value="">-- Faculty / Subject / Target Cohort --</option>
                  {loads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.faculty_name} - {l.subject_code} ({l.section_id !== 1 ? `${l.program_code}-${l.year_level}${l.section_name}` : 'Unassigned'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Day</label>
                  <select 
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    value={formData.day_of_week}
                    onChange={e => setFormData({...formData, day_of_week: e.target.value})}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Room / Venue</label>
                  <select 
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    value={formData.room}
                    onChange={e => setFormData({...formData, room: e.target.value})}
                    required
                  >
                    <option value="">-- Select Valid Facility --</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.name}>{r.name} ({r.type} - {r.capacity} pax)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    value={formData.start_time}
                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">End Time</label>
                  <input 
                    type="time" 
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    value={formData.end_time}
                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end mt-1">
                 <button type="button" onClick={handleAutoSuggest} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all shadow-sm">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Auto-Find Empty Matrix Slot
                 </button>
              </div>

              <div className="bg-brand-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-start gap-3 border border-brand-100 dark:border-slate-600/50">
                <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="text-sm text-brand-800 dark:text-slate-300 font-medium">
                  Select a Faculty member and Room above, then click Auto Suggest to actively scan mathematical constraints.
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-700/50 flex justify-end gap-3 flex-none">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={createMutation.isLoading || !formData.teaching_load_id || !formData.room} className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 hover:-translate-y-0.5 transition disabled:opacity-50 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Finalize Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
