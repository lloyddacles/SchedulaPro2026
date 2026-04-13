import { create } from 'zustand';
import api from '../api';
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5001');
const socket = io(socketUrl, {
  withCredentials: true,
  autoConnect: true,
});

/**
 * Global Zustand store for managing scheduling system state.
 * Consolidates Term, Socket, and UI state into a single reactive hub.
 */
const useScheduleStore = create((set, get) => ({
  // --- Term State ---
  terms: [],
  activeTermId: null,
  isTermsLoading: false,

  fetchTerms: async (includeArchived = false) => {
    set({ isTermsLoading: true });
    try {
      const res = await api.get(`/terms?include_archived=${includeArchived}`);
      const terms = res.data;
      // ALWAYS prioritize the globally 'is_active' term as the default
      const activeTerm = terms.find(t => t.is_active) || terms[0];
      set({ terms, activeTermId: activeTerm?.id || null, isTermsLoading: false });
    } catch (error) {
      console.error('Failed to fetch terms:', error);
      set({ isTermsLoading: false });
    }
  },

  setActiveTermId: (id) => set({ activeTermId: id }),
  
  promoteTerm: async (id) => {
    set({ isGlobalLoading: true });
    try {
      await api.put(`/terms/${id}/activate`);
      await get().fetchTerms(); // Refresh local state
      set({ isGlobalLoading: false });
    } catch (error) {
      console.error('Failed to promote term:', error);
      set({ isGlobalLoading: false });
      throw error;
    }
  },

  archiveTerm: async (id, isArchived, includeArchived = false) => {
    set({ isGlobalLoading: true });
    try {
      await api.put(`/terms/${id}/archive`, { is_archived: isArchived });
      await get().fetchTerms(includeArchived); // Refresh local state while retaining archived view if requested
      set({ isGlobalLoading: false });
    } catch (error) {
      console.error('Failed to archive term:', error);
      set({ isGlobalLoading: false });
      throw error;
    }
  },
  
  createTerm: async (name, makeActive = false) => {
    set({ isGlobalLoading: true });
    try {
      const res = await api.post('/terms', { name, is_active: makeActive });
      const newTerm = res.data;
      
      if (makeActive) {
        await get().promoteTerm(newTerm.id);
      } else {
        await get().fetchTerms();
      }
      
      set({ isGlobalLoading: false });
      return newTerm;
    } catch (error) {
      console.error('Failed to create term:', error);
      set({ isGlobalLoading: false });
      throw error;
    }
  },

  // --- Campus State ---
  campuses: [],
  selectedCampusId: null,
  fetchCampuses: async () => {
    try {
      const res = await api.get('/campuses');
      set({ campuses: res.data });
    } catch (error) {
      console.error('Failed to fetch campuses:', error);
    }
  },
  setSelectedCampusId: (id) => set({ selectedCampusId: id }),

  // --- Socket / Notification State ---
  socket: socket,
  isConnected: false,
  realtimeSupported: true, // Defaults to true, updated by fetchSettings
  unreadNotifications: 0,
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  incrementNotifications: () => set((state) => ({ unreadNotifications: state.unreadNotifications + 1 })),
  initializeSocket: () => {
    if (socket.connected) set({ isConnected: true });
    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));
  },

  // --- UI State ---
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  isGlobalLoading: false,
  setGlobalLoading: (bool) => set({ isGlobalLoading: bool }),

  // --- System Settings / Branding ---
  systemSettings: {
    app_name: 'SchedulaPro',
    institution_name: 'CARD-MRI Development Institute, Inc.',
    logo_url: '',
  },
  fetchSettings: async () => {
    try {
      const res = await api.get('/settings');
      const { realtime_capability, ...settings } = res.data;
      set({ 
        systemSettings: settings,
        realtimeSupported: !!realtime_capability 
      });
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    }
  },
  updateSettings: (settings) => set((state) => ({ systemSettings: { ...state.systemSettings, ...settings } })),
}));

// Initialize socket listeners
useScheduleStore.getState().initializeSocket();

export default useScheduleStore;
