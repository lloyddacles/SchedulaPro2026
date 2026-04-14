import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Building2, Calendar, 
  MapPin, Clock, ShieldAlert,
  ArrowRight, Activity, BookOpen
} from 'lucide-react';

export default function DashboardModal({ isOpen, onClose, type, title, data }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Surface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-10 py-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/30">
                  {type === 'conflict' ? <ShieldAlert className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
                  <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Forensic Detail View</p>
               </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {type === 'conflict' ? (
              <div className="space-y-8">
                <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-4">Conflict Detected: Resource Overlap</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-rose-100/50">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">Subject A</span>
                        <p className="font-black text-gray-900 dark:text-white">{data.subject_a}</p>
                     </div>
                     <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-rose-100/50">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">Subject B</span>
                        <p className="font-black text-gray-900 dark:text-white">{data.subject_b}</p>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Spatio-Temporal Context</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                         <Calendar className="w-5 h-5 text-brand-500" />
                         <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{data.day_of_week}</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                         <Clock className="w-5 h-5 text-brand-500" />
                         <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{data.start_time} - {data.end_time}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                         <MapPin className="w-5 h-5 text-brand-500" />
                         <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{data.room || data.faculty_name || 'Resource Constraint'}</span>
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                 {/* Faculty Load Detail */}
                 <div className="grid grid-cols-3 gap-4">
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl text-center border border-blue-100 dark:border-blue-800/30">
                       <span className="text-2xl font-black text-blue-600 block">{data.total_assigned_hours}</span>
                       <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Total Units</span>
                    </div>
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl text-center border border-indigo-100 dark:border-indigo-800/30">
                       <span className="text-2xl font-black text-indigo-600 block">{data.subjects_count}</span>
                       <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Subjects</span>
                    </div>
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl text-center border border-emerald-100 dark:border-emerald-800/30">
                       <span className="text-2xl font-black text-emerald-600 block">{data.max_teaching_hours}</span>
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Max Limit</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Institutional Profile</h4>
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">Department</span>
                          <span className="text-sm font-black text-gray-900 dark:text-white">{data.department || 'General Education'}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">Employment Type</span>
                          <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">Full-Time Academic</span>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-8 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
             <button 
              onClick={onClose}
              className="px-6 py-3 bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-200 dark:border-slate-600 hover:bg-gray-50 transition-all"
             >
               Dismiss
             </button>
             <button className="px-8 py-3 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all flex items-center gap-2">
               Full Forensic Audit <ArrowRight className="w-4 h-4" />
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
