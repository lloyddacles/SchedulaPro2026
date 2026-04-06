import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import useScheduleStore from '../store/useScheduleStore';
import {
  Users, BookOpen, Calendar, LayoutDashboard, Database, Building2, LogOut,
  Hexagon, FileSpreadsheet, PlusCircle, Inbox, Sun, Moon, Shield, Menu, X, UserCog,
  Bell, CheckCircle2, Circle, PieChart, Key, MapPin, Settings, CalendarCheck
} from 'lucide-react';
import BulkImportModal from '../components/BulkImportModal';
import ChangePasswordModal from './ChangePasswordModal';
import CommandPalette from './CommandPalette';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { ChevronDown, CalendarPlus, Check } from 'lucide-react';

// ── Role badge config ────────────────────────────────────────────────────────
const ROLE_BADGES = {
  admin:             { label: 'Admin',        color: 'bg-red-500/20 text-red-300' },
  program_head:      { label: 'Prog. Head',   color: 'bg-blue-500/20 text-blue-300' },
  program_assistant: { label: 'Prog. Assist', color: 'bg-indigo-500/20 text-indigo-300' },
  viewer:            { label: 'Faculty',      color: 'bg-gray-500/20 text-gray-300' },
};

// ── Nav per role group ───────────────────────────────────────────────────────
const schedulerNav = [
  { path: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { path: '/programs',       label: 'Curriculums',    icon: BookOpen },
  { path: '/sections',       label: 'Appoint Sections',icon: Hexagon },
  { path: '/rooms',          label: 'Facilities',     icon: Building2 },
  { path: '/faculty',        label: 'Faculty Roster', icon: Users },
  { path: '/subjects',       label: 'Subject Bank',   icon: BookOpen },
  { path: '/teaching-loads', label: 'Assign Loads',   icon: Database },
  { path: '/requests',       label: 'Swap Requests',  icon: Inbox },
  { path: '/schedules',      label: 'Master Schedule',icon: Calendar },
  { path: '/reports',        label: 'Analytics & Reports', icon: PieChart },
];

const adminOnlyNav = [
  { path: '/users',          label: 'User Management',icon: UserCog },
  { path: '/campuses',       label: 'Campuses',       icon: MapPin },
  { path: '/audit-logs',     label: 'System Audit',   icon: Shield },
  { path: '/settings',       label: 'System Settings',icon: Settings },
];

const viewerNav = [
  { path: '/my-schedule',    label: 'My Schedule',    icon: Calendar },
];

export default function Layout() {
  const { logout, user } = useAuth();
  const { 
    terms, activeTermId, setActiveTermId, fetchTerms, createTerm,
    setUnreadNotifications, unreadNotifications,
    systemSettings, fetchSettings
  } = useScheduleStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const { isSidebarOpen, toggleSidebar, socket, isConnected } = useScheduleStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin     = user?.role === 'admin';
  const isScheduler = ['admin','program_head','program_assistant'].includes(user?.role);
  const isViewer    = user?.role === 'viewer';

  // Initialize store data
  useEffect(() => {
    fetchTerms();
    fetchSettings();
  }, [fetchTerms, fetchSettings]);

  // Notification Queries
  const { data: notifications = [] } = useQuery({ 
    queryKey: ['notifications'], 
    queryFn: async () => (await api.get('/notifications')).data
  });

  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    if (unread !== unreadNotifications) {
      setUnreadNotifications(unread);
    }
  }, [notifications, unreadNotifications, setUnreadNotifications]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (notif) => {
      queryClient.invalidateQueries(['notifications']);
    };

    const handleUpdate = () => {
      queryClient.invalidateQueries(['notifications']);
    };

    socket.on('notification_received', handleNewNotification);
    socket.on('notifications_updated', handleUpdate);

    return () => {
      socket.off('notification_received', handleNewNotification);
      socket.off('notifications_updated', handleUpdate);
    };
  }, [socket, isConnected, queryClient]);

  const unreadCount = unreadNotifications;

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.put(`/notifications/read-all`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  // Build nav based on role
  let navItems = isViewer
    ? [...viewerNav]
    : isAdmin
      ? [...schedulerNav, ...adminOnlyNav]
      : [...schedulerNav];

  // Add My Schedule if user has a faculty_id but isn't already seeing it
  if (user?.faculty_id && !navItems.find(i => i.path === '/my-schedule')) {
    navItems.unshift({ path: '/my-schedule', label: 'My Schedule', icon: Calendar });
  }

  const roleBadge = ROLE_BADGES[user?.role] || ROLE_BADGES.viewer;

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => { if(isSidebarOpen) toggleSidebar(); };
  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!newTermName) return;
    await createTerm(newTermName, true);
    setIsAddingTerm(false);
    setNewTermName('');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 font-sans transition-colors duration-200 overflow-hidden">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-brand-900 dark:bg-slate-950 text-white flex flex-col shadow-xl
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-brand-800 dark:border-slate-800/50 flex items-center justify-between">
          <h1 className="text-base font-bold tracking-tight text-brand-50 dark:text-white flex items-center gap-2">
            {systemSettings.logo_url ? (
              <img src={systemSettings.logo_url} alt="Logo" className="w-6 h-6 flex-shrink-0 rounded object-contain" />
            ) : (
              <CalendarCheck className="text-brand-400 dark:text-brand-500 w-5 h-5 flex-shrink-0" />
            )}
            <span className="truncate">{systemSettings.app_name || 'SchedulaPro'}</span>
          </h1>
          <button onClick={closeSidebar} className="lg:hidden text-brand-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role pill */}
        <div className="px-4 pt-3 pb-1">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-xl transition-colors text-sm ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-brand-100 hover:bg-brand-800/70 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pb-2 border-t border-white/10 pt-3 space-y-1">
          {/* CSV Import — admin only */}
          {isAdmin && (
            <>
              <button
                onClick={() => { setIsBulkModalOpen(true); closeSidebar(); }}
                className="w-full flex items-center px-3 py-2.5 text-sm font-bold rounded-xl transition-all bg-brand-50 text-brand-700 hover:bg-brand-100 mb-1"
              >
                <FileSpreadsheet className="w-4 h-4 mr-3 flex-shrink-0" /> CSV Import
              </button>
              <button
                onClick={() => { setIsPasswordModalOpen(true); closeSidebar(); }}
                className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <Key className="w-4 h-4 mr-3 flex-shrink-0" /> Security Keys
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all text-red-400 hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4 mr-3 flex-shrink-0" /> Sign Out
          </button>
        </div>

        {/* Architect & Owner Accreditation */}
        <div className="px-4 pb-5 pt-3 border-t border-white/10">
          <p className="text-[10px] text-brand-400/60 uppercase tracking-widest font-black mb-1">Architect & Owner</p>
          <p className="text-[11px] text-brand-100 font-bold leading-tight">Mr. Lloyd Christopher F. Dacles, MIS</p>
          <p className="text-[10px] text-brand-400 font-extrabold tracking-[0.15em] uppercase mt-0.5">LDRaidmax Systems</p>
          <p className="text-[9px] text-brand-400/40 mt-2 font-bold select-none">&copy; {new Date().getFullYear()} Software Laboratory</p>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between px-4 sm:px-6 z-10 border-b border-gray-100 dark:border-slate-800 transition-colors duration-200 flex-shrink-0 gap-3">

          {/* Hamburger + Page title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
              {isAdmin ? 'System Admin Portal' : isScheduler ? 'Scheduling Portal' : 'Faculty Portal'}
            </h2>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

            {/* Term Switcher (Scheduler + Admin Only) */}
            {isScheduler && (
              <div className="flex items-center gap-2">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 rounded-xl text-xs font-black uppercase tracking-widest border border-brand-500/20 hover:bg-brand-500/20 transition-all">
                      {terms.find(t => t.id === activeTermId)?.name || 'Select Term'}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Menu.Button>
                  </div>
                  <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-slate-700 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden border border-gray-100 dark:border-slate-700">
                      <div className="px-1 py-1">
                        {terms.map((t) => (
                          <Menu.Item key={t.id}>
                            {({ active }) => (
                              <button
                                onClick={() => setActiveTermId(t.id)}
                                className={`${
                                  active ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-slate-300'
                                } group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all`}
                              >
                                <span className="truncate">{t.name}</span>
                                {t.id === activeTermId && <Check className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-emerald-500'}`} />}
                              </button>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>

                {isAdmin && (
                  <button
                    onClick={() => setIsAddingTerm(true)}
                    className="p-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 rounded-xl border border-brand-500/20 transition-all"
                    title="Setup New Academic Term"
                  >
                    <CalendarPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-amber-400 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden z-50 transform transition-all animate-fade-in origin-top-right">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Notifications {unreadCount > 0 && <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAllAsReadMutation.mutate()} 
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-800 dark:text-brand-400 transition-colors uppercase tracking-wider"
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm font-semibold">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => { if(!n.is_read) markAsReadMutation.mutate(n.id); if(n.link) navigate(n.link); setShowNotifications(false); }}
                            className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${!n.is_read ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
                          >
                            <div className="flex gap-3 items-start">
                              <div className="mt-0.5">
                                {!n.is_read ? (
                                  <Circle className="w-2.5 h-2.5 fill-brand-500 text-brand-500" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-600 dark:text-slate-300'}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-wider">
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar + username */}
            <div className="flex items-center gap-2">
              <div className="text-sm text-right hidden md:block">
                <p className="font-bold text-gray-700 dark:text-slate-200 leading-tight">{user?.username || 'User'}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGES[user?.role]?.color?.split(' ')[1] || 'text-gray-400'}`}>
                  {ROLE_BADGES[user?.role]?.label || user?.role}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md uppercase text-sm border-2 border-white dark:border-slate-800 flex-shrink-0">
                {user?.username?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative min-w-0">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-200/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <Outlet />
        </div>
      </main>

      {isBulkModalOpen && <BulkImportModal onClose={() => setIsBulkModalOpen(false)} />}
      
      {/* Global Modals */}
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      
      {/* ── Premium Academic Term Modal ───────────────────────── */}
      <Transition appear show={isAddingTerm} as={React.Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setIsAddingTerm(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-8"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-8"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20">
                      <CalendarPlus className="w-7 h-7 text-brand-600" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Academic Term Setup
                      </Dialog.Title>
                      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">Institutional Planning</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateTerm} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Academic Year & Semester Name</label>
                      <input
                        autoFocus
                        type="text"
                        required
                        placeholder="e.g. 1st Semester 2026-2027"
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-bold text-gray-800 dark:text-white placeholder-gray-300"
                        value={newTermName}
                        onChange={(e) => setNewTermName(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-3 bg-brand-500/5 p-4 rounded-2xl border border-brand-500/10">
                      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      <p className="text-[11px] text-brand-700 dark:text-brand-300 font-bold leading-relaxed">
                        Creating a new term will allow you to generate unique teaching load matrices for this specific duration.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingTerm(false)}
                        className="flex-1 px-6 py-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-950 dark:bg-brand-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-1 active:scale-95 transition-all"
                      >
                        Initialize Term
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <CommandPalette />
    </div>
  );
}
