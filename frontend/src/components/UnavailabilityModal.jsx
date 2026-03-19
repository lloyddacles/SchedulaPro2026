import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { X, Trash2, Clock, AlertCircle } from 'lucide-react';

export default function UnavailabilityModal({ faculty, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ day_of_week: 'Monday', start_time: '08:00', end_time: '12:00', reason: 'Unavailable' });
  const [error, setError] = useState('');

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['unavailability', faculty.id],
    queryFn: async () => (await api.get(`/unavailability/${faculty.id}`)).data
  });

  const createMutation = useMutation({
    mutationFn: (newBlock) => api.post('/unavailability', { ...newBlock, faculty_id: faculty.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', faculty.id] });
      setFormData({ day_of_week: 'Monday', start_time: '08:00', end_time: '12:00', reason: 'Unavailable' });
      setError('');
    },
    onError: (err) => setError(err.response?.data?.error || 'Failed to map time blockout.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/unavailability/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unavailability', faculty.id] })
  });

  return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3"><Clock className="text-amber-500 w-6 h-6"/> Active Time Blackouts: {faculty.full_name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {error && (
               <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" /> <span className="font-semibold">{error}</span>
               </div>
            )}

            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(formData); }} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-amber-700 mb-1 uppercase tracking-wider">Day Target</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500 bg-white" value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                 <label className="block text-[10px] font-bold text-amber-700 mb-1 uppercase tracking-wider">Start Time</label>
                 <input type="time" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
              </div>
              <div className="col-span-1">
                 <label className="block text-[10px] font-bold text-amber-700 mb-1 uppercase tracking-wider">End Time</label>
                 <input type="time" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
              </div>
              <div className="col-span-2 md:col-span-1">
                 <label className="block text-[10px] font-bold text-amber-700 mb-1 uppercase tracking-wider">Reason</label>
                 <input type="text" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>
              <div className="col-span-2 md:col-span-1">
                 <button type="submit" disabled={createMutation.isPending} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50">Block Time</button>
              </div>
            </form>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
               <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Day</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time Range</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unavailability Reason</th>
                      <th className="px-5 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                     {blocks.length === 0 ? <tr><td colSpan="4" className="text-center py-10 text-gray-400 text-sm font-semibold">No active time blockouts detected.</td></tr> : null}
                     {blocks.map(b => (
                        <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                           <td className="px-5 py-4 text-sm font-extrabold text-gray-800">{b.day_of_week}</td>
                           <td className="px-5 py-4 text-sm font-mono text-amber-600 font-bold bg-amber-50/50 rounded inline-block mt-2 mb-2 ml-5">{b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}</td>
                           <td className="px-5 py-4 text-sm font-semibold text-gray-600 break-words">{b.reason}</td>
                           <td className="px-5 py-4 text-right">
                              <button onClick={() => { if(window.confirm('Remove blackout restriction linking this timeframe?')) deleteMutation.mutate(b.id) }} className="text-red-400 hover:text-red-600 transition-colors p-2 bg-red-50 hover:bg-red-100 rounded-lg">
                                 <Trash2 className="w-4 h-4 inline"/>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      </div>
  );
}
