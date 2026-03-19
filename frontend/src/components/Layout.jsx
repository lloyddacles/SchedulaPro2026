import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTerm } from '../context/TermContext';
import { useTheme } from '../context/ThemeContext';
import { Users, BookOpen, Calendar, LayoutDashboard, Database, Building2, LogOut, Hexagon, FileSpreadsheet, PlusCircle, Inbox, Sun, Moon, Shield } from 'lucide-react';
import BulkImportModal from '../components/BulkImportModal';

const adminNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/programs', label: 'Curriculums', icon: BookOpen },
  { path: '/sections', label: 'Appoint Cohorts', icon: Hexagon },
  { path: '/rooms', label: 'Facilities', icon: Building2 },
  { path: '/faculty', label: 'Faculty Roster', icon: Users },
  { path: '/subjects', label: 'Subjects Bank', icon: BookOpen },
  { path: '/teaching-loads', label: 'Assign Loads', icon: Database },
  { path: '/requests', label: 'Swap Requests', icon: Inbox },
  { path: '/schedules', label: 'Master Schedule', icon: Calendar },
  { path: '/audit-logs', label: 'System Audit', icon: Shield },
];

const viewerNav = [
  { path: '/my-schedule', label: 'My Schedule', icon: Calendar }
];

export default function Layout() {
  const { logout, user } = useAuth();
  const { terms, activeTermId, setActiveTermId, isLoadingTerms, changeTerm, createTerm } = useTerm();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNav : viewerNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!newTermName) return;
    await createTerm(newTermName, true);
    setIsAddingTerm(false);
    setNewTermName('');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 font-sans transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-900 dark:bg-slate-950 text-white flex flex-col shadow-xl transition-colors duration-200">
        <div className="p-6 border-b border-brand-800 dark:border-slate-800/50">
          <h1 className="text-xl font-bold tracking-tight text-brand-50 dark:text-white flex items-center gap-2">
            <Hexagon className="text-brand-400 dark:text-brand-500" /> FacultyScheduler
          </h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 px-4 border-t border-white/20 pt-6">
          <button onClick={() => setIsBulkModalOpen(true)} className="w-full mb-3 flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all shadow-sm bg-brand-50 text-brand-700 hover:bg-brand-100 hover:scale-[1.02]">
            <FileSpreadsheet className="w-5 h-5 mr-3" /> Execute CSV Hub
          </button>
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all text-red-600 hover:bg-red-50">
            <LogOut className="w-5 h-5 mr-3" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between px-8 z-10 border-b border-gray-100 dark:border-slate-800 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{isAdmin ? 'System Admin Portal' : 'Faculty Portal'}</h2>
          
          <div className="flex items-center gap-6">
            
            {/* Term Switcher Context Menu */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Context</span>
              {isAddingTerm ? (
                <form onSubmit={handleCreateTerm} className="flex items-center gap-2">
                  <input autoFocus type="text" placeholder="e.g. Spring 2027" value={newTermName} onChange={e => setNewTermName(e.target.value)} className="text-sm border-gray-200 rounded-lg p-2 focus:ring-brand-500 w-32" />
                  <button type="submit" className="text-xs bg-brand-600 text-white px-3 py-2 rounded-lg font-bold">Save</button>
                  <button type="button" onClick={() => setIsAddingTerm(false)} className="text-xs text-gray-500 px-2 py-2">Cancel</button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <select 
                    value={activeTermId || ''} 
                    onChange={(e) => changeTerm(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl focus:ring-brand-500 focus:border-brand-500 p-2 min-w-[140px] shadow-sm cursor-pointer"
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name} {t.is_active && '(Current)'}</option>
                    ))}
                  </select>
                  {isAdmin && (
                    <button onClick={() => setIsAddingTerm(true)} className="text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition-colors" title="Create New Term">
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" /> {/* Divider */}

            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-slate-700 transition-all">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" /> {/* Divider */}

            <div className="flex items-center gap-3">
              <div className="text-sm text-right hidden sm:block">
                <p className="font-bold text-gray-700 dark:text-slate-200">{user?.username || 'User'}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md uppercase border-2 border-white dark:border-slate-800">
                {user?.username?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-200/20 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[100px] -z-10" />
          <Outlet />
        </div>
      </main>
      
      {isBulkModalOpen && <BulkImportModal onClose={() => setIsBulkModalOpen(false)} />}
    </div>
  );
}
