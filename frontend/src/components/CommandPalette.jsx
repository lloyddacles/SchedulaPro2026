import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Search, Calendar, Users, BookOpen, Building2, LayoutDashboard, Database, PieChart, Moon, Sun, Inbox, GraduationCap } from 'lucide-react';
import api from '../api';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ faculty: [], rooms: [], programs: [] });
  const [loading, setLoading] = useState(false);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Handle Search Fetching
  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults({ faculty: [], rooms: [], programs: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${searchQuery}`);
        setResults(data);
      } catch (err) {
        console.error('Palette Search Error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const runCommand = (command) => {
    command();
    setOpen(false);
  };

  if (!open) return null;

  const isAdmin = user?.role === 'admin';
  const isScheduler = ['admin', 'program_head', 'program_assistant'].includes(user?.role);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden font-sans">
        <Command 
          className="w-full flex justify-center flex-col items-center" 
          loop
        >
          <div className="flex items-center w-full px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <Search className="w-5 h-5 text-gray-400" />
            <Command.Input 
               autoFocus
               value={searchQuery}
               onValueChange={setSearchQuery}
               className="w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none ml-3 text-lg font-medium" 
               placeholder="Search faculty, rooms, programs..." 
             />
            <div className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 font-mono tracking-widest shadow-sm">
              ESC
            </div>
          </div>

          <Command.List className="w-full max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
            <Command.Empty className="py-10 text-center flex flex-col items-center justify-center gap-3">
               <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-full">
                 <Search className="w-6 h-6 text-gray-300 dark:text-gray-600" />
               </div>
               <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                 {loading ? 'Searching institutional matrix...' : 'No results found in current system.'}
               </p>
             </Command.Empty>

            {/* Dynamic Results: Faculty */}
            {results.faculty.length > 0 && (
              <Command.Group heading="Faculty Matches" className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 px-3 py-2">
                {results.faculty.map((f) => (
                  <Command.Item
                    key={`fac-${f.id}`}
                    onSelect={() => runCommand(() => navigate(`/faculty?search=${encodeURIComponent(f.name)}`))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 aria-selected:bg-brand-500 aria-selected:text-white transition-all group"
                  >
                    <div className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg group-hover:bg-brand-400/20">
                      <Users className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
                    </div>
                    <span>{f.name}</span>
                    <span className="ml-auto text-[10px] opacity-60 font-medium">{f.email}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Dynamic Results: Rooms */}
            {results.rooms.length > 0 && (
              <Command.Group heading="Facility Matches" className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 px-3 py-2">
                {results.rooms.map((r) => (
                  <Command.Item
                    key={`room-${r.id}`}
                    onSelect={() => runCommand(() => navigate(`/rooms?search=${encodeURIComponent(r.name)}`))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 aria-selected:bg-emerald-500 aria-selected:text-white transition-all group"
                  >
                    <div className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg group-hover:bg-emerald-400/20">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
                    </div>
                    <span>{r.name}</span>
                    <span className="ml-auto text-[10px] opacity-60 font-medium uppercase tracking-tighter">{r.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Dynamic Results: Programs */}
            {results.programs.length > 0 && (
              <Command.Group heading="Curricular Program Matches" className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 px-3 py-2">
                {results.programs.map((p) => (
                  <Command.Item
                    key={`prog-${p.id}`}
                    onSelect={() => runCommand(() => navigate(`/teaching-loads?program=${encodeURIComponent(p.code)}`))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-purple-500 hover:text-white dark:hover:bg-purple-600 aria-selected:bg-purple-500 aria-selected:text-white transition-all group"
                  >
                    <div className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg group-hover:bg-purple-400/20">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
                    </div>
                    <span>{p.name}</span>
                    <span className="ml-auto text-[10px] opacity-60 font-medium px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-md group-hover:bg-white/20">{p.code}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {isScheduler && (
              <Command.Group heading="Master Scheduling" className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-3">
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/schedules'))}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-brand-50 hover:text-brand-900 dark:hover:bg-brand-900/40 dark:hover:text-brand-100 aria-selected:bg-brand-50 aria-selected:text-brand-900 dark:aria-selected:bg-brand-900/40 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Master Schedule Matrix
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/teaching-loads'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-b border-transparent cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-brand-50 hover:text-brand-900 dark:hover:bg-brand-900/40 dark:hover:text-brand-100 aria-selected:bg-brand-50 aria-selected:text-brand-900 dark:aria-selected:bg-brand-900/40 transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Assign Teaching Loads
                </Command.Item>
                 <Command.Item
                  onSelect={() => runCommand(() => navigate('/requests'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-b border-transparent cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-brand-50 hover:text-brand-900 dark:hover:bg-brand-900/40 dark:hover:text-brand-100 aria-selected:bg-brand-50 aria-selected:text-brand-900 dark:aria-selected:bg-brand-900/40 transition-colors"
                >
                  <Inbox className="w-4 h-4" />
                  Faculty Swap Requests
                </Command.Item>
              </Command.Group>
            )}

            {isScheduler && (
              <Command.Group heading="Data Management" className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-2">
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/faculty'))}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Faculty Roster
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/rooms'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Facility Mapping
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/subjects'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Subject Bank
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Insights & Reporting" className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-2">
              {isScheduler && (
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/dashboard'))}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Executive Dashboard
                </Command.Item>
              )}
               {isScheduler && (
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/reports'))}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
                >
                  <PieChart className="w-4 h-4" />
                  Analytics & Reports
                </Command.Item>
              )}
              {(!isScheduler || isAdmin) && (
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/my-schedule'))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  My Personal Schedule
                </Command.Item>
              )}
            </Command.Group>

            <Command.Group heading="Settings & Actions" className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-2">
              <Command.Item
                onSelect={() => runCommand(() => toggleTheme())}
                className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 aria-selected:bg-gray-100 dark:aria-selected:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </Command.Item>
            </Command.Group>
            
          </Command.List>
        </Command>

        {/* Footer Hint */}
        <div className="bg-gray-50 dark:bg-[#0B1120] px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Tip: Press <kbd className="bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-700 dark:text-gray-300">↑↓</kbd> to navigate, <kbd className="bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-700 dark:text-gray-300">↵</kbd> to select
          </div>
        </div>
      </div>
    </div>
  );
}
