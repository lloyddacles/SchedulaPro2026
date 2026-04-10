import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  BookOpen, PlusCircle, Archive, AlertCircle, X, Shield, 
  RefreshCw, Edit2, Building2, Layers, Search, LayoutGrid, 
  ChevronRight, ArrowRight
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import BulkActions from '../components/BulkActions';

export default function Programs() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('programs'); // 'programs' or 'departments'
  const [showArchived, setShowArchived] = useState(false);
  
  // Shared Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [error, setError] = useState('');
  
  // Program Form State
  const [programForm, setProgramForm] = useState({ code: '', name: '', type: 'College', department_id: '' });
  
  // Department Form State
  const [departmentForm, setDepartmentForm] = useState({ code: '', name: '' });
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });

  // --- Data Queries ---
  const { data: programs = [], isLoading: isProgramsLoading } = useQuery({ 
    queryKey: ['programs', showArchived], 
    queryFn: async () => (await api.get(`/programs?archived=${showArchived}`)).data 
  });

  const { data: departments = [], isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ['departments', showArchived],
    queryFn: async () => (await api.get(`/departments?archived=${showArchived}`)).data
  });

  // --- Program Mutations ---
  const createProgramMutation = useMutation({
    mutationFn: (newProg) => api.post('/programs', newProg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error adding program')
  });

  const updateProgramMutation = useMutation({
    mutationFn: (upProg) => api.put(`/programs/${currentId}`, upProg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error updating program')
  });

  const archiveProgramMutation = useMutation({
    mutationFn: (id) => api.delete(`/programs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] })
  });

  const restoreProgramMutation = useMutation({
    mutationFn: (id) => api.put(`/programs/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] })
  });

  // --- Department Mutations ---
  const createDeptMutation = useMutation({
    mutationFn: (newDept) => api.post('/departments', newDept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error adding department')
  });

  const updateDeptMutation = useMutation({
    mutationFn: (upDept) => api.put(`/departments/${currentId}`, upDept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error updating department')
  });

  const archiveDeptMutation = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    }
  });

  const restoreDeptMutation = useMutation({
    mutationFn: (id) => api.put(`/departments/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] })
  });

  // --- Helper Functions ---
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setProgramForm({ code: '', name: '', type: 'College', department_id: '' });
    setDepartmentForm({ code: '', name: '' });
    setError('');
  };

  const openProgramModal = (p = null) => {
    if (p) {
      setProgramForm({ code: p.code, name: p.name, type: p.type, department_id: p.department_id || '' });
      setCurrentId(p.id);
      setIsEditing(true);
    } else {
      setProgramForm({ code: '', name: '', type: 'College', department_id: '' });
      setIsEditing(false);
    }
    setActiveTab('programs');
    setIsModalOpen(true);
  };

  const openDeptModal = (d = null) => {
    if (d) {
      setDepartmentForm({ code: d.code, name: d.name });
      setCurrentId(d.id);
      setIsEditing(true);
    } else {
      setDepartmentForm({ code: '', name: '' });
      setIsEditing(false);
    }
    setActiveTab('departments');
    setIsModalOpen(true);
  };

  const handleProgramSubmit = (e) => {
    e.preventDefault();
    const payload = { ...programForm, department_id: programForm.department_id || null };
    if (isEditing) updateProgramMutation.mutate(payload);
    else createProgramMutation.mutate(payload);
  };

  const handleDeptSubmit = (e) => {
    e.preventDefault();
    if (isEditing) updateDeptMutation.mutate(departmentForm);
    else createDeptMutation.mutate(departmentForm);
  };

  const isLoading = isProgramsLoading || isDepartmentsLoading;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Curriculum Hub <span className="text-sm font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full whitespace-nowrap">Root Logic</span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage organizational departments and academic degrees.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <BulkActions 
            entity={activeTab === 'programs' ? 'programs' : 'departments'}
            columns={activeTab === 'programs' ? ['code', 'name', 'type'] : ['code', 'name']}
          />
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-bold border transition-all ${showArchived ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:shadow-md'}`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
          <button 
            onClick={() => activeTab === 'programs' ? openProgramModal() : openDeptModal()} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-5 h-5" /> 
            <span>Add {activeTab === 'programs' ? 'Program' : 'Department'}</span>
          </button>
        </div>
      </div>

      {/* Tab Swiper */}
      <div className="flex p-1.5 bg-gray-100 dark:bg-slate-800/50 rounded-2xl w-full max-w-md border border-gray-200 dark:border-slate-700/50">
        <button 
          onClick={() => setActiveTab('programs')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'programs' ? 'bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          <BookOpen className="w-4 h-4" /> Academic Programs
        </button>
        <button 
          onClick={() => setActiveTab('departments')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'departments' ? 'bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
        >
          <Building2 className="w-4 h-4" /> Departments / Colleges
        </button>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="animate-spin h-8 w-8 text-brand-600" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Querying curriculum matrix...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
                <thead className="bg-gray-50/80 dark:bg-slate-900/50">
                  {activeTab === 'programs' ? (
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Matrix Code</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Academic Description</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Institutional Grouping</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Type</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Dept Code</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Department / College Name</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Programs Linked</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                  {activeTab === 'programs' ? (
                    programs.map((p) => (
                      <tr key={p.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-700 dark:text-brand-400">{p.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800 dark:text-slate-200">{p.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {p.department_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-bold text-gray-600 dark:text-slate-400">{p.department_name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 italic">No Dept Assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full border shadow-sm ${
                            p.type === 'College' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50' : 
                            p.type === 'SHS' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50' : 
                            'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/50'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!showArchived ? (
                              <>
                                <button onClick={() => openProgramModal(p)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => { 
                                  setConfirmConfig({
                                    title: 'Archive Program?',
                                    message: `Move ${p.code} to archives?`,
                                    type: 'danger',
                                    onConfirm: () => archiveProgramMutation.mutate(p.id)
                                  });
                                  setIsConfirmModalOpen(true);
                                }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                  <Archive className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => restoreProgramMutation.mutate(p.id)} className="px-3 py-1.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-brand-100 transition-colors">Restore</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    departments.map((d) => (
                      <tr key={d.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap font-black text-gray-900 dark:text-white uppercase tracking-wider">{d.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700 dark:text-slate-300">{d.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                             <Layers className="w-3.5 h-3.5 text-brand-500" />
                             <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                               {programs.filter(p => !p.is_archived && p.department_id === d.id).length} Programs
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!showArchived ? (
                              <>
                                <button onClick={() => openDeptModal(d)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => { 
                                  setConfirmConfig({
                                    title: 'Archive Department?',
                                    message: `Archive ${d.name}? This will un-link all related programs but won't delete them.`,
                                    type: 'danger',
                                    onConfirm: () => archiveDeptMutation.mutate(d.id)
                                  });
                                  setIsConfirmModalOpen(true);
                                }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                  <Archive className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => restoreDeptMutation.mutate(d.id)} className="px-3 py-1.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-brand-100 transition-colors">Restore</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {(activeTab === 'programs' ? programs : departments).length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center bg-white/20 dark:bg-slate-900/20">
                   <div className="p-4 rounded-full bg-gray-50 dark:bg-slate-800 mb-4">
                      <Search className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                   </div>
                   <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No curriculum records found.</p>
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700/50 bg-white/40 dark:bg-slate-800/40">
              {(activeTab === 'programs' ? programs : departments).map((item) => (
                <div key={item.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest truncate">{item.code}</span>
                        {activeTab === 'programs' && (
                          <span className="px-2 py-0.5 text-[7px] font-black uppercase bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 rounded-lg border border-gray-200 dark:border-slate-600">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800 dark:text-slate-100 leading-tight truncate">{item.name}</h4>
                      {activeTab === 'programs' && item.department_name && (
                         <div className="mt-2 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.department_name}</span>
                         </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      {!showArchived ? (
                        <>
                          <button onClick={() => activeTab === 'programs' ? openProgramModal(item) : openDeptModal(item)} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-90">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => {
                             setConfirmConfig({
                               title: activeTab === 'programs' ? 'Archive Program?' : 'Archive Department?',
                               message: `Archive ${item.code}?`,
                               type: 'danger',
                               onConfirm: () => activeTab === 'programs' ? archiveProgramMutation.mutate(item.id) : archiveDeptMutation.mutate(item.id)
                             });
                             setIsConfirmModalOpen(true);
                          }} className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-90">
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => activeTab === 'programs' ? restoreProgramMutation.mutate(item.id) : restoreDeptMutation.mutate(item.id)} className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Curriculum Hub Unified Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-slate-700 mx-auto">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
               <div>
                  <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.3em] mb-1">Administrative Node</p>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    {activeTab === 'programs' ? <BookOpen className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                    {isEditing ? 'Modify Identity' : `New ${activeTab === 'programs' ? 'Program' : 'Department'}`}
                  </h3>
               </div>
               <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            {error && (
              <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-2xl text-xs border border-red-100 dark:border-red-800 flex items-center gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold uppercase tracking-wider">{error}</span>
              </div>
            )}

            <form onSubmit={activeTab === 'programs' ? handleProgramSubmit : handleDeptSubmit} className="p-8 space-y-6">
              {activeTab === 'programs' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Matrix Type</label>
                      <select 
                        className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold text-sm shadow-inner transition-all hover:bg-white dark:hover:bg-slate-950"
                        value={programForm.type}
                        onChange={e => setProgramForm({...programForm, type: e.target.value})}
                      >
                        <option value="College">College Degree</option>
                        <option value="SHS">SHS Strand</option>
                        <option value="JHS">Junior High</option>
                        <option value="Other">Other Cert</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Program Code</label>
                      <input 
                        type="text" 
                        placeholder="BSIS, STEM..."
                        className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold text-sm uppercase shadow-inner"
                        value={programForm.code}
                        onChange={e => setProgramForm({...programForm, code: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Full Degree Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Bachelor of Science in Information Systems"
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold text-sm shadow-inner"
                      value={programForm.name}
                      onChange={e => setProgramForm({...programForm, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Assign to Department</label>
                    <div className="relative group">
                      <select 
                        className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold text-sm shadow-inner transition-all"
                        value={programForm.department_id}
                        onChange={e => setProgramForm({...programForm, department_id: e.target.value})}
                      >
                        <option value="">-- Institutional Generic (No Dept) --</option>
                        {departments.filter(d => !d.is_archived).map(d => (
                           <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                      <Building2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-brand-500 transition-colors" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Collegiate Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g., CCS, SBA, CAS"
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold text-sm shadow-inner uppercase"
                      value={departmentForm.code}
                      onChange={e => setDepartmentForm({...departmentForm, code: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Full Department / College Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., College of Computer Studies"
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-bold text-sm shadow-inner"
                      value={departmentForm.name}
                      onChange={e => setDepartmentForm({...departmentForm, name: e.target.value})}
                      required
                    />
                  </div>
                </>
              )}
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 px-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-600 dark:text-slate-300 font-bold hover:shadow-lg transition-all active:scale-95">Discard</button>
                <button 
                  type="submit" 
                  disabled={createProgramMutation.isPending || updateProgramMutation.isPending || createDeptMutation.isPending || updateDeptMutation.isPending} 
                  className="flex-1 py-4 px-6 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-brand-900/20 hover:bg-brand-700 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {isEditing ? 'Commit Changes' : `Initialize ${activeTab === 'programs' ? 'Program' : 'Dept'}`}
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
