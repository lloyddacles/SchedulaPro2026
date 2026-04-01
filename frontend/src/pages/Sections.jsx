import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Users, PlusCircle, Archive, AlertCircle, X, RefreshCw, Edit2, Search, BookOpen, GraduationCap, ShieldAlert } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Sections() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ program_id: '', year_level: '1', name: 'A', adviser_id: '', campus_id: '' });
  const [error, setError] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: '', onConfirm: () => {} });

  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: async () => (await api.get('/programs')).data });
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: async () => (await api.get('/campuses')).data });
  
  // Faculty list filtered by campus for the adviser dropdown
  const { data: facultyList = [] } = useQuery({ 
    queryKey: ['faculty', formData.campus_id], 
    queryFn: async () => {
      if (!formData.campus_id) return [];
      const res = await api.get(`/faculty?campus_id=${formData.campus_id}`);
      return res.data;
    },
    enabled: isModalOpen && !!formData.campus_id
  });

  const { data: sections = [], isLoading } = useQuery({ 
    queryKey: ['sections', showArchived, selectedCampus], 
    queryFn: async () => {
      let url = `/sections?archived=${showArchived}`;
      if (selectedCampus) url += `&campus_id=${selectedCampus}`;
      const res = await api.get(url);
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: (newSec) => api.post('/sections', newSec),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error adding section sequence')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/sections/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] })
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/sections/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] })
  });

  const updateMutation = useMutation({
    mutationFn: (updatedSec) => api.put(`/sections/${editingId}`, updatedSec),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error updating section')
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({ program_id: '', year_level: '1', name: 'A', adviser_id: '', campus_id: '' });
    setError('');
  };

  const handleEdit = (sec) => {
    setFormData({
      program_id: sec.program_id,
      year_level: sec.year_level,
      name: sec.name,
      adviser_id: sec.adviser_id || '',
      campus_id: sec.campus_id || ''
    });
    setEditingId(sec.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const stats = React.useMemo(() => {
    const total = sections.length;
    const programsCount = new Set(sections.map(s => s.program_id)).size;
    const unassignedAdvisers = sections.filter(s => !s.adviser_id).length;
    const adviserAssignmentRate = total > 0 ? Math.round(((total - unassignedAdvisers) / total) * 100) : 0;
    
    return { total, programsCount, unassignedAdvisers, adviserAssignmentRate };
  }, [sections]);

  const filteredSections = sections.filter(sec => {
    if (!search) return true;
    const query = search.toLowerCase();
    return sec.name.toLowerCase().includes(query) ||
           sec.program_code.toLowerCase().includes(query) ||
           (sec.adviser_name && sec.adviser_name.toLowerCase().includes(query)) ||
           sec.year_level.toString().includes(query);
  });

  const groupedSections = React.useMemo(() => {
    return filteredSections.reduce((acc, sec) => {
      const key = `${sec.program_code} - ${sec.program_name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(sec);
      return acc;
    }, {});
  }, [filteredSections]);

  const renderAvatar = (name) => {
    if (!name) return null;
    const parts = name.trim().split(' ');
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].substring(0, 2);
    const colors = ['bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', 
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                    'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 border-brand-200 dark:border-brand-800',
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800'];
    const idx = name.length % colors.length;
    return (
       <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase border ${colors[idx]} shadow-sm`}>
         {initials}
       </div>
    );
  };

  const sortedProgramKeys = Object.keys(groupedSections).sort();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Student Sections
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage cohorts, track programmatic travel blocks, and assign faculty advising.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
          <PlusCircle className="w-5 h-5" /> Generate Section
        </button>
      </div>

      {/* Analytics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cohorts', value: stats.total, icon: Users, color: 'brand' },
          { label: 'Deployed Programs', value: stats.programsCount, icon: BookOpen, color: 'indigo' },
          { label: 'Adviser Coverage', value: `${stats.adviserAssignmentRate}%`, icon: GraduationCap, color: 'emerald' },
          { label: 'Unassigned Cohorts', value: stats.unassignedAdvisers, icon: ShieldAlert, color: 'amber' }
        ].map((stat, i) => (
          <div key={i} className={`glass rounded-3xl p-5 border border-white/40 dark:border-slate-700/50 shadow-sm relative overflow-hidden group ${stat.label === 'Unassigned Cohorts' && stats.unassignedAdvisers > 0 ? 'bg-amber-50/50 dark:bg-amber-900/20' : ''}`}>
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${stat.color}-500/5 rounded-full transition-transform group-hover:scale-110`} />
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.label === 'Unassigned Cohorts' && stats.unassignedAdvisers > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-gray-900 dark:text-white'} leading-tight`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl shadow-sm border border-white/40 dark:border-slate-700/50 p-4 mb-2 bg-white/40 dark:bg-slate-900/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/50 rounded-xl px-4 py-1.5 shadow-sm">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Facility Location</label>
            <select 
              value={selectedCampus} 
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-0 cursor-pointer min-w-[140px]"
            >
              <option value="">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${showArchived ? 'bg-brand-600 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            {showArchived ? 'Active Cohorts Only' : 'Include Archived'}
          </button>
        </div>
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search cohort, program, or adviser..."
            className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl leading-5 bg-white shadow-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-40 glass rounded-[2rem]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : sortedProgramKeys.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in glass rounded-[2rem] shadow-sm border border-white/40 dark:border-slate-700/50">
             <div className="w-48 h-48 mb-6 relative">
               <div className="absolute inset-0 bg-brand-100 dark:bg-brand-900/20 rounded-full blur-3xl opacity-50"></div>
               <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-brand-500 dark:text-brand-400 opacity-80 relative z-10 drop-shadow-sm" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                 <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
               </svg>
             </div>
             <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Sections Configured</h3>
             <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-8">The current filter selection has yielded zero cohorts. Alter your active filter parameters or generate a fresh section.</p>
             <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition flex items-center gap-2 mx-auto"><PlusCircle className="w-5 h-5"/> Generate Section</button>
           </div>
        ) : (
          sortedProgramKeys.map((programKey) => {
            const progSections = groupedSections[programKey];
            return (
              <div key={programKey} className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
                <div className="bg-brand-50/80 dark:bg-slate-800 border-b border-brand-100 dark:border-slate-700/50 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-brand-800 dark:text-brand-300">{programKey}</h2>
                  <span className="bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 font-bold px-3 py-1 rounded-full text-xs shadow-sm shadow-brand-100/50 dark:shadow-none border border-brand-100 dark:border-slate-600">
                     {progSections.length} {progSections.length === 1 ? 'Cohort' : 'Cohorts'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
                    <thead className="bg-gray-50/50 dark:bg-slate-900/40">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Year Level</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Section Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Block Adviser</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Full Identifier</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                      {progSections.map((sec) => (
                        <tr key={sec.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800 dark:text-slate-200 w-32">Year {sec.year_level}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-700 dark:text-slate-300 font-bold">{sec.name}</div>
                            <div className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mt-1">{sec.campus_name || 'Main Campus'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-400 font-medium">
                            {sec.adviser_name ? (
                              <div className="flex items-center gap-3">
                                 {renderAvatar(sec.adviser_name)}
                                 <span className="font-bold text-gray-800 dark:text-slate-200">{sec.adviser_name}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold shadow-sm">
                                 <ShieldAlert className="w-3.5 h-3.5" /> Fast-Track Assignment
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                              {sec.program_code}-{sec.year_level}{sec.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {!showArchived && (
                              <div className="flex items-center justify-end gap-3">
                                <button onClick={() => handleEdit(sec)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" title="Edit Section">
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => { 
                                  setConfirmConfig({
                                    title: 'Archive Section?',
                                    message: `This will remove ${sec.program_code}-${sec.year_level}${sec.name} from active curricular rotations. Existing schedules mapping to this cohort will not be lost.`,
                                    type: 'danger',
                                    onConfirm: () => deleteMutation.mutate(sec.id)
                                  });
                                  setIsConfirmModalOpen(true);
                                }} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors" title="Archive Section">
                                  <Archive className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                            {showArchived && (
                              <button onClick={() => { 
                                setConfirmConfig({
                                  title: 'Restore Section?',
                                  message: `This will reactive the ${sec.program_code}-${sec.year_level}${sec.name} cohort across all administrative dashboards and scheduling filters.`,
                                  type: 'restore',
                                  onConfirm: () => restoreMutation.mutate(sec.id)
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
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-500 dark:text-brand-400"/> {isEditing ? 'Edit Section' : 'Define Section'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-800 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 dark:text-red-400" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Select Program/Strand</label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                  value={formData.program_id}
                  onChange={e => setFormData({...formData, program_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose Curriculum --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Year Level</label>
                  <input 
                    type="number" min="1" max="12"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                    value={formData.year_level}
                    onChange={e => setFormData({...formData, year_level: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Section Identifier</label>
                  <input 
                    type="text" 
                    placeholder="e.g., A, B, STEM1"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white uppercase"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Campus Location</label>
                  <select 
                    required 
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold"
                    value={formData.campus_id} 
                    onChange={e => setFormData({...formData, campus_id: e.target.value})}
                  >
                    <option value="">-- Choose Location --</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Block Adviser (Optional)</label>
                  <select 
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                    value={formData.adviser_id}
                    onChange={e => setFormData({...formData, adviser_id: e.target.value})}
                  >
                    <option value="">-- Unassigned --</option>
                    {facultyList.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.full_name} ({f.employment_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                  {isEditing ? 'Save Changes' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
      />
    </div>
  );
}
