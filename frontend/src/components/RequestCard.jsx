import React from 'react';
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  Calendar, 
  ArrowRightLeft, 
  Trash2, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function RequestCard({ req, onApprove, onReject, onEndorse, userRole }) {
  const isPending = req.status === 'PENDING';
  const isEndorsed = req.status === 'ENDORSED';
  
  const getTypeStyles = (type) => {
    switch(type) {
      case 'DROP': return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
      case 'SWAP': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'MAKEUP': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800';
      default: return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getStatusStyles = (status) => {
    switch(status) {
      case 'PENDING': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800';
      case 'ENDORSED': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800';
      case 'APPROVED': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800';
      default: return 'text-gray-500 bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-100 dark:border-slate-700/50 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-brand-200 dark:hover:border-brand-500/30 transition-all duration-300"
    >
      {/* Header: Faculty Info & Status */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-black text-xs shadow-inner">
            {req.faculty_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight">{req.faculty_name}</h3>
            <p className="text-[9px] font-black text-brand-500/80 uppercase tracking-widest">Requesting Faculty</p>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-slate-500 font-bold mt-0.5">
              <Clock className="w-3 h-3" />
              {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-widest flex items-center gap-1.5 ${getStatusStyles(req.status)}`}>
          {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
          {req.status === 'ENDORSED' && <AlertCircle className="w-3 h-3" />}
          {req.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
          {req.status}
        </div>
      </div>

      {/* Delta Mapping (Side-by-Side Visualization) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center mb-6">
        {/* Source Slot */}
        <div className="p-4 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-700/50">
          <p className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">Original Slot</p>
          <div className="font-black text-gray-800 dark:text-slate-200 text-sm mb-1">{req.subject_code}</div>
          <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 flex flex-wrap gap-y-1">
            <span className="flex items-center gap-1 mr-3"><Calendar className="w-3 h-3 text-brand-500" /> {req.day_of_week}</span>
            <span className="flex items-center gap-1 mr-3"><Clock className="w-3 h-3 text-brand-500" /> {req.start_time.substring(0, 5)} - {req.end_time.substring(0, 5)}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-500" /> {req.room}</span>
          </div>
        </div>

        {/* Action Indicator */}
        <div className="flex flex-col items-center justify-center">
          <div className={`p-3 rounded-full border shadow-sm ${getTypeStyles(req.request_type)}`}>
            {req.request_type === 'DROP' && <Trash2 className="w-5 h-5" />}
            {req.request_type === 'SWAP' && <ArrowRightLeft className="w-5 h-5" />}
            {req.request_type === 'MAKEUP' && <Sparkles className="w-5 h-5" />}
          </div>
          <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-slate-700 my-1"></div>
          <p className={`text-[8px] font-black tracking-widest uppercase mt-1 ${getTypeStyles(req.request_type).split(' ')[1]}`}>
            {req.request_type}
          </p>
        </div>

        {/* Target Slot */}
        <div className={`p-4 rounded-2xl border ${req.request_type === 'DROP' ? 'bg-rose-50/10 border-rose-100/30' : 'bg-brand-50/30 dark:bg-brand-900/10 border-brand-100/50 dark:border-brand-800/50'}`}>
          <p className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2">Proposed Adjustment</p>
          {req.request_type === 'DROP' ? (
            <div className="h-full flex flex-col justify-center">
               <div className="text-sm font-black text-rose-600 dark:text-rose-400">VACATE SLOT</div>
               <div className="text-[10px] font-bold text-rose-400/80 mt-1">Resource recovery triggered</div>
            </div>
          ) : (
            <>
              <div className="font-black text-gray-800 dark:text-slate-200 text-sm mb-1">{req.subject_code}</div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex flex-wrap gap-y-1">
                <span className="flex items-center gap-1 mr-3"><Calendar className="w-3 h-3 text-brand-500" /> {req.target_day || req.day_of_week}</span>
                <span className="flex items-center gap-1 mr-3"><Clock className="w-3 h-3 text-brand-500" /> {req.target_start_time?.substring(0, 5) || req.start_time.substring(0,5)} - {req.target_end_time?.substring(0, 5) || req.end_time.substring(0,5)}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-500" /> {req.target_room || req.room}</span>
              </div>
              {req.event_date && (
                 <div className="mt-2 text-[9px] font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/50 px-2 py-0.5 rounded w-fit italic">
                    Single Event on {new Date(req.event_date).toLocaleDateString()}
                 </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer: Justification and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4 border-t border-gray-50 dark:border-slate-700/50 pt-5">
        <div className="w-full max-w-lg">
          <p className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Detailed Justification</p>
          <div className="relative pl-3 border-l-2 border-brand-200 dark:border-brand-800">
            <p className="text-xs text-gray-600 dark:text-slate-400 font-medium italic leading-relaxed">
              "{req.reason_text || req.reason || 'No specification provided.'}"
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {(userRole === 'program_assistant' && isPending) && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEndorse(req.id); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" /> ENDORSE
            </button>
          )}

          {(userRole === 'admin' || userRole === 'program_head') && (isPending || isEndorsed) && (
            <button 
              onClick={(e) => { e.stopPropagation(); onApprove(req.id); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black tracking-widest shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <CheckCircle className="w-3.5 h-3.5" /> FINALIZE
            </button>
          )}

          {(isPending || isEndorsed) && (
            <button 
              onClick={(e) => { e.stopPropagation(); onReject(req.id); }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 rounded-xl text-[11px] font-black tracking-widest hover:bg-rose-600 hover:text-white transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> REJECT
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
