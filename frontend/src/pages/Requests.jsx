import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  MapPin, 
  Sparkles, 
  Search,
  Filter,
  Layers,
  Archive,
  ArrowRightLeft,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';
import RequestCard from '../components/RequestCard';

export default function Requests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCampus, setSelectedCampus] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('PENDING'); // PENDING, ENDORSED, RESOLVED
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [confirmConfig, setConfirmConfig] = React.useState({ title: '', message: '', type: '', onConfirm: () => {} });

  const { data: campuses = [] } = useQuery({ 
    queryKey: ['campuses'], 
    queryFn: async () => (await api.get('/campuses')).data 
  });

  const { data: requests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['requests', selectedCampus],
    queryFn: async () => {
      let url = '/requests';
      if (selectedCampus) url += `?campus_id=${selectedCampus}`;
      const res = await api.get(url);
      return res.data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setIsConfirmModalOpen(false);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.put(`/requests/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setIsConfirmModalOpen(false);
    }
  });

  const endorseMutation = useMutation({
    mutationFn: (id) => api.put(`/requests/${id}/endorse`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setIsConfirmModalOpen(false);
    }
  });

  // Filtering Logic
  const filteredRequests = requests.filter(req => {
    // 1. Status Tab Filter
    const statusMatch = activeTab === 'RESOLVED' 
      ? (req.status === 'APPROVED' || req.status === 'REJECTED')
      : req.status === activeTab;
    
    // 2. Search Filter
    const searchMatch = !searchQuery || 
      req.faculty_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.subject_code?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return statusMatch && searchMatch;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'PENDING').length,
    endorsed: requests.filter(r => r.status === 'ENDORSED').length,
    resolved: requests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED').length,
  };

  const handleAction = (id, action, type) => {
    let config = {};
    if (action === 'approve') {
      config = {
        title: 'Execute Final Matrix Change?',
        message: type === 'MAKEUP' 
          ? 'Confirming this will programmatically INSERT the recovery slot into the Master Schedule.' 
          : 'Confirming this will forcefully REMOVE the slot from the Master Schedule.',
        type: 'success',
        onConfirm: () => approveMutation.mutate(id)
      };
    } else if (action === 'reject') {
      config = {
        title: 'Deny Transaction Request?',
        message: 'This will move the request to the Resolved History with a rejected status.',
        type: 'danger',
        onConfirm: () => rejectMutation.mutate(id)
      };
    } else if (action === 'endorse') {
      config = {
        title: 'Endorse Slot Configuration?',
        message: 'Forwarding this to the Program Head for final institutional execution.',
        type: 'success',
        onConfirm: () => endorseMutation.mutate(id)
      };
    }
    setConfirmConfig(config);
    setIsConfirmModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Dynamic Header & Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-600 rounded-3xl shadow-lg shadow-brand-500/30 text-white">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white font-display tracking-tight">Academic Request Portal</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-bold">Manage teaching workload recovery and schedule adjustments.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          {[
            { id: 'PENDING', label: 'Action Needed', icon: Clock, count: stats.pending, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
            { id: 'ENDORSED', label: 'Endorsed', icon: Sparkles, count: stats.endorsed, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
            { id: 'RESOLVED', label: 'Completed History', icon: Archive, count: stats.resolved, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all font-black text-[10px] tracking-widest uppercase border-2 ${
                activeTab === tab.id 
                  ? `${tab.color} border-current ring-4 ring-current/10 shadow-lg` 
                  : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="ml-1 opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filtering Bar */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-4 items-center bg-white/50 dark:bg-slate-800/30 backdrop-blur-md p-4 rounded-[2rem] border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by faculty initializer or subject code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700/50 rounded-2xl outline-none focus:border-brand-500/50 dark:focus:border-brand-500/30 text-sm font-bold transition-all shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700/50 rounded-2xl px-4 py-3 shadow-inner">
          <MapPin className="w-4 h-4 text-gray-400" />
          <select 
            value={selectedCampus} 
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-0 cursor-pointer min-w-[140px]"
          >
            <option value="">Global Coverage</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => refetch()} 
          disabled={isRefetching} 
          className="p-3 bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 rounded-2xl border-2 border-gray-100 dark:border-slate-700/50 transition-all hover:rotate-180 active:scale-95 shadow-sm"
          title="Refresh Schedule Data"
        >
           <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin text-brand-500' : ''}`} />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="relative min-h-[400px]">
        {filteredRequests.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-20 text-center"
          >
            <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
              <Layers className="w-10 h-10 text-gray-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-black text-gray-800 dark:text-slate-200">The queue is empty!</h3>
            <p className="text-sm text-gray-400 dark:text-slate-500 font-bold max-w-xs mt-2">All recovery staging slots for this campus have been processed and normalized.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map(req => (
                <div 
                  key={req.id} 
                  onClick={() => setSelectedRequest(req)}
                  className="cursor-pointer"
                >
                  <RequestCard 
                    req={req} 
                    userRole={user?.role}
                    onEndorse={(id) => {
                      handleAction(id, 'endorse', req.request_type);
                    }}
                    onApprove={(id) => {
                      handleAction(id, 'approve', req.request_type);
                    }}
                    onReject={(id) => {
                      handleAction(id, 'reject', req.request_type);
                    }}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Side Drawer for Detailed Insight */}
      <AnimatePresence>
        {selectedRequest && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl z-[70] overflow-y-auto p-8"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">Request Detail</h2>
                  <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Reference ID: #{selectedRequest.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-8">
                <section>
                  <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-3 block">Faculty Initializer</label>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-700/50">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-lg">
                      {selectedRequest.faculty_name[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">{selectedRequest.faculty_name}</p>
                      <p className="text-xs text-gray-500 font-bold">{selectedRequest.department || 'Academic Division'}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-3 block">Schedule Metadata</label>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-400 font-bold">Subject Code</span>
                      <span className="font-black text-gray-900 dark:text-white">{selectedRequest.subject_code}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-400 font-bold">Transaction Type</span>
                      <span className="font-black text-brand-600">{selectedRequest.request_type}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700/50">
                      <span className="text-gray-400 font-bold">Campus Location</span>
                      <span className="font-black text-gray-900 dark:text-white">{selectedCampus ? campuses.find(c => c.id == selectedCampus)?.name : 'Main Campus'}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-3 block">Full Justification</label>
                  <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 rounded-3xl border border-brand-100 dark:border-brand-800/50 text-sm italic text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                    "{selectedRequest.reason_text || selectedRequest.reason || 'No detailed specification provided for this variance.'}"
                  </div>
                </section>

                <div className="pt-10 flex gap-4">
                  {(user?.role === 'admin' || user?.role === 'program_head') && (selectedRequest.status === 'PENDING' || selectedRequest.status === 'ENDORSED') && (
                    <button 
                      onClick={() => { handleAction(selectedRequest.id, 'approve', selectedRequest.request_type); setSelectedRequest(null); }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs tracking-widest shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
                    >
                      FINALIZE SCHEDULE CHANGE
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
