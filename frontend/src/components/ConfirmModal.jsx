import { Archive, RefreshCw, RotateCcw, Sparkles, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'danger', 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel'
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <Archive className="w-10 h-10" />;
      case 'restore': return <RefreshCw className="w-10 h-10" />;
      case 'reset': return <RotateCcw className="w-10 h-10" />;
      case 'indigo': return <Sparkles className="w-10 h-10" />;
      case 'warning': return <AlertTriangle className="w-10 h-10" />;
      case 'success': return <CheckCircle className="w-10 h-10" />;
      case 'error': return <XCircle className="w-10 h-10" />;
      default: return <Archive className="w-10 h-10" />;
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger': return 'bg-red-100 text-red-600';
      case 'restore': return 'bg-emerald-100 text-emerald-600';
      case 'reset': return 'bg-red-100 text-red-600';
      case 'indigo': return 'bg-indigo-100 text-indigo-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      case 'success': return 'bg-emerald-100 text-emerald-600';
      case 'error': return 'bg-rose-100 text-rose-600';
      default: return 'bg-red-100 text-red-600';
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none';
      case 'restore': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none';
      case 'reset': return 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none';
      case 'error': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none';
      default: return 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none';
    }
  };

  const getBackgroundStyles = () => {
    switch (type) {
      case 'danger': 
      case 'reset': return 'bg-red-50/50 dark:bg-red-900/10';
      case 'restore':
      case 'success': return 'bg-emerald-50/50 dark:bg-emerald-900/10';
      case 'warning': return 'bg-amber-50/50 dark:bg-amber-900/10';
      case 'error': return 'bg-rose-50/50 dark:bg-rose-900/10';
      case 'indigo': return 'bg-indigo-50/50 dark:bg-indigo-900/10';
      default: return 'bg-red-50/50 dark:bg-red-900/10';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden"
      >
        <div className={`p-8 text-center ${getBackgroundStyles()}`}>
          <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm ${getTypeStyles()}`}>
            {getIcon()}
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{message}</p>
        </div>

        <div className="p-6 flex gap-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => {
              if (onCancel) onCancel();
              onClose();
            }} 
            className="flex-1 px-6 py-4 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-4 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${getButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
