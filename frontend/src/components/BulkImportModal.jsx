import React, { useState } from 'react';
import Papa from 'papaparse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { motion } from 'framer-motion';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

export default function BulkImportModal({ onClose }) {
  const queryClient = useQueryClient();
  const [targetEntity, setTargetEntity] = useState('faculty');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setStatus({ type: '', msg: '' });

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setStatus({ type: 'error', msg: 'CSV parsing failed. Please check your file format.' });
          return;
        }
        if (results.data.length === 0) {
          setStatus({ type: 'error', msg: 'No data rows found in the uploaded file.' });
          return;
        }
        setPreviewData(results.data);
      }
    });
  };

  const importMutation = useMutation({
    mutationFn: (payload) => api.post(`/bulk/${targetEntity}`, payload),
    onSuccess: (res) => {
      setStatus({ type: 'success', msg: `Successfully imported ${res.data.inserted_objects} records.` });
      queryClient.invalidateQueries({ queryKey: [targetEntity] });
      setPreviewData([]);
      setFile(null);
    },
    onError: (err) => {
      setStatus({ type: 'error', msg: err.response?.data?.message || err.message });
    }
  });

  const handleCommit = () => {
    if (previewData.length === 0) return;
    importMutation.mutate(previewData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
        className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-700"
      >

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/60 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <FileSpreadsheet className="text-brand-500 w-6 h-6" /> CSV Bulk Import
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Status Banner */}
          {status.msg && (
            <div className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 ${
              status.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
            }`}>
              {status.type === 'error'
                ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                : <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <span>{status.msg}</span>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Import Target</label>
              <select
                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-900 dark:text-white font-semibold transition-all cursor-pointer"
                value={targetEntity}
                onChange={(e) => { setTargetEntity(e.target.value); setPreviewData([]); setFile(null); setStatus({ type: '', msg: '' }); }}
              >
                <option value="faculty">Faculty Profiles</option>
                <option value="subjects">Subjects</option>
                <option value="sections">Sections</option>
                <option value="rooms">Rooms / Facilities</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1">Upload CSV File</label>
              <label className="flex items-center justify-center w-full h-[52px] border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-400 dark:hover:border-brand-600 transition-colors cursor-pointer bg-gray-50 dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-semibold gap-2">
                <UploadCloud className="w-5 h-5 flex-shrink-0" />
                <span className="truncate text-sm">{file ? file.name : 'Choose .CSV file'}</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 px-5 py-3 flex justify-between items-center">
                <span className="text-xs font-extrabold text-brand-700 dark:text-brand-400 uppercase tracking-widest">
                  Preview — {previewData.length} rows detected
                </span>
              </div>
              <div className="overflow-x-auto max-h-[350px]">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      {Object.keys(previewData[0]).map((key, i) => (
                        <th key={i} className="px-5 py-3 text-left text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50/50 dark:bg-slate-900/30 divide-y divide-gray-100 dark:divide-slate-700">
                    {previewData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-5 py-3 text-sm text-gray-800 dark:text-slate-200 font-medium truncate max-w-[200px]" title={String(val)}>
                            {val || <span className="text-gray-400 italic">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 5 && (
                <div className="text-center py-3 text-xs font-bold text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                  ...and {previewData.length - 5} more rows
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900/60 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={importMutation.isPending || previewData.length === 0}
            className="flex justify-center items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {importMutation.isPending
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><FileSpreadsheet className="w-4 h-4" /> Import Data</>
            }
          </button>
        </div>

      </motion.div>
    </div>
  );
}
