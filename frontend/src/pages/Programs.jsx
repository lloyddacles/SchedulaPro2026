import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  BookOpen, PlusCircle, Archive, AlertCircle, X, Shield, 
  RefreshCw, Edit2, Building2, Layers, Search, LayoutGrid, 
  ChevronRight, ArrowRight, TrendingUp, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // --- Filtered Data ---
  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.department_name && p.department_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20">
      {/* ── Intelligence Hub Header ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white font-display tracking-tight">
              Curriculum Hub
            </h1>
          </div>
          <p className="text-gray-500 dark:text-slate-400 font-medium max-w-xl">
            Orchestrating academic dependencies. Manage institutional departments and degree matrices with normalized relational integrity.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[240px] xl:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <BulkActions 
            entity={activeTab === 'programs' ? 'programs' : 'departments'}
            columns={activeTab === 'programs' ? ['code', 'name', 'type'] : ['code', 'name']}
          />

          <button 
            onClick={() => activeTab === 'programs' ? openProgramModal() : openDeptModal()} 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 dark:bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:shadow-brand-500/20 hover:-translate-y-1 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> 
            <span>Add {activeTab === 'programs' ? 'Program' : 'Dept'}</span>
          </button>
        </div>
      </div>

      {/* ── Status Indicators ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Programs</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{programs.filter(p => !p.is_archived).length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Colleges</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{departments.filter(d => !d.is_archived).length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Type</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-slate-300">College-First</span>
          </div>
        </div>
        <button 
          onClick={() => setShowArchived(!showArchived)}
          className={`p-4 border rounded-3xl shadow-sm space-y-1 text-left transition-all ${showArchived ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}
        >
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Archive Engine</p>
          <div className="flex items-center justify-between">
             <span className={`text-sm font-bold ${showArchived ? 'text-amber-600' : 'text-gray-500'}`}>
                {showArchived ? 'Active Mode' : 'Hidden'}
             </span>
             <RefreshCw className={`w-4 h-4 ${showArchived ? 'text-amber-500' : 'text-gray-300'}`} />
          </div>
        </button>
      </div>

      {/* ── Tab Swiper ────────────────────────────────────────────────────── */}
      <div className="flex p-2 bg-gray-100 dark:bg-slate-900 rounded-[2rem] w-full max-w-md border border-gray-200 dark:border-slate-800 shadow-inner">
        <button 
          onClick={() => { setActiveTab('programs'); setSearchTerm(''); }}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'programs' ? 'bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-xl' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600'}`}
        >
          <BookOpen className="w-4 h-4" /> 
          <span>Academic Records</span>
          {activeTab === 'programs' && (
             <motion.div layoutId="activeTabPill" className="absolute -bottom-1 w-1 h-1 bg-brand-500 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => { setActiveTab('departments'); setSearchTerm(''); }}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'departments' ? 'bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-xl' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600'}`}
        >
          <Building2 className="w-4 h-4" /> 
          <span>Collegiate Nodes</span>
          {activeTab === 'departments' && (
             <motion.div layoutId="activeTabPill" className="absolute -bottom-1 w-1 h-1 bg-brand-500 rounded-full" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab + showArchived}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.3 }}
           className="min-h-[400px]"
        >
          {isProgramsLoading || isDepartmentsLoading ? (
            <div className="flex justify-center items-center h-60">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="animate-spin h-8 w-8 text-brand-600" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Synchronizing matrix...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'departments' ? (
                /* ── Departments Card Grid ────────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredDepartments.map((dept) => (
                    <motion.div
                      layout
                      key={dept.id}
                      className="group relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-brand-500/10 transition-all border-b-4 border-b-transparent hover:border-b-brand-500"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!showArchived ? (
                            <>
                              <button onClick={() => openDeptModal(dept)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => {
                                setConfirmConfig({
                                  title: 'Archive Department?',
                                  message: `Move ${dept.name} to archives?`,
                                  type: 'danger',
                                  onConfirm: () => archiveDeptMutation.mutate(dept.id)
                                });
                                setIsConfirmModalOpen(true);
                              }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => restoreDeptMutation.mutate(dept.id)} className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest">Restore</button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1">{dept.code}</h3>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-4">{dept.name}</h2>
                      
                      <div className="pt-4 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Layers className="w-4 h-4 text-gray-400" />
                           <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                             {programs.filter(p => p.department_id === dept.id && !p.is_archived).length} Programs
                           </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* ── Programs Grouped Matrix ─────────────────────────────── */
                <div className="space-y-12">
                   {departments.filter(d => !d.is_archived || showArchived).map(dept => {
                      const deptProgs = filteredPrograms.filter(p => p.department_id === dept.id);
                      if (deptProgs.length === 0 && searchTerm) return null;
                      
                      return (
                        <section key={dept.id} className="space-y-4">
                           <div className="flex items-center gap-4 px-2">
                              <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">{dept.name}</h2>
                              <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-800">{deptProgs.length} Items</span>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                              {deptProgs.map(p => (
                                <motion.div 
                                  layout
                                  key={p.id}
                                  className="group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 hover:border-brand-500/50 transition-all flex items-center justify-between"
                                >
                                   <div className="flex items-center gap-4 min-w-0">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                         p.type === 'College' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' :
                                         'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                                      }`}>
                                         {p.type === 'College' ? <GraduationCap className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                                      </div>
                                      <div className="truncate">
                                         <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{p.code}</span>
                                            <span className="h-1 w-1 rounded-full bg-gray-200" />
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{p.type}</span>
                                         </div>
                                         <h4 className="font-bold text-gray-800 dark:text-slate-200 truncate">{p.name}</h4>
                                      </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                      {!showArchived ? (
                                        <>
                                          <button onClick={() => openProgramModal(p)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                          </button>
                                          <button onClick={() => {
                                            setConfirmConfig({
                                              title: 'Archive Program?',
                                              message: `Archive ${p.code}?`,
                                              type: 'danger',
                                              onConfirm: () => archiveProgramMutation.mutate(p.id)
                                            });
                                            setIsConfirmModalOpen(true);
                                          }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Archive className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <button onClick={() => restoreProgramMutation.mutate(p.id)} className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-brand-100 transition-colors">Restore</button>
                                      )}
                                   </div>
                                </motion.div>
                              ))}
                              
                              {deptProgs.length === 0 && !searchTerm && (
                                <div className="md:col-span-2 2xl:col-span-3 py-6 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center opacity-40">
                                   <PlusCircle className="w-6 h-6 text-gray-300 mb-2" />
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No programs registered for this node</p>
                                </div>
                              )}
                           </div>
                        </section>
                      );
                   })}
                   
                   {/* Unassigned Programs */}
                   {filteredPrograms.filter(p => !p.department_id).length > 0 && (
                      <section className="space-y-4">
                         <div className="flex items-center gap-4 px-2">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Institutional Generic</h2>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-800">
                               {filteredPrograms.filter(p => !p.department_id).length} Items
                            </span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {filteredPrograms.filter(p => !p.department_id).map(p => (
                               <motion.div 
                                  layout
                                  key={p.id}
                                  className="group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 hover:border-brand-500/50 transition-all flex items-center justify-between"
                               >
                                  <div className="flex items-center gap-4 min-w-0">
                                     <div className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-400">
                                        <BookOpen className="w-5 h-5" />
                                     </div>
                                     <div className="truncate">
                                        <div className="flex items-center gap-2 mb-0.5">
                                           <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{p.code}</span>
                                           <span className="h-1 w-1 rounded-full bg-gray-200" />
                                           <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{p.type}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-800 dark:text-slate-200 truncate">{p.name}</h4>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                     {!showArchived ? (
                                       <>
                                         <button onClick={() => openProgramModal(p)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                           <Edit2 className="w-4 h-4" />
                                         </button>
                                         <button onClick={() => {
                                           setConfirmConfig({
                                             title: 'Archive Program?',
                                             message: `Archive ${p.code}?`,
                                             type: 'danger',
                                             onConfirm: () => archiveProgramMutation.mutate(p.id)
                                           });
                                           setIsConfirmModalOpen(true);
                                         }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                           <Archive className="w-4 h-4" />
                                         </button>
                                       </>
                                     ) : (
                                       <button onClick={() => restoreProgramMutation.mutate(p.id)} className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-brand-100 transition-colors">Restore</button>
                                     )}
                                  </div>
                               </motion.div>
                            ))}
                         </div>
                      </section>
                   )}
                </div>
              )}

              {(activeTab === 'programs' ? filteredPrograms : filteredDepartments).length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center text-center">
                   <div className="p-6 bg-gray-50 dark:bg-slate-900 rounded-[2.5rem] mb-6">
                      <Search className="w-12 h-12 text-gray-200 dark:text-slate-800" />
                   </div>
                   <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Matrix Anomaly Detected</h3>
                   <p className="text-gray-500 dark:text-slate-400 font-medium max-w-xs">We couldn't locate any records matching your synchronization parameters.</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Curriculum Hub Unified Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_32px_128px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden border border-gray-100 dark:border-slate-800 mx-auto"
            >
              <div className="px-10 py-8 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/30 dark:bg-slate-900/50">
                 <div>
                    <p className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.4em] mb-2">Matrix Configuration</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="p-2 bg-brand-500 rounded-xl">
                        {activeTab === 'programs' ? <BookOpen className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
                      </div>
                      {isEditing ? 'Modify Identity' : `New ${activeTab === 'programs' ? 'Program' : 'Node'}`}
                    </h3>
                 </div>
                 <button onClick={closeModal} className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-2xl shadow-sm transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-700"><X className="w-6 h-6" /></button>
              </div>
              
              {error && (
                <div className="mx-10 mt-8 p-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-3xl text-sm border border-red-100/50 dark:border-red-900/50 flex items-center gap-4 animate-shake">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className="font-bold tracking-tight">{error}</span>
                </div>
              )}
  
              <form onSubmit={activeTab === 'programs' ? handleProgramSubmit : handleDeptSubmit} className="p-10 pt-8 space-y-8">
                {activeTab === 'programs' ? (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Matrix Type</label>
                        <select 
                          className="w-full border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] px-6 py-4 outline-none focus:border-brand-500 bg-gray-50 dark:bg-slate-950 dark:text-white font-bold text-sm shadow-inner transition-all hover:bg-white dark:hover:bg-slate-900"
                          value={programForm.type}
                          onChange={e => setProgramForm({...programForm, type: e.target.value})}
                        >
                          <option value="College">College Degree</option>
                          <option value="SHS">SHS Strand</option>
                          <option value="JHS">Junior High</option>
                          <option value="Other">Other Cert</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Academic Code</label>
                        <input 
                          type="text" 
                          placeholder="BSIS, STEM..."
                          className="w-full border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] px-6 py-4 outline-none focus:border-brand-500 bg-gray-50 dark:bg-slate-950 dark:text-white font-bold text-sm uppercase shadow-inner"
                          value={programForm.code}
                          onChange={e => setProgramForm({...programForm, code: e.target.value})}
                          required
                        />
                      </div>
                    </div>
  
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Degree Nomenclature</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Bachelor of Science in Information Systems"
                        className="w-full border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] px-6 py-4 outline-none focus:border-brand-500 bg-gray-50 dark:bg-slate-950 dark:text-white font-bold text-sm shadow-inner"
                        value={programForm.name}
                        onChange={e => setProgramForm({...programForm, name: e.target.value})}
                        required
                      />
                    </div>
  
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Collegiate Mapping</label>
                      <div className="relative group">
                        <select 
                          className="w-full border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] px-6 py-4 outline-none focus:border-brand-500 bg-gray-50 dark:bg-slate-950 dark:text-white font-bold text-sm shadow-inner transition-all"
                          value={programForm.department_id}
                          onChange={e => setProgramForm({...programForm, department_id: e.target.value})}
                        >
                          <option value="">-- Institutional Generic (No Dept) --</option>
                          {departments.filter(d => !d.is_archived).map(d => (
                             <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                          ))}
                        </select>
                        <Building2 className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-brand-500 transition-colors" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Collegiate Node Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g., CCS, SBA, CAS"
                        className="w-full border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] px-6 py-4 outline-none focus:border-brand-500 bg-gray-50 dark:bg-slate-950 dark:text-white font-bold text-sm shadow-inner uppercase"
                        value={departmentForm.code}
                        onChange={e => setDepartmentForm({...departmentForm, code: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Collegiate Designation</label>
                      <input 
                        type="text" 
                        placeholder="e.g., College of Computer Studies"
                        className="w-full border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] px-6 py-4 outline-none focus:border-brand-500 bg-gray-50 dark:bg-slate-950 dark:text-white font-bold text-sm shadow-inner"
                        value={departmentForm.name}
                        onChange={e => setDepartmentForm({...departmentForm, name: e.target.value})}
                        required
                      />
                    </div>
                  </>
                )}
                
                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-5 px-8 bg-white dark:bg-slate-900 border-2 border-gray-50 dark:border-slate-800 rounded-[1.5rem] text-gray-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95">Discard</button>
                  <button 
                    type="submit" 
                    disabled={createProgramMutation.isPending || updateProgramMutation.isPending || createDeptMutation.isPending || updateDeptMutation.isPending} 
                    className="flex-1 py-5 px-8 bg-slate-950 dark:bg-brand-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:shadow-brand-500/20 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isEditing ? 'Commit Update' : `Synchronize ${activeTab === 'programs' ? 'Program' : 'Node'}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
