import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, CalendarCheck, Layers, Zap, ShieldCheck, 
  LayoutDashboard, BrainCircuit, Users, CheckCircle2, 
  ChevronRight, Moon, Sun, AlertTriangle, Sparkles, 
  ShieldAlert, History, MousePointer2, BarChart3
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

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
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjAwIDIwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSdub2lzZUZpbHRlcic+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuNjUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbm9pc2VGaWx0ZXInKScvPjwvc3ZnPg==')] opacity-[0.12] mix-blend-overlay"></div>
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
          className="flex items-center gap-2 sm:gap-4 flex-shrink-0"
        >
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 transition-all border border-slate-300/50 dark:border-white/5 active:scale-95"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <Link 
            to="/login"
            className="group relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-full overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm tracking-wide transition-transform hover:scale-[1.03] active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/10"
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
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-md text-brand-700 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/10">
            <Sparkles className="w-4 h-4 text-brand-500" /> Administrative Relief Module
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[1] text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 pb-2 max-w-5xl">
            Stop fighting <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-indigo-500 to-violet-500">Spreadsheets.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-2xl text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            SchedulaPro transforms manual logistics into an elegant mathematical certainty. Reclaim hundreds of administrative hours with the industry's most advanced constraint-formulation matrix.
          </motion.p>

          <motion.div variants={fadeUp} className="pt-6 w-full flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/login" className="px-8 py-5 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
              <LayoutDashboard className="w-5 h-5" /> Experience Scheduling Zen
            </Link>
            <button className="px-8 py-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Watch Product Film
            </button>
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

      {/* ── Section: The Scheduling Crisis (Pain Points) ────────────────────── */}
      <section className="relative z-10 py-32 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div 
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-20 space-y-4"
          >
             <h2 className="text-sm font-black text-brand-500 uppercase tracking-[0.4em] mb-4">The Status Quo</h2>
             <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">Scheduling shouldn't feel like <br /><span className="text-red-500 underline decoration-wavy decoration-2 underline-offset-8">Administrative Warfare.</span></h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { icon: ShieldAlert, color: "red", title: "Excel Hell", desc: "Hidden overlaps in static spreadsheets that only reveal themselves when the semester starts." },
               { icon: History, color: "amber", title: "Clerical Decay", desc: "Wasting 80+ hours of high-value administrative time on manual data entry and conflict hunting." },
               { icon: Users, color: "orange", title: "Personnel Burnout", desc: "Inefficient loads and awkward gaps that frustrate faculty and lower institutional morale." }
             ].map((pain, i) => (
               <motion.div 
                 key={i} 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: i * 0.1 }}
                 className="p-10 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[3rem] shadow-sm relative group overflow-hidden"
               >
                 <div className={`absolute top-0 right-0 w-24 h-24 bg-${pain.color}-500/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-${pain.color}-500/20 transition-all`} />
                 <div className={`w-14 h-14 rounded-2xl bg-${pain.color}-50 dark:bg-${pain.color}-950/30 flex items-center justify-center text-${pain.color}-500 mb-8 border border-${pain.color}-100 dark:border-${pain.color}-900/50 shadow-inner`}>
                    <pain.icon className="w-7 h-7" />
                 </div>
                 <h4 className="text-xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">{pain.title}</h4>
                 <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">"{pain.desc}"</p>
               </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* ── Section: The Resolution (Problem vs Solution Visual) ────────────── */}
      <section className="relative z-10 py-32 bg-slate-100 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-900">
         <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
               <div className="flex-1 space-y-8">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <MousePointer2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                    From Chaos to <br />
                    <span className="text-emerald-500">Conflict-Free Harmony.</span>
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl italic border-l-4 border-emerald-500/30 pl-6">
                    "Our intelligent matrix doesn't just list data—it understands it. It dynamically calculates thousands of permutation constraints in milliseconds to ensure not a single room or professor is double-booked."
                  </p>
                  <div className="pt-4 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">99%</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Error Reduction</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">80hrs+</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saved per Semester</p>
                    </div>
                  </div>
               </div>

               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
                 className="flex-1 rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-[0_32px_128px_rgba(0,0,0,0.1)] group relative overflow-hidden"
               >
                 <img 
                   src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80" 
                   alt="Conflict Resolution Demonstration" 
                   className="w-full rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-1000 object-cover aspect-video"
                   onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"; }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
               </motion.div>
            </div>
         </div>
      </section>

      {/* ── Section: Institutional Intelligence (Executive Dashboard) ────────── */}
      <section className="relative z-10 py-32">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
            <motion.div 
               initial={{ opacity: 0, x: -50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="flex-1 rounded-[3rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl relative group"
            >
               <img 
                 src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" 
                 alt="Institutional Health Monitoring" 
                 className="w-full grayscale group-hover:grayscale-0 transition-all duration-1000"
                 onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80"; }}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
            </motion.div>

            <div className="flex-1 space-y-8">
               <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                 <BarChart3 className="w-6 h-6" />
               </div>
               <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                 Executive <br />
                 <span className="text-brand-500">Institutional Wisdom.</span>
               </h3>
               <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                 SchedulaPro provides high-level observability for administrators. Track campus-wide utilization, personnel efficiency, and system health from a single, high-fidelity command center.
               </p>
               <ul className="space-y-4 pt-4">
                  {[
                    "Departmental Efficiency Heatmaps",
                    "Personnel Load Balancing Intelligence",
                    "Room Classification Utilization Metrics",
                    "Global Institutional Health Scoring"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      <CheckCircle2 className="w-5 h-5 text-brand-500" /> {feat}
                    </li>
                  ))}
               </ul>
            </div>
          </div>
        </div>
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
                src="https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1000&q=80" 
                alt="AI Constraint Solver Visualization" 
                className="relative z-10 w-full rounded-2xl shadow-2xl brightness-110 contrast-125 mix-blend-screen opacity-90 group-hover:opacity-100 transition-opacity"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1000&q=80"; }}
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

      {/* ── Section: The Vision (Creator Narrative) ─────────────────────────── */}
      <section className="relative z-20 py-32 bg-slate-950 overflow-hidden border-y border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/20 to-indigo-900/20 opacity-40" />
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none grayscale brightness-50 contrast-125 mix-blend-overlay">
           <img 
             src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80" 
             className="w-full h-full object-cover" 
             onError={(e) => { e.style.display = 'none'; }}
           />
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-[3rem] overflow-hidden border-4 border-white/5 flex-shrink-0 shadow-2xl rotate-3 scale-95 hover:rotate-0 hover:scale-100 transition-all duration-700 relative group">
               <div className="absolute inset-0 bg-brand-500/10 group-hover:bg-transparent z-10 transition-all text-center flex items-center justify-center">
                  <span className="text-[10px] font-black uppercase text-white tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity">Founding Architect</span>
               </div>
               <img 
                  src="/assets/images/founder.jpg" 
                  alt="Mr. Lloyd Christopher F. Dacles" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"; }}
               />
            </div>
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-black uppercase tracking-[0.3em] border border-brand-500/20">
                A Message from the Architect
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight">
                "SchedulaPro was built to reclaim the human element <br className="hidden xl:block"/> 
                of <span className="text-brand-500 underline decoration-brand-500/30 underline-offset-8">Academic Leadership.</span>"
              </h2>
              <div className="space-y-4 max-w-3xl">
                <p className="text-lg text-slate-400 font-medium leading-relaxed">
                  I started this project after years of seeing administrators trapped in endless spreadsheet cycles. SchedulaPro isn't just software—it's a mission to eliminate clerical fatigue and replace it with mathematical certainty.
                </p>
                <div className="pt-4">
                  <p className="text-2xl font-black text-white tracking-tight">Mr. Lloyd Christopher F. Dacles<span className="text-brand-400">, MIS</span></p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">LDRaidmax Systems & Software Laboratory</p>
                </div>
              </div>
            </div>
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
