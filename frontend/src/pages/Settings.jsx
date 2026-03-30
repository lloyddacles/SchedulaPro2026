import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Settings, Save, Building2, Monitor, Image, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import toast from 'react-hot-toast';

export default function SystemSettings() {
  const { systemSettings, updateSettings, fetchSettings } = useScheduleStore();

  const [appName, setAppName] = useState(systemSettings.app_name || '');
  const [institutionName, setInstitutionName] = useState(systemSettings.institution_name || '');
  const [logoUrl, setLogoUrl] = useState(systemSettings.logo_url || '');
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  // Sync form fields when store data populates (covers slow-fetch / first-load edge case)
  useEffect(() => {
    if (systemSettings.app_name) setAppName(systemSettings.app_name);
    if (systemSettings.institution_name) setInstitutionName(systemSettings.institution_name);
    setLogoUrl(systemSettings.logo_url || '');
  }, [systemSettings.app_name, systemSettings.institution_name, systemSettings.logo_url]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      updateSettings({ app_name: appName, institution_name: institutionName, logo_url: logoUrl });
      fetchSettings(); // Re-sync from server
      toast.success('System settings saved! Changes are now live across the application.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save settings.');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!appName.trim() || !institutionName.trim()) {
      toast.error('App Name and Institution Name are required.');
      return;
    }
    saveMutation.mutate({ app_name: appName.trim(), institution_name: institutionName.trim(), logo_url: logoUrl.trim() });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-lg shadow-brand-500/30">
          <Settings className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">System Settings</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">White-label branding configuration for this institution</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* App Branding Card */}
        <div className="glass rounded-[2rem] border border-white/30 shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">Application Identity</h2>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5">
              Application Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. FacultySync"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Displayed in the sidebar navigation header.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5">
              Institution Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g. CARD-MRI Development Institute, Inc."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Printed at the top of all exported PDF documents.</p>
          </div>
        </div>

        {/* Logo Card */}
        <div className="glass rounded-[2rem] border border-white/30 shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">Logo Configuration</h2>
          </div>

          <div className="flex items-start gap-5">
            {/* Preview */}
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 bg-gray-50 dark:bg-slate-900">
              {logoUrl && !logoPreviewError ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-16 h-16 object-contain rounded-xl"
                  onError={() => setLogoPreviewError(true)}
                />
              ) : (
                <Building2 className="w-8 h-8 text-gray-300 dark:text-slate-600" />
              )}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5">Logo Image URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => { setLogoUrl(e.target.value); setLogoPreviewError(false); }}
                placeholder="https://yourschool.edu/logo.png"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Paste a public URL to your institution's logo. Replaces the default hexagon icon in the sidebar. Leave blank to use the default icon.
              </p>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="glass rounded-[2rem] border border-white/30 shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">PDF Header Preview</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center space-y-0.5">
            <p className="text-base font-black text-slate-900 uppercase tracking-wide">{institutionName || 'Institution Name'}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">MAIN CAMPUS</p>
            <p className="text-xs text-slate-400">Second Semester A.Y. 2025-2026</p>
            <p className="text-sm font-bold text-slate-800 pt-1">Schedule for Cohort BSIS 1st Year B1</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {saveMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveMutation.isPending ? 'Saving...' : 'Save & Apply Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
