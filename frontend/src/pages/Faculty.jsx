import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Plus, Edit2, Trash2, Search, X, Clock } from 'lucide-react';
import UnavailabilityModal from '../components/UnavailabilityModal';

export default function Faculty() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [managingAvailabilityFor, setManagingAvailabilityFor] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '', department: '', specialization: '', max_teaching_hours: 20
  });

  const queryClient = useQueryClient();

  // Queries
  const { data: faculty = [], isLoading } = useQuery({
    queryKey: ['faculty'],
    queryFn: async () => {
      const res = await api.get('/faculty');
      return res.data;
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newFaculty) => api.post('/faculty', newFaculty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (updated) => api.put(`/faculty/${currentId}`, updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/faculty/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] })
  });

  // Handlers
  const openAddModal = () => {
    setFormData({ full_name: '', department: '', specialization: '', max_teaching_hours: 20 });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (fac) => {
    setFormData({ 
      full_name: fac.full_name, 
      department: fac.department, 
      specialization: fac.specialization, 
      max_teaching_hours: fac.max_teaching_hours 
    });
    setCurrentId(fac.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const filteredFaculty = faculty.filter(f => 
    f.full_name.toLowerCase().includes(search.toLowerCase()) || 
    f.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Faculty Management</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Add, edit or remove teaching staff members.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5">
          <Plus className="w-5 h-5" /> Add Faculty
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
              placeholder="Search faculty..."
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Specialization</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Max Hours</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {filteredFaculty.map((f) => (
                  <tr key={f.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">{f.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300">{f.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300">{f.specialization || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 rounded-full font-bold text-xs">
                        {f.max_teaching_hours} hrs
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setManagingAvailabilityFor(f)} className="text-amber-500 hover:text-amber-700 mr-4 transition-colors" title="Manage Time Blocks"><Clock className="w-5 h-5 inline" /></button>
                      <button onClick={() => openEditModal(f)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 transition-colors" title="Edit Properties"><Edit2 className="w-5 h-5 inline" /></button>
                      <button onClick={() => { if(window.confirm('Delete faculty?')) deleteMutation.mutate(f.id) }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Remove Instuctor"><Trash2 className="w-5 h-5 inline" /></button>
                    </td>
                  </tr>
                ))}
                {filteredFaculty.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-slate-500 italic">No faculty records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 my-8">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Faculty' : 'Add New Faculty'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                <input required type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
                  <input required type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max Hours</label>
                  <input required type="number" min="1" className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" value={formData.max_teaching_hours} onChange={e => setFormData({...formData, max_teaching_hours: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Specialization</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500" value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50">
                  {isEditing ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unavailability Sub-Modal */}
      {managingAvailabilityFor && (
        <UnavailabilityModal 
          faculty={managingAvailabilityFor} 
          onClose={() => setManagingAvailabilityFor(null)} 
        />
      )}
    </div>
  );
}
