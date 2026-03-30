import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Shield, Clock, HardDrive, TerminalSquare, Search } from 'lucide-react';

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await api.get('/audit-logs?limit=250');
      return res.data;
    },
    refetchInterval: 15000 // Poll every 15s to keep logs fresh implicitly
  });

  const logs = data?.logs || [];
  
  const filteredLogs = logs.filter(l => 
    (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.entity_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            System Audit Trail
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 dark:border-emerald-800/30">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
            </span>
            <p className="text-sm text-gray-500 dark:text-slate-400">Verifiable trace of all administrative operations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-800 dark:border-slate-700">
          <TerminalSquare className="w-5 h-5 text-emerald-400" /> 
          <span className="font-mono text-xs font-black tracking-[0.2em]">{data?.total || 0} RECORDS</span>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 overflow-hidden relative">
        <div className="p-8 border-b border-gray-100 dark:border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h3 className="font-black flex items-center gap-2 text-gray-900 dark:text-white uppercase tracking-tight text-lg">
              <Shield className="w-6 h-6 text-brand-500"/> Operational Log Array
            </h3>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Immutable Transaction History</p>
          </div>
          <div className="relative w-full lg:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search actions, entities, or operators..."
              className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-2xl bg-white/80 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700/50 font-mono text-[13px]">
              <thead className="bg-gray-50/80 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Scope</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Operator</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Trace JSON</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 dark:bg-slate-800/40 divide-y divide-gray-50 dark:divide-slate-700/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-slate-400 flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5" />
                       {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        log.action.includes('UPDATE') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' :
                        log.action.includes('DELETE') || log.action === 'REJECT' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
                        log.action === 'APPROVE' || log.action === 'RESTORE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' :
                        'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                        <HardDrive className="w-4 h-4" /> {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-semibold">
                       {log.user_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300 w-full min-w-[300px]">
                       <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded text-[11px] font-mono border border-gray-100 dark:border-slate-700 max-h-20 overflow-y-auto">
                          {(() => {
                            try {
                              const parsed = JSON.parse(log.details);
                              return Object.entries(parsed).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <span className="text-gray-400 uppercase text-[9px] font-black">{k}:</span>
                                  <span className="truncate">{String(v)}</span>
                                </div>
                              ));
                            } catch (e) {
                              return log.details;
                            }
                          })()}
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-slate-500 italic">Zero transaction traces found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
