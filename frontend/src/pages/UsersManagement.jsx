import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  UserCog, Plus, Edit2, Trash2, X, 
  ShieldAlert, ShieldCheck, Eye, Users, 
  Search, Filter, AlertTriangle, CheckCircle2, 
  KeyRound, Shield
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const ROLE_CONFIG = {
  admin:             { label: 'Admin',             color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', icon: ShieldAlert },
  program_head:      { label: 'Program Head',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Users },
  program_assistant: { label: 'Program Assistant', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', icon: ShieldCheck },
  viewer:            { label: 'Faculty / Viewer',  color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: Eye },
};

const DEFAULT_FORM = { username: '', email: '', password: '', role: 'program_assistant', faculty_id: '' };

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [modalError, setModalError] = useState('');
  
  // Filtering & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const { data: faculty = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: async () => (await api.get('/faculty')).data,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to create user.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/users/${currentId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to update user.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const sendResetMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/send-reset`),
    onSuccess: (res) => {
      setConfirmConfig({
        title: 'Recovery Dispatched',
        message: res.data.message,
        type: 'success',
        onConfirm: () => setIsConfirmModalOpen(false)
      });
      setIsConfirmModalOpen(true);
    },
    onError: (err) => {
      setConfirmConfig({
        title: 'Dispatch Failed',
        message: err.response?.data?.error || 'Could not send recovery email.',
        type: 'danger',
        onConfirm: () => setIsConfirmModalOpen(false)
      });
      setIsConfirmModalOpen(true);
    }
  });

  const openAdd = () => {
    setFormData(DEFAULT_FORM);
    setIsEditing(false);
    setCurrentId(null);
    setModalError('');
    setIsModalOpen(true);
  };

  const openEdit = (u) => {
    setFormData({ username: u.username, email: u.email || '', password: '', role: u.role, faculty_id: u.faculty_id || '' });
    setCurrentId(u.id);
    setIsEditing(true);
    setModalError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    if (isEditing) {
      const payload = { role: formData.role, faculty_id: formData.faculty_id || null, username: formData.username, email: formData.email };
      if (formData.password) payload.password = formData.password;
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(formData);
    }
  };

  // Derived Stats
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const heads = users.filter(u => u.role === 'program_head').length;
    const viewers = users.filter(u => u.role === 'viewer');
    const unlinkedViewers = viewers.filter(u => !u.faculty_id).length;
    return { total, admins, heads, viewers: viewers.length, unlinkedViewers };
  }, [users]);

  // Derived Filtering
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (u.faculty_name && u.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter ? u.role === roleFilter : true;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            User Management
            <span className="text-sm font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full">
              {stats.total} Accounts
            </span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400 leading-relaxed">
            Audit system access, manage administrative roles, and secure faculty accounts.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5 text-sm"
        >
          <Plus className="w-5 h-5" /> Add User
        </button>
      </div>

      {/* UserStats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4 group">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl group-hover:scale-110 transition-transform">
             <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Sys Admins</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.admins}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4 group">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
             <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Prog Heads</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.heads}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4 group">
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-2xl group-hover:scale-110 transition-transform">
             <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Viewers</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.viewers}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-amber-300 transition-colors" title={stats.unlinkedViewers > 0 ? "Some faculty viewers cannot see any schedules because they are unlinked." : "All faculty viewers are correctly linked."}>
          <div className={`p-3 rounded-2xl group-hover:scale-110 transition-transform ${stats.unlinkedViewers > 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
             {stats.unlinkedViewers > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Unlinked</p>
            <p className={`text-2xl font-black ${stats.unlinkedViewers > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stats.unlinkedViewers}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Filtering & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white font-medium placeholder-gray-400 shadow-sm"
            placeholder="Search username or faculty name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
          <select
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none text-gray-700 dark:text-slate-200 font-bold appearance-none shadow-sm cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="program_head">Program Head</option>
            <option value="program_assistant">Program Assistant</option>
            <option value="viewer">Faculty Viewer</option>
          </select>
        </div>
      </div>

      {/* Modernized Data Table */}
      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
               <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-brand-600" />
             </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
              <thead className="bg-gray-50/80 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Account Details</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden md:table-cell">Identity Link</th>
                  <th className="px-6 py-5 text-right text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest w-40">Access Controls</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {filteredUsers.map((u) => {
                  const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer;
                  const RoleIcon = cfg.icon;
                  return (
                    <tr key={u.id} className="hover:bg-white/80 dark:hover:bg-slate-700/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-inner">
                            {u.username.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-base leading-tight">{u.username}</div>
                            <div className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mb-1">{u.email || 'No email registered'}</div>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cfg.color}`}>
                              <RoleIcon className="w-3 h-3" /> {cfg.label}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {u.role === 'admin' ? (
                          <div className="flex items-center gap-2 text-red-500 dark:text-red-400 opacity-70">
                            <Shield className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-widest">System Access</span>
                          </div>
                        ) : u.faculty_name ? (
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{u.faculty_name}</span>
                             <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3" /> Fully Linked</span>
                          </div>
                        ) : u.role === 'viewer' ? (
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-400 dark:text-slate-500 italic">No Faculty Assigned</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> Action Required</span>
                          </div>
                        ) : (
                           <span className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-widest font-semibold">— N/A —</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right w-40">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 rounded-xl text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 transition-colors shadow-sm border border-brand-100 dark:border-brand-800"
                            title="Edit Account"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmConfig({
                                title: 'Reset Identity Key?',
                                message: `Dispatch an institutional Verification Matrix Code to "${u.email}"? This allows the user to securely regain access and synchronize their credentials.`,
                                type: 'brand',
                                onConfirm: () => {
                                  sendResetMutation.mutate(u.id);
                                  setIsConfirmModalOpen(false);
                                }
                              });
                              setIsConfirmModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 transition-colors shadow-sm border border-amber-100 dark:border-amber-800"
                            title="Send Recovery OTP"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => { 
                                setConfirmConfig({
                                  title: 'Delete User Account?',
                                  message: `Are you sure you want to permanently delete the account for "${u.username}"? They will instantly lose access to the system.`,
                                  type: 'danger',
                                  onConfirm: () => deleteMutation.mutate(u.id)
                                });
                                setIsConfirmModalOpen(true);
                              }}
                              className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors shadow-sm border border-red-100 dark:border-red-800"
                              title="Revoke Access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                        <ShieldCheck className="w-12 h-12 mb-3 opacity-20 text-brand-500" />
                        <p className="text-lg font-bold text-gray-600 dark:text-slate-300">No users found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Refined Modular Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-xl">
                   {isEditing ? <UserCog className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {isEditing ? 'Configure Security' : 'Provision User'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {modalError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl text-sm border-2 border-red-500/20 font-bold flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>{modalError}</p>
                </div>
              )}

              {/* Security Context Banner for Admins */}
              {isEditing && formData.role === 'admin' && (
                 <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4" /> Root Access Warning
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">
                      You are modifying a System Administrator. Changing their password immediately revokes their current active sessions.
                    </p>
                 </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">Institutional ID</label>
                <input
                  required
                  type="text"
                  disabled={isEditing}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 text-sm font-bold disabled:opacity-60 transition-all font-mono"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  placeholder="e.g. jdoe"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">Registered Email</label>
                <input
                  required
                  type="email"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@institution.edu"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">
                  <KeyRound className="w-3.5 h-3.5" /> Security Key
                  {isEditing && <span className="ml-auto text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md font-bold">Leave blank to retain</span>}
                </label>
                <input
                  required={!isEditing}
                  type="password"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium transition-all"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEditing ? 'New secret (optional)' : 'Minimum 6 characters'}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">Access Tier</label>
                <select
                  disabled={isEditing && formData.role === 'admin'}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all appearance-none cursor-pointer disabled:opacity-60"
                  value={formData.role}
                  onChange={e => {
                     const newRole = e.target.value;
                     setFormData({ ...formData, role: newRole, faculty_id: newRole === 'viewer' ? formData.faculty_id : '' });
                  }}
                >
                  <option value="admin">System Admin</option>
                  <option value="program_head">Program Head</option>
                  <option value="program_assistant">Program Assistant</option>
                  <option value="viewer">Faculty Viewer</option>
                </select>
              </div>

              {(formData.role === 'viewer') && (
                <div className="animate-fade-in p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Target Roster Subject
                  </label>
                  <select
                    required
                    className="w-full border border-white dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold truncate cursor-pointer shadow-sm"
                    value={formData.faculty_id}
                    onChange={e => setFormData({ ...formData, faculty_id: e.target.value })}
                  >
                    <option value="">— Must Select Identity —</option>
                    {faculty.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                  </select>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                    Viewers can <strong className="text-slate-700 dark:text-slate-200">only</strong> see schedules where their linked identity is assigned as the primary or co-faculty.
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-200 font-bold hover:bg-gray-50 dark:hover:bg-slate-600 transition-all text-sm shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 text-sm">
                  {isEditing ? 'Commit Configuration' : 'Authorize Account'}
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
