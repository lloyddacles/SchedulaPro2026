import React, { useRef } from 'react';
import Papa from 'papaparse';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * BulkActions Component
 * Handles CSV template generation and Bulk Upload logic for different entities.
 * 
 * @param {string} entity - 'subjects' or 'faculty'
 * @param {Array} columns - The columns for the CSV template
 */
export default function BulkActions({ entity, columns, onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (data) => api.post(`/${entity}/bulk-upload`, data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Import successful!');
      queryClient.invalidateQueries({ queryKey: [entity] });
      if (onUploadSuccess) onUploadSuccess();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Error uploading data';
      toast.error(msg);
    }
  });

  const downloadTemplate = () => {
    // Standard blank row
    const row = {};
    columns.forEach(col => row[col] = '');
    
    const csv = Papa.unparse([row], { columns });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${entity}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid .csv file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('Error parsing CSV file');
          return;
        }

        const data = results.data;
        if (data.length === 0) {
          toast.error('The uploaded file is empty');
          return;
        }

        // Simple header validation
        const headers = Object.keys(data[0]);
        const missing = columns.filter(col => !headers.includes(col));
        
        if (missing.length > 0) {
          toast.error(`Missing columns: ${missing.join(', ')}`);
          return;
        }

        uploadMutation.mutate(data);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={downloadTemplate}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition"
        title="Download Blank CSV Template"
      >
        <Download className="w-4 h-4" />
        <span className="text-xs font-bold whitespace-nowrap">Template</span>
      </button>

      <div className="relative">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden" 
          accept=".csv"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-md transition hover:bg-emerald-700 ${uploadMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploadMutation.isPending ? (
             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
             <Upload className="w-4 h-4" />
          )}
          <span className="text-xs font-bold whitespace-nowrap">Bulk Import</span>
        </button>
      </div>
    </div>
  );
}
