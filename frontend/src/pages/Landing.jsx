import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, CalendarCheck, Layers, Zap, 
  ShieldCheck, LayoutDashboard, BrainCircuit, Users 
} from 'lucide-react';

export default function Landing() {
  // Animation Variants
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0f1c] text-slate-900 dark:text-white overflow-hidden selection:bg-brand-500/30 font-sans">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-violet-600/20 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <CalendarCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight flex items-center gap-2">
            SchedulaPro
            <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400 text-[9px] uppercase tracking-widest font-black border border-brand-500/20">V2</span>
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link 
            to="/login"
            className="group relative px-6 py-2.5 rounded-full overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm tracking-wide transition-transform hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              Sign In to Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32 px-4 max-w-5xl mx-auto text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-8 flex flex-col items-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-md text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-widest">
            <Zap className="w-4 h-4" /> Next-Generation Algorithm
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 pb-2">
            Meet the Scheduler <br className="hidden md:block"/>
            of the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-indigo-500 to-violet-500">Future.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-2xl text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Eliminate double-booking and operational bottlenecks with SchedulaPro's intelligent matrix formulation. Designed exclusively for modern educational institutions.
          </motion.p>

          <motion.div variants={fadeUp} className="pt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
              <LayoutDashboard className="w-5 h-5" /> Deploy Institution
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 py-32 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div variants={fadeUp} className="glass p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Core Intelligence</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm">
                Advanced conflict detection aggressively prevents faculty overload and room overlaps before they are even saved.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeUp} className="glass p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Personnel Symphony</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm">
                Seamlessly map subjects to faculty credentials while respecting operational break blocks and designated rest days.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeUp} className="glass p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 hover:border-violet-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group lg:col-span-1 xl:col-span-1 md:col-span-2">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Impenetrable Audit Log</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm">
                Every modification is traced. Maintain strict institutional compliance globally across departments and roles.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Layers className="w-5 h-5" />
            <span className="font-extrabold uppercase tracking-[0.2em] text-xs">LDRaidmax Systems</span>
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Software Laboratory. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
