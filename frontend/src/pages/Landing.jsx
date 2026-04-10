import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, CalendarCheck, Layers, Zap, 
  ShieldCheck, LayoutDashboard, BrainCircuit, Users, CheckCircle2, ChevronRight 
} from 'lucide-react';

function AnimatedCounter({ end, suffix = "", text }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000;
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(start);
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, end]);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center p-6 w-full sm:w-1/3">
      <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand-600 to-indigo-600 dark:from-white dark:to-slate-400">
        {Math.floor(count).toLocaleString()}{suffix}
      </span>
      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-2 text-center">
        {text}
      </span>
    </div>
  );
}

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-white overflow-hidden selection:bg-brand-500/30 font-sans">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-indigo-600/20 blur-[130px] rounded-full mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-[1400px] mx-auto">
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
            <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400 text-[9px] uppercase tracking-widest font-black border border-brand-500/20">Alpha V2</span>
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link 
            to="/login"
            className="group relative px-6 py-2.5 rounded-full overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm tracking-wide transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/10"
          >
            <span className="relative z-10 flex items-center gap-2">
              Access Institutional Node <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:text-white" />
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center pt-20 pb-16 px-4 max-w-[1400px] mx-auto text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-8 flex flex-col items-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-md text-brand-700 dark:text-brand-400 text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/10">
            <Zap className="w-4 h-4 fill-brand-500/50" /> Enterprise-Grade AI Deployment Module
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 pb-2 max-w-5xl">
            Meet the Scheduler <br className="hidden md:block"/>
            of the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-indigo-500 to-violet-500">Future.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-2xl text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Eradicate double-booking and operational bottlenecks with SchedulaPro's intelligent constraint formulation matrix. Designed exclusively for cutting-edge educational institutions.
          </motion.p>

          <motion.div variants={fadeUp} className="pt-6 w-full flex justify-center">
            <Link to="/login" className="px-8 py-5 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
              <LayoutDashboard className="w-5 h-5" /> Initialize Dashboard
            </Link>
          </motion.div>

          {/* Dynamic Metrics Counter */}
          <motion.div 
            variants={fadeUp} 
            className="w-full max-w-4xl mx-auto mt-16 glass rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-white/10 overflow-hidden"
          >
            <AnimatedCounter end={10000} suffix="+" text="Class Blocks Handled" />
            <AnimatedCounter end={99} suffix=".9%" text="Conflict Reduction" />
            <AnimatedCounter end={0} suffix="" text="System Intrusions" />
          </motion.div>
        </motion.div>
      </main>

      {/* Epic Dashboard Mockup Presentation */}
      <section className="relative z-20 px-6 pb-32 max-w-[1400px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/50 p-2 sm:p-4 backdrop-blur-xl shadow-2xl shadow-brand-900/20 group overflow-hidden"
        >
          {/* Decorative browser bar */}
          <div className="absolute top-0 left-0 w-full h-12 bg-white/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-white/5 flex items-center px-4 gap-2 z-10 backdrop-blur-md">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="ml-4 flex-1 h-6 bg-slate-200/50 dark:bg-white/5 rounded-md max-w-sm flex items-center px-3">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">schedulapro.internal.network</span>
            </div>
          </div>
          
          <img 
            src="/assets/images/dashboard_mockup.png" 
            alt="SchedulaPro Interface Simulation" 
            className="w-full rounded-[1.5rem] mt-10 shadow-inner brightness-105 contrast-105 group-hover:scale-[1.01] transition-transform duration-700" 
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2000&q=80";
              e.target.className = "w-full rounded-[1.5rem] mt-10 shadow-inner opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-transparent opacity-40 pointer-events-none" />
        </motion.div>
      </section>

      {/* Advanced AI Matrix Deep-Dive */}
      <section className="relative z-10 py-32 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                Powered by a <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Recursive Engine.</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                The core of SchedulaPro isn't just a database—it's a computational puzzle solver. Our artificial intelligence framework dynamically calculates thousands of permutation constraints in milliseconds.
              </p>
              
              <ul className="space-y-6 pt-4">
                {[
                  "Zero-Collision Guarantee for rooms and professors",
                  "Automated Lunch & Night break insertions",
                  "Dynamic structural load balancing across departments",
                  "Overwork protection logic mapped to instructor capacity"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-700 dark:text-slate-300 font-bold">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 mt-1">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="relative rounded-[2rem] border border-slate-200 dark:border-indigo-500/20 bg-indigo-500/5 p-4 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-3xl opacity-50 z-0" />
              <img 
                src="/assets/images/ai_matrix.png" 
                alt="AI Constraint Solver Visualization" 
                className="relative z-10 w-full rounded-2xl shadow-2xl brightness-110 contrast-125 mix-blend-lighten"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1000&q=80"; e.target.className = "relative z-10 w-full rounded-2xl shadow-2xl mix-blend-luminosity brightness-75 opacity-90"; }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Grid (Bento Box) */}
      <section className="relative z-10 py-32 bg-slate-50 dark:bg-[#0a0f1c] border-t border-slate-200 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Institutional Dominance</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Equipped with everything required to run a high-volume campus.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Extended Features */}
            {[
              { icon: Layers, title: "Curriculum Synchronizer", desc: "Maps strict educational pre-requisites to specific room classifications effortlessly.", color: "brand" },
              { icon: Users, title: "Personnel Symphony", desc: "Aligns human resources with architectural availability without creating operational strain.", color: "indigo" },
              { icon: ShieldCheck, title: "Impenetrable Logs", desc: "Every permutation and schedule modification is traced to the exact user and second.", color: "violet" },
            ].map((card, i) => (
              <motion.div key={i} variants={fadeUp} className="glass p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all hover:-translate-y-1 bg-white/50 dark:bg-slate-900/40">
                <div className={`w-12 h-12 rounded-2xl bg-${card.color}-500/10 flex items-center justify-center text-${card.color}-600 dark:text-${card.color}-400 mb-6`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight text-slate-900 dark:text-white">{card.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Creator Showcase */}
      <section className="relative z-20 py-24 bg-brand-950 dark:bg-slate-950 border-y border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/20 to-indigo-900/20" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 blur-[100px] rounded-full mix-blend-screen" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-brand-500/30 flex-shrink-0 shadow-2xl shadow-brand-500/20 relative">
             <div className="absolute inset-0 bg-brand-500/20 mix-blend-overlay z-10" />
             <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=80" alt="Architect" className="w-full h-full object-cover filter contrast-125" />
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em]">
              Primary Architect & Owner
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter">
              Mr. Lloyd Christopher F. Dacles<span className="text-brand-400">, MIS</span>
            </h2>
            <p className="text-xl text-brand-100/80 font-semibold tracking-wide">
              LDRaidmax Systems & Software Laboratory
            </p>
            <p className="text-sm text-slate-400 max-w-xl font-medium leading-relaxed pt-2">
              "SchedulaPro was engineered to eliminate extreme hours of clerical overlap. It transforms a painful logistical nightmare into an elegant, automated mathematical certainty. Built for the modern educational ecosystem."
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 bg-slate-950 text-white">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
               <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold uppercase tracking-[0.2em] text-xs">SchedulaPro Systems</span>
          </div>
          <div className="flex items-center gap-6">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors cursor-pointer">Enterprise SLA</span>
             <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors cursor-pointer">Architecture</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            &copy; {new Date().getFullYear()} Software Laboratory. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
