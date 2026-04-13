import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  Building, Plus, Archive, X, AlertCircle, RefreshCw, Edit2, 
  MapPin, Users, Activity, Hammer, CheckCircle2, LayoutGrid, List, RotateCcw, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import BulkActions from '../components/BulkActions';

const RoomStats = ({ rooms }) => {
  const stats = useMemo(() => {
    const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const labCount = rooms.filter(r => r.type === 'Laboratory').length;
    const lectureCount = rooms.filter(r => r.type === 'Lecture').length;
    const peakUsage = rooms.length > 0 
      ? (rooms.reduce((sum, r) => sum + Number(r.weekly_hours || 0), 0) / (rooms.length * 40)) * 100 
      : 0;
    const activeRooms = rooms.filter(r => r.status === 'active').length;

    return { totalCapacity, labCount, lectureCount, peakUsage, activeRooms };
  }, [rooms]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="glass p-6 rounded-[2rem] border border-white/40 shadow-lg bg-gradient-to-br from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 transition-all hover:shadow-xl group">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-brand-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-[10px] font-black text-brand-600/50 uppercase tracking-widest">Total Seats</span>
        </div>
        <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 font-display tracking-tight">
          {stats.totalCapacity.toLocaleString()}
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Institutional Capacity</p>
      </div>

      <div className="glass p-6 rounded-[2rem] border border-white/40 shadow-lg bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 transition-all hover:shadow-xl group">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <Building className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">Environment</span>
        </div>
        <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 font-display tracking-tight">
          {stats.lectureCount}<span className="text-sm font-bold text-slate-400 ml-2">LEC / {stats.labCount} LAB</span>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Facility Diversity</p>
      </div>

      <div className="glass p-6 rounded-[2rem] border border-white/40 shadow-lg bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 transition-all hover:shadow-xl group">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest">Utilization</span>
        </div>
        <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 font-display tracking-tight">
          {stats.peakUsage.toFixed(1)}%
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Peak Occupancy Index</p>
      </div>

      <div className="glass p-6 rounded-[2rem] border border-white/40 shadow-lg bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 transition-all hover:shadow-xl group">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest">Active Status</span>
        </div>
        <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 font-display tracking-tight">
          {stats.activeRooms}<span className="text-sm font-bold text-slate-400 ml-2">/ {rooms.length}</span>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Operational Readiness</p>
      </div>
    </div>
  );
};

