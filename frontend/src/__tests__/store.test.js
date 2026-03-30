import { describe, it, expect, beforeEach, vi } from 'vitest';
import useScheduleStore from '../store/useScheduleStore';

// Mock the API and Socket
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false,
  }),
}));

describe('useScheduleStore', () => {
  beforeEach(() => {
    // Reset store before each test if needed
  });

  it('should initialize with default values', () => {
    const state = useScheduleStore.getState();
    expect(state.terms).toEqual([]);
    expect(state.activeTermId).toBeNull();
    expect(state.unreadNotifications).toBe(0);
  });

  it('should update activeTermId', () => {
    useScheduleStore.getState().setActiveTermId(123);
    expect(useScheduleStore.getState().activeTermId).toBe(123);
  });

  it('should toggle sidebar', () => {
    const initialSidebar = useScheduleStore.getState().isSidebarOpen;
    useScheduleStore.getState().toggleSidebar();
    expect(useScheduleStore.getState().isSidebarOpen).toBe(!initialSidebar);
  });
});
