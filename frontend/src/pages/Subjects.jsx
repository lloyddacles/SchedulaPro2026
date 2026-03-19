import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';

export default function Subjects() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [apiError, setApiError] = useState('');
  
  const [formData, setFormData] = useState({
    subject_code: '', subject_name: '', units: 3, required_hours: 3, program_id: '', year_level: ''
  });

  const queryClient = useQueryClient();

  // Queries
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: async () => (await api.get('/programs')).data });
  const { data: subjects = [], isLoading } = useQuery({ queryKey: ['subjects'], queryFn: async () => (await api.get('/subjects')).data });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newSubject) => api.post('/subjects', {
      ...newSubject, 
      program_id: newSubject.program_id ? Number(newSubject.program_id) : null,
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
      program_id: updated.program_id ? Number(updated.program_id) : null,
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

  // Handlers
  const openAddModal = () => {
    setFormData({ subject_code: '', subject_name: '', units: 3, required_hours: 3, program_id: '', year_level: '' });
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
      year_level: sub.year_level || ''
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

  const filteredSubjects = subjects.filter(s => 
    s.subject_code.toLowerCase().includes(search.toLowerCase()) || 
    s.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Subjects Bank</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage required classes and dynamically map them to Curriculum Years.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
          <Plus className="w-5 h-5" /> Add Subject
        </button>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden relative">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 flex justify-end">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search subjects..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl leading-5 bg-white/80 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
              <thead className="bg-gray-50/80 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Code & Focus</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Subject Name</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Units / Required Hrs</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-brand-700 dark:text-brand-400">{s.subject_code}</div>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wide mt-0.5">
                        {s.program_id ? `${s.program_code} - Yr ${s.year_level}` : 'Generic Cross-Section'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-slate-200 font-medium">{s.subject_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="font-bold text-gray-600 dark:text-slate-300">{s.units} Units</div>
                      <div className="mt-1">
                        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs border border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 font-bold">
                          {s.required_hours} hrs
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openEditModal(s)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 transition-colors"><Edit2 className="w-5 h-5 inline" /></button>
                      <button onClick={() => { if(window.confirm('Delete subject?')) deleteMutation.mutate(s.id) }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"><Trash2 className="w-5 h-5 inline" /></button>
                    </td>
                  </tr>
                ))}
                {filteredSubjects.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-slate-500 italic">No subject records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 my-8">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Subject Map' : 'Add New Subject'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            {apiError && (
              <div className="m-4 mb-0 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Subject Code</label>
                  <input required type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-mono uppercase bg-gray-50 text-sm" value={formData.subject_code} onChange={e => setFormData({...formData, subject_code: e.target.value})} placeholder="e.g. CS101" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Required Hrs</label>
                  <input required type="number" min="1" step="0.5" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 text-sm" value={formData.required_hours} onChange={e => setFormData({...formData, required_hours: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject Name</label>
                <input required type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 text-sm" value={formData.subject_name} onChange={e => setFormData({...formData, subject_name: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Academic Units</label>
                <input required type="number" min="1" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 text-sm" value={formData.units} onChange={e => setFormData({...formData, units: parseInt(e.target.value)})} />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Curriculum Target Mapping</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Target Program (Optional)</label>
                    <select className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 bg-white text-sm" value={formData.program_id} onChange={e => setFormData({...formData, program_id: e.target.value})}>
                      <option value="">General (All Programs)</option>
                      {programs.filter(p => p.id !== 1).map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Year Level (Optional)</label>
                    <input type="number" min="1" max="12" className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 text-sm" value={formData.year_level} onChange={e => setFormData({...formData, year_level: e.target.value})} placeholder="e.g. 1" />
                  </div>
                </div>
              </div>
              
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                  {isEditing ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