export default function Rooms() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHead = user?.role === 'program_head' || isAdmin;

  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'Lecture', capacity: 40, campus_id: '', department_id: '', status: 'active' });
  const [error, setError] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });

  const { data: rooms = [], isLoading } = useQuery({ 
    queryKey: ['rooms', showArchived, selectedCampus], 
    queryFn: async () => {
      let url = `/rooms?archived=${showArchived}`;
      if (selectedCampus) url += `&campus_id=${selectedCampus}`;
      const res = await api.get(url);
      return res.data;
    }
  });

  const { data: campuses = [] } = useQuery({
    queryKey: ['campuses'],
    queryFn: async () => (await api.get('/campuses')).data
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data
  });

  const createMutation = useMutation({
    mutationFn: (newRoom) => api.post('/rooms', newRoom),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['rooms'] }); 
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error creating facility.')
  });

  const updateMutation = useMutation({
    mutationFn: (upRoom) => api.put(`/rooms/${currentId}`, upRoom),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['rooms'] }); 
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.error || 'Error updating facility.')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/rooms/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/rooms/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });
  
  const purgeMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}/permanent`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] })
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({ name: '', type: 'Lecture', capacity: 40, campus_id: '', department_id: '', status: 'active' });
    setError('');
  };

  const openEditModal = (r) => {
    setFormData({ name: r.name, type: r.type, capacity: r.capacity, campus_id: r.campus_id || '', department_id: r.department_id || '', status: r.status || 'active' });
    setCurrentId(r.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, department_id: formData.department_id || null };
    if (isEditing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const groupedRooms = useMemo(() => {
    const groups = {};
    rooms.forEach(r => {
      const cName = r.campus_name || 'Main Campus';
      if (!groups[cName]) groups[cName] = [];
      groups[cName].push(r);
    });
    return groups;
  }, [rooms]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white font-display flex items-center gap-3 tracking-tight">
            Facilities & Venues
          </h1>
          <p className="mt-1 text-slate-500 font-medium">Institutional physical resource management and utilization analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <BulkActions 
            entity="rooms"
            columns={['name', 'type', 'capacity', 'campus_name', 'department_code', 'notes']}
          />
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold border transition-all ${
              showArchived 
                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
          {isHead && (
            <button onClick={() => { setIsEditing(false); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition hover:-translate-y-0.5">
              <Plus className="w-5 h-5" /> Provision Facility
            </button>
          )}
        </div>
      </div>

      {!showArchived && <RoomStats rooms={rooms} />}

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 p-6 bg-white/50 dark:bg-slate-900/50 flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-slate-400" />
            <select 
              value={selectedCampus} 
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-brand-500/10 min-w-[220px]"
            >
              <option value="">Global Institution View</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
           <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" /> Live Occupancy</span>
           <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Maintenance</span>
        </div>
      </div>

      <div className="space-y-10">
        {Object.entries(groupedRooms).map(([campusName, campusRooms]) => (
          <div key={campusName} className="animate-fade-in">
            <div className="flex items-center gap-4 mb-6 ml-2">
              <div className="h-8 w-1.5 bg-brand-500 rounded-full" />
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{campusName}</h2>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-black">{campusRooms.length} VENUES</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {campusRooms.map((r) => (
                <div key={r.id} className={`glass rounded-[2.5rem] p-6 border transition-all hover:shadow-2xl group relative overflow-hidden ${
                  r.status === 'maintenance' 
                    ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-900/10' 
                    : 'border-white/40 bg-white/60 dark:bg-slate-800/60'
                }`}>
                  {r.is_occupied === 1 && r.status === 'active' && (
                    <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      In Use
                    </div>
                  )}
                  {r.status === 'maintenance' && (
                    <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                      <Hammer className="w-3 h-3" />
                      Maintenance
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                      r.type === 'Laboratory' 
                        ? 'bg-amber-500 text-white shadow-amber-500/20' 
                        : 'bg-brand-600 text-white shadow-brand-500/20'
                    }`}>
                      <Building className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display leading-tight">{r.name}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {r.type} {r.department_code && <span className="text-brand-500 dark:text-brand-400">| {r.department_code}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Seats</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{r.capacity}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Loads</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{r.usage_count || 0}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Hrs/Wk</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{Math.round(r.weekly_hours || 0)}h</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(r)}
                        className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"
                        title="Edit Facility"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                         onClick={() => {
                           statusMutation.mutate({ id: r.id, status: r.status === 'active' ? 'maintenance' : 'active' });
                         }}
                         className={`p-2 rounded-xl transition-colors ${
                           r.status === 'active' 
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30'
                         }`}
                         title={r.status === 'active' ? "Mark for Maintenance" : "Set to Active"}
                      >
                        {r.status === 'active' ? <Hammer className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {showArchived ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => restoreMutation.mutate(r.id)}
                          className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors"
                          title="Restore Facility"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              setConfirmConfig({
                                title: 'PERMANENTLY DELETE?',
                                message: `WARNING: You are about to IRREVERSIBLY purge room ${r.name}. This cannot be undone and may affect historical reports.`,
                                type: 'danger',
                                onConfirm: () => purgeMutation.mutate(r.id)
                              });
                              setIsConfirmModalOpen(true);
                            }}
                            className="p-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                            title="Permanent Purge"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => { 
                          setConfirmConfig({
                            title: 'Archive Facility?',
                            message: `Are you sure you want to archive room ${r.name}? This will remove it from scheduling availability.`,
                            type: 'danger',
                            onConfirm: () => deleteMutation.mutate(r.id)
                          });
                          setIsConfirmModalOpen(true);
                        }}
                        className="p-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                        title="Archive Room"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-white/20">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">
                {isEditing ? 'Modify Facility' : 'Provision Room'}
              </h3>
              <button onClick={closeModal} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Room Designation</label>
                <input required type="text" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] px-5 py-4 outline-none focus:border-brand-500 bg-slate-50 dark:bg-slate-900 dark:text-white font-black text-lg font-mono uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. COMP LAB 1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Campus Location</label>
                  <select 
                    required 
                    className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] px-5 py-4 outline-none focus:border-brand-500 bg-white dark:bg-slate-900 dark:text-white font-bold"
                    value={formData.campus_id} 
                    onChange={e => setFormData({...formData, campus_id: e.target.value})}
                  >
                    <option value="">Select Campus</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assign to Department (Optional)</label>
                  <select 
                    className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] px-5 py-4 outline-none focus:border-brand-500 bg-white dark:bg-slate-900 dark:text-white font-bold"
                    value={formData.department_id} 
                    onChange={e => setFormData({...formData, department_id: e.target.value})}
                  >
                    <option value="">-- Institutional Shared --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Type</label>
                  <select 
                    className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] px-5 py-4 outline-none focus:border-brand-500 bg-white dark:bg-slate-900 dark:text-white font-bold" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Lecture">Lecture / Standard</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Science Lab">Science Lab</option>
                    <option value="Kitchen">Culinary Kitchen</option>
                    <option value="Court">Gym / Court / Field</option>
                    <option value="Engineering Lab">Engineering Lab</option>
                    <option value="Laboratory">General Laboratory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Capacity</label>
                  <input required type="number" min="1" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] px-5 py-4 outline-none focus:border-brand-500 text-center font-black dark:bg-slate-900 dark:text-white" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
                </div>
              </div>
              
              <div className="pt-4 flex gap-4 mt-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 shadow-xl shadow-brand-500/20 transition-all disabled:opacity-50">
                  {isEditing ? 'Save Changes' : 'Provision Now'}
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
