import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import { 
  PlusCircle, Trash2, Calendar, AlertCircle, X, Printer, 
  Download, Sparkles, RotateCcw, ShieldAlert, RefreshCw, 
  Ghost, Save, Database, ArrowRightLeft, History, Search, Filter, MoreHorizontal, ChevronDown, AlertTriangle
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ConfirmModal from '../components/ConfirmModal';
import ConflictResolutionPanel from '../components/ConflictResolutionPanel';
import GhostCommitBar from '../components/GhostCommitBar';
import useGhostStore from '../store/useGhostStore';
import { generateProfessionalPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Institutional Color Way Mapping
export const getProgramColor = (programCode) => {
  const code = (programCode || '').toUpperCase();
  if (code.includes('BSTM')) return { bg: '#7c3aed', border: '#6d28d9' };
  if (code.includes('BSAIS') || code.includes('BSA')) return { bg: '#eab308', border: '#ca8a04' };
  if (code.includes('BSIS')) return { bg: '#1e3a8a', border: '#1e40af' };
  if (code.includes('BSE')) return { bg: '#7f1d1d', border: '#991b1b' };
  if (code.includes('BSCRIM')) return { bg: '#f97316', border: '#ea580c' };
  if (code.includes('SHS') || code.includes('TVL') || code.includes('GAS') || code.includes('ABM') || code.includes('STEM') || code.includes('HUMSS')) 
    return { bg: '#10b981', border: '#059669' };
  
  return { bg: '#64748b', border: '#475569' };
};

export default function Schedules() {
  const queryClient = useQueryClient();
  const { activeTermId, socket, isConnected } = useScheduleStore();
  const calendarRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: '', onConfirm: () => {} });
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [popoverState, setPopoverState] = useState({ isOpen: false, data: null, position: { top: 0, left: 0 } });
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isCommittingGhost, setIsCommittingGhost] = useState(false);
  const [dragTarget, setDragTarget] = useState(null); // { day, sAttempt, eAttempt, status, message }

  // ── Ghost Mode Logic ───────────────────────────────────────────────────
  const { isGhostMode, stagedSchedules, toggleGhostMode, stageUpdate, stageDelete, getDiff, discardDraft, validateIntegrity, validationErrors } = useGhostStore();
  
  // ── Responsive View State ────────────────────────────────────────────────
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(isMobile ? 'timeGridDay' : 'timeGridWeek');
    }
  }, [isMobile]);
  
  const [formData, setFormData] = useState({
    teaching_load_id: '', day_of_week: 'Monday', start_time: '08:00', end_time: '09:00', room: ''
  });

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery({ 
    queryKey: ['schedules', activeTermId, selectedCampusId], 
    queryFn: async () => {
      const res = await api.get('/schedules', { 
        params: { 
          term_id: activeTermId,
          campus_id: selectedCampusId
        } 
      });
      return res.data;
    },
    enabled: !!activeTermId
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUpdate = (data) => {
      // Real-time update received: Invalidate schedules
      if (!data.campus_id || !selectedCampusId || Number(data.campus_id) === Number(selectedCampusId)) {
        queryClient.invalidateQueries(['schedules']);
      }
      
      // If it's a global structural reset, invalidate loads and other matrices
      if (data?.action === 'reset') {
        queryClient.invalidateQueries(['loads']);
        queryClient.invalidateQueries(['schedules']); // Broad invalidation
      }
    };

    const handleResourceRemoved = () => {
      // Trigger a broad invalidation to fetch fresh room/faculty lists for the integrity scan
      queryClient.invalidateQueries(['rooms']);
      queryClient.invalidateQueries(['faculty']);
      toast.error('Institutional resource changes detected. Re-validating drafts...', { icon: '🔄' });
    };

    socket.on('schedule_updated', handleUpdate);
    socket.on('resource_archived', handleResourceRemoved);

    return () => {
      socket.off('schedule_updated', handleUpdate);
      socket.off('resource_archived', handleResourceRemoved);
    };
  }, [socket, isConnected, queryClient, selectedCampusId]);

  const { data: loads = [] } = useQuery({ 
    queryKey: ['loads', activeTermId], 
    queryFn: async () => (await api.get('/teaching-loads', { params: { term_id: activeTermId } })).data || [],
    enabled: !!activeTermId
  });

  const { data: faculty = [] } = useQuery({ queryKey: ['faculty'], queryFn: async () => (await api.get('/faculty')).data || [] });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: async () => (await api.get('/sections')).data || [] });
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: async () => (await api.get('/rooms')).data || [] });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: async () => (await api.get('/programs')).data || [] });
  const { data: blackouts = [] } = useQuery({ queryKey: ['blackouts'], queryFn: async () => (await api.get('/unavailability')).data || [] });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: async () => (await api.get('/academic-terms')).data || [] });
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: async () => (await api.get('/campuses')).data || [] });

  // Reactive Integrity Scan: Ensure drafts always respect resource availability
  useEffect(() => {
    if (isGhostMode && rooms.length > 0 && faculty.length > 0) {
      validateIntegrity(rooms, faculty);
    }
  }, [isGhostMode, rooms, faculty, stagedSchedules, validateIntegrity]);

  const createMutation = useMutation({
    mutationFn: (newSchedule) => api.post('/schedules', newSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      // Clear filters to ensure visibility
      setSelectedProgramId('');
      setSelectedFacultyId(''); 
      setSelectedSectionId('');
      setSelectedRoomName('');
      setIsModalOpen(false);
    },
    onError: (err) => setError(err.response?.data?.error?.details || err.response?.data?.error?.message || 'Error assigning schedule')
  });

  const updateMutation = useMutation({
    mutationFn: (updatedSchedule) => api.put(`/schedules/${updatedSchedule.id}`, updatedSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setError('');
      setIsModalOpen(false);
    },
    onError: (err) => {
      setError(err.response?.data?.error?.details || err.response?.data?.error?.message || 'Error moving schedule block');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] })
  });

  const [isConflictPanelOpen, setIsConflictPanelOpen] = useState(false);
  const [schedulerFailures, setSchedulerFailures] = useState([]);

  const autoScheduleMutation = useMutation({
    mutationFn: ({ termId, campusId }) => {
      const payload = { term_id: termId };
      if (campusId) payload.campus_id = campusId;
      return api.post('/schedules/auto-schedule/', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      const { data } = res;
      
      if (data.failed > 0) {
        setSchedulerFailures(data.failures || []);
        setIsConflictPanelOpen(true);
      } else if (data.scheduled > 0) {
         alert(`Successfully auto-scheduled ${data.scheduled} class blocks with 0 conflicts!`);
      } else {
         alert('Matrix clean! All approved teaching loads are inherently mapped!');
      }
    },
    onError: (err) => setError(err.response?.data?.error?.message || 'Error running Core Auto-Scheduler')
  });

  const handleManualResolveSuccess = (loadId) => {
    // Remove from the resolution list locally
    setSchedulerFailures(prev => prev.filter(f => f.teaching_load_id !== loadId));
    // Refresh the grid
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
  };

  const resetMutation = useMutation({
    mutationFn: (termId) => api.delete(`/schedules/reset/${termId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      alert(res.data.message || 'Master Schedule has been completely reset.');
    },
    onError: (err) => setError(err.response?.data?.error?.message || 'Error resetting schedules')
  });

  const { data: conflictCheck, isFetching: isCheckingConflict } = useQuery({
    queryKey: ['conflictCheck', formData.teaching_load_id, formData.day_of_week, formData.start_time, formData.end_time, formData.room, isEditingSchedule ? selectedScheduleId : null],
    queryFn: async () => {
      if (!formData.teaching_load_id || !formData.room) return { conflict: false };
      const res = await api.get('/schedules/check-conflict', {
        params: {
          teaching_load_id: formData.teaching_load_id,
          day_of_week: formData.day_of_week,
          start_time: formData.start_time + ':00',
          end_time: formData.end_time + ':00',
          room: formData.room,
          schedule_id: isEditingSchedule ? selectedScheduleId : undefined
        }
      });
      return res.data;
    },
    enabled: isModalOpen && !!formData.teaching_load_id && !!formData.room
  });

  const checkSlotCollision = (day, sAttempt, eAttempt, load, roomName, ignoreScheduleId) => {
    if (!load) return { collision: false };

    const loadFacs = [load.faculty_id, load.co_faculty_id_1, load.co_faculty_id_2].filter(id => !!id && id > 0);

    for (let i = 0; i < schedules.length; i++) {
        const sch = schedules[i];
        if (ignoreScheduleId && sch.id === ignoreScheduleId) continue;
        if (sch.day_of_week !== day) continue;
        const sSch = parseInt(sch.start_time.substring(0, 2), 10) + parseInt(sch.start_time.substring(3, 5), 10) / 60;
        const eSch = parseInt(sch.end_time.substring(0, 2), 10) + parseInt(sch.end_time.substring(3, 5), 10) / 60;
        if (!(sSch < eAttempt && eSch > sAttempt)) continue;

        let isSameFaculty = false;
        if (sch.faculty_id && loadFacs.includes(sch.faculty_id)) isSameFaculty = true;
        else if (sch.co_faculty_id_1 && loadFacs.includes(sch.co_faculty_id_1)) isSameFaculty = true;
        else if (sch.co_faculty_id_2 && loadFacs.includes(sch.co_faculty_id_2)) isSameFaculty = true;
        if (isSameFaculty) return { collision: true, reason: 'Faculty Overlap' };

        if (sch.section_id === load.section_id && sch.section_id !== 1) return { collision: true, reason: 'Cohort Conflict' };
        if (roomName && sch.room && sch.room.toLowerCase() === roomName.toLowerCase()) return { collision: true, reason: 'Room Double-Book' };
    }

    for (let i = 0; i < blackouts.length; i++) {
        const b = blackouts[i];
        if (b.day_of_week !== day) continue;
        if (!loadFacs.includes(b.faculty_id)) continue;
        const bS = parseInt(b.start_time.substring(0, 2), 10) + parseInt(b.start_time.substring(3, 5), 10) / 60;
        const bE = parseInt(b.end_time.substring(0, 2), 10) + parseInt(b.end_time.substring(3, 5), 10) / 60;
        if (bS < eAttempt && bE > sAttempt) return { collision: true, reason: 'Faculty Blackout' };
    }

    return { collision: false };
  };

  const verifyWellness = (day, sAttempt, eAttempt, load, ignoreScheduleId) => {
    if (!load || !load.faculty_id) return { valid: true };
    const facultyIds = [load.faculty_id, load.co_faculty_id_1, load.co_faculty_id_2].filter(id => !!id && id > 0);
    
    const dayMap = { 'Monday': 'Sunday', 'Tuesday': 'Monday', 'Wednesday': 'Tuesday', 'Thursday': 'Wednesday', 'Friday': 'Thursday', 'Saturday': 'Friday', 'Sunday': 'Saturday' };
    const nextDayMap = { 'Monday': 'Tuesday', 'Tuesday': 'Wednesday', 'Wednesday': 'Thursday', 'Thursday': 'Friday', 'Friday': 'Saturday', 'Saturday': 'Sunday' };
    const prevDay = dayMap[day];
    const nextDay = nextDayMap[day];

    let lastEnd = -1;
    let nextStart = 99;

    for (let i = 0; i < schedules.length; i++) {
      const sch = schedules[i];
      if (ignoreScheduleId && sch.id === ignoreScheduleId) continue;
      if (!facultyIds.includes(sch.faculty_id) && !facultyIds.includes(sch.co_faculty_id_1) && !facultyIds.includes(sch.co_faculty_id_2)) continue;
      
      if (sch.day_of_week === prevDay) {
        const e = parseInt(sch.end_time.substring(0, 2), 10) + parseInt(sch.end_time.substring(3, 5), 10) / 60;
        if (e > lastEnd) lastEnd = e;
      } else if (sch.day_of_week === nextDay) {
        const s = parseInt(sch.start_time.substring(0, 2), 10) + parseInt(sch.start_time.substring(3, 5), 10) / 60;
        if (s < nextStart) nextStart = s;
      }
    }

    if (lastEnd > 0) {
      const gap = (sAttempt + 24) - lastEnd;
      if (gap < 10) return { valid: false, reason: `Rest Gap: ${gap.toFixed(1)}h (Prev)` };
    }
    if (nextStart < 30) {
      const gap = (nextStart + 24) - eAttempt;
      if (gap < 10) return { valid: false, reason: `Rest Gap: ${gap.toFixed(1)}h (Next)` };
    }
    return { valid: true };
  };

  const handleAutoSuggest = async () => {
    if (!formData.teaching_load_id) return setError('Please select a Teaching Load first.');
    setSmartSuggestions([]);
    setError('');
    setIsFetchingSuggestions(true);
    try {
      const res = await api.get('/schedules/suggest-slots', {
        params: {
          teaching_load_id: formData.teaching_load_id,
          term_id: activeTermId,
          preferred_room: formData.room || undefined
        }
      });
      const suggestions = res.data;
      if (suggestions.length === 0) {
        setError('No available slots found. All valid windows are occupied for this faculty/section combination.');
      } else {
        setSmartSuggestions(suggestions);
      }
    } catch (e) {
      setError('Smart Resolver failed. Please try adjusting the load or term.');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Guard: End time must come strictly after start time
    const [sh, sm] = formData.start_time.split(':').map(Number);
    const [eh, em] = formData.end_time.split(':').map(Number);
    const startDecimal = sh + sm / 60;
    const endDecimal = eh + em / 60;
    if (endDecimal <= startDecimal) {
      setError('End time must be after start time. Please correct the time range.');
      return;
    }
    // Note: Lunch break flexibility (1-hour gap anywhere 11:30 AM–2:30 PM) is enforced
    // by the backend ScheduleService.hasLunchGap — do not duplicate it here.

    // Ensure numeric teaching_load_id for consistency
    const submissionData = {
      ...formData,
      teaching_load_id: Number(formData.teaching_load_id)
    };

    if (isGhostMode) {
      stageUpdate(submissionData);
      setIsModalOpen(false);
      toast.success(`Staged: ${loads.find(l => l.id === submissionData.teaching_load_id)?.subject_code}`, { 
        icon: '👻',
        style: { background: '#1e293b', color: '#fff', border: '1px solid #7c3aed' }
      });
      return;
    }

    if (isEditingSchedule) updateMutation.mutate({ id: selectedScheduleId, ...submissionData });
    else createMutation.mutate(submissionData);
  };

  let displayedSchedules = (isGhostMode ? stagedSchedules : (schedules || []));
  
  if (selectedProgramId) displayedSchedules = displayedSchedules?.filter(s => s.program_id === Number(selectedProgramId));
  
  if (selectedFacultyId) {
    displayedSchedules = displayedSchedules?.filter(s => 
      s.faculty_id === Number(selectedFacultyId) || 
      s.co_faculty_id_1 === Number(selectedFacultyId) || 
      s.co_faculty_id_2 === Number(selectedFacultyId)
    );
  }
  else if (selectedSectionId) displayedSchedules = displayedSchedules?.filter(s => s.section_id === Number(selectedSectionId));
  else if (selectedRoomName) displayedSchedules = displayedSchedules?.filter(s => s.room === selectedRoomName);

  // Remove blocks pending deletion in Ghost Mode
  if (isGhostMode) {
    displayedSchedules = displayedSchedules?.filter(s => !s.isPendingDelete);
  }

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      let termName = terms.find(t => t.id === activeTermId)?.name || 'Current Term';
      // Systemic check to prevent double-printing the academic year if the Administrator already hard-coded it into the term name
      if (!termName.includes('A.Y.') && !termName.includes('202')) {
          termName = `${termName} A.Y. 2026-2027`;
      }
      
      const campusObj = campuses.find(c => c.id === Number(selectedCampusId));
      const campusName = campusObj ? campusObj.name : 'Main Campus';
      const institutionName = useScheduleStore.getState().systemSettings.institution_name || 'Institution';

      const formatYear = (y) => {
         if (!y) return '';
         const n = Number(y);
         if (n === 1) return '1st Year';
         if (n === 2) return '2nd Year';
         if (n === 3) return '3rd Year';
         if (n === 4) return '4th Year';
         if (n >= 11) return `Grade ${n}`;
         return `${n} Year`;
      };

      const title = selectedFacultyId 
        ? `Schedule for ${faculty.find(f => f.id === parseInt(selectedFacultyId))?.full_name}`
        : selectedSectionId
          ? (() => {
              const sec = sections.find(s => s.id === parseInt(selectedSectionId));
              return sec ? `Schedule for Cohort ${sec.program_code} ${formatYear(sec.year_level)} ${sec.name}` : 'Cohort Schedule';
            })()
          : selectedRoomName
            ? `Room Schedule: ${selectedRoomName}`
            : 'Institutional Master Schedule';

      // Use the pure vector jsPDF engine for professional portrait output, specifically injecting ONLY the active filters
      generateProfessionalPDF(displayedSchedules, title, termName, campusName, institutionName);
      
      toast.success('Professional PDF generated successfully!');
    } catch (err) {
      console.error("PDF Generation failed", err);
      toast.error("Failed to export PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleEventDrop = (info) => {
      setError('');
      const oldSch = info.event.extendedProps.raw;
      const newDayMap = { 1:'Monday', 2:'Tuesday', 3:'Wednesday', 4:'Thursday', 5:'Friday', 6:'Saturday' };
      const newDayOfWeek = newDayMap[info.event.start.getDay()];
      const padTime = d => d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':00';
      
      const updatedData = {
        ...oldSch,
        day_of_week: newDayOfWeek,
        start_time: padTime(info.event.start),
        end_time: padTime(info.event.end)
      };

      if (isGhostMode) {
        stageUpdate(updatedData);
        toast.success(`Staged move: ${oldSch.subject_code} to ${newDayOfWeek}`, { 
          icon: '👻',
          style: { background: '#1e293b', color: '#fff', border: '1px solid #7c3aed' }
        });
        return;
      }

      setConfirmConfig({
        title: 'Reschedule Class Block?',
        message: `Move ${oldSch.subject_code} to ${newDayOfWeek} starting at ${info.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}?`,
        type: 'indigo',
        onConfirm: () => {
          updateMutation.mutate(updatedData, {
             onError: (err) => { setError(err.response?.data?.error?.details || err.response?.data?.error?.message || err.message); info.revert(); }
          });
        },
        onCancel: () => info.revert()
      });
      setIsConfirmModalOpen(true);
  };

  const handleGhostCommit = async () => {
    setIsCommittingGhost(true);
    const diff = getDiff();
    try {
      const res = await api.post('/schedules/batch-sync', {
        term_id: activeTermId,
        updates: diff.updated,
        creates: diff.created,
        deletes: diff.deleted.map(s => s.id)
      });
      queryClient.invalidateQueries(['schedules']);
      discardDraft();
      toast.success(res.data.message || 'Draft synchronized successfully!');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ghost Sync failed. Check for concurrent conflicts.');
      toast.error('Sync failed. See error log.');
    } finally {
      setIsCommittingGhost(false);
    }
  };

  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  
  const getReferenceDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - today.getDay() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  };
  const weekDates = getReferenceDates();

  const ghostBlocks = React.useMemo(() => {
    if (!isModalOpen || !formData.teaching_load_id || !formData.room) return [];
    const load = loads.find(l => l.id === Number(formData.teaching_load_id));
    if (!load) return [];
    
    const durationHours = Number(load.required_hours) || 1;
    let blocks = [];
    
    for (const day of DAYS) {
      for (let timeCode = 7; timeCode <= 22 - durationHours; timeCode += 0.5) {
         const sAttempt = timeCode;
         const eAttempt = timeCode + durationHours;
         
         // Skip slots that span the entire 11 AM–2 PM window (impossible to have a 1-hr gap)
         if (sAttempt <= 11 && eAttempt >= 14) continue;
         
          const { collision } = checkSlotCollision(day, sAttempt, eAttempt, load, formData.room, isEditingSchedule ? selectedScheduleId : null);

          if (!collision) {
              const formatTime = (t) => {
                 const hh = Math.floor(t).toString().padStart(2, '0');
                 const mm = (t % 1 === 0.5) ? '30' : '00';
                 return `${hh}:${mm}:00`;
              };
              const dateStr = weekDates[dayMap[day]];
              blocks.push({
                id: `ghost-${day}-${timeCode}`,
                title: 'Valid Slot',
                start: `${dateStr}T${formatTime(sAttempt)}`,
                end: `${dateStr}T${formatTime(eAttempt)}`,
                display: 'background',
                backgroundColor: 'rgba(16, 185, 129, 0.4)' 
              });
          }
      }
    }
    return blocks;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, formData.teaching_load_id, formData.room, loads, schedules, blackouts, isEditingSchedule, selectedScheduleId]);

  const eventAllow = (dropInfo, draggedEvent) => {
    const sTime = dropInfo.start;
    const eTime = dropInfo.end;
    const newDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][sTime.getDay()];
    const raw = draggedEvent.extendedProps?.raw;
    if (!raw) return true;
    const parse = (d) => d.getHours() + (d.getMinutes() / 60);
    const sA = parse(sTime);
    const eA = parse(eTime);
    
    // Ghost Mode Predictive Feedback
    const { collision, reason } = checkSlotCollision(newDayOfWeek, sA, eA, raw, raw.room, raw.id);
    const wellness = verifyWellness(newDayOfWeek, sA, eA, raw, raw.id);
    
    setDragTarget({ 
      day: newDayOfWeek, 
      start: sA, 
      end: eA, 
      status: collision ? 'error' : (!wellness.valid ? 'warning' : 'success'),
      message: collision ? reason : (!wellness.valid ? wellness.reason : 'Optimal Slot'),
      isWellnessViolation: !wellness.valid
    });

    if (sA <= 11 && eA >= 14) return false;
    return !collision;
  };

  const fcEvents = [
    ...(displayedSchedules?.map(sch => {
       const colors = getProgramColor(sch.program_code);
       const dateStr = weekDates[dayMap[sch.day_of_week]];
       const isDraft = sch.isDraft;
       const isOrphan = validationErrors.some(e => e.id === sch.id);

       return {
         id: sch.id.toString(),
         title: sch.subject_code,
         start: `${dateStr}T${sch.start_time}`,
         end: `${dateStr}T${sch.end_time}`,
         backgroundColor: isOrphan ? 'rgba(239, 68, 68, 0.1)' : (isDraft ? 'rgba(124, 58, 237, 0.1)' : colors.bg),
         borderColor: isOrphan ? '#ef4444' : (isDraft ? '#a78bfa' : colors.border),
         textColor: isOrphan ? '#ef4444' : (isDraft ? '#a78bfa' : '#fff'),
         classNames: [
           ...(isDraft ? ['ghost-draft-event'] : []), 
           ...(sch.is_makeup ? ['makeup-event-block'] : []),
           ...(isOrphan ? ['spectral-orphan-warning', 'animate-pulse'] : [])
         ],
         extendedProps: { raw: sch, isOrphan }
       };
    }) || []),
    ...(blackouts && !selectedSectionId ? blackouts.filter(b => selectedFacultyId ? b.faculty_id === Number(selectedFacultyId) : true).map(b => {
       const bDateStr = weekDates[dayMap[b.day_of_week]];
       return {
         id: 'block-' + b.id, 
         title: b.reason, 
         start: `${bDateStr}T${b.start_time}`, 
         end: `${bDateStr}T${b.end_time}`, 
         display: 'background', 
         backgroundColor: '#9ca3af'
       };
    }) : []),
    ...ghostBlocks,
  ];

  const currentTerm = terms.find(t => t.id === activeTermId);
  const facultyName = faculty.find(f => f.id === parseInt(selectedFacultyId))?.full_name || '';
  const sectionName = sections.find(s => s.id === parseInt(selectedSectionId))?.name || '';
  const programCode = sections.find(s => s.id === parseInt(selectedSectionId))?.program_code || '';

  const uniqueSchedules = Array.from(new Set((selectedFacultyId || selectedSectionId || selectedRoomName || selectedProgramId ? displayedSchedules : []).map(e => e.teaching_load_id)))
    .map(loadId => displayedSchedules.find(e => e.teaching_load_id === loadId))
    .filter(Boolean);

  const renderEventContent = (eventInfo) => {
    if (eventInfo.event.display === 'background') return <div className="p-1 opacity-50 text-xs font-bold text-gray-700 dark:text-gray-300">{eventInfo.event.title}</div>;
    const sch = eventInfo.event.extendedProps.raw;
    if (!sch) return <div className="p-1 text-xs">{eventInfo.event.title}</div>;

    const shortenName = (name) => {
       if (!name) return '';
       const parts = name.trim().split(/\s+/);
       const lastName = parts[parts.length - 1];
       const initial = parts[0].charAt(0).toUpperCase();
       return `Prof. ${initial}. ${lastName}`;
    };

    const formatTimeLocal = (t) => {
       if (!t) return '--:--';
       const [h, m] = t.split(':');
       let hr = parseInt(h);
       const ampm = hr >= 12 ? 'PM' : 'AM';
       hr = hr % 12 || 12;
       return `${hr}:${m} ${ampm}`;
    };

    const profs = [sch.faculty_name, sch.co_faculty_1_name, sch.co_faculty_2_name].filter(Boolean).map(shortenName).join(' & ');

    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-0.5 text-center leading-[1.1] overflow-hidden group cursor-pointer relative">
        {!!sch.is_makeup && (
           <div className="absolute top-0 right-0 p-0.5 z-10">
              <div className="bg-white/90 dark:bg-slate-900/90 text-[7px] font-black text-brand-600 px-1 rounded shadow-sm flex items-center gap-0.5">
                 <Sparkles className="w-1.5 h-1.5" /> RECOVERY
              </div>
           </div>
        )}
        <div className="font-black text-[10px] sm:text-[11px] md:text-xs tracking-tight uppercase leading-none mb-0.5">{sch.subject_code}</div>
        <div className="font-medium text-[8px] sm:text-[9px] md:text-[10px] opacity-95 line-clamp-2 px-0.5 mb-1">{sch.subject_name}</div>
        <div className="flex flex-col gap-0.5 w-full mt-auto">
          <div className="text-[7px] sm:text-[8px] md:text-[9px] font-bold bg-white/20 rounded py-0.5 truncate uppercase">
            {sch.program_code}-{sch.year_level}{sch.section_name}
            {!!sch.is_makeup && sch.event_date && (
               <span className="ml-1 opacity-70">[{new Date(sch.event_date).toLocaleDateString([], {month:'short', day:'numeric'})}]</span>
            )}
          </div>
          <div className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold opacity-90 truncate italic">{profs}</div>
          <div className="text-[7px] sm:text-[8px] md:text-[9px] font-bold bg-black/10 rounded py-0.5 truncate">{sch.room}</div>
        </div>
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 z-20 pointer-events-none rounded">
           <span className="text-[8px] font-bold">{formatTimeLocal(sch.start_time)} - {formatTimeLocal(sch.end_time)}</span>
        </div>
      </div>
    );
  };

  const totalApprovedLoads = (loads || []).filter(l => l.status === 'approved').length;
  const uniqueScheduledLoads = new Set((schedules || []).map(s => s.teaching_load_id)).size;
  const completionPercentage = totalApprovedLoads > 0 ? Math.round((uniqueScheduledLoads / totalApprovedLoads) * 100) : 0;

  return (
    <div className="space-y-6 pb-10 print:p-0 print:space-y-0 print:block">
      {/* SCREEN HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Schedules <span className="text-sm font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full">{displayedSchedules.length} blocks</span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Master schedule organized by program hierarchy and institutional load.</p>
          
          <div className="flex items-center gap-4 mt-4 bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm w-full max-w-sm">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-gray-600 dark:text-slate-400 uppercase tracking-widest">Master KPI Mapping</span>
                <span className={completionPercentage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'}>{completionPercentage}% mapped</span>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${completionPercentage === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-brand-500'}`} style={{ width: `${completionPercentage}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Mobile Filter Toggle — Visible only on mobile/tablet */}
          <div className="lg:hidden w-full flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
             <select value={selectedCampusId} onChange={e => setSelectedCampusId(e.target.value)} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 outline-none">
               <option value="">Campus</option>
               {campuses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
             <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 outline-none">
               <option value="">Program</option>
               {programs?.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
             </select>
             <select value={selectedSectionId} onChange={e => { setSelectedSectionId(e.target.value); setSelectedFacultyId(''); setSelectedRoomName(''); }} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 outline-none">
               <option value="">Section</option>
               {sections?.filter(s => (selectedProgramId ? s.program_id === Number(selectedProgramId) : true) && (selectedCampusId ? s.campus_id === Number(selectedCampusId) : true))?.map(s => <option key={s.id} value={s.id}>{s.program_code}-{s.year_level}{s.name}</option>)}
             </select>
             <select value={selectedRoomName} onChange={e => { setSelectedRoomName(e.target.value); setSelectedFacultyId(''); setSelectedSectionId(''); }} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 outline-none">
               <option value="">Facility</option>
               {rooms?.filter(r => selectedCampusId ? r.campus_id === Number(selectedCampusId) : true)?.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
             </select>
          </div>

          <div className="hidden lg:flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Campus</label>
              <select value={selectedCampusId} onChange={e => { setSelectedCampusId(e.target.value); setSelectedProgramId(''); setSelectedSectionId(''); setSelectedFacultyId(''); setSelectedRoomName(''); }} className="bg-transparent border-none text-indigo-700 dark:text-indigo-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate">
                <option value="">All Campuses</option>
                {campuses.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Program</label>
              <select value={selectedProgramId} onChange={e => { setSelectedProgramId(e.target.value); setSelectedSectionId(''); setSelectedFacultyId(''); setSelectedRoomName(''); }} className="bg-transparent border-none text-brand-700 dark:text-brand-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate">
                <option value="">Master View</option>
                {programs.map(p => (<option key={p.id} value={p.id}>{p.code}</option>))}
              </select>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Instructor</label>
              <select value={selectedFacultyId} onChange={e => { setSelectedFacultyId(e.target.value); setSelectedSectionId(''); setSelectedRoomName(''); }} className="bg-transparent border-none text-brand-700 dark:text-brand-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate">
                <option value="">Master View</option>
                {faculty
                  .filter(f => (selectedProgramId ? f.program_id === Number(selectedProgramId) : true) && (selectedCampusId ? f.campus_id === Number(selectedCampusId) : true))
                  .map(f => (<option key={f.id} value={f.id}>{f.full_name}</option>))}
              </select>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Section</label>
              <select value={selectedSectionId} onChange={e => { setSelectedSectionId(e.target.value); setSelectedFacultyId(''); setSelectedRoomName(''); }} className="bg-transparent border-none text-emerald-700 dark:text-emerald-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate">
                <option value="">Master View</option>
                {sections
                  .filter(s => (selectedProgramId ? s.program_id === Number(selectedProgramId) : true) && (selectedCampusId ? s.campus_id === Number(selectedCampusId) : true))
                  .map(s => (<option key={s.id} value={s.id}>{s.program_code}-{s.year_level}{s.name}</option>))}
              </select>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Facility</label>
              <select value={selectedRoomName} onChange={e => { setSelectedRoomName(e.target.value); setSelectedFacultyId(''); setSelectedSectionId(''); }} className="bg-transparent border-none text-amber-700 dark:text-amber-400 font-bold text-sm focus:ring-0 outline-none w-32 truncate">
                <option value="">Master View</option>
                {rooms
                  .filter(r => selectedCampusId ? r.campus_id === Number(selectedCampusId) : true)
                  .map(r => (<option key={r.id} value={r.name}>{r.name}</option>))}
              </select>
            </div>
          </div>

          {/* Combined Operations Menu */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-slate-700 rounded-xl font-bold shadow-sm transition h-[42px] flex-1 sm:flex-none">
              {isGeneratingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={handlePrint} className="p-2 sm:px-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold shadow-sm transition h-[42px] hidden sm:flex items-center">
               <Printer className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex border-l border-gray-200 dark:border-slate-700 h-8 mx-1"></div>
            <button onClick={() => { 
                setConfirmConfig({ title: 'Reset Schedules?', message: 'This will permanently delete all class blocks for the current academic term. This action cannot be undone.', type: 'reset', onConfirm: () => resetMutation.mutate(activeTermId) });
                setIsConfirmModalOpen(true);
              }} disabled={resetMutation.isPending} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 rounded-xl font-bold shadow-sm hover:bg-red-100 transition h-[42px] flex-1 sm:flex-none">
                <RotateCcw className="w-4 h-4" /> <span className="hidden lg:inline">Reset</span>
            </button>
            <button onClick={() => { 
                setConfirmConfig({ title: 'Auto-Schedule?', message: 'Run the algorithm to securely map unassigned approved loads into available slots within institutional constraints.', type: 'indigo', onConfirm: () => autoScheduleMutation.mutate({ termId: activeTermId, campusId: selectedCampusId }) });
                setIsConfirmModalOpen(true);
              }} disabled={autoScheduleMutation.isPending} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition h-[42px] flex-1 sm:flex-none">
                <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Auto</span>
            </button>
            <button 
              onClick={() => toggleGhostMode(schedules)} 
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-bold shadow-lg transition h-[42px] flex-1 sm:flex-none border
                ${isGhostMode 
                  ? 'bg-brand-500/10 text-brand-500 border-brand-500/30' 
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
            >
              <Ghost className={`w-4 h-4 ${isGhostMode ? 'animate-pulse' : ''}`} /> 
              <span className="hidden sm:inline">{isGhostMode ? 'Ghost Layer Active' : 'Ghost Mode'}</span>
            </button>
            <button onClick={() => { setError(''); setIsEditingSchedule(false); setSelectedScheduleId(null); setFormData({ teaching_load_id: '', day_of_week: 'Monday', start_time: '08:00', end_time: '09:00', room: '' }); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition h-[42px] flex-1 sm:flex-none">
              <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">Book Slot</span>
            </button>
          </div>
        </div>
      </div>

      {/* COLOR LEGEND */}
      <div className="flex flex-wrap items-center gap-2 print:hidden overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mr-2">Color Key:</span>
          {[
            { code: 'BSTM', label: 'Tourism' },
            { code: 'BSAIS', label: 'Accounting' },
            { code: 'BSIS', label: 'Info Systems' },
            { code: 'BSE', label: 'Entrepreneurship' },
            { code: 'BSCRIM', label: 'Criminology' },
            { code: 'SHS', label: 'Senior High' },
            { code: 'OTHER', label: 'General / Other' }
          ].map(ci => {
             const color = getProgramColor(ci.code);
             return (
               <div key={ci.code} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm cursor-default hover:scale-105 transition-transform shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}></div>
                  <span className="text-[9px] font-bold text-gray-700 dark:text-slate-300 uppercase">{ci.label}</span>
               </div>
             );
          })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-3 shadow-sm print:hidden">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
      />

      <ConflictResolutionPanel 
        isOpen={isConflictPanelOpen}
        onClose={() => setIsConflictPanelOpen(false)}
        failures={schedulerFailures}
        termId={activeTermId}
        onResolveSuccessful={handleManualResolveSuccess}
      />

      <div ref={containerRef} className={`glass rounded-[2rem] shadow-xl border border-white/40 overflow-hidden print:shadow-none print:border-none print:bg-white print:rounded-none relative ${dragTarget ? `ghost-active ghost-status-${dragTarget.status}` : ''}`}>
        {isLoadingSchedules ? (
           <div className="flex justify-center items-center h-40"><RefreshCw className="animate-spin h-8 w-8 text-brand-600" /></div>
        ) : (displayedSchedules.length === 0 && (selectedFacultyId || selectedSectionId || selectedProgramId || selectedRoomName)) ? (
           <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-fade-in bg-white/50 dark:bg-slate-900/50">
             <div className="w-48 h-48 mb-6 relative">
               <div className="absolute inset-0 bg-brand-100 dark:bg-brand-900/20 rounded-full blur-3xl opacity-50"></div>
               <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-brand-500 dark:text-brand-400 opacity-80 relative z-10 drop-shadow-sm" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                 <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                 <line x1="16" y1="2" x2="16" y2="6"></line>
                 <line x1="8" y1="2" x2="8" y2="6"></line>
                 <line x1="3" y1="10" x2="21" y2="10"></line>
                 <path d="M9 16l2 2 4-4"></path>
               </svg>
             </div>
             <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Scheduled Blocks Found</h3>
             <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-8">The current filter selection has no assigned classes in the matrix. Broaden your search or start booking.</p>
             <button onClick={() => { setError(''); setIsEditingSchedule(false); setSelectedScheduleId(null); setFormData({ teaching_load_id: '', day_of_week: 'Monday', start_time: '08:00', end_time: '09:00', room: '' }); setIsModalOpen(true); }} className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition flex items-center gap-2 mx-auto"><PlusCircle className="w-5 h-5"/> Book Class</button>
           </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-4 print:p-0 transition-colors duration-200 relative">
             {/* FORMAL PRINT HEADER */}
             <div className="hidden print:flex flex-col items-center text-center mb-4 print-header-reduced text-gray-900">
               <h1 className="font-bold text-lg uppercase">CARD-MRI Development Institute, Inc. (CMDI)</h1>
               <p className="text-sm font-semibold uppercase">{currentTerm ? `${currentTerm.semester} / AY ${currentTerm.academic_year}` : 'Class Schedule'}</p>
               <h2 className="text-xl font-black mt-2 underline uppercase tracking-widest">OFFICIAL CLASS SCHEDULE</h2>
               <p className="text-lg font-bold mt-1 uppercase underline underline-offset-4">
                  {selectedFacultyId ? facultyName : selectedSectionId ? `${programCode}-${sectionName}` : 'MASTER SCHEDULE'}
               </p>
             </div>

             <style>{`
               .fc-theme-standard td, .fc-theme-standard th { border-color: #e5e7eb !important; }
               .fc-timegrid-slot-label-cushion { font-size: 10px; font-weight: 700; color: #374151; }
               .fc-col-header-cell-cushion { font-size: 11px; font-weight: 800; color: #111827; padding: 10px 0; text-transform: uppercase; }
               .fc-event-main { padding: 0 !important; }
               .fc-event { border: 1px solid rgba(0,0,0,0.05) !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

                /* GHOST DRAFT STYLING */
                .ghost-draft-event {
                  border: 2px dashed #a78bfa !important;
                  box-shadow: 0 0 15px rgba(139, 92, 246, 0.2) !important;
                  background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(167, 139, 250, 0.05) 5px, rgba(167, 139, 250, 0.05) 10px);
                }
                /* ROW EXPANSION: Expand downward for more space */
                .fc-timegrid-slot { height: 3.5rem !important; }
                .fc-timegrid-slot-label { vertical-align: top !important; padding-top: 4px !important; }
                
                /* Dark Mode FullCalendar Modifications */
                .dark .fc-theme-standard td, .dark .fc-theme-standard th { border-color: #334155 !important; }
                .dark .fc-timegrid-slot-label-cushion { color: #cbd5e1 !important; }
                .dark .fc-col-header-cell-cushion { color: #f8fafc !important; }
                .dark .fc-event { border: 1px solid rgba(255,255,255,0.05) !important; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                .dark .fc-timegrid-col.fc-day-today { background-color: rgba(255,255,255,0.02) !important; }
               
                @media print {
                  @page { size: legal portrait; margin: 0.25in; }
                  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  .fc-event { border: 1px solid rgba(0,0,0,0.1) !important; }
                  
                  /* Maximizing Row Space for Legal Paper (14 inches height) */
                  .fc-timegrid-slot { height: 4.8rem !important; }
                  .print-header-reduced { margin-bottom: 1rem !important; }
                  
                  /* Ensure the calendar doesn't break across pages if possible */
                  .fc-timegrid { page-break-inside: avoid; }
                }

                 .fc-event { border: 1px solid rgba(0,0,0,0.1) !important; }

                 /* DYNAMIC GHOST AURA */
                 .ghost-status-success .fc-event-mirror { background-color: rgba(16, 185, 129, 0.4) !important; border-color: #10b981 !important; box-shadow: 0 0 25px rgba(16, 185, 129, 0.4) !important; filter: brightness(1.1); }
                 .ghost-status-warning .fc-event-mirror { background-color: rgba(245, 158, 11, 0.4) !important; border-color: #f59e0b !important; box-shadow: 0 0 25px rgba(245, 158, 11, 0.4) !important; filter: brightness(1.1); }
                 .ghost-status-error   .fc-event-mirror { background-color: rgba(244, 63, 94, 0.4) !important; border-color: #f43f5e !important; box-shadow: 0 0 25px rgba(244, 63, 94, 0.4) !important; filter: brightness(1.1); }
             `}</style>

             <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={false}
                firstDay={1}
                hiddenDays={[0]}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                slotEventOverlap={false}
                eventOverlap={false}
                dayHeaderFormat={{ weekday: 'long' }}
                slotLabelFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                events={fcEvents}
                eventContent={renderEventContent}
                editable={true}
                eventAllow={eventAllow}
                eventDrop={handleEventDrop}
                eventClick={(info) => {
                   if (info.event.display !== 'background') {
                      const raw = info.event.extendedProps.raw;
                      const rect = info.el.getBoundingClientRect();
                      const rootRect = containerRef.current.getBoundingClientRect();
                      
                      const top = rect.top - rootRect.top;
                      const left = rect.left - rootRect.left;
                      const width = rect.width;
                      
                      let popLeft = left + width + 10;
                      if (popLeft + 280 > rootRect.width) popLeft = left - 290;
                      if (popLeft < 10) popLeft = 10;

                      setPopoverState({
                         isOpen: true,
                         data: raw,
                         position: { top: Math.max(0, top), left: popLeft }
                      });
                   }
                }}
                height="auto"
                slotDuration="00:30:00"
                eventDragStart={() => setError('')}
                eventDragStop={() => setTimeout(() => setDragTarget(null), 100)}
             />

             {/* GHOST MODE PREDICTIVE TOOLTIP */}
             <AnimatePresence>
                {dragTarget && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-3xl shadow-2xl border flex items-center gap-4 backdrop-blur-md pointer-events-none ${
                      dragTarget.status === 'error' ? 'bg-rose-600/90 border-rose-400 text-white' :
                      dragTarget.status === 'warning' ? 'bg-amber-500/90 border-amber-300 text-white' :
                      'bg-emerald-600/90 border-emerald-400 text-white'
                    }`}
                  >
                    <div className="p-2 bg-white/20 rounded-xl">
                      {dragTarget.status === 'error' ? <ShieldAlert className="w-5 h-5" /> : 
                       dragTarget.status === 'warning' ? <AlertTriangle className="w-5 h-5" /> : 
                       <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Ghost Intelligence</p>
                      <p className="text-sm font-black tracking-tight">{dragTarget.message}</p>
                    </div>
                  </motion.div>
                )}
             </AnimatePresence>

             {/* FLOATING ACTION POPOVER */}
             {popoverState.isOpen && popoverState.data && (
                <div 
                  className="absolute z-50 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-slate-700 overflow-hidden transform transition-all animate-fade-in print:hidden"
                  style={{ top: popoverState.position.top, left: popoverState.position.left }}
                >
                  <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                     <span className="font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Block Details</span>
                     <button onClick={() => setPopoverState({ isOpen: false, data: null, position: { top:0, left:0 } })} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 space-y-3">
                     <div>
                       <div className="font-black text-xl text-brand-700 dark:text-brand-400 leading-tight block mb-1">{popoverState.data.subject_code}</div>
                       <div className="text-sm font-semibold text-gray-700 dark:text-slate-300 line-clamp-2">{popoverState.data.subject_name}</div>
                     </div>
                     <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                           <span className="block text-gray-500 mb-0.5">Time</span>
                           <span className="font-bold text-gray-900 dark:text-white block truncate">{popoverState.data.start_time.slice(0,5)} - {popoverState.data.end_time.slice(0,5)}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                           <span className="block text-gray-500 mb-0.5">Facility</span>
                           <span className="font-bold text-gray-900 dark:text-white block line-clamp-1">{popoverState.data.room}</span>
                        </div>
                     </div>
                     <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-2 rounded-lg border border-emerald-100 dark:border-slate-700 text-center uppercase tracking-widest truncate">
                        {popoverState.data.program_code}-{popoverState.data.year_level}{popoverState.data.section_name}
                     </div>
                     <hr className="border-gray-100 dark:border-slate-700" />
                     <div className="flex gap-2">
                        <button onClick={() => {
                           const raw = popoverState.data;
                           setError('');
                           setFormData({ teaching_load_id: raw.teaching_load_id, day_of_week: raw.day_of_week, start_time: raw.start_time.slice(0,5), end_time: raw.end_time.slice(0,5), room: raw.room });
                           setSelectedScheduleId(raw.id);
                           setIsEditingSchedule(true);
                           setPopoverState({ isOpen: false, data: null, position: { top:0, left:0 } });
                           setIsModalOpen(true);
                        }} className="flex-1 py-2 text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-800 transition-colors">Edit Block</button>
                        <button onClick={() => {
                           const raw = popoverState.data;
                           setConfirmConfig({ title: 'Delete this Block?', message: 'Are you sure you want to completely clear this scheduled block? The load will return to unassigned.', type: 'danger', onConfirm: () => { deleteMutation.mutate(raw.id); setPopoverState({ isOpen: false, data: null, position: { top:0, left:0 } }); } });
                           setIsConfirmModalOpen(true);
                        }} className="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">Release</button>
                     </div>
                  </div>
                </div>
             )}

             {/* PRINT SUMMARY TABLE */}
             {(selectedFacultyId || selectedSectionId || selectedRoomName) && uniqueSchedules.length > 0 && (
               <div className="hidden print:block mt-8 border-t-2 border-gray-900 pt-4">
                 <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase">Abstract of Loaded Subjects</h3>
                 <table className="min-w-full bg-white border border-gray-900 text-[10px]">
                   <thead>
                     <tr className="bg-gray-100">
                       <th className="py-1 px-2 border border-gray-900 text-left font-bold">Code</th>
                       <th className="py-1 px-2 border border-gray-900 text-left font-bold">Subject Description</th>
                       <th className="py-1 px-2 border border-gray-900 text-left font-bold">Target Cohort</th>
                       <th className="py-1 px-2 border border-gray-900 text-left font-bold">Assigned Instructor</th>
                     </tr>
                   </thead>
                   <tbody>
                     {uniqueSchedules.map((sch, index) => (
                       <tr key={index}>
                         <td className="py-1 px-2 border border-gray-900 font-bold">{sch.subject_code}</td>
                         <td className="py-1 px-2 border border-gray-900">{sch.subject_name}</td>
                         <td className="py-1 px-2 border border-gray-900">{sch.program_code}-{sch.year_level}{sch.section_name}</td>
                         <td className="py-1 px-2 border border-gray-900">
                           {[sch.faculty_name, sch.co_faculty_1_name, sch.co_faculty_2_name].filter(Boolean).join(' & ')}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" /> {isEditingSchedule ? 'Update Class' : 'New Booking'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Teaching Load</label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700" 
                  value={formData.teaching_load_id} 
                  onChange={e => setFormData({...formData, teaching_load_id: e.target.value})} 
                  required
                >
                  <option value="">-- Select Load --</option>
                  {Object.entries(
                    loads
                      .filter(l => l.status === 'approved')
                      .reduce((acc, l) => {
                        const prog = l.program_name || 'General';
                        if (!acc[prog]) acc[prog] = [];
                        acc[prog].push(l);
                        return acc;
                      }, {})
                  ).sort(([a], [b]) => a.localeCompare(b)).map(([program, programLoads]) => (
                    <optgroup key={program} label={program}>
                      {programLoads.map(l => {
                        const alreadyBooked = schedules.some(s => s.teaching_load_id === l.id && (!isEditingSchedule || s.id !== selectedScheduleId));
                        return (
                          <option key={l.id} value={l.id}>
                            {alreadyBooked ? '✓ ' : ''}{[l.faculty_name, l.co_faculty_1_name, l.co_faculty_2_name].filter(Boolean).join(' & ')} — {l.subject_code} {l.subject_name} ({l.program_code}-{l.year_level}{l.section_name})
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Day</label>
                  <select className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700" value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Facility</label>
                  <select className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700 font-bold" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} required>
                    <option value="">-- Select Room --</option>
                    {(() => {
                      const activeLoad = loads.find(l => l.id === Number(formData.teaching_load_id));
                      const sectionDeptId = activeLoad?.program_department_id;

                      return Object.entries(
                        rooms.reduce((acc, r) => {
                          const campusName = campuses.find(c => c.id === r.campus_id)?.name || 'Unknown Campus';
                          if (!acc[campusName]) acc[campusName] = [];
                          acc[campusName].push(r);
                          return acc;
                        }, {})
                      ).sort(([a], [b]) => a.localeCompare(b)).map(([campusName, campusRooms]) => (
                        <optgroup key={campusName} label={campusName}>
                          {campusRooms.map(r => {
                            const isHomeRoom = sectionDeptId && Number(r.department_id) === Number(sectionDeptId);
                            return (
                              <option key={r.id} value={r.name} className={isHomeRoom ? 'font-black text-brand-600' : ''}>
                                {isHomeRoom ? '★ ' : ''}{r.name} ({r.type}) {isHomeRoom ? '[Home Room]' : r.department_code ? `[${r.department_code}]` : ''} — Cap: {r.capacity || '?'}
                              </option>
                            );
                          })}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
              </div>
              {/* ── Context-Aware Optimization Indicator (Phase 3) ──────────── */}
              {(() => {
                const load = loads.find(l => l.id === Number(formData.teaching_load_id));
                const room = rooms.find(r => r.name === formData.room);
                if (!load || !room) return null;

                const section = sections.find(s => s.id === load.section_id);
                const enrollment = section?.student_count || 0;
                const capacity = room.capacity || 0;
                const ratio = capacity > 0 ? enrollment / capacity : 0;
                
                const isOver = ratio > 1;
                const isTight = ratio > 0.9 && ratio <= 1;
                const isHomeRoom = Number(load.program_department_id) === Number(room.department_id);
                const isForeignRoom = room.department_id && !isHomeRoom;

                return (
                  <div className="space-y-2">
                     <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold ${
                       isOver ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                       : isTight ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' 
                       : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                     }`}>
                        <span>{isOver ? '🔴 Overflowed' : isTight ? '🟡 Tight Fit' : '🟢 Fits'} — {enrollment} / {capacity} seats</span>
                        <div className="h-2 w-24 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : isTight ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                        </div>
                     </div>
                     
                     {isHomeRoom && (
                       <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-200 text-brand-700 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-400 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                         <Sparkles className="w-3 h-3" /> Home Room Advantage: Optimized Assignment
                       </div>
                     )}
                     
                     {isForeignRoom && (
                       <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                         <ShieldAlert className="w-3 h-3 text-amber-500" /> Cross-Departmental Venue: Consult {room.department_code} Dean
                       </div>
                     )}
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Start</label>
                  <input type="time" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">End</label>
                  <input type="time" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} required />
                </div>
              </div>
              <button type="button" onClick={handleAutoSuggest} disabled={isFetchingSuggestions} className="w-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-60">
                {isFetchingSuggestions ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning Slots...</> : <><Sparkles className="w-4 h-4" /> Smart Find Slot</>}
              </button>
              {/* Smart Suggestions Panel */}
              {smartSuggestions.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">✨ {smartSuggestions.length} Valid Slots Found — Click to Apply</p>
                  {smartSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, day_of_week: s.day_of_week, start_time: s.start_time.slice(0,5), end_time: s.end_time.slice(0,5), room: s.room });
                        setSmartSuggestions([]);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-700 rounded-lg text-xs font-bold text-indigo-800 dark:text-indigo-300 transition-colors text-left"
                    >
                      <span>{s.day_of_week}, {s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</span>
                      <span className="text-[10px] font-black text-slate-400 truncate ml-2">{s.room}</span>
                    </button>
                  ))}
                </div>
              )}
              {conflictCheck?.conflict && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border-2 border-red-500 animate-pulse">
                  <p className="font-bold">{conflictCheck.message}</p>
                </div>
              )}
              {!conflictCheck?.conflict && conflictCheck?.warning && (
                <div className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 p-3 rounded-xl text-xs border border-amber-200 dark:border-amber-700 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                  <p>{conflictCheck.warning}</p>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700/50 flex justify-between gap-3">
                {isEditingSchedule && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      if (isGhostMode) {
                        stageDelete(selectedScheduleId);
                        setIsModalOpen(false);
                        toast.success(`Staged removal`, { 
                          icon: '👻',
                          style: { background: '#1e293b', color: '#fff', border: '1px solid #ef4444' }
                        });
                        return;
                      }
                      setConfirmConfig({
                        title: 'Delete this Block?',
                        message: 'Are you sure you want to remove this specific class assignment? This teaching load will return to the unassigned pool.',
                        type: 'danger',
                        onConfirm: () => {
                          deleteMutation.mutate(selectedScheduleId);
                          setIsModalOpen(false);
                        }
                      });
                      setIsConfirmModalOpen(true);
                    }} 
                    className="text-red-500 font-bold px-4 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                )}
                <div className="flex-1 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending || (conflictCheck?.conflict && !isCheckingConflict) || isCheckingConflict}
                    className="inline-flex items-center gap-2 px-8 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isCheckingConflict ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Validating...</>
                    ) : (createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (isEditingSchedule ? 'Update Schedule' : 'Confirm Booking')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* GHOST MODE COMMAND CENTER */}
      <GhostCommitBar onCommit={handleGhostCommit} isCommitting={isCommittingGhost} />
    </div>
  );
}
