import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  MapPin, Plus, Edit2, Trash2, RotateCcw, Building2, 
  Search, Shield, Activity, Globe, LayoutGrid, X
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import BulkActions from '../components/BulkActions';

export default function Campuses() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampus, setCurrentCampus] = useState({ name: '', code: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });

  const { data: campuses, isLoading } = useQuery({
    queryKey: ['campuses', showArchived],
    queryFn: async () => (await api.get('/campuses', { params: { archived: showArchived } })).data
  });

  const mutation = useMutation({
    mutationFn: (newCampus) => isEditing 
      ? api.put(`/campuses/${currentCampus.id}`, newCampus)
      : api.post('/campuses', newCampus),
    onSuccess: () => {
      queryClient.invalidateQueries(['campuses']);
      setShowModal(false);
      resetForm();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.delete(`/campuses/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['campuses'])
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/campuses/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries(['campuses'])
  });

  const resetForm = () => {
    setCurrentCampus({ name: '', code: '' });
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(currentCampus);
  };

  const handleEdit = (campus) => {
    setCurrentCampus(campus);
    setIsEditing(true);
    setShowModal(true);
  };

  const filteredCampuses = (campuses || []).filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white font-display tracking-tight flex items-center gap-4">
            <Globe className="w-10 h-10 text-brand-600" /> Campus Management
          </h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400 font-medium text-lg">
            Organize institutional resources across physical locations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BulkActions 
            entity="campuses"
            columns={['name', 'code']}
          />
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border ${
              showArchived 
                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800' 
                : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {showArchived ? 'View Active' : 'View Archived'}
          </button>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white font-black rounded-2xl shadow-xl hover:bg-brand-700 hover:-translate-y-1 transition active:translate-y-0 text-sm"
          >
            <Plus className="w-5 h-5" /> Add Campus
          </button>
        </div>
      </div>

      {/* Stats Layer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <StatCard label="Total Locations" value={campuses?.length || 0} icon={MapPin} color="text-brand-600" bg="bg-brand-50/50 dark:bg-brand-900/20" />
        <StatCard label="Primary Region" value="Luzon" icon={Globe} color="text-blue-600" bg="bg-blue-50/50 dark:bg-blue-900/20" />
        <StatCard label="System Status" value="Online" icon={Activity} color="text-emerald-600" bg="bg-emerald-50/50 dark:bg-emerald-900/20" />
      </div>

      {/* Search & Management Grid */}
      <div className="glass rounded-[2.5rem] p-8 shadow-2xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 min-h-[500px]">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search by name or code..."
              className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <p className="text-gray-400 font-medium animate-pulse">Loading geography...</p>
          </div>
        ) : filteredCampuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
            <LayoutGrid className="w-16 h-16 opacity-20" />
            <p className="text-xl font-bold">No campuses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampuses.map((campus) => (
              <div key={campus.id} className="glass group p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  {!showArchived ? (
                    <>
                      <button onClick={() => handleEdit(campus)} className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-100 dark:border-slate-600 text-blue-600 hover:scale-110 transition"><Edit2 className="w-4 h-4" /></button>
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            title: 'Archive Campus?',
                            message: `Are you sure you want to archive "${campus.name}"? This will hide its associated Faculty, Rooms, and Sections from active scheduling views.`,
                            type: 'danger',
                            onConfirm: () => archiveMutation.mutate(campus.id)
                          });
                          setIsConfirmModalOpen(true);
                        }} 
                        className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-100 dark:border-slate-600 text-red-600 hover:scale-110 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setConfirmConfig({
                          title: 'Restore Campus?',
                          message: `This will reactivate "${campus.name}" and all its linked resources throughout the system.`,
                          type: 'restore',
                          onConfirm: () => restoreMutation.mutate(campus.id)
                        });
                        setIsConfirmModalOpen(true);
                      }} 
                      className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-100 dark:border-slate-600 text-emerald-600 hover:scale-110 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 border border-brand-100 dark:border-brand-800 shadow-inner">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight">{campus.name}</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{campus.code}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg border border-blue-100 dark:border-blue-800/50">Luzon Region</span>
                    <span className="px-3 py-1 bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 text-[10px] font-black rounded-lg border border-gray-100 dark:border-slate-600">Active Node</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-scale-in">
            <div className="p-8 border-b border-gray-100 dark:border-slate-800">
               <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                 <Shield className="w-6 h-6 text-brand-600" /> {isEditing ? 'Update Campus' : 'Onboard New Campus'}
               </h2>
               <p className="text-sm text-gray-500 mt-1">Institutional geographic identifier node.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Campus Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Main Campus"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-brand-500/10 transition-all font-bold"
                  value={currentCampus.name}
                  onChange={(e) => setCurrentCampus({...currentCampus, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Campus Code</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. MAIN"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-brand-500/10 transition-all font-bold uppercase"
                  value={currentCampus.code}
                  onChange={(e) => setCurrentCampus({...currentCampus, code: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={mutation.isLoading}
                  className="flex-1 py-4 bg-brand-600 text-white font-black rounded-2xl shadow-lg hover:bg-brand-700 transition disabled:opacity-50"
                >
                  {mutation.isLoading ? 'Processing...' : isEditing ? 'Save Changes' : 'Initialize Node'}
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

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="glass p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-3xl font-black ${color} tracking-tight`}>{value}</p>
        </div>
        <div className={`p-4 rounded-2xl ${bg} ${color}`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
