import React, { useState } from 'react';
import { Shield, Key, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const submitMutation = useMutation({
    mutationFn: (payload) => api.put('/auth/change-password', payload),
    onSuccess: () => {
      setSuccessMsg('Security credentials updated explicitly.');
      setErrorMsg('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { onClose(); setSuccessMsg(''); }, 2000);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || 'Server disruption tracking constraint.');
      setSuccessMsg('');
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Target parameter mismatch: The new keys do not structurally align.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Key Length Constraint: Security requires a minimum of 6 characters strictly.');
      return;
    }
    setErrorMsg('');
    submitMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/60 backdrop-blur-md print:hidden">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 10 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
         className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
       >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
             <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                <Shield className="w-6 h-6 text-brand-500" />
                Update Security Key
             </h3>
             <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="w-6 h-6" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
             {errorMsg && (
               <div className="p-4 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-sm border-2 border-red-200 dark:border-red-900/50 flex items-center gap-3 font-semibold">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" /> {errorMsg}
               </div>
             )}
             {successMsg && (
               <div className="p-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl text-sm border-2 border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 font-bold">
                 <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" /> {successMsg}
               </div>
             )}

             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Original Security Token</label>
               <input type="password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}
                 className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700 dark:text-white focus:bg-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 mt-4">New Authentication Key</label>
               <input type="password" required value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                 className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700 dark:text-white focus:bg-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 mt-4">Verify New Key</label>
               <input type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
                 className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-700 dark:text-white focus:bg-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
               />
             </div>

             <div className="pt-4 mt-2 border-t border-gray-100 dark:border-slate-700/50 flex justify-end gap-3 flex-wrap">
               <button type="button" onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition w-full sm:w-auto">Cancel</button>
               <button type="submit" disabled={submitMutation.isPending} className="flex justify-center items-center gap-2 px-6 py-2.5 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 w-full sm:w-auto">
                 {submitMutation.isPending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Key className="w-4 h-4"/> Commit Update</>}
               </button>
             </div>
          </form>
       </motion.div>
    </div>
  );
}
