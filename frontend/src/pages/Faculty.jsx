import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import { Plus, Edit2, Archive, Search, X, Clock, RefreshCw, Users, Activity, BarChart2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UnavailabilityModal from '../components/UnavailabilityModal';
import ConfirmModal from '../components/ConfirmModal';
import BulkActions from '../components/BulkActions';

export default function Faculty() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHead = user?.role === 'program_head' || isAdmin;

  const [search, setSearch] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('');
  const [groupingMode, setGroupingMode] = useState('program'); // 'program' | 'department'
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [managingAvailabilityFor, setManagingAvailabilityFor] = useState(null);
  const [modalError, setModalError] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });
  
  const [formData, setFormData] = useState({
    full_name: '', program_id: 1, campus_id: '', specializations: [], max_teaching_hours: 24, employment_type: 'Regular', department_id: ''
  });

  const queryClient = useQueryClient();
  const { activeTermId } = useScheduleStore();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data
  });

  const { data: programs = [] } = useQuery({ 
    queryKey: ['programs'], 
    queryFn: async () => (await api.get('/programs')).data 
  });
  
  const { data: campuses = [] } = useQuery({
    queryKey: ['campuses'],
    queryFn: async () => (await api.get('/campuses')).data
  });

  const { data: faculty = [], isLoading } = useQuery({
    queryKey: ['faculty', showArchived, activeTermId, selectedCampus],
    queryFn: async () => {
      let url = `/faculty?archived=${showArchived}`;
      if (activeTermId) url += `&term_id=${activeTermId}`;
      if (selectedCampus) url += `&campus_id=${selectedCampus}`;
      const res = await api.get(url);
      return res.data;
    }
  });

  const { data: subjects = [] } = useQuery({ 
    queryKey: ['subjects'], 
    queryFn: async () => (await api.get('/subjects')).data 
  });

  // ── Stats Calculation ────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const total = faculty.length;
    const overloaded = faculty.filter(f => Number(f.current_load) > Number(f.max_teaching_hours)).length;
    const totalLoad = faculty.reduce((acc, f) => acc + (Number(f.current_load) || 0), 0);
    const totalCapacity = faculty.reduce((acc, f) => acc + (Number(f.max_teaching_hours) || 0), 0);
    const utilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;
    
    return { total, overloaded, utilization };
  }, [faculty]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (newFaculty) => api.post('/faculty', newFaculty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      closeModal();
    },
    onError: (err) => setModalError(err.response?.data?.error?.message || err.message || 'Failed to add faculty.')
  });

  const updateMutation = useMutation({
    mutationFn: (updated) => api.put(`/faculty/${currentId}`, updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      closeModal();
    },
    onError: (err) => setModalError(err.response?.data?.error?.message || err.message || 'Failed to update faculty.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/faculty/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] })
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/faculty/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] })
  });

  const purgeMutation = useMutation({
    mutationFn: (id) => api.delete(`/faculty/${id}/permanent`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] })
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setFormData({ full_name: '', program_id: 1, campus_id: '', specializations: [], max_teaching_hours: 24, employment_type: 'Regular', department_id: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (fac) => {
    setFormData({ 
      full_name: fac.full_name, 
      program_id: fac.program_id || 1, 
      campus_id: fac.campus_id || '',
      specializations: fac.specializations_array || [], 
      max_teaching_hours: fac.max_teaching_hours,
      employment_type: fac.employment_type || 'Regular',
      department_id: fac.department_id || ''
    });
    setCurrentId(fac.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentId(null);
    setModalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, department_id: formData.department_id || null };
    if (isEditing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const EMPLOYMENT_DEFAULTS = { 'Regular': 24, 'Probationary': 24, 'Contractual': 24, 'Part-time': 15 };
  const EMPLOYMENT_COLORS = {
    'Regular': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Probationary': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    'Contractual': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'Part-time': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };

  // ── Logic ────────────────────────────────────────────────────────────────
  const filteredFaculty = faculty.filter(f => {
    const term = search.toLowerCase();
    const matchesSearch = f.full_name.toLowerCase().includes(term) || 
      (f.program_code && f.program_code.toLowerCase().includes(term)) ||
      (f.department_name && f.department_name.toLowerCase().includes(term));
    
    const matchesEmployment = !selectedEmploymentType || f.employment_type === selectedEmploymentType;
    return matchesSearch && matchesEmployment;
  });

  const groupedFaculty = React.useMemo(() => {
    return filteredFaculty.reduce((acc, fac) => {
      let key = 'General / Unassigned';
      if (groupingMode === 'program') {
        key = !fac.program_code ? 'General / Unassigned Faculty' : `${fac.program_code} - ${fac.program_name}`;
      } else {
        key = fac.department_name || 'No Department Assigned';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(fac);
      return acc;
    }, {});
  }, [filteredFaculty, groupingMode]);

  const sortedGroupKeys = Object.keys(groupedFaculty).sort((a, b) => {
    if (a.startsWith('General') || a.startsWith('No Dept')) return 1;
    if (b.startsWith('General') || b.startsWith('No Dept')) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 pb-14 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-600" /> Personnel Audit
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Institutional Faculty Roster with collegiate mapping.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`px-4 py-2.5 rounded-xl font-bold border transition-all ${showArchived ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-inner' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-gray-50'}`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
          {isHead && (
            <div className="flex items-center gap-3">
              <BulkActions 
                entity="faculty"
                columns={['full_name', 'program_code', 'campus_name', 'employment_type', 'max_teaching_hours', 'department_code']}
              />
              <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5" /> Add Instructor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      {!showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-[2rem] p-6 border border-white/40 dark:border-slate-700/50 flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Total Active</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{stats.total} Staff</h4>
            </div>
          </div>
          <div className="glass rounded-[2rem] p-6 border border-white/40 dark:border-slate-700/50 flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.overloaded > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
              <Activity className={`w-6 h-6 ${stats.overloaded > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Load Warnings</p>
              <h4 className={`text-2xl font-bold leading-tight ${stats.overloaded > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {stats.overloaded} Overloaded
              </h4>
            </div>
          </div>
          <div className="glass rounded-[2rem] p-6 border border-white/40 dark:border-slate-700/50 flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Efficiency</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{stats.utilization}% Utilization</h4>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Bar */}
      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 p-6 bg-white/50 dark:bg-slate-900/50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 flex-1 sm:flex-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Campus:</span>
            <select 
              value={selectedCampus} 
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 dark:text-white outline-none w-full sm:min-w-[120px]"
            >
              <option value="">All Campuses</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 flex-1 sm:flex-none">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Contract:</span>
            <select 
              value={selectedEmploymentType} 
              onChange={(e) => setSelectedEmploymentType(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 dark:text-white outline-none w-full sm:min-w-[120px]"
            >
              <option value="">All Types</option>
              {Object.keys(EMPLOYMENT_DEFAULTS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
             <button 
              onClick={() => setGroupingMode('program')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold rounded-xl transition-all ${groupingMode === 'program' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm border border-gray-100 dark:border-slate-600' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500'}`}
             >By Program</button>
             <button 
              onClick={() => setGroupingMode('department')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-bold rounded-xl transition-all ${groupingMode === 'department' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm border border-gray-100 dark:border-slate-600' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500'}`}
             >By Dept</button>
          </div>
        </div>
        <div className="relative w-full lg:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, program or dept..."
            className="block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm font-medium shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 glass rounded-[2rem] gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-200 border-t-brand-600" />
            <p className="text-sm font-bold text-gray-400 animate-pulse uppercase tracking-[0.2em]">Synchronizing Roster...</p>
          </div>
        ) : sortedGroupKeys.length === 0 ? (
          <div className="glass rounded-[2rem] p-16 text-center shadow-inner border-dashed border-2 border-gray-200 dark:border-slate-700">
            <Users className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-500 dark:text-slate-500">No matching faculty found.</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          sortedGroupKeys.map(groupKey => {
            const list = groupedFaculty[groupKey];
            return (
              <div key={groupKey} className="group/section">
                <div className="flex items-center gap-4 mb-4 pl-2">
                  <h2 className={`text-xl font-bold tracking-tight ${groupKey.startsWith('General') || groupKey.startsWith('No Dept') ? 'text-indigo-800 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                    {groupKey}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-slate-700 to-transparent" />
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold px-3 py-1 rounded-full text-xs border border-gray-200 dark:border-slate-700">
                    {list.length} Staff
                  </span>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {list.map((f) => {
                    const currentLoad = Number(f.current_load) || 0;
                    const maxLoad = Number(f.max_teaching_hours) || 24;
                    const loadPct = Math.min((currentLoad / maxLoad) * 100, 100);
                    const isOver = currentLoad > maxLoad;
                    const isNear = !isOver && currentLoad >= maxLoad - 4;

                    return (
                      <div key={f.id} className="glass rounded-3xl p-5 border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 transition-all hover:shadow-xl hover:shadow-brand-500/5 group/card relative overflow-hidden">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${EMPLOYMENT_COLORS[f.employment_type] || EMPLOYMENT_COLORS['Regular']}`}>
                              {f.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug">{f.full_name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg uppercase tracking-wider border ${EMPLOYMENT_COLORS[f.employment_type] || EMPLOYMENT_COLORS['Regular']}`}>
                                  {f.employment_type}
                                </span>
                                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" /> {f.campus_name || 'Main Campus'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            {isHead && (
                              <>
                                <button onClick={() => setManagingAvailabilityFor(f)} className="p-2.5 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/40 transition-colors" title="Availability"><Clock className="w-5 h-5"/></button>
                                
                                {!showArchived ? (
                                  <>
                                    <button onClick={() => openEditModal(f)} className="p-2.5 rounded-xl text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 transition-colors" title="Edit Profile"><Edit2 className="w-5 h-5"/></button>
                                    <button onClick={() => {
                                      setConfirmConfig({
                                        title: 'Archive Record',
                                        message: `Remove ${f.full_name} from active roster?`,
                                        type: 'danger',
                                        onConfirm: () => deleteMutation.mutate(f.id)
                                      });
                                      setIsConfirmModalOpen(true);
                                    }} className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 transition-colors" title="Archive"><Archive className="w-5 h-5"/></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => {
                                      setConfirmConfig({
                                        title: 'Restore Faculty',
                                        message: `Bring ${f.full_name} back to the active roster?`,
                                        type: 'brand',
                                        onConfirm: () => restoreMutation.mutate(f.id)
                                      });
                                      setIsConfirmModalOpen(true);
                                    }} className="p-2.5 rounded-xl text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors" title="Restore"><RefreshCw className="w-5 h-5"/></button>
                                    
                                    {isAdmin && (
                                       <button onClick={() => {
                                        setConfirmConfig({
                                          title: 'Delete Permanently',
                                          message: `This will erase ${f.full_name} and all their historical data from the system. This cannot be undone.`,
                                          type: 'danger',
                                          onConfirm: () => {
                                            purgeMutation.mutate(f.id); 
                                          }
                                        });
                                        setIsConfirmModalOpen(true);
                                      }} className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 transition-colors" title="Delete Permanently"><Trash2 className="w-5 h-5"/></button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                          <div className="flex justify-between items-end">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Workload Capacity</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className={`text-xl font-black ${isOver ? 'text-red-600 animate-pulse' : 'text-gray-900 dark:text-white'}`}>{currentLoad}</span>
                                <span className="text-sm font-bold text-gray-400">/ {maxLoad} Units</span>
                              </div>
                            </div>
                            {isOver && <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg uppercase tracking-widest border border-red-100 dark:border-red-800">Capacity Exceeded</span>}
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-brand-500'}`}
                              style={{ width: `${loadPct}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-700/50 mt-1">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Collegiate Entity</span>
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                                {f.department_name || 'Generic Administrative'}
                              </span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Base Program</span>
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{f.program_code || 'Gen-Ed'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transform border border-white/20 dark:border-slate-800">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/30 dark:bg-slate-800/30">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{isEditing ? 'Modify Personnel' : 'Add Instructor'}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Institutional Audit Record</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-gray-400 hover:text-gray-900 hover:shadow-md transition-all border border-gray-100 dark:border-slate-700"><X className="w-6 h-6" /></button>
            </div>
            <div className="overflow-y-auto p-8 flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                {modalError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900 flex items-center gap-3">
                    <X className="w-4 h-4" /> {modalError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-1">Full Identity</label>
                    <input required type="text" className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="e.g. Dr. Jane Pearson" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-1">Assign to College / Department</label>
                    <select 
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold"
                      value={formData.department_id}
                      onChange={e => setFormData({...formData, department_id: e.target.value})}
                    >
                      <option value="">-- Generic Institutional --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Base Program</label>
                      <select required className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-xs font-bold transition-all h-[52px]" value={formData.program_id} onChange={e => setFormData({...formData, program_id: Number(e.target.value)})}>
                        <option value="1">General Education</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Contract Nature</label>
                      <select required className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-xs font-bold transition-all h-[52px]" value={formData.employment_type} onChange={e => {
                        const type = e.target.value;
                        setFormData({ ...formData, employment_type: type, max_teaching_hours: EMPLOYMENT_DEFAULTS[type] || formData.max_teaching_hours });
                      }}>
                        <option value="Regular">Regular (Full-time)</option>
                        <option value="Probationary">Probationary</option>
                        <option value="Contractual">Contractual</option>
                        <option value="Part-time">Part-time (Adjunct)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-1">Target Campus</label>
                    <select required className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 bg-gray-50 dark:bg-slate-800 text-xs font-bold transition-all" value={formData.campus_id} onChange={e => setFormData({...formData, campus_id: e.target.value})}>
                      <option value="">Choose Operational Location</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="p-5 bg-brand-50/30 dark:bg-brand-900/10 rounded-3xl border border-brand-100/50 dark:border-brand-900/30">
                    <label className="block text-[11px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-widest mb-3">Load Capacity (Weekly Units)</label>
                    <input required type="number" min="1" className="w-full border border-brand-200 dark:border-brand-900/50 rounded-2xl px-5 py-3 bg-white dark:bg-slate-900 font-black text-lg text-brand-600 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all" value={formData.max_teaching_hours} onChange={e => setFormData({...formData, max_teaching_hours: parseInt(e.target.value)})} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 border-t border-gray-100 dark:border-slate-800 pt-5 pr-2 flex justify-between items-center">
                      Authorized Subjects
                      <span className="text-[10px] text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full">{formData.specializations.length} Selected</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-4 border border-gray-100 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 custom-scrollbar shadow-inner">
                      {subjects.map(s => (
                        <label key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-brand-300 transition-all cursor-pointer shadow-sm group">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-brand-600 border-gray-300 dark:border-slate-600 rounded focus:ring-brand-500 bg-white dark:bg-slate-900"
                            checked={formData.specializations.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) setFormData({ ...formData, specializations: [...formData.specializations, s.id] });
                              else setFormData({ ...formData, specializations: formData.specializations.filter(id => id !== s.id) });
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white text-[11px]">{s.subject_code}</span>
                            <span className="text-[10px] text-gray-500 dark:text-slate-500 line-clamp-1">{s.subject_name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 px-6 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] py-4 px-8 bg-brand-600 text-white rounded-2xl font-black shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isEditing ? 'Sync Changes' : 'Initialize Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Utilities */}
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
      />

      {managingAvailabilityFor && (
        <UnavailabilityModal 
          faculty={managingAvailabilityFor} 
          onClose={() => setManagingAvailabilityFor(null)} 
        />
      )}
    </div>
  );
}
