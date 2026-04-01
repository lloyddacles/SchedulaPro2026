import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { BookOpen, PlusCircle, Archive, AlertCircle, X, Shield, RefreshCw, Edit2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Programs() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'College' });
  const [error, setError] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });

  const { data: programs = [], isLoading } = useQuery({ 
    queryKey: ['programs', showArchived], 
    queryFn: async () => (await api.get(`/programs?archived=${showArchived}`)).data 
  });

  const createMutation = useMutation({
    mutationFn: (newProg) => api.post('/programs', newProg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error adding program')
  });

  const updateMutation = useMutation({
    mutationFn: (upProg) => api.put(`/programs/${currentId}`, upProg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error updating program')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/programs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] })
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/programs/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] })
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({ code: '', name: '', type: 'College' });
    setError('');
  };

  const openEditModal = (p) => {
    setFormData({ code: p.code, name: p.name, type: p.type });
    setCurrentId(p.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Academic Programs
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage institutional college degrees, strands, and curricular paths.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`px-4 py-2.5 rounded-xl font-bold border transition-colors ${showArchived ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
          <button onClick={() => { setIsEditing(false); setFormData({code: '', name: '', type: 'College'}); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
            <PlusCircle className="w-5 h-5" /> Add Program
          </button>
        </div>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
              <thead className="bg-gray-50/80 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Program Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Program Name</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {programs.map((p) => (
                  <tr key={p.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-700 dark:text-brand-400">{p.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800 dark:text-slate-200">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600 dark:text-slate-300">
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${
                        p.type === 'College' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50' : 
                        p.type === 'SHS' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50' : 
                        p.type === 'JHS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' : 
                        'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/50'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {!showArchived && (
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => openEditModal(p)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                            <Edit2 className="w-5 h-5 inline" />
                          </button>
                          <button onClick={() => { 
                            setConfirmConfig({
                              title: 'Archive Program?',
                              message: `Are you sure you want to archive ${p.code}? All mapped sections will track this archiving status.`,
                              type: 'danger',
                              onConfirm: () => deleteMutation.mutate(p.id)
                            });
                            setIsConfirmModalOpen(true);
                          }} className="text-gray-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors">
                            <Archive className="w-5 h-5 inline" />
                          </button>
                        </div>
                      )}
                      {showArchived && (
                        <button onClick={() => { 
                            setConfirmConfig({
                              title: 'Restore Program?',
                              message: `Restore ${p.code} to active mapping?`,
                              type: 'restore',
                              onConfirm: () => restoreMutation.mutate(p.id)
                            });
                            setIsConfirmModalOpen(true);
                        }} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors font-bold flex items-center justify-end w-full gap-2">
                          <RefreshCw className="w-4 h-4" /> Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {isEditing ? <Edit2 className="w-5 h-5 text-brand-500 dark:text-brand-400"/> : <BookOpen className="w-5 h-5 text-brand-500 dark:text-brand-400"/>} 
                {isEditing ? 'Edit Program' : 'Define Program'}
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Type</label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="College">College Degree</option>
                  <option value="SHS">Senior High School (SHS) Strand</option>
                  <option value="JHS">Junior High School (JHS)</option>
                  <option value="Other">Other Certificate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Code</label>
                <input 
                  type="text" 
                  placeholder="e.g., BSCS, STEM"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Bachelor of Science in Computer Science"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                  {isEditing ? 'Save Changes' : 'Save Program'}
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
