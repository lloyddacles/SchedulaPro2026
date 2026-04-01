import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Plus, Edit2, Archive, Search, X, RefreshCw, BarChart2, BookOpen, Layers, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useScheduleStore from '../store/useScheduleStore';
import ConfirmModal from '../components/ConfirmModal';

export default function Subjects() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHead = user?.role === 'program_head' || isAdmin;
  const { activeTermId } = useScheduleStore();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [hideOrphaned, setHideOrphaned] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [apiError, setApiError] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    subject_code: '', subject_name: '', units: 3, required_hours: 3, program_id: 1, year_level: '', room_type: 'Any'
  });

  const queryClient = useQueryClient();

  // Queries
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: async () => (await api.get('/programs')).data });
  const { data: subjects = [], isLoading } = useQuery({ 
    queryKey: ['subjects', showArchived, activeTermId], 
    queryFn: async () => {
      let url = `/subjects?archived=${showArchived}`;
      if (activeTermId) url += `&term_id=${activeTermId}`;
      return (await api.get(url)).data;
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newSubject) => api.post('/subjects', {
      ...newSubject, 
      program_id: newSubject.program_id ? Number(newSubject.program_id) : 1,
      year_level: newSubject.year_level ? Number(newSubject.year_level) : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      closeModal();
    },
    onError: (err) => setApiError(err.response?.data?.message || 'Error saving subject')
  });

  const updateMutation = useMutation({
    mutationFn: (updated) => api.put(`/subjects/${currentId}`, {
      ...updated, 
      program_id: updated.program_id ? Number(updated.program_id) : 1,
      year_level: updated.year_level ? Number(updated.year_level) : null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      closeModal();
    },
    onError: (err) => setApiError(err.response?.data?.message || 'Error updating subject')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/subjects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] })
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/subjects/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] })
  });

  // Handlers
  const openAddModal = () => {
    setFormData({ subject_code: '', subject_name: '', units: 3, required_hours: 3, program_id: 1, year_level: '', room_type: 'Any' });
    setIsEditing(false);
    setApiError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub) => {
    setFormData({ 
      subject_code: sub.subject_code, 
      subject_name: sub.subject_name, 
      units: sub.units, 
      required_hours: sub.required_hours,
      program_id: sub.program_id || '',
      year_level: sub.year_level || '',
      room_type: sub.room_type || 'Any'
    });
    setCurrentId(sub.id);
    setIsEditing(true);
    setApiError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setApiError('');
    if (isEditing) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const stats = React.useMemo(() => {
    const total = subjects.length;
    const totalUnits = subjects.reduce((acc, s) => acc + (Number(s.units) || 0), 0);
    const orphaned = subjects.filter(s => Number(s.usage_count) === 0).length;
    const labNeeded = subjects.filter(s => s.room_type === 'Computer Lab' || s.room_type === 'Science Lab').length;
    
    return { total, totalUnits, orphaned, labNeeded };
  }, [subjects]);

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.subject_code.toLowerCase().includes(search.toLowerCase()) || 
                         s.subject_name.toLowerCase().includes(search.toLowerCase());
    const satisfiesOrphanFilter = hideOrphaned ? Number(s.usage_count) > 0 : true;
    return matchesSearch && satisfiesOrphanFilter;
  });

  const groupedSubjects = React.useMemo(() => {
    return filteredSubjects.reduce((acc, sub) => {
      const key = !sub.program_code 
        ? 'General Education / Cross-Sectional Subjects' 
        : `${sub.program_code} - ${sub.program_name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(sub);
      return acc;
    }, {});
  }, [filteredSubjects]);

  const sortedProgramKeys = Object.keys(groupedSubjects).sort((a, b) => {
    if (a.startsWith('General')) return 1;
    if (b.startsWith('General')) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Subject Bank</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Institutional curriculum repository and cross-sectional subject mapping.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`px-4 py-2.5 rounded-xl font-bold border transition-colors ${showArchived ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
          {isHead && (
            <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
              <Plus className="w-5 h-5" /> Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Analytics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Subjects', value: stats.total, icon: BookOpen, color: 'brand' },
          { label: 'Total Units', value: stats.totalUnits, icon: Layers, color: 'indigo' },
          { label: 'Specialized Labs', value: stats.labNeeded, icon: BarChart2, color: 'amber' },
          { label: 'Orphaned (No Load)', value: stats.orphaned, icon: Users, color: 'rose' }
        ].map((stat, i) => (
          <div key={i} className="glass rounded-3xl p-5 border border-white/40 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${stat.color}-500/5 rounded-full transition-transform group-hover:scale-110`} />
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl shadow-sm border border-white/40 dark:border-slate-700/50 p-4 mb-2 bg-white/40 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setHideOrphaned(!hideOrphaned)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${hideOrphaned ? 'bg-brand-600 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
          >
            {hideOrphaned ? 'Showing Only Active' : 'Hide Orphaned'}
          </button>
        </div>
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search subject code or name..."
            className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl leading-5 bg-white shadow-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
      />

      <div className="space-y-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-40 glass rounded-[2rem]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : sortedProgramKeys.length === 0 ? (
          <div className="glass rounded-[2rem] p-8 text-center text-gray-500 font-medium">No subjects found matching your criteria.</div>
        ) : (
          sortedProgramKeys.map(programKey => {
            const progSubjects = groupedSubjects[programKey];
            return (
              <div key={programKey} className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden relative">
                <div className="bg-brand-50/80 dark:bg-slate-800 border-b border-brand-100 dark:border-slate-700/50 px-6 py-4 flex items-center justify-between">
                  <h2 className={`text-lg font-bold ${programKey.startsWith('General') ? 'text-indigo-800 dark:text-indigo-300' : 'text-brand-800 dark:text-brand-300'}`}>
                    {programKey}
                  </h2>
                  <span className="bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 font-bold px-3 py-1 rounded-full text-xs shadow-sm shadow-brand-100/50 dark:shadow-none border border-brand-100 dark:border-slate-600">
                    {progSubjects.length} {progSubjects.length === 1 ? 'Subject' : 'Subjects'}
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
                    <thead className="bg-gray-50/50 dark:bg-slate-900/40">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Subject Designation</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Units / Required Hrs</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                      {progSubjects.map((s) => (
                        <tr key={s.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white text-[15px] flex items-center gap-2">
                              <span className="text-brand-700 dark:text-brand-400">{s.subject_code.toUpperCase()}</span>
                              <span className="text-gray-400">-</span>
                              {s.subject_name.replace(/\b\w/g, c => c.toUpperCase())}
                              {Number(s.usage_count) > 0 ? (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1 shadow-sm">
                                  <Users className="w-3 h-3" /> Active in {s.usage_count} Section{Number(s.usage_count) !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] border border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1 shadow-sm font-bold">
                                  Orphaned
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wide mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/50">
                              {s.program_id ? `Mapped: ${s.program_code || 'N/A'} (Yr ${s.year_level || '?'})` : 'Generic Cross-Section'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="font-bold text-gray-600 dark:text-slate-300">{s.units} Units</div>
                            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-[11px] border border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 font-bold">
                                {s.required_hours} hrs
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${s.room_type === 'Any' ? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'}`}>
                                Fac: {s.room_type || 'Any'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {isHead && !showArchived && (
                              <>
                                <button onClick={() => openEditModal(s)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 transition-colors"><Edit2 className="w-5 h-5 inline" /></button>
                                <button onClick={() => { 
                                  setConfirmConfig({
                                    title: 'Archive Subject?',
                                    message: 'This will remove the subject from active rotations. Existing schedules mapping to this subject will not be modified.',
                                    type: 'danger',
                                    onConfirm: () => deleteMutation.mutate(s.id)
                                  });
                                  setIsConfirmModalOpen(true);
                                }} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"><Archive className="w-5 h-5 inline" /></button>
                              </>
                            )}
                            {isHead && showArchived && (
                              <button onClick={() => { 
                                setConfirmConfig({
                                  title: 'Restore Subject?',
                                  message: 'This subject will become visible again to curriculum mappers and load dispatchers.',
                                  type: 'restore',
                                  onConfirm: () => restoreMutation.mutate(s.id)
                                });
                                setIsConfirmModalOpen(true);
                              }} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-bold flex items-center justify-end w-full gap-2">
                                <RefreshCw className="w-4 h-4" /> Restore
                              </button>
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
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Subject Map' : 'Add New Subject'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              {apiError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Subject Code</label>
                    <input required type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-mono uppercase bg-gray-50 dark:bg-slate-900 dark:text-white text-sm" value={formData.subject_code} onChange={e => setFormData({...formData, subject_code: e.target.value})} placeholder="e.g. CS101" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Required Hrs/Week</label>
                    <input required type="number" min="1" step="0.5" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-sm" value={formData.required_hours} onChange={e => setFormData({...formData, required_hours: parseFloat(e.target.value)})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Subject Name</label>
                  <input required type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-sm" value={formData.subject_name} onChange={e => setFormData({...formData, subject_name: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Academic Units</label>
                  <input required type="number" min="1" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-sm" value={formData.units} onChange={e => setFormData({...formData, units: parseInt(e.target.value)})} />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Facility Requirement</p>
                  <div>
                      <select required className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-white text-sm" value={formData.room_type} onChange={e => setFormData({...formData, room_type: e.target.value})}>
                        <option value="Lecture">Lecture / Standard</option>
                        <option value="Computer Lab">Computer Lab</option>
                        <option value="Science Lab">Science Lab</option>
                        <option value="Kitchen">Culinary Kitchen</option>
                        <option value="Court">Gym / Court / Field</option>
                        <option value="Engineering Lab">Engineering Lab</option>
                        <option value="Any">Any Available Room</option>
                      </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Curriculum Mapping (Optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">Target Program</label>
                      <select className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-white text-sm" value={formData.program_id} onChange={e => setFormData({...formData, program_id: e.target.value})}>
                        <option value="1">General (All Programs)</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">Year Level</label>
                      <input type="number" min="1" max="12" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-white text-sm" value={formData.year_level} onChange={e => setFormData({...formData, year_level: e.target.value})} placeholder="e.g. 1" />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                    {isEditing ? 'Update Subject' : 'Save Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
