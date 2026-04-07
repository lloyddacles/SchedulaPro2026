import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Save, Building2, Monitor, Image, RefreshCw, CheckCircle, 
  CalendarPlus, Archive, CheckCircle2, PlusCircle, Info, Database, 
  ShieldCheck, Zap, ArrowRight, Layout 
} from 'lucide-react';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import toast from 'react-hot-toast';

export default function SystemSettings() {
  const { 
    systemSettings, updateSettings, fetchSettings,
    terms, fetchTerms, promoteTerm, archiveTerm, createTerm, isTermsLoading
  } = useScheduleStore();

  const [appName, setAppName] = useState(systemSettings.app_name || '');
  const [institutionName, setInstitutionName] = useState(systemSettings.institution_name || '');
  const [logoUrl, setLogoUrl] = useState(systemSettings.logo_url || '');
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  
  const [showArchived, setShowArchived] = useState(false);
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');

  useEffect(() => {
    fetchTerms(true);
    fetchSettings();
  }, [fetchTerms, fetchSettings]);

  useEffect(() => {
    if (systemSettings.app_name) setAppName(systemSettings.app_name);
    if (systemSettings.institution_name) setInstitutionName(systemSettings.institution_name);
    setLogoUrl(systemSettings.logo_url || '');
  }, [systemSettings.app_name, systemSettings.institution_name, systemSettings.logo_url]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      updateSettings({ app_name: appName, institution_name: institutionName, logo_url: logoUrl });
      toast.success('Branding propagated across system!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save settings.'),
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!appName.trim() || !institutionName.trim()) {
      toast.error('Required fields missing.');
      return;
    }
    saveMutation.mutate({ app_name: appName.trim(), institution_name: institutionName.trim(), logo_url: logoUrl.trim() });
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!newTermName.trim()) return;
    try {
      await createTerm(newTermName.trim());
      setNewTermName('');
      setIsAddingTerm(false);
      toast.success('Timeline extended successfully.');
    } catch (err) {
      toast.error('Term addition failed.');
    }
  };

  const handlePromote = async (id) => {
    try {
      await promoteTerm(id);
      toast.success('Operational environment shifted.');
    } catch (err) {
      toast.error('Promotion failed.');
    }
  };

  const handleArchive = async (id, isArchived) => {
    try {
      await archiveTerm(id, isArchived);
      toast.success(isArchived ? 'Moved to archive.' : 'Restored to operations.');
    } catch (err) {
      toast.error('Status transition failed.');
    }
  };

  const filteredTerms = terms.filter(t => showArchived ? true : !t.is_archived);

  // Animation variants
  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={containerVars}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-10 min-h-screen"
    >
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-[1.5rem] bg-gradient-to-br from-brand-500 via-indigo-600 to-violet-700 shadow-2xl shadow-brand-500/20 ring-4 ring-brand-500/10 transition-transform hover:scale-105 cursor-default">
            <Settings className="w-8 h-8 text-white animate-pulse-slow" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              Institutional Control Center
              <span className="hidden sm:inline-flex px-3 py-1 bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-500/20">Alpha V2</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium italic">Synchronizing branding and operational lifecycles across the environment.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Database</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aiven Cloud Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
        
        {/* Branding Bento (60%) */}
        <motion.div variants={itemVars} className="lg:col-span-12 xl:col-span-8 flex flex-col gap-8">
          <form onSubmit={handleSave} className="glass rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden group">
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 dark:text-slate-500">Global Identification</h2>
                </div>
                <Zap className="w-4 h-4 text-brand-400 opacity-20 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Application Hub Name</label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Official Institution Label</label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Brand Asset (Logo URL)</label>
                    <div className="flex gap-4">
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => { setLogoUrl(e.target.value); setLogoPreviewError(false); }}
                        placeholder="https://assets.yourschool.edu/logo.png"
                        className="flex-1 px-5 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                      />
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group">
                        {logoUrl && !logoPreviewError ? (
                          <img src={logoUrl} alt="Preview" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" onError={() => setLogoPreviewError(true)} />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-slate-950 dark:bg-brand-600 text-white font-black uppercase tracking-widest text-[11px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-brand-500/40 hover:-translate-y-1.5 transition-all disabled:opacity-50"
                  >
                    {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saveMutation.isPending ? 'Propagating Assets...' : 'Broadcast Brand Update'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Banner Decor */}
            <div className="h-2 bg-gradient-to-r from-brand-400 via-indigo-500 to-violet-600 opacity-50 group-hover:opacity-100 transition-opacity" />
          </form>

          {/* Academic Timeline Bento */}
          <div className="glass rounded-[2.5rem] border border-white/20 shadow-2xl p-8 space-y-8 min-h-[400px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 dark:text-slate-500">A.Y. Lifecycle Timeline</h2>
              </div>
              <button 
                onClick={() => setIsAddingTerm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Term
              </button>
            </div>

            <AnimatePresence>
              {isAddingTerm && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateTerm} 
                  className="p-6 rounded-[2rem] bg-indigo-600/5 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      autoFocus
                      value={newTermName}
                      onChange={(e) => setNewTermName(e.target.value)}
                      placeholder="Academic Term Title (e.g. 1st Semester 2026-2027)"
                      className="flex-1 px-6 py-4 rounded-xl border border-white/50 dark:border-slate-800 bg-white/50 dark:bg-slate-950 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 sm:flex-none px-8 py-4 rounded-xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Add to Timeline</button>
                      <button type="button" onClick={() => setIsAddingTerm(false)} className="px-6 py-4 rounded-xl text-gray-400 font-bold text-xs hover:text-gray-600">Cancel</button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTerms.map((term, idx) => (
                <motion.div 
                  key={term.id} 
                  variants={itemVars}
                  className={`group relative flex flex-col justify-between p-6 rounded-[2rem] border transition-all duration-300 ${
                    term.is_active 
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] ring-4 ring-emerald-500/10 z-10 scale-[1.02]' 
                      : term.is_archived
                      ? 'bg-gray-50/30 dark:bg-slate-900/40 border-gray-100 dark:border-slate-800/50 opacity-50 contrast-75'
                      : 'bg-white dark:bg-slate-950 border-gray-100 dark:border-slate-800 hover:scale-[1.01] hover:shadow-xl hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${term.is_active ? 'text-emerald-100' : 'text-gray-400 dark:text-slate-500'}`}>
                        {term.is_archived ? 'Legacy Archival' : 'Institutional Period'}
                      </div>
                      <h3 className="text-base font-black tracking-tight truncate max-w-[200px]">{term.name}</h3>
                    </div>
                    {term.is_active && <div className="p-2 bg-white/20 rounded-full backdrop-blur-md"><Zap className="w-4 h-4 fill-white animate-pulse" /></div>}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                    <div className="flex flex-wrap gap-2">
                      {term.is_active ? (
                        <span className="text-[9px] px-2.5 py-1 rounded-full bg-white text-emerald-600 font-black uppercase tracking-tighter shadow-sm">Operational Default</span>
                      ) : term.is_archived ? (
                        <span className="text-[9px] px-2.5 py-1 rounded-full bg-slate-500 text-white font-black uppercase tracking-tighter">Archived</span>
                      ) : (
                        <span className="text-[9px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-black uppercase tracking-tighter italic">Inactive</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!term.is_active && !term.is_archived && (
                        <button 
                          onClick={() => handlePromote(term.id)}
                          className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors"
                          title="Promote to Operational Default"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      {!term.is_active && (
                         <button 
                          onClick={() => handleArchive(term.id, !term.is_archived)}
                          className={`p-2 rounded-xl transition-all ${
                            term.is_archived 
                              ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10' 
                              : 'text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 hover:scale-110'
                          }`}
                          title={term.is_archived ? 'Restore to Timeline' : 'Move to Archive'}
                        >
                          {term.is_archived ? <RefreshCw className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center pt-6">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className="group px-6 py-3 rounded-2xl bg-gray-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500 hover:text-brand-500 hover:dark:text-brand-400 transition-all border border-transparent hover:border-brand-500/20 flex items-center gap-3"
              >
                {showArchived ? 'Hide Archived Context' : 'Reveal Operational Archives'}
                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : 'group-hover:translate-x-1'}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* UTILITY SIDEBAR (40%) */}
        <motion.div variants={itemVars} className="lg:col-span-12 xl:col-span-4 flex flex-col gap-8">
          
          {/* Header Preview Bento */}
          <div className="glass rounded-[2.5rem] border border-white/20 shadow-2xl p-8 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Layout className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 dark:text-slate-500">Document Layout Preview</h2>
            </div>
            
            <div className="relative group">
              <div className="bg-white rounded-[2rem] border border-gray-100 p-8 text-center space-y-1 shadow-2xl shadow-gray-200/50 dark:shadow-none transition-transform group-hover:scale-[1.02] duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <CheckCircle className="w-5 h-5 text-emerald-500 opacity-20" />
                </div>
                <p className="text-xl font-black text-slate-950 uppercase tracking-tighter leading-none">{institutionName || 'Institutional Entity'}</p>
                <div className="h-0.5 w-16 bg-brand-500/20 mx-auto mt-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] pt-2">MAIN CAMPUS OPERATIONS</p>
                
                <div className="pt-8 pb-4">
                  <div className="relative inline-block px-5 py-2">
                    <div className="absolute inset-0 bg-brand-500/5 rounded-full blur-md" />
                    <p className="relative text-xs font-black text-brand-600 uppercase tracking-widest whitespace-nowrap">
                      {terms.find(t => t.is_active)?.name || 'TERMINOLOGY PENDING'}
                    </p>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-3 font-medium flex items-center justify-center gap-2 italic">
                    SchedulaPro Matrix v2026.4
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  </p>
                </div>
              </div>
              
              {/* Hover Indicator */}
              <div className="absolute -inset-4 bg-brand-500/5 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity -z-10 pointer-events-none" />
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100/50 dark:border-amber-500/20 relative group">
                <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0 animate-bounce-slow mt-1" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Global Policy Alert</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500/80 leading-relaxed font-medium">
                      Operational shifts propagate instantly. All user sessions will re-base their default view to the promoted period on the next payload handshake.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Stats Bento (New - Fills Wasted Space) */}
          <div className="glass rounded-[2.5rem] border border-white/20 shadow-2xl p-8 space-y-6 flex-1 bg-gradient-to-tr from-brand-900/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-500/10 text-slate-500">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 dark:text-slate-500">Infrastructure Integrity</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Handshake</span>
                <span className="block text-sm font-bold text-emerald-500 uppercase tracking-tighter">Verified</span>
              </div>
              <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Latency</span>
                <span className="block text-sm font-bold text-brand-500 uppercase tracking-tighter">18ms</span>
              </div>
              <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">TLS Security</span>
                <span className="block text-sm font-bold text-indigo-500 uppercase tracking-tighter">v1.3 AES</span>
              </div>
              <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800 space-y-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage</span>
                <span className="block text-sm font-bold text-violet-500 uppercase tracking-tighter">Cloud DB</span>
              </div>
            </div>

            <div className="pt-4">
               <div className="p-6 rounded-[1.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 text-center space-y-2 opacity-50 group hover:opacity-100 transition-all cursor-default translate-y-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Institutional Node</p>
                 <p className="text-xs font-black text-slate-400 dark:text-slate-600 truncate">{window.location.hostname}</p>
                 <div className="flex justify-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '400ms' }} />
                 </div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
