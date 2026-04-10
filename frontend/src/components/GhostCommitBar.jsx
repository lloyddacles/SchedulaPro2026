import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, X, CheckCircle2, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';
import useGhostStore from '../store/useGhostStore';

/**
 * GhostCommitBar.jsx
 * 
 * Floating control center for the Smart Scheduling staging layer.
 * Provides real-time diff visibility and the primary 'Commit' action.
 */
export default function GhostCommitBar({ onCommit, isCommitting }) {
  const { isGhostMode, stagedSchedules, discardDraft, getDiff } = useGhostStore();
  
  const diff = getDiff();
  const totalChanges = diff.updated.length + diff.created.length + diff.deleted.length;

  if (!isGhostMode) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4"
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-brand-500/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center text-brand-400 animate-pulse">
              <Ghost className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                Spectral Draft Active
                <span className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_#7c3aed]" />
              </h4>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                {totalChanges === 0 
                  ? "No changes staged yet" 
                  : `${totalChanges} modifications stored in session`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={discardDraft}
              className="px-4 py-2 text-slate-400 hover:text-white dark:hover:text-red-400 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Discard
            </button>
            <button 
              onClick={onCommit}
              disabled={totalChanges === 0 || isCommitting}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2
                ${totalChanges > 0 
                  ? 'bg-brand-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] hover:scale-105' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
              {isCommitting ? (
                <>Synchronizing...</>
              ) : (
                <>Commit to Production <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* Change Breakdown Indicator */}
        {totalChanges > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-4"
          >
             {diff.created.length > 0 && (
               <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                 +{diff.created.length} New
               </span>
             )}
             {diff.updated.length > 0 && (
               <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                 ~{diff.updated.length} Moved
               </span>
             )}
              {diff.deleted.length > 0 && (
               <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                 -{diff.deleted.length} REMOVED
               </span>
             )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
