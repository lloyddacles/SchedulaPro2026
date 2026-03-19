import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Users, PlusCircle, Trash2, AlertCircle, X } from 'lucide-react';

export default function Sections() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ program_id: '', year_level: '1', name: 'A' });
  const [error, setError] = useState('');

  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: async () => (await api.get('/programs')).data });
  const { data: sections = [], isLoading } = useQuery({ queryKey: ['sections'], queryFn: async () => (await api.get('/sections')).data });

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

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ program_id: '', year_level: '1', name: 'A' });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Student Cohort Sections
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Define block sections that travel together (e.g. BSCS-1A).</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
          <PlusCircle className="w-5 h-5" /> Generate Section
        </button>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
              <thead className="bg-gray-50/80 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Track / Curriculum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Year Level</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Section Name</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Full Identifier</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {sections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600 dark:text-slate-300"><span className="font-bold text-brand-700 dark:text-brand-400">{sec.program_code}</span> - {sec.program_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800 dark:text-slate-200 text-center w-24">Year {sec.year_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-slate-300 font-bold">{sec.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-sm font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                        {sec.program_code}-{sec.year_level}{sec.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {sec.id !== 1 && (
                        <button onClick={() => { if(window.confirm('Delete this section?')) deleteMutation.mutate(sec.id) }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                          <Trash2 className="w-5 h-5 inline" />
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-brand-500 dark:text-brand-400"/> Define Section</h3>
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
                  {programs.filter(p => p.id !== 1).map(p => (
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
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
