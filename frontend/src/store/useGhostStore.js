import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * useGhostStore.js
 * 
 * Manages the "Staging Layer" for Smart Scheduling.
 * Allows administrators to draft non-destructive changes with real-time 
 * conflict simulations before committing to the production ledger.
 */
const useGhostStore = create()(
  persist(
    (set, get) => ({
      isGhostMode: false,
      stagedSchedules: [], // Array of Schedule objects including local modifications
      originalSchedules: [], // Snap of the production schedule at the time Ghost Mode was entered
      
      toggleGhostMode: (liveSchedules = []) => set((state) => {
        const nextMode = !state.isGhostMode;
        
        // When entering Ghost Mode, snap the current live schedules
        if (nextMode) {
          return {
            isGhostMode: true,
            originalSchedules: liveSchedules,
            stagedSchedules: JSON.parse(JSON.stringify(liveSchedules))
          };
        }
        
        // When exiting, clear the staging layer unless specifically committed
        return {
          isGhostMode: false,
          stagedSchedules: [],
          originalSchedules: []
        };
      }),

      // Stage an update (drag-and-drop or edit)
      stageUpdate: (updatedBlock) => set((state) => {
        const index = state.stagedSchedules.findIndex(s => s.id === updatedBlock.id);
        const nextStaged = [...state.stagedSchedules];
        
        if (index > -1) {
          nextStaged[index] = { ...nextStaged[index], ...updatedBlock, isDraft: true };
        } else {
          // It's a brand new booking drafted in Ghost Mode
          nextStaged.push({ ...updatedBlock, id: `draft-${Date.now()}`, isDraft: true });
        }
        
        return { stagedSchedules: nextStaged };
      }),

      // Remove a staged block (or revert to original)
      stageDelete: (id) => set((state) => {
        // If it's a new draft (ID starts with 'draft-'), just remove it
        if (String(id).startsWith('draft-')) {
          return { stagedSchedules: state.stagedSchedules.filter(s => s.id !== id) };
        }
        
        // If it's an existing production block, we Mark it for deletion in the draft
        const index = state.stagedSchedules.findIndex(s => s.id === id);
        const nextStaged = [...state.stagedSchedules];
        if (index > -1) {
          nextStaged[index] = { ...nextStaged[index], isPendingDelete: true, isDraft: true };
        }
        return { stagedSchedules: nextStaged };
      }),

      discardDraft: () => set({
        stagedSchedules: [],
        originalSchedules: [],
        isGhostMode: false
      }),

      getDiff: () => {
        const state = get();
        const diff = {
          updated: state.stagedSchedules.filter(s => {
            const original = state.originalSchedules.find(o => o.id === s.id);
            if (!original) return false;
            return JSON.stringify(s) !== JSON.stringify(original);
          }),
          created: state.stagedSchedules.filter(s => String(s.id).startsWith('draft-')),
          deleted: state.stagedSchedules.filter(s => s.isPendingDelete)
        };
        return diff;
      }
    }),
    {
      name: 'schedulapro-ghost-staging',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useGhostStore;
