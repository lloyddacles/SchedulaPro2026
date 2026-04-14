import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import { useAuth } from '../context/AuthContext';
import {
  Layers, PlusCircle, Trash2, ShieldAlert, X, AlertCircle,
  SendHorizonal, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Edit, Archive, RotateCcw, MapPin, Users, Star
} from 'lucide-react';
import { formatYearLevelShort } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';

// ── Status Config ─────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:          { label: 'Draft',          bg: 'bg-gray-100 dark:bg-slate-700',          text: 'text-gray-600 dark:text-slate-300',       dot: 'bg-gray-400' },
  pending_review: { label: 'Pending Review', bg: 'bg-amber-100 dark:bg-amber-900/30',      text: 'text-amber-700 dark:text-amber-400',       dot: 'bg-amber-400' },
  approved:       { label: 'Approved',       bg: 'bg-emerald-100 dark:bg-emerald-900/30',  text: 'text-emerald-700 dark:text-emerald-400',   dot: 'bg-emerald-500' },
  rejected:       { label: 'Rejected',       bg: 'bg-red-100 dark:bg-red-900/30',          text: 'text-red-700 dark:text-red-400',            dot: 'bg-red-500' },
  archived:       { label: 'Archived',       bg: 'bg-gray-200 dark:bg-slate-800',          text: 'text-gray-500 dark:text-slate-400',         dot: 'bg-gray-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function TeachingLoads() {
  const queryClient = useQueryClient();
  const { activeTermId } = useScheduleStore();
  const { user } = useAuth();
  
  const initialForm = { id: null, faculty_id: '', co_faculty_id_1: '', co_faculty_id_2: '', subject_ids: [], subject_id: '', section_id: '' };
  const [formData, setFormData] = useState(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'archived'
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);
  const [bulkRejectNote, setBulkRejectNote] = useState('');
  
  const [rejectModal, setRejectModal] = useState(null); // load id
  const [rejectNote, setRejectNote] = useState('');
  const [expandedReject, setExpandedReject] = useState(null); // show rejection note
  
  const [evalModal, setEvalModal] = useState(null); // load obj for evaluation
  const [evalRating, setEvalRating] = useState('Satisfactory');
  const [evalNote, setEvalNote] = useState('');
  
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', type: 'danger', onConfirm: () => {} });
  
  const isAdmin     = user?.role === 'admin';
  const isHead      = user?.role === 'program_head' || isAdmin;
  const isAssistant = user?.role === 'program_assistant';

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: async () => (await api.get('/campuses')).data });
  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['loads', activeTermId, activeTab === 'archived', selectedCampusId],
    queryFn: async () => (await api.get('/teaching-loads', { params: { term_id: activeTermId, archived: activeTab === 'archived', campus_id: selectedCampusId || undefined } })).data,
    enabled: !!activeTermId
  });
  const { data: faculty = [] } = useQuery({ 
    queryKey: ['faculty', activeTermId, selectedCampusId], 
    queryFn: async () => (await api.get('/faculty', { params: { term_id: activeTermId, campus_id: selectedCampusId || undefined } })).data,
    enabled: !!activeTermId
  });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: async () => (await api.get('/subjects')).data });
  const { data: sections = [] } = useQuery({ 
    queryKey: ['sections', selectedCampusId], 
    queryFn: async () => (await api.get('/sections', { params: { campus_id: selectedCampusId || undefined } })).data 
  });

  // ── Computed ─────────────────────────────────────────────────────────────
  const isEditing = !!formData.id;
  const selectedFaculty = faculty.find(f => f.id === Number(formData.faculty_id));
  const currentHours    = selectedFaculty ? Number(selectedFaculty.current_load) || 0 : 0;
  
  let projectedHours = currentHours;
  if (isEditing) {
    const selectedSubject = subjects.find(s => s.id === Number(formData.subject_id));
    projectedHours += (selectedSubject ? Number(selectedSubject.required_hours) : 0);
  } else {
    formData.subject_ids.forEach(sid => {
      const s = subjects.find(sub => sub.id === Number(sid));
      if (s) projectedHours += Number(s.required_hours);
    });
  }

  const maxHours        = selectedFaculty ? Number(selectedFaculty.max_teaching_hours) : 0;
  const hardCap         = 60;
  const loadRatio       = Math.min((projectedHours / hardCap) * 100, 100);
  const isOverload      = maxHours > 0 && projectedHours > maxHours;
  const isHardCapped    = projectedHours > hardCap;
  const isNearLimit     = !isHardCapped && projectedHours > 0 && (hardCap - projectedHours) <= 3;

  const pendingLoads = loads.filter(l => l.status === 'pending_review');

  const filteredSubjects = formData.section_id && formData.section_id !== '1'
    ? subjects.filter(s => {
        const sec = sections.find(x => x.id === Number(formData.section_id));
        if (!sec) return true;
        if (s.program_id && s.year_level) return s.program_id === sec.program_id && s.year_level === sec.year_level;
        return true;
      })
    : subjects;

  const specFacs = [];
  const otherFacs = [];
  faculty.forEach(f => {
    const activeSub = isEditing ? formData.subject_id : formData.subject_ids[0];
    const isSpec = activeSub && f.specializations_array?.includes(Number(activeSub));
    if (isSpec) specFacs.push(f);
    else otherFacs.push(f);
  });

  const renderFacultyOption = (f) => {
    const currentLoad = Number(f.current_load) || 0;
    const isFull = currentLoad >= 60;
    const baseMax = Number(f.max_teaching_hours);
    const overload = currentLoad > baseMax ? currentLoad - baseMax : 0;
    
    return (
      <option key={f.id} value={f.id} disabled={isFull}>
        {f.full_name} {isFull ? '[60-HR CAPACITY REACHED]' : `(${currentLoad} / ${baseMax} hrs)`} {overload > 0 ? `[+${overload} Overload Units]` : ''}
      </option>
    );
  };

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (newLoad) => api.post('/teaching-loads', { ...newLoad, term_id: activeTermId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); closeModal(); },
    onError: (err) => setError(err.response?.data?.error?.details || err.response?.data?.error?.message || 'Error executing request.')
  });

  const updateMutation = useMutation({
    mutationFn: (upLoad) => api.put(`/teaching-loads/${upLoad.id}`, { ...upLoad, term_id: activeTermId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); closeModal(); },
    onError: (err) => setError(err.response?.data?.error?.details || err.response?.data?.error?.message || 'Error executing request.')
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.patch(`/teaching-loads/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loads'] })
  });

  const submitMutation = useMutation({
    mutationFn: (id) => api.patch(`/teaching-loads/${id}/submit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loads'] })
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/teaching-loads/${id}/approve`, { reviewed_by: user?.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loads'] })
  });

  const evaluateMutation = useMutation({
    mutationFn: (payload) => api.post('/evaluations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] }); // To trigger data refresh if we attached evals to loads
      setEvalModal(null);
      alert('Teaching Load Evaluation successfully submitted.');
    },
    onError: (err) => setError(err.response?.data?.error?.details || err.response?.data?.message || 'Error submitting evaluation.')
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }) => api.patch(`/teaching-loads/${id}/reject`, { reviewed_by: user?.id, review_notes: note }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); setRejectModal(null); setRejectNote(''); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teaching-loads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loads'] })
  });
  
  const purgeMutation = useMutation({
    mutationFn: (id) => api.delete(`/teaching-loads/${id}/permanent`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loads'] })
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => api.patch('/teaching-loads/bulk-approve', { ids, reviewed_by: user?.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); setSelectedIds([]); },
    onError: (err) => setError(err.response?.data?.error?.message || 'Bulk approval failed')
  });

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, note }) => api.patch('/teaching-loads/bulk-reject', { ids, reviewed_by: user?.id, review_notes: note }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); setSelectedIds([]); setIsBulkRejectModalOpen(false); setBulkRejectNote(''); },
    onError: (err) => setError(err.response?.data?.error?.message || 'Bulk rejection failed')
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const closeModal = () => { setIsModalOpen(false); setFormData(initialForm); setError(''); };
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (isEditing) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const displayLoads = activeTab === 'pending' ? pendingLoads : loads;

  const groupedSectionsForDropdown = React.useMemo(() => {
    return sections.filter(s => Number(s.id) !== 1).reduce((acc, sec) => {
      const key = sec.program_code && sec.program_name ? `${sec.program_code} - ${sec.program_name}` : 'Unmapped Sections';
      if (!acc[key]) acc[key] = [];
      acc[key].push(sec);
      return acc;
    }, {});
  }, [sections]);

  const groupedLoads = React.useMemo(() => {
    return displayLoads.reduce((acc, load) => {
      const key = Number(load.section_id) === 1 || !load.program_code 
        ? 'General Education / Cross-Sectional Subjects' 
        : `${load.program_code} - ${load.program_name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(load);
      return acc;
    }, {});
  }, [displayLoads]);

  const sortedProgramKeys = Object.keys(groupedLoads).sort((a, b) => {
    if (a.startsWith('General')) return 1;
    if (b.startsWith('General')) return -1;
    return a.localeCompare(b);
  });

  const stats = React.useMemo(() => {
    const total = loads.length;
    const approved = loads.filter(l => l.status === 'approved').length;
    const pending = loads.filter(l => l.status === 'pending_review').length;
    const totalHrs = loads.reduce((acc, l) => acc + (Number(l.required_hours) || 0), 0);
    const approvedHrs = loads.filter(l => l.status === 'approved').reduce((acc, l) => acc + (Number(l.required_hours) || 0), 0);
    const overloadFac = faculty.filter(f => (Number(f.current_load) || 0) > (Number(f.max_teaching_hours) || 0)).length;
    
    return { 
      total, 
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0, 
      pending, 
      totalHrs, 
      approvedHrs,
      overloadFac
    };
  }, [loads, faculty]);

  const toggleSelectAll = (progLoads) => {
    const progIds = progLoads.map(l => l.id);
    const allSelected = progIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !progIds.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...progIds])]);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Teaching Workload Management</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Institutional recruitment and curriculum mapping for the active academic term.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 shadow-sm min-w-max">
            <MapPin className="w-4 h-4 text-brand-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Campus Scope</span>
              <select
                id="loadCampusScope"
                name="loadCampusScope"
                className="text-sm font-bold bg-transparent text-gray-900 dark:text-white outline-none cursor-pointer"
                value={selectedCampusId}
                onChange={(e) => { setSelectedCampusId(e.target.value); }}
              >
                <option value="">Full Institution</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => { setFormData(initialForm); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg hover:bg-brand-700 transition hover:-translate-y-0.5 text-sm flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> New Workload Assignment
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assigned Hrs', value: `${stats.totalHrs} hrs`, icon: Clock, color: 'brand' },
          { label: 'Approval Rate', value: `${stats.approvalRate}%`, icon: CheckCircle2, color: 'emerald' },
          { label: 'Pending Review', value: stats.pending, icon: AlertCircle, color: 'amber' },
          { label: 'Overloaded Faculty', value: stats.overloadFac, icon: Users, color: 'rose' }
        ].map((stat, i) => (
          <div key={i} className="glass rounded-3xl p-5 border border-white/40 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${stat.color}-500/5 rounded-full`} />
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-slate-700/50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'all' ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}
        >
          All Assignments ({activeTab === 'archived' ? '-' : loads.length})
        </button>
        {(isHead || isAssistant) && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'pending' ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}
          >
            Pending Approval
            {pendingLoads.length > 0 && activeTab !== 'archived' && (
              <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                {pendingLoads.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'archived' ? 'border-gray-500 text-gray-600 dark:text-gray-400 dark:border-gray-500' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}
        >
          Historical Records
        </button>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-40 glass rounded-[2rem]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : sortedProgramKeys.length === 0 ? (
          <div className="glass rounded-[2rem] p-8 text-center">
            {activeTab === 'pending'
              ? <div className="flex flex-col items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                  <p className="font-semibold text-sm">No loads pending review — all clear!</p>
                </div>
              : activeTab === 'archived' ? <p className="text-gray-400 dark:text-slate-500 italic font-medium">No historically archived loads found.</p>
              : <p className="text-gray-400 dark:text-slate-500 italic font-medium">No loads mapped for this exact term natively.</p>
            }
          </div>
        ) : (
          sortedProgramKeys.map(programKey => {
            const progLoads = groupedLoads[programKey];
            return (
              <div key={programKey} className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden">
                <div className="bg-brand-50/80 dark:bg-slate-800 border-b border-brand-100 dark:border-slate-700/50 px-6 py-4 flex items-center justify-between">
                  <h2 className={`text-lg font-bold ${programKey.startsWith('General') ? 'text-indigo-800 dark:text-indigo-300' : 'text-brand-800 dark:text-brand-300'}`}>
                    {programKey}
                  </h2>
                  <span className="bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 font-bold px-3 py-1 rounded-full text-xs shadow-sm shadow-brand-100/50 dark:shadow-none border border-brand-100 dark:border-slate-600">
                    {progLoads.length} {progLoads.length === 1 ? 'Workload Assignment' : 'Workload Assignments'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
                    <thead className="bg-gray-50/50 dark:bg-slate-900/40">
                      <tr>
                        {isHead && activeTab === 'pending' && (
                          <th className="px-6 py-4 text-left w-10">
                            <input
                              type="checkbox"
                              id={`loadBulkSelect-${programKey}`}
                              name={`loadBulkSelect-${programKey}`}
                              checked={progLoads.every(l => selectedIds.includes(l.id))}
                              onChange={() => toggleSelectAll(progLoads)}
                              className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Faculty Arrays</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Subject & Section Data</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase hidden sm:table-cell">Hrs/Wk</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Status</th>
                        <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                      {progLoads.map((load) => (
                        <React.Fragment key={load.id}>
                          <tr className={`hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors ${selectedIds.includes(load.id) ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}>
                            {isHead && activeTab === 'pending' && (
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  id={`loadSelect-${load.id}`}
                                  name={`loadSelect-${load.id}`}
                                  checked={selectedIds.includes(load.id)}
                                  onChange={() => {
                                    setSelectedIds(prev => prev.includes(load.id) ? prev.filter(id => id !== load.id) : [...prev, load.id]);
                                  }}
                                  className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{load.faculty_name}</div>
                        {(load.co_faculty_1_name || load.co_faculty_2_name) && (
                          <div className="text-[11px] text-brand-600 dark:text-brand-400 mt-0.5 space-y-0.5 font-bold">
                            {load.co_faculty_1_name && <div>+ {load.co_faculty_1_name}</div>}
                            {load.co_faculty_2_name && <div>+ {load.co_faculty_2_name}</div>}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">{load.department}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-brand-700 dark:text-brand-400">{load.subject_code}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{load.subject_name}</div>
                        <span className="mt-1 inline-flex items-center text-[9px] font-extrabold text-white bg-indigo-500 px-1.5 py-0.5 rounded uppercase">
                          {`${load.program_code}-${formatYearLevelShort(load.year_level, load.program_type)}${load.section_name}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
                        <span className="px-2.5 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-800 dark:text-brand-400 text-xs font-bold rounded-full border border-brand-100 dark:border-brand-800">
                          {load.required_hours} hrs
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge status={load.status} />
                          {load.status === 'rejected' && (
                            <button
                              onClick={() => setExpandedReject(expandedReject === load.id ? null : load.id)}
                              className="text-[9px] text-red-500 dark:text-red-400 font-bold flex items-center gap-0.5"
                            >
                              {expandedReject === load.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              View reason
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right w-40">
                        <div className="flex items-center justify-end gap-1">
                          {/* Program Assistant: Endorse for approval */}
                          {(isAssistant || isAdmin) && ['draft', 'rejected'].includes(load.status) && activeTab !== 'archived' && (
                            <button
                              onClick={() => submitMutation.mutate(load.id)}
                              disabled={submitMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg text-xs font-bold transition-colors"
                              title="Endorse for Approval"
                            >
                              <SendHorizonal className="w-3.5 h-3.5" /> Endorse
                            </button>
                          )}

                          {/* Edit Row Payload */}
                          {(isAdmin || ['draft', 'rejected'].includes(load.status)) && activeTab !== 'archived' && (
                            <button
                              onClick={() => { setFormData({ id: load.id, faculty_id: load.faculty_id, co_faculty_id_1: load.co_faculty_id_1||'', co_faculty_id_2: load.co_faculty_id_2||'', subject_id: load.subject_id, subject_ids: [], section_id: load.section_id }); setIsModalOpen(true); }}
                              className="p-1.5 rounded-lg text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit Load"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Program Head / Admin: Approve & Reject */}
                          {isHead && load.status === 'pending_review' && activeTab !== 'archived' && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(load.id)}
                                disabled={approveMutation.isPending}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setRejectModal(load.id); setRejectNote(''); }}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Archive (If Approved or Admin) */}
                          {isHead && ['approved', 'archived'].includes(load.status) && (
                            <button
                              onClick={() => { setEvalModal(load); setEvalRating('Satisfactory'); setEvalNote(''); }}
                              className="p-1.5 rounded-lg text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              title="Evaluate Teaching Load"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && activeTab !== 'archived' && (
                             <button
                               onClick={() => {
                                 setConfirmConfig({
                                   title: 'Archive Load',
                                   message: 'This will move the load from the active queue to historical records. Are you sure?',
                                   type: 'danger',
                                   onConfirm: () => archiveMutation.mutate(load.id)
                                 });
                                 setIsConfirmModalOpen(true);
                               }}
                               className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 bg-gray-50 dark:bg-slate-900/50 dark:hover:text-white transition-colors"
                               title="Archive"
                             >
                               <Archive className="w-4 h-4" />
                             </button>
                          )}

                          {/* Delete (draft only or archived) */}
                          {(load.status === 'draft' || activeTab === 'archived') && (
                             <button
                               onClick={() => {
                                 setConfirmConfig({
                                   title: 'Permanently Delete',
                                   message: 'Are you sure you want to permanently delete this load block from the database? This cannot be undone.',
                                   type: 'danger',
                                   onConfirm: () => {
                                   if (activeTab === 'archived') purgeMutation.mutate(load.id);
                                   else deleteMutation.mutate(load.id);
                                 }
                                 });
                                 setIsConfirmModalOpen(true);
                               }}
                               className="p-1.5 rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                               title="Delete"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Rejection note row */}
                    {load.status === 'rejected' && expandedReject === load.id && (
                      <tr className="bg-red-50/50 dark:bg-red-900/10">
                        <td colSpan="5" className="px-6 py-3">
                          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-xs uppercase tracking-wide mb-0.5">Rejection Note</p>
                              <p>{load.review_notes}</p>
                              {load.reviewed_by_name && (
                                <p className="text-xs text-red-500/70 dark:text-red-500/50 mt-1">by {load.reviewed_by_name} · {new Date(load.reviewed_at).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
      />

      {/* ── Rejection Modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
              <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Teaching Load
              </h3>
              <button onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Provide a reason for rejection. The preparatory Assistant will see this note and can resubmit after corrections.
              </p>
              <textarea
                autoFocus
                id="loadRejectNote"
                name="loadRejectNote"
                rows={4}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="e.g. Schedule conflicts with another section, please reassign another time slot..."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: rejectModal, note: rejectNote })}
                  disabled={!rejectNote.trim() || rejectMutation.isPending}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Evaluation Modal (Phase 3) ───────────────────────────────────────── */}
      {evalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
              <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" /> Performance Evaluation
              </h3>
              <button onClick={() => setEvalModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-sm">
                <p className="font-bold text-gray-900 dark:text-white">{evalModal.faculty_name}</p>
                <p className="text-gray-500 dark:text-slate-400">{evalModal.subject_code} — {evalModal.section_name}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Rating</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Excellent', 'Satisfactory', 'Needs Improvement'].map(r => (
                    <button
                      key={r}
                      onClick={() => setEvalRating(r)}
                      className={`py-2 px-2 text-xs font-bold border rounded-xl text-center transition-colors ${
                        evalRating === r 
                        ? (r === 'Excellent' ? 'bg-emerald-500 border-emerald-600 text-white shadow-inner' : r === 'Satisfactory' ? 'bg-blue-500 border-blue-600 text-white shadow-inner' : 'bg-amber-500 border-amber-600 text-white shadow-inner')
                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {r.replace(' ', '\n')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Qualitative Notes (Optional)</label>
                 <textarea
                   rows={3}
                   className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-gray-400"
                   placeholder="Add specific feedback or observations here..."
                   value={evalNote}
                   onChange={e => setEvalNote(e.target.value)}
                 />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEvalModal(null)} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors uppercase tracking-wide">
                  Cancel
                </button>
                <button
                  onClick={() => evaluateMutation.mutate({ teaching_load_id: evalModal.id, rating: evalRating, notes: evalNote })}
                  disabled={evaluateMutation.isPending}
                  className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50 uppercase tracking-wide flex justify-center items-center gap-2"
                >
                   {evaluateMutation.isPending ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign/Edit Load Modal ────────────────────────────────────────────── */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {isEditing ? <Edit className="w-5 h-5 text-brand-500" /> : <Layers className="w-5 h-5 text-brand-500" />} 
                {isEditing ? 'Edit Teaching Load' : 'Assign Teaching Load'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Info banner */}
              {!isEditing && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                  <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>New assignments are saved as <strong>Draft</strong>. Endorse when ready for Program Head review.</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">1. Target Student Section</label>
                <select
                  required
                  id="load_section_id"
                  name="load_section_id"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50 dark:bg-slate-900 text-brand-900 dark:text-brand-400 border-brand-200 font-bold text-sm"
                  value={formData.section_id}
                  onChange={e => setFormData({ ...formData, section_id: e.target.value })}
                >
                  <option value="">-- Select Target Section --</option>
                  {Object.entries(groupedSectionsForDropdown).sort((a,b) => a[0].localeCompare(b[0])).map(([programKey, progSecs]) => (
                    <optgroup key={programKey} label={programKey}>
                      {progSecs.map(s => (
                        <option key={s.id} value={s.id}>{s.program_code}-{s.year_level}{s.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="General Education">
                    <option value="1">General / Cross-Section</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  2. Target {isEditing ? 'Subject' : 'Subjects (Multi-Select)'}
                </label>
                {isEditing ? (
                  <select
                    required
                    id="load_subject_id"
                    name="load_subject_id"
                    disabled={!formData.section_id}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-sm disabled:opacity-50"
                    value={formData.subject_id}
                    onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                  >
                    <option value="">{formData.section_id ? '— Select Subject —' : '— Select Section First —'}</option>
                    {filteredSubjects.map(s => (
                      <option key={s.id} value={s.id}>[{s.subject_code}] {s.subject_name} — {s.required_hours} hrs</option>
                    ))}
                  </select>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-xl p-3 space-y-2 bg-gray-50 dark:bg-slate-900 shadow-inner">
                    {!formData.section_id ? (
                       <p className="text-sm text-gray-400 italic text-center py-4">Select Section First</p>
                    ) : (
                      filteredSubjects.map(s => (
                        <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
                          <input
                            type="checkbox"
                            id={`load_subject-${s.id}`}
                            name={`load_subject-${s.id}`}
                            checked={formData.subject_ids.includes(s.id.toString())}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...formData.subject_ids, s.id.toString()]
                                : formData.subject_ids.filter(id => id !== s.id.toString());
                              setFormData({ ...formData, subject_ids: newIds });
                            }}
                            className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700"
                          />
                          <div className="flex-1 text-sm">
                            <span className="font-bold text-gray-900 dark:text-white">[{s.subject_code}]</span> {s.subject_name}
                          </div>
                          <span className="text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded font-semibold">{s.required_hours}h</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
                {formData.section_id && formData.section_id !== '1' && !isEditing && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-2 ml-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Filtered to {filteredSubjects.length} subjects for this section
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">3. Primary Instructor</label>
                <select
                  required
                  id="load_faculty_id"
                  name="load_faculty_id"
                  disabled={isEditing ? !formData.subject_id : formData.subject_ids.length === 0}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-white text-sm disabled:opacity-50"
                  value={formData.faculty_id}
                  onChange={e => setFormData({ ...formData, faculty_id: e.target.value })}
                >
                  <option value="">{(isEditing ? formData.subject_id : formData.subject_ids.length > 0) ? '— Select Instructor —' : '— Select Subject First —'}</option>
                  {specFacs.length > 0 && <optgroup label="🌟 Specialized / Recommended">{specFacs.map(renderFacultyOption)}</optgroup>}
                  <optgroup label="Other Faculty">{otherFacs.map(renderFacultyOption)}</optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Co-Teacher 1 <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <select
                    id="load_co_faculty_1"
                    name="load_co_faculty_1"
                    disabled={isEditing ? !formData.subject_id : formData.subject_ids.length === 0}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-white text-sm disabled:opacity-50"
                    value={formData.co_faculty_id_1}
                    onChange={e => setFormData({ ...formData, co_faculty_id_1: e.target.value })}
                  >
                    <option value="">None</option>
                    {specFacs.length > 0 && <optgroup label="🌟 Recommended">{specFacs.filter(f => f.id !== Number(formData.faculty_id) && f.id !== Number(formData.co_faculty_id_2)).map(renderFacultyOption)}</optgroup>}
                    <optgroup label="Other">{otherFacs.filter(f => f.id !== Number(formData.faculty_id) && f.id !== Number(formData.co_faculty_id_2)).map(renderFacultyOption)}</optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Co-Teacher 2 <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <select
                    id="load_co_faculty_2"
                    name="load_co_faculty_2"
                    disabled={isEditing ? !formData.subject_id : formData.subject_ids.length === 0}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-white text-sm disabled:opacity-50"
                    value={formData.co_faculty_id_2}
                    onChange={e => setFormData({ ...formData, co_faculty_id_2: e.target.value })}
                  >
                    <option value="">None</option>
                    {specFacs.length > 0 && <optgroup label="🌟 Recommended">{specFacs.filter(f => f.id !== Number(formData.faculty_id) && f.id !== Number(formData.co_faculty_id_1)).map(renderFacultyOption)}</optgroup>}
                    <optgroup label="Other">{otherFacs.filter(f => f.id !== Number(formData.faculty_id) && f.id !== Number(formData.co_faculty_id_1)).map(renderFacultyOption)}</optgroup>
                  </select>
                </div>
              </div>

              {/* Live Load Meter */}
              {selectedFaculty && (
                <div className={`p-4 rounded-xl border ${isHardCapped ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : isOverload ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Load Preview</span>
                    <span className={`text-xs font-bold ${isHardCapped ? 'text-red-700 dark:text-red-400' : isOverload ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {projectedHours} / {hardCap} hrs Max {isOverload && !isHardCapped && `(+${projectedHours - maxHours} Overload)`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isHardCapped ? 'bg-red-500' : isOverload ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${loadRatio}%` }}
                    />
                  </div>
                  {isHardCapped && <p className="text-xs text-red-700 dark:text-red-400 font-bold mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Will exceed maximum 60 hr hard-cap</p>}
                  {isOverload && !isHardCapped && <p className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Faculty is generating Overload Units (Base: {maxHours} hrs)</p>}
                  {!isOverload && isNearLimit && <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-2">⚠ Nearing regular load capacity — {maxHours - projectedHours} hrs remaining to Base</p>}
                </div>
              )}

              <div className="pt-2 flex gap-3 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm">Cancel</button>
                <button type="submit" disabled={isHardCapped || createMutation.isPending || updateMutation.isPending || (isEditing ? !formData.subject_id : formData.subject_ids.length === 0)} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 shadow-md transition-colors disabled:opacity-50 text-sm">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEditing ? 'Update Draft' : 'Save for Endorsement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 group">
          <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-white/10">
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
              <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center font-black text-sm">
                {selectedIds.length}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loads Selected</p>
                <p className="text-sm font-bold">Bulk Action Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => bulkApproveMutation.mutate(selectedIds)}
                disabled={bulkApproveMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {bulkApproveMutation.isPending ? 'Processing...' : 'Approve All'}
              </button>
              <button
                onClick={() => setIsBulkRejectModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                Reject Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Rejection Modal */}
      {isBulkRejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
              <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Bulk Rejection ({selectedIds.length} loads)
              </h3>
              <button onClick={() => setIsBulkRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                Please provide a unified rejection reason for the {selectedIds.length} selected loads.
              </p>
              <textarea
                autoFocus
                id="loadBulkRejectNote"
                name="loadBulkRejectNote"
                rows={4}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-sm bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 resize-none font-medium"
                placeholder="e.g. Incomplete data, please re-verify faculty availability..."
                value={bulkRejectNote}
                onChange={e => setBulkRejectNote(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsBulkRejectModalOpen(false)} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => bulkRejectMutation.mutate({ ids: selectedIds, note: bulkRejectNote })}
                  disabled={!bulkRejectNote.trim() || bulkRejectMutation.isPending}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-shadow disabled:opacity-50"
                >
                  {bulkRejectMutation.isPending ? 'Rejecting...' : 'Reject All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
