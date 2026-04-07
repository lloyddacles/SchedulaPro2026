import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Settings, Save, Building2, Monitor, Image, RefreshCw, CheckCircle, CalendarPlus, Archive, CheckCircle2, MoreVertical, Trash2, PlusCircle, Info } from 'lucide-react';
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
  
  // Term Management State
  const [showArchived, setShowArchived] = useState(false);
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');

  useEffect(() => {
    fetchTerms(true); // Fetch all including archived for management
  }, [fetchTerms]);

  // Sync form fields when store data populates
  useEffect(() => {
    if (systemSettings.app_name) setAppName(systemSettings.app_name);
    if (systemSettings.institution_name) setInstitutionName(systemSettings.institution_name);
    setLogoUrl(systemSettings.logo_url || '');
  }, [systemSettings.app_name, systemSettings.institution_name, systemSettings.logo_url]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      updateSettings({ app_name: appName, institution_name: institutionName, logo_url: logoUrl });
      fetchSettings();
      toast.success('System settings saved!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save settings.');
    },
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
      toast.success('New academic term created.');
    } catch (err) {
      toast.error('Failed to create term.');
    }
  };

  const handlePromote = async (id) => {
    try {
      await promoteTerm(id);
      toast.success('Term promoted to operational default.');
    } catch (err) {
      toast.error('Failed to promote term.');
    }
  };

  const handleArchive = async (id, isArchived) => {
    try {
      await archiveTerm(id, isArchived);
      toast.success(isArchived ? 'Term moved to archive.' : 'Term restored from archive.');
    } catch (err) {
      toast.error('Failed to update term status.');
    }
  };

  const filteredTerms = terms.filter(t => showArchived ? true : !t.is_archived);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 shadow-xl shadow-brand-500/20">
          <Settings className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Institutional Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage global operational defaults and branding</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - Settings Form */}
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handleSave} className="space-y-6">
            {/* App Branding Card */}
            <div className="glass rounded-[2rem] border border-white/20 shadow-xl p-6.5 space-y-6">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-brand-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">Identity & Logo</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Application Name</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Institution Name</label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Logo Image URL</label>
                  <div className="flex gap-4">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => { setLogoUrl(e.target.value); setLogoPreviewError(false); }}
                      placeholder="https://yourschool.edu/logo.png"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-medium focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                    />
                    <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logoUrl && !logoPreviewError ? (
                        <img src={logoUrl} alt="Preview" className="w-9 h-9 object-contain" onError={() => setLogoPreviewError(true)} />
                      ) : (
                        <Building2 className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-slate-950 dark:bg-brand-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:shadow-brand-500/30 hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saveMutation.isPending ? 'Propagating...' : 'Save & Publish Branding'}
                </button>
              </div>
            </div>
          </form>

          {/* Academic Term Setup Card */}
          <div className="glass rounded-[2rem] border border-white/20 shadow-xl p-6.5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarPlus className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">Academic Term Lifecycle</h2>
              </div>
              <button 
                onClick={() => setIsAddingTerm(true)}
                className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>

            {isAddingTerm && (
              <form onSubmit={handleCreateTerm} className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newTermName}
                    onChange={(e) => setNewTermName(e.target.value)}
                    placeholder="Term Name (e.g. First Semester 2026-2027)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20">Add</button>
                  <button type="button" onClick={() => setIsAddingTerm(false)} className="px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {filteredTerms.map((term) => (
                <div key={term.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  term.is_active 
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30' 
                    : term.is_archived
                    ? 'bg-gray-50/50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800/50 opacity-60'
                    : 'bg-white dark:bg-slate-950 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-1.5 rounded-full ${term.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300 dark:bg-slate-700'}`} />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {term.name}
                        {term.is_active && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black uppercase tracking-tighter">Operational</span>}
                        {term.is_archived && <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-500 text-white font-black uppercase tracking-tighter">Archived</span>}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {!term.is_active && !term.is_archived && (
                      <button 
                        onClick={() => handlePromote(term.id)}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        title="Promote to Operational Default"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleArchive(term.id, !term.is_archived)}
                      className={`p-2 rounded-lg transition-colors ${
                        term.is_archived 
                          ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10' 
                          : 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
                      }`}
                      title={term.is_archived ? 'Restore Term' : 'Archive Term'}
                    >
                      {term.is_archived ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:text-brand-500 transition-colors flex items-center gap-2"
              >
                {showArchived ? 'Hide Archived Terms' : 'Show All Archives'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Meta & Preview */}
        <div className="lg:col-span-5 space-y-8">
          {/* Header Preview */}
          <div className="glass rounded-[2rem] border border-white/20 shadow-xl p-6.5">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">Live Header Preview</h2>
            </div>
            
            <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-1 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
              </div>
              <p className="text-lg font-black text-slate-950 uppercase tracking-tight leading-none">{institutionName || 'Institutional Entity'}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pb-1 border-b border-gray-50 mx-12">MAIN CAMPUS OPERATIONS</p>
              <div className="pt-3">
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                  {terms.find(t => t.is_active)?.name || 'NO ACTIVE TERM SELECTED'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 italic">Generated Matrix Schedule · Card-MRI</p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                <Info className="w-3 h-3" />
                Operational Warning
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500/70 mt-1 leading-relaxed">
                Promoting a term will instantly shift the global operational environment. All users will see data for the promoted term by default upon their next session initialization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
