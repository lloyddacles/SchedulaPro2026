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
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-3">
            System Audit Trail
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Review historical administrative operations tracking absolute truth mutations.</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-xl shadow-md">
          <TerminalSquare className="w-5 h-5 text-emerald-400" /> <span className="font-mono text-sm tracking-widest">{data?.total || 0} RECORDS</span>
        </div>
      </div>

      <div className="glass rounded-[2rem] shadow-xl border border-white/40 dark:border-slate-700/50 overflow-hidden relative">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-slate-200"><Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-400"/> Operational Log Array</h3>
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search actions or entities..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl leading-5 bg-white/80 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
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
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                       {log.user_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300 w-full">
                       <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded text-[11px] overflow-hidden truncate max-w-lg border border-gray-100 dark:border-slate-700 group-hover:whitespace-normal group-hover:transition-all">
                          {log.details}
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
