import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, User, Layers, ShieldCheck, Info, CalendarCheck, Settings2, CheckCircle2 } from 'lucide-react';

const CAROUSEL_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1400",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1400",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1400"
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle subtle animation entrance
  const [mounted, setMounted] = useState(false);
  useEffect(() => { 
    setMounted(true); 
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid identity credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950 font-sans selection:bg-brand-500/30">
      
      {/* ── Left Side: Faculty Coordination Hero Section (Carousel) ────────── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden group bg-brand-900">
        <AnimatePresence mode="wait">
          <motion.img 
            key={CAROUSEL_IMAGES[currentIdx]}
            src={CAROUSEL_IMAGES[currentIdx]}
            alt="Academic Planning Hub" 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/85 via-brand-900/50 to-transparent" />
        
        {/* Branding on Image Overlay */}
        <div className={`absolute top-12 left-12 flex items-center gap-3 transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl overflow-hidden p-0.5">
            <img src="/logo.png" alt="SchedulaPro Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">SchedulaPro</h2>
        </div>

        {/* Hero Text Content */}
        <div className="absolute bottom-16 left-12 right-12 max-w-xl">
          <div className={`space-y-4 transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-[0.2em] border border-white/10">
              Academic Resource Matrix
            </span>
            <h1 className="text-5xl font-black text-white leading-tight font-display">
              Orchestrating Faculty <br/> 
              <span className="text-brand-400">Synchronization.</span>
            </h1>
            <p className="text-brand-100/80 text-lg font-medium leading-relaxed">
              Standardizing institutional workloads and schedule boundaries through high-fidelity matrix automation.
            </p>
          </div>

          {/* Quick Stats/Info Pills */}
          <div className={`flex gap-4 mt-12 transition-all duration-1000 delay-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="px-4 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 space-y-1">
              <p className="text-[10px] text-brand-300 font-bold uppercase tracking-wider">Matrix Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-white">Operational</span>
              </div>
            </div>
            <div className="px-4 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 space-y-1">
              <p className="text-[10px] text-brand-300 font-bold uppercase tracking-wider">Administrative Mode</p>
              <span className="text-sm font-bold text-white">Full Access [v2.4]</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: Professional Scheduler Portal ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 relative">
        <div className={`w-full max-w-sm space-y-8 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* Mobile Only Branding */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl mb-4 p-0.5 border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <img src="/logo.png" alt="SchedulaPro Logo" className="w-full h-full object-cover rounded-3xl" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">SchedulaPro</h1>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white font-display mb-3 tracking-tighter">Scheduler Portal</h2>
            <p className="text-gray-500 dark:text-slate-400 font-medium">Enter your coordinator credentials to access the academic resource planner.</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-2xl p-4 flex items-center gap-3 animate-shake text-sm font-bold text-red-600 dark:text-red-400">
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-14 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-gray-800 dark:text-white placeholder-gray-300"
                  placeholder="Official Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end mr-1">
                <label className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <button type="button" className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider hover:underline transition-colors">Reset Matrix Key?</button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-14 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-gray-800 dark:text-white placeholder-gray-300"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-5 px-6 rounded-2xl bg-slate-950 dark:bg-brand-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 dark:shadow-brand-500/30 hover:shadow-brand-500/40 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Dispatching Matrix...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" /> 
                  Authorize Entry
                </span>
              )}
            </button>
          </form>

          {/* Institutional Integrity Note */}
          <div className="pt-6 border-t border-gray-50 dark:border-slate-800/50 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed font-semibold">
              This system governs sensitive faculty workload data. Unauthorized access attempts are monitored and recorded electronically.
            </p>
          </div>

          {/* Ownership Footer */}
          <footer className="pt-12 text-center lg:text-left">
            <p className="text-[10px] text-gray-300 dark:text-slate-600 font-black uppercase tracking-widest mb-1">Architect & Principal Owner</p>
            <p className="text-xs font-bold text-gray-600 dark:text-slate-300">Mr. Lloyd Christopher F. Dacles, MIS</p>
            <p className="text-[10px] text-brand-500 font-black tracking-[0.2em] uppercase mt-0.5">LDRaidmax Systems</p>
            <div className="mt-6 text-[10px] text-gray-300 dark:text-slate-700 font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} Software Laboratory · Philippines
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
