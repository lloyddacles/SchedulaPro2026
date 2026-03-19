import React, { useState } from 'react';
import Papa from 'papaparse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
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
         // Local Error Guarding
         if (results.errors.length > 0) {
            setStatus({ type: 'error', msg: 'CSV Data Corruption: Mathematical structure failed to map array bounds locally.' });
            return;
         }
         if (results.data.length === 0) {
            setStatus({ type: 'error', msg: 'CSV Extraction Empty: Zero object rows detected.' });
            return;
         }
         setPreviewData(results.data);
      }
    });
  };

  const importMutation = useMutation({
     mutationFn: (payload) => api.post(`/bulk/${targetEntity}`, payload),
     onSuccess: (res) => {
        setStatus({ type: 'success', msg: res.data.message || `Successfully committed ${res.data.inserted_objects} discrete parameters into SQL.` });
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
       <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
               <FileSpreadsheet className="text-brand-500 w-6 h-6"/> Bulk CSV Configurator
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
             {status.msg && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                   {status.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0"/> : <CheckCircle className="w-5 h-5 flex-shrink-0"/>}
                   {status.msg}
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Target Database Node</label>
                   <select className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 font-bold text-brand-900 transition-all cursor-pointer shadow-sm" value={targetEntity} onChange={(e) => { setTargetEntity(e.target.value); setPreviewData([]); setFile(null); setStatus({type:'',msg:''}) }}>
                      <option value="faculty">Faculty Profiles Data</option>
                      <option value="subjects">Curriculum Subjects</option>
                      <option value="sections">Student Cohorts</option>
                      <option value="rooms">Physical Facilities</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Upload Data Matrix</label>
                   <label className="flex items-center justify-center w-full h-[52px] border-2 border-dashed border-gray-300 rounded-xl hover:bg-brand-50 hover:border-brand-500 transition-colors cursor-pointer bg-gray-50 text-brand-600 font-bold gap-3 shadow-sm">
                      <UploadCloud className="w-5 h-5" /> 
                      <span className="truncate max-w-[200px]">{file ? file.name : "Choose .CSV Bundle"}</span>
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                   </label>
                </div>
             </div>

             {previewData.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
                   <div className="bg-brand-50 border-b border-brand-100 px-5 py-3 flex justify-between items-center">
                      <span className="text-xs font-extrabold text-brand-700 uppercase tracking-widest">Mathematical Preview ({previewData.length} Extracted Rows)</span>
                   </div>
                   <div className="overflow-x-auto max-h-[350px]">
                      <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-white sticky top-0 relative z-10 shadow-sm border-b border-gray-200">
                           <tr>
                             {Object.keys(previewData[0]).map((key, i) => (
                                <th key={i} className="px-5 py-4 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{key}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody className="bg-gray-50/50 divide-y divide-gray-100">
                            {previewData.slice(0, 5).map((row, idx) => (
                               <tr key={idx} className="hover:bg-brand-50/50 transition-colors">
                                  {Object.values(row).map((val, i) => (
                                     <td key={i} className="px-5 py-4 text-sm text-gray-800 font-semibold truncate max-w-[200px]" title={val}>{val || '-'}</td>
                                  ))}
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                   {previewData.length > 5 && <div className="text-center py-3 text-xs font-bold text-gray-400 bg-white border-t border-gray-100">...and {previewData.length - 5} subsequent nested iterations.</div>}
                </div>
             )}
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
             <button onClick={onClose} className="px-6 py-3 bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors sm:w-auto w-full">Cancel</button>
             <button onClick={handleCommit} disabled={importMutation.isPending || previewData.length === 0} className="flex justify-center items-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 sm:w-auto w-full">
                {importMutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><FileSpreadsheet className="w-5 h-5"/> Force Execute Pipeline</>}
             </button>
          </div>
       </div>
    </div>
  );
}
