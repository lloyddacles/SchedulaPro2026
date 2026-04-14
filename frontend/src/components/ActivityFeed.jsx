import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, User, Shield, Clock, 
  CheckCircle2, AlertCircle, Calendar, 
  Building2, Hash, ArrowRight
} from 'lucide-react';

const ACTION_ICONS = {
  'CREATE': { icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  'UPDATE': { icon: RefreshCw => Zap, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'DELETE': { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  'APPROVE': { icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  'GENERATE': { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

const TARGET_ICONS = {
  'FACULTY': Users => User,
  'SCHEDULE': Calendar,
  'ROOM': Building2,
  'LOAD': Layers => Hash,
  'SYSTEM': Shield,
};

export default function ActivityFeed({ activities = [] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
           <Zap className="w-4 h-4 text-amber-500" />
           <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Institutional Heartbeat</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400 opacity-30">
              <Activity className="w-8 h-8" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Pulse...</p>
            </div>
          ) : (
            activities.map((item, idx) => {
              const config = ACTION_ICONS[item.action] || { icon: Zap, color: 'text-gray-400', bg: 'bg-gray-100' };
              const Icon = config.icon;
              const TargetIcon = TARGET_ICONS[item.target_type] || Zap;
              const formattedDate = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative flex gap-4 p-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all cursor-default overflow-hidden"
                >
                  {/* Action Indicator */}
                  <div className={`shrink-0 w-10 h-10 rounded-2xl ${config.bg} flex items-center justify-center border border-white dark:border-slate-700/50 group-hover:rotate-6 transition-transform`}>
                    <Icon className={`w-5 h-5 ${config.color}`} strokeWidth={2.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TargetIcon className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest truncate">{item.target_type}</span>
                      </div>
                      <span className="text-[9px] font-bold text-gray-300 dark:text-slate-600 shrink-0">{formattedDate}</span>
                    </div>
                    
                    <p className="text-[13px] font-black text-gray-800 dark:text-slate-200 leading-tight mb-1 line-clamp-2">
                       {item.performer_name} <span className="text-gray-400 dark:text-slate-500 font-bold lowercase">{item.action.toLowerCase()}d</span> {item.target_type.toLowerCase()}
                    </p>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-brand-500 uppercase tracking-tighter cursor-pointer hover:underline flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Aesthetic Accent */}
                  <div className={`absolute top-0 right-0 w-1 h-full ${config.color.replace('text-', 'bg-')} opacity-20`} />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800/30">
        <button className="w-full py-3 bg-gray-50 dark:bg-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] rounded-2xl border border-gray-100 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
          View Full Institutional Logs
        </button>
      </div>
    </div>
  );
}
