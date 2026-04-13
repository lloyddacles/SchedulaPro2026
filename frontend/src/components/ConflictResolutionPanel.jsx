import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertTriangle, Search, Check, Sparkles, 
  Clock, MapPin, ChevronRight, RefreshCw,
  AlertCircle
} from 'lucide-react';
import api from '../api';

const ConflictResolutionPanel = ({ 
  isOpen, 
  onClose, 
  failures, 
  termId,
  onResolveSuccessful 
}) => {
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const fetchSuggestions = async (load) => {
    setSelectedLoad(load);
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await api.get(`/schedules/suggestions/${load.teaching_load_id}?term_id=${termId}`);
      setSuggestions(res.data);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleResolve = async (suggestion) => {
    setIsResolving(true);
    try {
      await api.post('/schedules', {
        teaching_load_id: selectedLoad.teaching_load_id,
        day_of_week: suggestion.day_of_week,
        start_time: suggestion.start_time,
        end_time: suggestion.end_time,
        room: suggestion.room,
        term_id: termId
      });
      
      // Successfully resolved - trigger refresh in parent
      onResolveSuccessful(selectedLoad.teaching_load_id);
      setSelectedLoad(null);
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      alert(err.response?.data?.error?.message || 'Failed to assign suggested slot');
    } finally {
      setIsResolving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
      />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl pointer-events-auto flex flex-col h-full"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-brand-50/30 dark:bg-brand-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Conflict Resolution Center</h2>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">{failures.length} Pending Bottlenecks</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {failures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Clear!</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">All algorithmic bottlenecks have been addressed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {failures.map((fail) => (
                <div 
                  key={fail.teaching_load_id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                    selectedLoad?.teaching_load_id === fail.teaching_load_id 
                      ? 'border-brand-500 ring-1 ring-brand-500 shadow-lg' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm'
                  }`}
                >
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-[10px] font-black rounded uppercase tracking-tighter">
                          {fail.program_code}
                        </span>
                        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{fail.subject}</h3>
                      </div>
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-3 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-brand-500" /> SECTION: {fail.section_id > 0 ? fail.section_id : 'N/A (Link Broken)'}
                      </p>
                      
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-tight">
                          {fail.reason}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => fetchSuggestions(fail)}
                      disabled={isLoadingSuggestions && selectedLoad?.teaching_load_id === fail.teaching_load_id}
                      className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition-all active:scale-95 flex-shrink-0"
                      title="Find Smart Suggestions"
                    >
                      {isLoadingSuggestions && selectedLoad?.teaching_load_id === fail.teaching_load_id ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Suggestion Drawer for Selected Item */}
                  <AnimatePresence>
                    {selectedLoad?.teaching_load_id === fail.teaching_load_id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
                      >
                        <div className="p-5">
                          <header className="flex items-center justify-between mb-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                              <Sparkles className="w-3.5 h-3.5" /> Valid Alternatives
                            </h4>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{suggestions.length} Found</span>
                          </header>

                          {isLoadingSuggestions ? (
                            <div className="py-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-brand-500" /></div>
                          ) : suggestions.length === 0 ? (
                            <p className="text-xs text-center py-4 font-bold text-red-500 px-6 uppercase tracking-tight">
                              Absolute Deadlock: No valid slots exist within institutional constraints for this subject. Manual section/room swapping required.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {suggestions.map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => handleResolve(sug)}
                                  disabled={isResolving}
                                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 group/btn transition-all text-left shadow-sm hover:shadow-md"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 rounded-lg min-w-[70px]">
                                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none">{sug.day_of_week.substring(0, 3)}</span>
                                      <span className="text-xs font-black text-slate-700 dark:text-slate-200 mt-1">{sug.start_time.substring(0, 5)}</span>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
                                        <Clock className="w-3 h-3 text-brand-500" /> {sug.start_time.substring(0, 5)} - {sug.end_time.substring(0, 5)}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-slate-400 mt-1 uppercase">
                                        <MapPin className="w-3 h-3 text-amber-500" /> {sug.room}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-2 opacity-0 group-hover/btn:opacity-100 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-full transition-all">
                                    <PlusCircle className="w-5 h-5" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-black rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
          >
            Review & Close Center
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConflictResolutionPanel;

// Internal shorthand icons that were missing in import block
const PlusCircle = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);
