import { ScheduleService, ScheduleBlock, TeachingLoad, Room, Schedule, FacultyUnavailability } from '../ScheduleService.js';

describe('ScheduleService Unit Tests', () => {
  describe('Time Math Helpers', () => {
    test('parseTime converts HH:mm:ss to decimal hours', () => {
      expect(ScheduleService.parseTime('07:30:00')).toBe(7.5);
      expect(ScheduleService.parseTime('18:00:00')).toBe(18.0);
      expect(ScheduleService.parseTime('13:45:00')).toBe(13.75);
    });

    test('formatTime converts decimal hours to HH:mm:00', () => {
      expect(ScheduleService.formatTime(7.5)).toBe('07:30:00');
      expect(ScheduleService.formatTime(18.0)).toBe('18:00:00');
      expect(ScheduleService.formatTime(13.75)).toBe('13:45:00');
    });
  });

  describe('Lunch Gap Constraint (11:30 AM - 2:30 PM)', () => {
    test('should allow a block that leaves 1-hour gap at the start of window', () => {
      // Proposed: 12:30 - 15:30. 
      // Window: 11:30 - 14:30. 
      // Gap: 11:30 - 12:30 (1 hour!). Should pass.
      const currentBlocks: ScheduleBlock[] = [];
      expect(ScheduleService.hasLunchGap(currentBlocks, 12.5, 15.5)).toBe(true);
    });

    test('should block a 3-hour subject that fills the entire window', () => {
      // Proposed: 11:30 - 14:30.
      // Gap: 0. Should fail.
      const currentBlocks: ScheduleBlock[] = [];
      expect(ScheduleService.hasLunchGap(currentBlocks, 11.5, 14.5)).toBe(false);
    });

    test('should allow multiple blocks if a gap exists between them', () => {
      // Existing: 11:30 - 12:00
      // Proposed: 13:00 - 14:30
      // Gap: 12:00 - 13:00 (1 hour!). Should pass.
      const currentBlocks: ScheduleBlock[] = [{ start: 11.5, end: 12.0 }];
      expect(ScheduleService.hasLunchGap(currentBlocks, 13.0, 14.5)).toBe(true);
    });
  });

  describe('Auto-Scheduling Algorithm (MOCKED)', () => {
    it('should schedule a single load in the first available Tier 1 slot', async () => {
      const mockPool = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ 
            teaching_load_id: 1, faculty_id: 10, section_id: 20, campus_id: 1, 
            required_hours: 3, room_type: 'Lecture', subject_code: 'TEST101', program_code: 'BSTM' 
          }], []]) // Loads
          .mockResolvedValueOnce([[{ name: 'ROOM-A', type: 'Lecture', capacity: 40, campus_id: 1 }], []]) // Rooms
          .mockResolvedValueOnce([[], []]) // Existing Schedules
          .mockResolvedValueOnce([[], []]) // Blackouts
      };

      const result = await ScheduleService.autoGenerate(mockPool, 3, 1);
      
      expect(result.scheduled).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.newlyMapped[0]).toMatchObject({
        day_of_week: 'Monday',
        start_time: '07:30:00',
        room: 'ROOM-A'
      });
    });

    it('should prioritize Laboratories for computer subjects', async () => {
      const mockPool = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ 
            teaching_load_id: 2, faculty_id: 11, section_id: 21, campus_id: 1, 
            required_hours: 3, room_type: 'Laboratory', subject_code: 'COMP101', program_code: 'BSIS' 
          }], []]) // Loads
          .mockResolvedValueOnce([[
            { name: 'LECTURE-1', type: 'Lecture', capacity: 40, campus_id: 1 },
            { name: 'LAB-1', type: 'Laboratory', capacity: 40, campus_id: 1 }
          ], []]) // Rooms
          .mockResolvedValueOnce([[], []]) // Existing Schedules
          .mockResolvedValueOnce([[], []]) // Blackouts
      };

      const result = await ScheduleService.autoGenerate(mockPool, 3, 1);
      
      expect(result.scheduled).toBe(1);
      expect(result.newlyMapped[0].room).toBe('LAB-1');
    });
  });
});
