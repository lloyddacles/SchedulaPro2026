import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useTerm } from '../context/TermContext';
import { Layers, PlusCircle, Trash2, ShieldAlert, X, AlertCircle } from 'lucide-react';

export default function TeachingLoads() {
  const queryClient = useQueryClient();
  const { activeTermId } = useTerm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ faculty_id: '', subject_id: '', section_id: '' });
  const [error, setError] = useState('');

  const { data: loads = [], isLoading } = useQuery({ 
    queryKey: ['loads', activeTermId], 
    queryFn: async () => {
      const res = await api.get('/teaching-loads', { params: { term_id: activeTermId } });
      return res.data;
    },
    enabled: !!activeTermId
  });

  const { data: faculty = [] } = useQuery({ queryKey: ['faculty'], queryFn: async () => (await api.get('/faculty')).data });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: async () => (await api.get('/subjects')).data });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: async () => (await api.get('/sections')).data });

  const createMutation = useMutation({
    mutationFn: (newLoad) => api.post('/teaching-loads', { ...newLoad, term_id: activeTermId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      closeModal();
    },
    onError: (err) => {
      setError(err.response?.data?.details || err.response?.data?.message || 'Error executing request.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teaching-loads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loads'] })
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ faculty_id: '', subject_id: '', section_id: '' });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const filteredSubjects = formData.section_id && formData.section_id !== '1'
    ? subjects.filter(s => {
        const sec = sections.find(x => x.id === Number(formData.section_id));
        if (!sec) return true;
        if (s.program_id && s.year_level) {
          return s.program_id === sec.program_id && s.year_level === sec.year_level;
        }
        return true; // Keep generic subjects visible
      })
    : subjects;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            Teaching Loads
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Pair Instructors to Subjects targeting specific Student Cohorts.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
          <PlusCircle className="w-5 h-5" /> Assign Load
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Faculty</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Subject Details & Cohort</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Hours / Week</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {loads.map((load) => (
                  <tr key={load.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{load.faculty_name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{load.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-brand-700 dark:text-brand-400">{load.subject_code}</div>
                      <div className="text-xs text-gray-600 dark:text-slate-300">{load.subject_name} ({load.units} Units)</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded uppercase shadow-sm">
                        {load.section_id !== 1 ? `${load.program_code}-${load.year_level}${load.section_name}` : 'Unassigned General Section'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-400 text-sm font-bold rounded-full border border-brand-200 dark:border-brand-800">
                        {load.required_hours} hrs
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => { if(window.confirm('Delete this load?')) deleteMutation.mutate(load.id) }} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                        <Trash2 className="w-5 h-5 inline" />
                      </button>
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Layers className="w-5 h-5 text-brand-500 dark:text-brand-400"/> Distribute Load Limit</h3>
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Faculty Member</label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-sm"
                  value={formData.faculty_id}
                  onChange={e => setFormData({...formData, faculty_id: e.target.value})}
                  required
                >
                  <option value="">-- Select Instructor --</option>
                  {faculty.map(f => (
                    <option key={f.id} value={f.id}>{f.full_name} (Max: {f.max_teaching_hours} hrs)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 flex justify-between">
                  <span>Target Student Cohort</span>
                </label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50 dark:bg-slate-900 text-sm text-brand-900 dark:text-brand-400 border-brand-200 dark:border-slate-600 font-bold"
                  value={formData.section_id}
                  onChange={e => setFormData({...formData, section_id: e.target.value})}
                  required
                >
                  <option value="">-- 1st: Select Cohort Array --</option>
                  {sections.filter(s => s.id !== 1).map(s => (
                    <option key={s.id} value={s.id}>{s.program_code}-{s.year_level}{s.name}</option>
                  ))}
                  <option value="1">Generic Cross-Section / General Open Load</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Assigned Subject Requirement
                </label>
                <select 
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-sm disabled:opacity-50"
                  value={formData.subject_id}
                  onChange={e => setFormData({...formData, subject_id: e.target.value})}
                  required
                  disabled={!formData.section_id}
                >
                  <option value="">{formData.section_id ? `-- Select filtered Class --` : `-- Waiting for Cohort Data --`}</option>
                  {filteredSubjects.map(s => (
                    <option key={s.id} value={s.id}>[{s.subject_code}] {s.subject_name} - {s.required_hours} hrs</option>
                  ))}
                </select>
                {formData.section_id && formData.section_id !== '1' && (
                  <p className="text-xs text-emerald-600 font-bold mt-2 ml-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Filtering {filteredSubjects.length} subjects based on chosen cohort mapping.
                  </p>
                )}
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                  Assign & Validate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
