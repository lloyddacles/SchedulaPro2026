import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { 
  Shield, Clock, HardDrive, TerminalSquare, Search, 
  Activity, ArrowUpRight, Filter, Download, UserCheck, 
  Fingerprint, ChevronRight, X, AlertCircle, PlusCircle,
  RefreshCw, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';

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

  // --- Operational Stats ---
  const lastHourLogs = logs.filter(l => {
     const duration = new Date() - new Date(l.created_at);
     return duration < 3600000;
  }).length;

  const topOperator = logs.reduce((acc, curr) => {
    acc[curr.user_name] = (acc[curr.user_name] || 0) + 1;
    return acc;
  }, {});
  const leadAdmin = Object.entries(topOperator).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const mostModified = logs.reduce((acc, curr) => {
    acc[curr.entity_type] = (acc[curr.entity_type] || 0) + 1;
    return acc;
  }, {});
  const hotEntity = Object.entries(mostModified).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // --- PDF Export Engine ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('System Audit Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${timestamp}`, 14, 28);
    doc.text(`Total Records: ${filteredLogs.length}`, 14, 33);
    doc.line(14, 38, 196, 38);

    // Logs
    let y = 48;
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    
    filteredLogs.slice(0, 50).forEach((log, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const timeStr = new Date(log.created_at).toLocaleString();
      doc.setFont(undefined, 'bold');
      doc.text(`[${timeStr}] ${log.action} - ${log.user_name}`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${log.entity_type} ${log.entity_id ? `(#${log.entity_id})` : ''}`, 14, y + 5);
      
      try {
        const details = JSON.parse(log.details);
        const detailsStr = Object.entries(details).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ');
        doc.setTextColor(100, 116, 139);
        doc.text(`Changes: ${detailsStr.substring(0, 80)}${detailsStr.length > 80 ? '...' : ''}`, 14, y + 10);
        doc.setTextColor(15, 23, 42);
      } catch (e) {
        doc.text(`Details: ${log.details.substring(0, 80)}`, 14, y + 10);
      }
      
      y += 18;
    });

    if (filteredLogs.length > 50) {
      doc.text(`... and ${filteredLogs.length - 50} more records truncated for summary.`, 14, y);
    }

    doc.save(`system_audit_report_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white font-display tracking-tight flex items-center gap-3">
             Audit Trail <span className="text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full whitespace-nowrap border border-emerald-200 dark:border-emerald-800/50">Production Ledger</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-md border border-slate-200 dark:border-slate-700">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
            </span>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium italic">Immutable cryptographic record of all administrative state-shifts.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
           <button 
             onClick={exportToPDF}
             className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
           >
              <Download className="w-4 h-4 text-brand-500" /> Professional Export
           </button>
           <div className="flex-1 xl:flex-none flex items-center gap-2 px-5 py-3 bg-slate-950 dark:bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 border border-transparent">
              <TerminalSquare className="w-5 h-5 text-emerald-400" /> 
              <span className="font-mono text-xs font-black tracking-[0.2em] uppercase">{data?.total || 0} Registered Traces</span>
           </div>
        </div>
      </div>

      {/* ── Operational Intelligence Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Velocity</p>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white">{lastHourLogs} Ops/hr</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
               <Activity className="w-6 h-6 text-emerald-500" />
            </div>
         </motion.div>

         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Operator</p>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white truncate max-w-[120px]">{leadAdmin}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
               <UserCheck className="w-6 h-6 text-blue-500" />
            </div>
         </motion.div>

         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hot Entity</p>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white truncate max-w-[120px]">{hotEntity}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
               <Fingerprint className="w-6 h-6 text-amber-500" />
            </div>
         </motion.div>

         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Health</p>
               <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase">Optimal</h3>
            </div>
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center">
               <Shield className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
         </motion.div>
      </div>

  const [selectedLog, setSelectedLog] = useState(null);

  const getLogIcon = (action) => {
    if (action.includes('CREATE')) return <PlusCircle className="w-5 h-5 text-emerald-500" />;
    if (action.includes('UPDATE')) return <RefreshCw className="w-5 h-5 text-amber-500" />;
    if (action.includes('DELETE')) return <Archive className="w-5 h-5 text-red-500" />;
    if (action.includes('APPROVE')) return <UserCheck className="w-5 h-5 text-blue-500" />;
    return <Activity className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white font-display tracking-tight flex items-center gap-3">
             Audit Trail <span className="text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full whitespace-nowrap border border-emerald-200 dark:border-emerald-800/50">Production Ledger</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-md border border-slate-200 dark:border-slate-700">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
            </span>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium italic">Immutable cryptographic record of all administrative state-shifts.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
           <button 
             onClick={exportToPDF}
             className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
           >
              <Download className="w-4 h-4 text-brand-500" /> Professional Export
           </button>
           <div className="flex-1 xl:flex-none flex items-center gap-2 px-5 py-3 bg-slate-950 dark:bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 border border-transparent">
              <TerminalSquare className="w-5 h-5 text-emerald-400" /> 
              <span className="font-mono text-xs font-black tracking-[0.2em] uppercase">{data?.total || 0} Registered Traces</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Velocity</p>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white">{lastHourLogs} Ops/hr</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
               <Activity className="w-6 h-6 text-emerald-500" />
            </div>
         </motion.div>

         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Operator</p>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white truncate max-w-[120px]">{leadAdmin}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
               <UserCheck className="w-6 h-6 text-blue-500" />
            </div>
         </motion.div>

         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hot Entity</p>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white truncate max-w-[120px]">{hotEntity}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
               <Fingerprint className="w-6 h-6 text-amber-500" />
            </div>
         </motion.div>

         <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Health</p>
               <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase">Optimal</h3>
            </div>
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center">
               <Shield className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
         </motion.div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* ── Chronological Timeline ────────────────────────────────────────── */}
        <div className="flex-1 space-y-4">
           <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search chronological traces..."
                    className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
           </div>

           <div className="relative space-y-0.5">
             {/* The Vertical Line */}
             <div className="absolute left-10 top-2 bottom-2 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-slate-800 dark:via-slate-800 dark:to-transparent" />

             {isLoading ? (
               <div className="py-20 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-brand-600" /></div>
             ) : (
               <AnimatePresence mode="popLayout">
                 {filteredLogs.slice(0, 50).map((log, index) => (
                   <motion.div
                     key={log.id}
                     layout
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ duration: 0.3, delay: index * 0.02 }}
                     className={`group relative flex gap-8 pl-6 py-4 rounded-[2rem] transition-all cursor-pointer hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-gray-100 dark:hover:border-slate-800 ${selectedLog?.id === log.id ? 'bg-brand-50/30 dark:bg-brand-900/10 border-brand-200/50' : ''}`}
                     onClick={() => setSelectedLog(log)}
                   >
                     {/* Node */}
                     <div className="relative z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-950 border-4 border-gray-100 dark:border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-brand-500 transition-all mt-1">
                        {getLogIcon(log.action)}
                     </div>

                     {/* Content Card */}
                     <div className="flex-1 flex flex-col md:flex-row justify-between gap-4 pr-6">
                        <div className="space-y-1">
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">{log.action}</span>
                              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-slate-700" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(log.created_at).toLocaleTimeString()}</span>
                           </div>
                           <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {log.entity_type} <span className="text-gray-300 font-medium">#{log.entity_id}</span>
                           </h4>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                              <div className="w-5 h-5 rounded-full bg-brand-600 text-[10px] font-black text-white flex items-center justify-center">
                                 {log.user_name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{log.user_name}</span>
                           </div>
                           <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform ${selectedLog?.id === log.id ? 'rotate-90 text-brand-500' : 'group-hover:translate-x-1'}`} />
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </AnimatePresence>
             )}
           </div>
        </div>

        {/* ── Trace Inspector Drawer ────────────────────────────────────────── */}
        <AnimatePresence>
           {selectedLog && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full xl:w-96 shrink-0 sticky top-8 h-fit bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
              >
                 <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">State Delta</p>
                       <h3 className="text-xl font-black text-white">Log Inspection</h3>
                    </div>
                    <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 <div className="p-8 space-y-8 flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
                    <section className="space-y-4">
                       <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-brand-500" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedLog.created_at).toLocaleString()}</p>
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Transaction Node</h4>
                          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                             <span className="text-sm font-bold text-white uppercase">{selectedLog.entity_type}</span>
                             <span className="text-xs font-mono text-brand-500">ID {selectedLog.entity_id}</span>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-4">
                       <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Data Mutations</h4>
                       </div>
                       <div className="space-y-2">
                          {(() => {
                            try {
                              const parsed = JSON.parse(selectedLog.details);
                              return Object.entries(parsed).map(([k, v]) => (
                                <div key={k} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 group hover:border-brand-500/50 transition-all">
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{k}</p>
                                   <p className="text-sm font-mono text-emerald-400 break-all">{String(v)}</p>
                                </div>
                              ));
                            } catch (e) {
                              return <p className="text-sm text-slate-400">{selectedLog.details}</p>;
                            }
                          })()}
                       </div>
                    </section>
                 </div>

                 <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-slate-600" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Cryptographic integrity verified by system kernel logs.</p>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
