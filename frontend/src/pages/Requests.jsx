import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
export default function Requests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCampus, setSelectedCampus] = React.useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [confirmConfig, setConfirmConfig] = React.useState({ title: '', message: '', type: '', onConfirm: () => {} });

  const isAdmin = user?.role === 'admin';
  const isHead = user?.role === 'program_head' || isAdmin;

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] })
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.put(`/requests/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] })
  });

  if (isLoading) return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Faculty Change Requests</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400 font-semibold">Manage staging queue for Drop and Substitute Swap transactions.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/50 rounded-xl px-4 py-1.5 shadow-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <select 
              value={selectedCampus} 
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-0 cursor-pointer min-w-[140px]"
            >
              <option value="">All Locations</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm">
             <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} /> Sync Queues
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-700/50 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-16 text-center text-gray-500 dark:text-slate-400 font-bold flex flex-col items-center">
             <CheckCircle className="w-16 h-16 text-emerald-400 dark:text-emerald-500 mb-4 opacity-70"/>
             <span className="text-xl text-gray-800 dark:text-slate-200">No active staging configurations found!</span>
             <p className="text-gray-400 dark:text-slate-500 font-semibold mt-1">All faculty workloads are strictly normalized.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50">
              <thead className="bg-gray-50/50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Faculty Initializer</th>
                  <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Target Schedule Bounds</th>
                  <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Execution Type</th>
                  <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-8">Detailed Justification</th>
                  <th className="px-6 py-4 text-left text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Queue Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Execute Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-brand-50/40 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-gray-900 dark:text-white tracking-tight">{req.faculty_name}</div>
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-0.5">{new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-black text-gray-800 dark:text-slate-200 flex items-center gap-2">
                         {req.subject_code} 
                         {<span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black px-1.5 py-0.5 rounded text-[10px] uppercase">SECTION BOUND</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 font-bold mt-1 bg-gray-100/80 dark:bg-slate-700/50 px-2 py-0.5 rounded inline-block">
                         {req.day_of_week} {req.start_time.substring(0,5)} - {req.end_time.substring(0,5)} <span className="opacity-50 mx-1">|</span> Rm {req.room}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 text-[10px] font-black tracking-widest rounded-lg uppercase ${req.request_type === 'DROP' ? 'bg-rose-100/80 text-rose-700 border border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' : 'bg-amber-100/80 text-amber-700 border border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'}`}>
                        {req.request_type} TARGET
                      </span>
                    </td>
                    <td className="px-6 py-5 pl-8 max-w-xs">
                      <div className="relative">
                         <div className="absolute left-[-20px] top-1 text-gray-300 dark:text-slate-600">"</div>
                         <p className="text-sm text-gray-700 dark:text-slate-300 font-medium italic line-clamp-2 leading-snug">{req.reason_text}</p>
                         <div className="absolute right-0 bottom-0 text-gray-300 dark:text-slate-600">"</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {req.status === 'PENDING' ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 px-2.5 py-1.5 rounded-xl w-fit"><Clock className="w-3.5 h-3.5"/> UNRESOLVED</span>
                      ) : req.status === 'APPROVED' ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 px-2.5 py-1.5 rounded-xl w-fit"><CheckCircle className="w-3.5 h-3.5"/> APPROVED</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 px-2.5 py-1.5 rounded-xl w-fit"><XCircle className="w-3.5 h-3.5"/> REJECTED</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right w-[140px]">
                      {req.status === 'PENDING' && isHead ? (
                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-sm">
                          <button onClick={() => { 
                            setConfirmConfig({
                              title: 'Approve Request?',
                              message: `Executing this will forcefully DELETE the live Schedule block for ${req.subject_code}, mathematically vacating the slot system-wide. This action is irreversible once finalized.`,
                              type: 'success',
                              onConfirm: () => approveMutation.mutate(req.id)
                            });
                            setIsConfirmModalOpen(true);
                          }} className="p-2 border border-emerald-200 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white dark:hover:text-white rounded-xl shadow-sm transition-all hover:scale-110" title="Force Execution (Approve)">
                            <CheckCircle className="w-4 h-4"/>
                          </button>
                          <button onClick={() => { 
                            setConfirmConfig({
                              title: 'Reject Request?',
                              message: `Deny this transaction configuration. The faculty schedule for ${req.subject_code} will remain unchanged, and the request will be moved to the resolved queue.`,
                              type: 'danger',
                              onConfirm: () => rejectMutation.mutate(req.id)
                            });
                            setIsConfirmModalOpen(true);
                          }} className="p-2 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white dark:hover:text-white rounded-xl shadow-sm transition-all hover:scale-110" title="Deny Transaction (Reject)">
                            <XCircle className="w-4 h-4"/>
                          </button>
                        </div>
                      ) : (
                         <span className="text-xs font-bold text-gray-300 dark:text-slate-600">LOCKED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
