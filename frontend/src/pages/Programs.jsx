import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { BookOpen, PlusCircle, Trash2, AlertCircle, X, Shield } from 'lucide-react';

export default function Programs() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'College' });
  const [error, setError] = useState('');

  const { data: programs = [], isLoading } = useQuery({ 
    queryKey: ['programs'], 
    queryFn: async () => (await api.get('/programs')).data 
  });

  const createMutation = useMutation({
    mutationFn: (newProg) => api.post('/programs', newProg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error adding program')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/programs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] })
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ code: '', name: '', type: 'College' });
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
            Academic Programs
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage institutional college degrees, strands, and curricular paths.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
          <PlusCircle className="w-5 h-5" /> Add Program
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
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${p.type === 'College' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : p.type === 'SHS' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {p.id !== 1 && (
                        <button onClick={() => { if(window.confirm('Delete this program? All mapped sections risk deletion.')) deleteMutation.mutate(p.id) }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-brand-500 dark:text-brand-400"/> Define Program</h3>
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
