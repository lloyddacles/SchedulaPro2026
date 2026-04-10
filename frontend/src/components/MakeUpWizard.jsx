import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { 
  Sparkles, Calendar, Clock, MapPin, Search, 
  CheckCircle2, AlertCircle, RefreshCw, X, ChevronRight, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MakeUpWizard({ schedule, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [eventDate, setEventDate] = useState('');
  const [preferredRoom, setPreferredRoom] = useState('');

  // 1. Fetch Suggestions Logic
  const { data: suggestions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['makeup-suggestions', schedule.teaching_load_id, preferredRoom],
    queryFn: async () => {
      const res = await api.get('/schedules/suggest-slots', {
        params: { 
          teaching_load_id: schedule.teaching_load_id,
          term_id: schedule.term_id,
          preferred_room: preferredRoom || undefined
        }
      });
      return res.data;
    },
    enabled: step === 1
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post('/requests', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      setStep(3);
    }
  });

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!reason.trim()) return;
    submitMutation.mutate({
      schedule_id: schedule.id,
      request_type: 'MAKEUP',
      reason_text: reason,
      target_day: selectedSlot.day_of_week,
      target_start_time: selectedSlot.start_time,
      target_end_time: selectedSlot.end_time,
      target_room: selectedSlot.room,
      is_recurring: isRecurring,
      event_date: isRecurring ? null : eventDate
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
           <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display flex items-center gap-3">
                 <Sparkles className="w-6 h-6 text-brand-500" />
                 Recovery Wizard
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                 Detecting institutional gaps for {schedule.subject_code}
              </p>
           </div>
           <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-8">
           <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                   <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <span>Phase 1: Intelligent Gap Detection</span>
                      <span className="flex items-center gap-1.5 text-brand-600"><Clock className="w-3 h-3"/> Required: {schedule.required_hours}hr Duration</span>
                   </div>

                   {isLoading || isRefetching ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                         <RefreshCw className="w-12 h-12 text-brand-500 animate-spin" />
                         <p className="text-sm font-bold text-slate-500 animate-pulse">Analyzing institutional matrix for available time-room vectors...</p>
                      </div>
                   ) : suggestions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                         {suggestions.map((slot, idx) => (
                           <button 
                            key={idx}
                            onClick={() => handleSelectSlot(slot)}
                            className="text-left p-5 border-2 border-slate-50 dark:border-slate-800 rounded-3xl hover:border-brand-500 bg-white dark:bg-slate-800/50 transition-all hover:scale-[1.02] group relative overflow-hidden"
                           >
                              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <ChevronRight className="w-5 h-5 text-brand-500" />
                              </div>
                              <div className="flex items-center gap-3 mb-3">
                                 <div className="p-2 bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-400">
                                    <Calendar className="w-4 h-4" />
                                 </div>
                                 <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{slot.day_of_week}</span>
                              </div>
                              <div className="space-y-2">
                                 <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                                 </div>
                                 <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Room {slot.room}
                                 </div>
                              </div>
                           </button>
                         ))}
                      </div>
                   ) : (
                      <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                         <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                         <h4 className="text-lg font-bold text-slate-900 dark:text-white">Strict Collision Detected</h4>
                         <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">No concurrent 100% free blocks found for this duration. Try relaxing room constraints.</p>
                      </div>
                   )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Phase 2: Recovery Justification & Persistence</div>
                   
                   <div className="p-6 bg-brand-50 dark:bg-brand-900/10 rounded-3xl border border-brand-100 dark:border-brand-800">
                      <p className="text-xs font-black text-brand-600 uppercase tracking-widest mb-3">Selected Synchronization Vector:</p>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                               <Calendar className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                               <div className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">{selectedSlot.day_of_week}</div>
                               <div className="text-xs font-bold text-slate-500">{selectedSlot.start_time.substring(0,5)} - {selectedSlot.end_time.substring(0,5)} • Room {selectedSlot.room}</div>
                            </div>
                         </div>
                         <button onClick={() => setStep(1)} className="text-[10px] font-black text-brand-600 uppercase tracking-tighter hover:underline">Change Slot</button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recovery Scope</label>
                         <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                            <button 
                             onClick={() => setIsRecurring(true)}
                             className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isRecurring ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
                            >Recurring</button>
                            <button 
                             onClick={() => setIsRecurring(false)}
                             className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isRecurring ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
                            >One-Time</button>
                         </div>
                      </div>
                      {!isRecurring && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Date</label>
                           <input 
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-2 text-sm font-bold dark:text-white focus:ring-2 focus:ring-brand-500/20"
                           />
                        </div>
                      )}
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Justification</label>
                      <textarea 
                       value={reason}
                       onChange={(e) => setReason(e.target.value)}
                       placeholder="Explain why this make-up class is necessary (e.g., Unforeseen incident, holiday recovery)..."
                       className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-5 text-sm font-medium dark:text-white outline-none focus:border-brand-500 transition-all shadow-inner"
                      />
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button onClick={() => setStep(1)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Cancel</button>
                      <button 
                       onClick={handleSubmit}
                       disabled={submitMutation.isPending || (reason.trim().length < 5) || (!isRecurring && !eventDate)}
                       className="flex-[2] py-4 bg-brand-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                         {submitMutation.isPending ? <RefreshCw className="animate-spin w-4 h-4"/> : <><CheckCircle2 className="w-4 h-4" /> File for Endorsement</>}
                      </button>
                   </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                   <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/5">
                      <CheckCircle2 className="w-10 h-10" />
                   </div>
                   <h4 className="text-2xl font-black text-slate-900 dark:text-white font-display mb-2">Request Dispatched</h4>
                   <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">Your recovery configuration has been queued for **Program Assistant Endorsement**. You will be notified once reviewed.</p>
                   <button 
                    onClick={onClose}
                    className="mt-8 px-8 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
                   >Return to Matrix</button>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
