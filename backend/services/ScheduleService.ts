/**
 * ScheduleService.ts
 * 
 * Centralizes the complex algorithmic logic for the Faculty Teaching Load Scheduling System.
 * Handles auto-generation, time-math, and institutional constraints (Lunch Gaps, Room Priorities).
 */

export interface ScheduleBlock {
  start: number;
  end: number;
}

export interface TeachingLoad {
  teaching_load_id: number;
  faculty_id: number;
  co_faculty_id_1: number | null;
  co_faculty_id_2: number | null;
  section_id: number;
  campus_id: number;
  required_hours: number;
  room_type: string;
  subject_code: string;
  program_code: string;
  max_days_per_week: number | null;
}

export interface Room {
  id: number;
  name: string;
  type: string;
  capacity: number;
  campus_id: number;
}

export interface FacultyUnavailability {
  faculty_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface Schedule {
  teaching_load_id: number;
  faculty_id: number;
  co_faculty_id_1: number | null;
  co_faculty_id_2: number | null;
  section_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface AutoScheduleResult {
  scheduled: number;
  failed: number;
  failures: { subject: string; reason: string }[];
  newlyMapped: Schedule[];
}

export interface ValidationParams {
  teachingLoadId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  termId: number;
  excludeScheduleId?: number | null;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  details?: string;
  warning?: string;  // Non-fatal advisory (e.g. cross-campus booking)
}

export class ScheduleService {
  private static readonly TOLERANCE = 0.001; // 1 second tolerance for floating-point drift

  /**
   * Helper: Parse "HH:mm:ss" or "HH:mm" to decimal hours (e.g., "07:30:00" -> 7.5)
   */
  static parseTime(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  /**
   * Helper: Format decimal hours back to "HH:mm:ss"
   */
  static formatTime(decimalHours: number): string {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  }

  /**
   * Helper: Automated lunch gap verification
   */
  static hasLunchGap(currentBlocks: ScheduleBlock[], newS: number, newE: number): boolean {
    const blocks: ScheduleBlock[] = [...currentBlocks, { start: newS, end: newE }];
    const L_START = 11.5; // 11:30 AM
    const L_END = 14.5;   // 02:30 PM
    const REQ_GAP = 1.0;  // 1 hour
    
    blocks.sort((a, b) => a.start - b.start);
    
    let lastEnd = L_START;
    for (const b of blocks) {
      if (b.end <= L_START) continue;
      if (b.start >= L_END) break;
      
      const gapStart = Math.max(lastEnd, L_START);
      const gapEnd = Math.min(b.start, L_END);
      if (gapEnd - gapStart >= REQ_GAP - 0.01) return true;
      
      lastEnd = Math.max(lastEnd, b.end);
    }
    
    return (L_END - Math.max(lastEnd, L_START) >= REQ_GAP - 0.01);
  }

  /**
   * Unified Placement Validation:
   * Checks for Faculty overlaps, Section overlaps, Room overlaps, Campus mismatch, Blackouts, and Lunch Gap.
   */
  static async validatePlacement(poolOrConn: any, params: ValidationParams): Promise<ValidationResult> {
    const { teachingLoadId, dayOfWeek, startTime, endTime, room, termId, excludeScheduleId } = params;
    const sAttempt = this.parseTime(startTime);
    const eAttempt = this.parseTime(endTime);

    // 1. Fetch core entities involved
    const [tlRows]: [any[], any] = await poolOrConn.query(
      'SELECT faculty_id, co_faculty_id_1, co_faculty_id_2, section_id, term_id FROM teaching_loads WHERE id = ?', 
      [teachingLoadId]
    );
    if (tlRows.length === 0) return { valid: false, message: 'Teaching load not found' };
    
    const { faculty_id: fId, co_faculty_id_1: c1Id, co_faculty_id_2: c2Id, section_id: sectionId, term_id: dbTermId } = tlRows[0];
    const targetTermId = termId || dbTermId;
    const targetFacultyIds = [fId, c1Id, c2Id].filter((id): id is number => !!id && id > 0);
    const facPlaceholders = targetFacultyIds.length > 0 ? targetFacultyIds.map(() => '?').join(',') : 'NULL';

    // 2. Room & Section Integrity Checks
    const [roomCheck]: [any[], any] = await poolOrConn.query('SELECT campus_id, capacity, is_archived FROM rooms WHERE name = ?', [room]);
    const [secCheck]: [any[], any] = await poolOrConn.query('SELECT campus_id, student_count FROM sections WHERE id = ?', [sectionId]);
    
    if (roomCheck.length === 0 || roomCheck[0].is_archived) {
      return { valid: false, message: 'Invalid Room', details: 'The room does not exist or is archived.' };
    }

    const roomCapacity = roomCheck[0].capacity || 0;
    const sectionSize = secCheck.length > 0 ? (secCheck[0].student_count || 0) : 50;

    // Only enforce capacity breach if it's a REAL section (ID != 1)
    if (sectionId !== 1 && sectionSize > roomCapacity) {
      return { 
        valid: false, 
        message: 'Capacity Breach', 
        details: `Room ${room} (Cap: ${roomCapacity}) cannot accommodate ${sectionSize} students from this section.` 
      };
    }

    // Campus cross-check: soft warning only — faculty may legitimately teach at a different campus
    // (e.g. Main Campus instructor assigned to SHS/Bay 2 subjects).
    // We intentionally do NOT block this — it is flagged as a non-fatal advisory.
    const campusMismatch = secCheck.length > 0 && roomCheck[0].campus_id !== secCheck[0].campus_id;

    // 3. Structural Overlaps (Faculty & Section)
    let queryConflicts = `
      SELECT sch.*, s.subject_code, sec.name as section_name, p.code as program_code,
             tl.faculty_id as c_f, tl.co_faculty_id_1 as c_c1, tl.co_faculty_id_2 as c_c2
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      WHERE (
          (tl.faculty_id IN (${facPlaceholders}) OR tl.co_faculty_id_1 IN (${facPlaceholders}) OR tl.co_faculty_id_2 IN (${facPlaceholders}))
          OR (tl.section_id = ? AND tl.section_id != 1)
        )
        AND tl.term_id = ? AND tl.status != 'archived' AND sch.day_of_week = ?
        AND sch.start_time < ? AND sch.end_time > ?
    `;
    const facParams = targetFacultyIds.length > 0 ? targetFacultyIds : [];
    // Adjust timing params by tolerance to avoid edge-case collisions from rounding
    const paramsConflicts: any[] = [...facParams, ...facParams, ...facParams, sectionId, targetTermId, dayOfWeek, this.formatTime(eAttempt - ScheduleService.TOLERANCE), this.formatTime(sAttempt + ScheduleService.TOLERANCE)];
    if (excludeScheduleId) { queryConflicts += ' AND sch.id != ?'; paramsConflicts.push(excludeScheduleId); }

    const [conflicts]: [any[], any] = await poolOrConn.query(queryConflicts, paramsConflicts);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      const conflictFacs = [c.c_f, c.c_c1, c.c_c2].filter(Boolean);
      const isFacConflict = targetFacultyIds.some(tf => conflictFacs.includes(tf));
      return { 
        valid: false, 
        message: isFacConflict ? 'Faculty Conflict' : 'Cohort Conflict',
        details: isFacConflict 
          ? `Collision with ${c.subject_code} (${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)}) on an instructor.`
          : `Students in ${c.program_code}-${c.section_name} are already booked for ${c.subject_code}.`
      };
    }

    // 4. Room Double-Booking
    let queryRoom = `
      SELECT sch.*, s.subject_code FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id JOIN subjects s ON tl.subject_id = s.id
      WHERE sch.room = ? AND tl.term_id = ? AND tl.status != 'archived' AND sch.day_of_week = ? AND sch.start_time < ? AND sch.end_time > ?
    `;
    const paramsRoom = [room, targetTermId, dayOfWeek, this.formatTime(eAttempt - ScheduleService.TOLERANCE), this.formatTime(sAttempt + ScheduleService.TOLERANCE)];
    if (excludeScheduleId) { queryRoom += ' AND sch.id != ?'; paramsRoom.push(excludeScheduleId); }

    const [roomConflicts]: [any[], any] = await poolOrConn.query(queryRoom, paramsRoom);
    if (roomConflicts.length > 0) {
      const c = roomConflicts[0];
      return { valid: false, message: 'Room Double-Booking', details: `Room ${room} is occupied by ${c.subject_code} (${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)}).` };
    }

    // 5. Faculty Blackouts & Multi-Campus Travel
    if (targetFacultyIds.length > 0) {
      const queryBlackouts = `
        SELECT * FROM faculty_unavailability 
        WHERE faculty_id IN (${facPlaceholders}) AND day_of_week = ? AND (start_time < ? AND end_time > ?)
      `;
      const [blockouts]: [any[], any] = await poolOrConn.query(queryBlackouts, [...targetFacultyIds, dayOfWeek, endTime, startTime]);
      if (blockouts.length > 0) {
        return { valid: false, message: 'Faculty Unavailability', details: `An instructor is explicitly blocked: ${blockouts[0].reason || 'No reason provided'}.` };
      }

      // Multi-campus travel check: Fetch ALL schedules for these faculty on this day
      const queryDaySchedules = `
        SELECT sch.start_time, sch.end_time, r.campus_id, r.name as room_name
        FROM schedules sch
        JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
        JOIN rooms r ON sch.room = r.name
        WHERE (tl.faculty_id IN (${facPlaceholders}) OR tl.co_faculty_id_1 IN (${facPlaceholders}) OR tl.co_faculty_id_2 IN (${facPlaceholders}))
          AND sch.day_of_week = ? AND tl.term_id = ? AND tl.status != 'archived'
      `;
      const [daySchedules]: [any[], any] = await poolOrConn.query(queryDaySchedules, [...targetFacultyIds, ...targetFacultyIds, ...targetFacultyIds, dayOfWeek, targetTermId]);
      
      const TRAVEL_BUFFER = 1.0; // 1 hour required to travel between campuses
      const currentCampusId = roomCheck[0].campus_id;

      for (const ds of daySchedules) {
        if (excludeScheduleId && ds.id === excludeScheduleId) continue;
        if (ds.campus_id === currentCampusId) continue; // Same campus, buffer not strictly enforced here (lunch gap handles it)

        const dsS = this.parseTime(ds.start_time);
        const dsE = this.parseTime(ds.end_time);

        // Check if the gap between ds and new placement is < 1 hour
        const gapBefore = sAttempt - dsE;
        const gapAfter = dsS - eAttempt;

        if ((gapBefore >= 0 && gapBefore < TRAVEL_BUFFER) || (gapAfter >= 0 && gapAfter < TRAVEL_BUFFER)) {
            return { 
              valid: false, 
              message: 'Travel Conflict', 
              details: `Instructor needs 1 hour to travel from ${ds.room_name} (Other Campus) to ${room}.` 
            };
        }
      }
    }

    // 6. Lunch Gap — only validate if the proposed class touches the lunch window (11:30 AM – 2:30 PM).
    // A class entirely before 11:30 AM or entirely after 2:30 PM cannot affect the lunch break.
    const L_START = 11.5; // 11:30 AM
    const L_END = 14.5;   // 02:30 PM
    const proposedOverlapsLunchWindow = sAttempt < L_END && eAttempt > L_START;
    if (proposedOverlapsLunchWindow) {
      const gapOk = await this.validateManualSlot(poolOrConn, { 
        facultyIds: targetFacultyIds as number[], sectionId: sectionId as number, dayOfWeek, termId: targetTermId, startTime, endTime, excludeScheduleId 
      });
      if (!gapOk) {
        return { valid: false, message: 'Flexible Lunch Required', details: 'No contiguous 1-hour break between 11:30 AM and 2:30 PM is available for this instructor/section on this day.' };
      }
    }

    return { 
      valid: true,
      warning: campusMismatch ? 'Cross-Campus Booking: The room is on a different campus than the section. Booking is allowed.' : undefined
    };
  }

  /**
   * ConflictManager: Optimized lookup for busy intervals.
   */
  private static createConflictManager(initialSchedules: Schedule[], blackouts: FacultyUnavailability[]) {
    const facultyBusy = new Map<string, ScheduleBlock[]>();
    const roomBusy = new Map<string, ScheduleBlock[]>();
    const sectionBusy = new Map<string, ScheduleBlock[]>();

    const addBlock = (map: Map<string, ScheduleBlock[]>, key: string, start: number, end: number) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ start, end });
    };

    for (const sch of initialSchedules) {
      if (!sch.start_time || !sch.end_time) continue;
      const s = this.parseTime(sch.start_time);
      const e = this.parseTime(sch.end_time);
      const fIds = [sch.faculty_id, sch.co_faculty_id_1, sch.co_faculty_id_2].filter(id => id && id > 0) as number[];
      
      fIds.forEach(id => addBlock(facultyBusy, `${id}:${sch.day_of_week}`, s, e));
      if (sch.room) addBlock(roomBusy, `${sch.room}:${sch.day_of_week}`, s, e);
      if (sch.section_id && sch.section_id !== 1) addBlock(sectionBusy, `${sch.section_id}:${sch.day_of_week}`, s, e);
    }

    for (const b of blackouts) {
      addBlock(facultyBusy, `${b.faculty_id}:${b.day_of_week}`, this.parseTime(b.start_time), this.parseTime(b.end_time));
    }

    return {
      isConflict: (day: string, s: number, e: number, facIds: number[], room: string, secId: number): boolean => {
        // Check Faculty
        for (const fId of facIds) {
          const blocks = facultyBusy.get(`${fId}:${day}`) || [];
          if (blocks.some(b => b.start < e && b.end > s)) return true;
        }
        // Check Room
        const rBlocks = roomBusy.get(`${room}:${day}`) || [];
        if (rBlocks.some(b => b.start < e && b.end > s)) return true;
        // Check Section
        if (secId !== 1) {
          const sBlocks = sectionBusy.get(`${secId}:${day}`) || [];
          if (sBlocks.some(b => b.start < e && b.end > s)) return true;
        }
        return false;
      },
      addSchedule: (sch: Schedule) => {
        const s = this.parseTime(sch.start_time);
        const e = this.parseTime(sch.end_time);
        const fIds = [sch.faculty_id, sch.co_faculty_id_1, sch.co_faculty_id_2].filter(Boolean) as number[];
        fIds.forEach(id => addBlock(facultyBusy, `${id}:${sch.day_of_week}`, s, e));
        addBlock(roomBusy, `${sch.room}:${sch.day_of_week}`, s, e);
        if (sch.section_id !== 1) addBlock(sectionBusy, `${sch.section_id}:${sch.day_of_week}`, s, e);
      },
      getRelatedBlocks: (day: string, facIds: number[], secId: number): ScheduleBlock[] => {
        const all: ScheduleBlock[] = [];
        facIds.forEach(id => all.push(...(facultyBusy.get(`${id}:${day}`) || [])));
        if (secId !== 1) all.push(...(sectionBusy.get(`${secId}:${day}`) || []));
        return all;
      }
    };
  }

  /**
   * Internal Helper: Check lunch gaps by fetching all related blocks for a day.
   */
  static async validateManualSlot(poolOrConn: any, params: { 
    facultyIds: number[], sectionId: number, dayOfWeek: string, termId: number, startTime: string, endTime: string, excludeScheduleId?: number | null 
  }): Promise<boolean> {
    const { facultyIds, sectionId, dayOfWeek, termId, startTime, endTime, excludeScheduleId } = params;
    const facPlaceholders = facultyIds.length > 0 ? facultyIds.map(() => '?').join(',') : 'NULL';
    
    let queryRelated = `
        SELECT sch.id, sch.start_time, sch.end_time FROM schedules sch
        JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
        WHERE tl.term_id = ? AND tl.status != 'archived' AND sch.day_of_week = ?
        AND (tl.faculty_id IN (${facPlaceholders}) OR tl.co_faculty_id_1 IN (${facPlaceholders}) OR tl.co_faculty_id_2 IN (${facPlaceholders}) OR tl.section_id = ?)
    `;
    const sqlParamsRelated = [termId, dayOfWeek, ...facultyIds, ...facultyIds, ...facultyIds, sectionId];
    if (excludeScheduleId) { queryRelated += ' AND sch.id != ?'; sqlParamsRelated.push(excludeScheduleId); }
    const [related] = await poolOrConn.query(queryRelated, sqlParamsRelated) as [{ start_time: string, end_time: string }[], any];

    const currentBlocks: ScheduleBlock[] = related.map(r => ({ start: this.parseTime(r.start_time), end: this.parseTime(r.end_time) }));
    if (facultyIds.length > 0) {
      const [unavail] = await poolOrConn.query(`SELECT start_time, end_time FROM faculty_unavailability WHERE faculty_id IN (${facPlaceholders}) AND day_of_week = ?`, [...facultyIds, dayOfWeek]) as [{ start_time: string, end_time: string }[], any];
      unavail.forEach(u => currentBlocks.push({ start: this.parseTime(u.start_time), end: this.parseTime(u.end_time) }));
    }
    return this.hasLunchGap(currentBlocks, this.parseTime(startTime), this.parseTime(endTime));
  }

  /**
   * Core Algorithm: Auto-generate schedules based on multi-pass priorities
   */
  /**
   * Core Algorithm: Auto-generate schedules based on multi-pass priorities
   */
  static async autoGenerate(poolOrConn: any, term_id: number, campus_id?: number): Promise<AutoScheduleResult> {
    // 1. Fetch ALL approved loads for the term/campus (including partially scheduled ones)
    const queryLoads = `
      SELECT tl.id as teaching_load_id, tl.faculty_id, tl.co_faculty_id_1, tl.co_faculty_id_2, tl.section_id, 
             sec.campus_id, sec.max_days_per_week, s.required_hours, s.room_type, s.subject_code, p.code as program_code
      FROM teaching_loads tl
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      WHERE tl.term_id = ? AND tl.status = 'approved'
        ${campus_id ? 'AND sec.campus_id = ?' : ''}
      ORDER BY s.required_hours DESC, tl.id ASC
    `;
    const loadParams = campus_id ? [term_id, campus_id] : [term_id];
    const [loads] = await poolOrConn.query(queryLoads, loadParams) as [TeachingLoad[], any];

    // Diagnostic check: Find approved loads skipped due to missing campus_id
    const [orphanedLoads] = await poolOrConn.query(`
      SELECT p.code, COUNT(*) as count
      FROM teaching_loads tl
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
      WHERE tl.term_id = ? AND tl.status = 'approved' AND sec.campus_id IS NULL
      GROUP BY p.code
    `, [term_id]) as [any[], any];

    if (orphanedLoads.length > 0) {
      console.warn(` [AUTO-SCHEDULER] [DATA-HEALTH]: Found ${orphanedLoads.reduce((acc, curr) => acc + curr.count, 0)} approved subjects skipped because the Section has no Campus ID.`);
      orphanedLoads.forEach(o => console.warn(`   - ${o.code}: ${o.count} subjects`));
    }

    if (loads.length === 0) return { scheduled: 0, failed: 0, failures: [], newlyMapped: [] };

    // 2. Fetch all active rooms for the campus(es)
    const [rooms] = await poolOrConn.query(`
      SELECT r.name, r.type, r.capacity, r.campus_id 
      FROM rooms r 
      WHERE r.is_archived = FALSE 
      ${campus_id ? 'AND r.campus_id = ?' : ''}
      ORDER BY r.capacity DESC
    `, campus_id ? [campus_id] : []) as [Room[], any];

    // 3. Fetch existing schedules & current hour tallies for conflict checks
    const [existingSchedules] = await poolOrConn.query(`
      SELECT sch.day_of_week, sch.start_time, sch.end_time, sch.room, 
             tl.faculty_id, tl.co_faculty_id_1, tl.co_faculty_id_2, tl.section_id, sch.teaching_load_id
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      WHERE tl.term_id = ? AND tl.status != 'archived'
    `, [term_id]) as [any[], any];

    // Calculate currently assigned hours per load
    const hoursTally = new Map<number, number>();
    existingSchedules.forEach(s => {
      const dur = this.parseTime(s.end_time) - this.parseTime(s.start_time);
      hoursTally.set(s.teaching_load_id, (hoursTally.get(s.teaching_load_id) || 0) + dur);
    });

    // 4. Interleaving Logic: Group by Program and Round-Robin to ensure fairness for multi-subject instructors
    const unassignedLoads = loads.filter(l => (hoursTally.get(l.teaching_load_id) || 0) < Number(l.required_hours) - 0.1);
    
    const programGroups = new Map<string, TeachingLoad[]>();
    unassignedLoads.forEach(l => {
      const code = l.program_code || 'GEN-ED';
      if (!programGroups.has(code)) programGroups.set(code, []);
      programGroups.get(code)!.push(l);
    });

    // Internal sort: hardest subjects (highest hours) first within each program
    programGroups.forEach(list => list.sort((a,b) => Number(b.required_hours) - Number(a.required_hours)));

    const interleavedQueue: TeachingLoad[] = [];
    const programKeys = Array.from(programGroups.keys());
    let maxLen = 0;
    programGroups.forEach(list => { if (list.length > maxLen) maxLen = list.length; });

    for (let i = 0; i < maxLen; i++) {
      for (const key of programKeys) {
        const list = programGroups.get(key)!;
        if (i < list.length) interleavedQueue.push(list[i]);
      }
    }

    // 5. Fetch faculty blackouts
    const [blackouts] = await poolOrConn.query(`SELECT faculty_id, day_of_week, start_time, end_time FROM faculty_unavailability`) as [FacultyUnavailability[], any];

    const cm = this.createConflictManager(existingSchedules, blackouts);

    const PASSES = [
      { name: 'Standard Day', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], sMin: 7.5, eMax: 17.5 },
      { name: 'Extended Day', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], sMin: 7.0, eMax: 21.0 },
      { name: 'Weekend', days: ['Saturday'], sMin: 7.5, eMax: 18.0 }
    ];

    let newlyMapped: Schedule[] = [];
    let failures: { subject: string; section_id: number; duration: number; reason: string }[] = [];
    let scheduledCount = 0;

    // Campus Isolation: track faculty_id -> campus_id (locked for this pass)
    const facultyCampusMap = new Map<number, number>();

    // Section Compaction: track section_id -> Set of active days
    const sectionActiveDays = new Map<number, Set<string>>();

    console.log(` [AUTO-SCHEDULER]: Starting fair interleaved pass for ${interleavedQueue.length} loads across ${programKeys.length} programs.`);

    for (const load of interleavedQueue) {
      let isPlaced = false;
      const totalRequired = Number(load.required_hours);
      let remainingToSchedule = totalRequired - (hoursTally.get(load.teaching_load_id) || 0);

      const isLabProgram = ['BSIS', 'TVL-ICT', 'BSAIS'].includes(load.program_code);
      const loadPESubject = load.subject_code?.toUpperCase().startsWith('PE') || load.subject_code?.toUpperCase().includes('PHED');
      const loadFacs = [load.faculty_id, load.co_faculty_id_1, load.co_faculty_id_2].filter((id): id is number => id !== null);

      // Campus Isolation Check: If any faculty is locked to a DIFFERENT campus, skip this load
      let campusLockReason = '';
      if (load.campus_id) {
          for (const fId of loadFacs) {
              const lockedCampus = facultyCampusMap.get(fId);
              if (lockedCampus !== undefined && lockedCampus !== load.campus_id) {
                  campusLockReason = `Faculty #${fId} is already locked to another campus in this pass.`;
                  break;
              }
          }
      }

      if (campusLockReason) {
          failures.push({
              subject: load.subject_code,
              section_id: load.section_id,
              duration: totalRequired,
              reason: `Skipped: Campus Isolation (${campusLockReason})`
          });
          continue; // Skip to next load in interleaved queue
      }

      // Rule: Never schedule two sessions of the same load on the same day in one run
      const usedDaysThisLoad = new Set<string>();
      // Also account for days already used in existing schedules
      existingSchedules.filter(s => s.teaching_load_id === load.teaching_load_id).forEach(s => usedDaysThisLoad.add(s.day_of_week));

      whileLoop: while (remainingToSchedule > 0.45) { // Threshold for minimum session (approx 30 mins)
        let blockSuccess = false;

        // Flexible splitting logic
        let durationHours = remainingToSchedule;
        if (totalRequired === 3 && remainingToSchedule > 1.5) durationHours = 1.5;
        else if (totalRequired === 5 && remainingToSchedule > 2.5) durationHours = 2.5;
        else if (remainingToSchedule > 3.5) durationHours = 3; 
        
        durationHours = Math.min(durationHours, remainingToSchedule);

        // Room Prioritization for this segment
        const prefersLab = (load.room_type === 'Computer Lab' || load.room_type === 'Laboratory') || 
                           (isLabProgram && (load.room_type === 'Any' || !load.room_type));
        const prefersPESubject = (load.room_type === 'Court' || load.room_type === 'Field') || 
                          (loadPESubject && (load.room_type === 'Any' || !load.room_type));
        const prefersLecture = (load.room_type === 'Lecture') || (!prefersLab && !prefersPESubject);

        const campusRooms = rooms.filter(r => r.campus_id === load.campus_id);
        const roomsForLoad = [...campusRooms].sort((a, b) => {
          const aType = a.type || 'Lecture';
          const bType = b.type || 'Lecture';
          if (prefersLab) {
            const aIsLab = aType === 'Computer Lab' || aType === 'Laboratory';
            const bIsLab = bType === 'Computer Lab' || bType === 'Laboratory';
            if (aIsLab && !bIsLab) return -1;
            if (!aIsLab && bIsLab) return 1;
          }
          if (prefersPESubject) {
            const aIsPEArea = aType === 'Court' || aType === 'Field';
            const bIsPEArea = bType === 'Court' || bType === 'Field';
            if (aIsPEArea && !bIsPEArea) return -1;
            if (!aIsPEArea && bIsPEArea) return 1;
          }
          if (prefersLecture) {
            const aIsLecture = aType === 'Lecture';
            const bIsLecture = bType === 'Lecture';
            if (aIsLecture && !bIsLecture) return -1;
            if (!aIsLecture && bIsLecture) return 1;
          }
          return b.capacity - a.capacity;
        });

        passLoop: for (const pass of PASSES) {
          for (const day of pass.days) {
            if (usedDaysThisLoad.has(day)) continue;

            // Compressed Learning: Check if this section has reached its day limit
            const activeDays = sectionActiveDays.get(load.section_id) || new Set<string>();
            const dayLimit = Number(load.max_days_per_week) || 4; // Default to 4 as per institutional policy
            if (activeDays.size >= dayLimit && !activeDays.has(day)) {
                // Skip this day to enforce vertical compaction
                continue;
            }

            for (let t = pass.sMin; t <= pass.eMax - durationHours; t += 0.5) {
              const sAttempt = t;
              const eAttempt = t + durationHours;

              for (const room of roomsForLoad) {
                // Conflict Check
                if (cm.isConflict(day, sAttempt, eAttempt, loadFacs, room.name, load.section_id)) continue;

                // Lunch Gap Check
                const currentDayBlocks = cm.getRelatedBlocks(day, loadFacs, load.section_id);
                if (!ScheduleService.hasLunchGap(currentDayBlocks, sAttempt, eAttempt)) continue;

                // PLACEMENT SUCCESS
                const newSch: Schedule = {
                  teaching_load_id: load.teaching_load_id,
                  faculty_id: load.faculty_id,
                  co_faculty_id_1: load.co_faculty_id_1,
                  co_faculty_id_2: load.co_faculty_id_2,
                  section_id: load.section_id,
                  day_of_week: day,
                  start_time: ScheduleService.formatTime(sAttempt),
                  end_time: ScheduleService.formatTime(eAttempt),
                  room: room.name
                };

                newlyMapped.push(newSch);
                cm.addSchedule(newSch);
                usedDaysThisLoad.add(day);
                remainingToSchedule -= durationHours;
                scheduledCount++;
                blockSuccess = true;
                isPlaced = true;

                // After successful placement, lock all involved faculty to this campus
                if (room.campus_id) {
                    loadFacs.forEach(fId => {
                        if (!facultyCampusMap.has(fId)) {
                            facultyCampusMap.set(fId, room.campus_id);
                        }
                    });
                }

                // Update Section Active Days
                if (!sectionActiveDays.has(load.section_id)) {
                    sectionActiveDays.set(load.section_id, new Set<string>());
                }
                sectionActiveDays.get(load.section_id)!.add(day);
                
                continue whileLoop;
              }
            }
          }
        }

        // If we reach here, we couldn't find a spot for the current 'durationHours' block
        if (!blockSuccess) {
          console.log(` [AUTO-SCHEDULER] [FAILURE]: ${load.subject_code} (${load.program_code}) - Could not find ${durationHours}h slot. Remaining: ${remainingToSchedule}h`);
          break whileLoop; 
        }
      }

      if (!isPlaced) {
        failures.push({
          subject: load.subject_code,
          section_id: load.section_id,
          duration: remainingToSchedule,
          reason: `No valid slot found for ${remainingToSchedule.toFixed(1)}h remaining (Type: ${load.room_type || 'Any'}).`
        });
      }
    }

    return { scheduled: scheduledCount, failed: failures.length, failures, newlyMapped };
  }

  /**
   * Phase 2: Smart Conflict Resolver — Suggest alternative valid slots
   * Returns up to `limit` conflict-free alternative placements for a given teaching load.
   */
  static async suggestAlternativeSlots(
    poolOrConn: any,
    params: { teachingLoadId: number; termId: number; preferredRoom?: string; limit?: number }
  ): Promise<{ day_of_week: string; start_time: string; end_time: string; room: string }[]> {
    const { teachingLoadId, termId, preferredRoom, limit = 5 } = params;

    // Fetch load details
    const [tlRows]: [any[], any] = await poolOrConn.query(`
      SELECT tl.faculty_id, tl.co_faculty_id_1, tl.co_faculty_id_2, tl.section_id, 
             s.required_hours, s.room_type, sec.campus_id
      FROM teaching_loads tl
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      WHERE tl.id = ?
    `, [teachingLoadId]);

    if (tlRows.length === 0) return [];
    const { faculty_id, co_faculty_id_1, co_faculty_id_2, section_id, required_hours, room_type, campus_id } = tlRows[0];
    const durationHours = Number(required_hours) || 1;
    const facIds = [faculty_id, co_faculty_id_1, co_faculty_id_2].filter(Boolean);

    // Fetch compatible rooms
    const [roomRows]: [any[], any] = await poolOrConn.query(`
      SELECT name, type, capacity FROM rooms 
      WHERE is_archived = FALSE AND campus_id = ? ${room_type && room_type !== 'Any' ? 'AND type = ?' : ''}
      ORDER BY capacity DESC
    `, room_type && room_type !== 'Any' ? [campus_id, room_type] : [campus_id]);

    // If preferred room is provided, prioritize it
    const sortedRooms = preferredRoom
      ? [roomRows.find((r: any) => r.name === preferredRoom), ...roomRows.filter((r: any) => r.name !== preferredRoom)].filter(Boolean)
      : roomRows;

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const suggestions: { day_of_week: string; start_time: string; end_time: string; room: string }[] = [];

    for (const day of DAYS) {
      if (suggestions.length >= limit) break;
      for (let timeCode = 7; timeCode <= 22 - durationHours; timeCode += 0.5) {
        if (suggestions.length >= limit) break;
        const sAttempt = timeCode;
        const eAttempt = timeCode + durationHours;

        for (const room of sortedRooms) {
          const result = await this.validatePlacement(poolOrConn, {
            teachingLoadId,
            dayOfWeek: day,
            startTime: this.formatTime(sAttempt),
            endTime: this.formatTime(eAttempt),
            room: room.name,
            termId
          });

          if (result.valid) {
            suggestions.push({
              day_of_week: day,
              start_time: this.formatTime(sAttempt),
              end_time: this.formatTime(eAttempt),
              room: room.name
            });
            break; // One suggestion per time slot (best room)
          }
        }
      }
    }
    return suggestions;
  }
  /**
   * Phase 3: Atomic Batch Sync — Commit entire Ghost Mode draft efficiently
   * Performs all updates, creations, and deletions in a single transaction.
   */
  static async batchSync(poolOrConn: any, params: {
    termId: number;
    updates: any[];   // { id, day_of_week covers, start_time, end_time, room, teaching_load_id }
    creates: any[];   // { day_of_week, start_time, end_time, room, teaching_load_id }
    deletes: number[]; // IDs to delete
  }): Promise<{ success: boolean; message: string; audit_ids?: number[] }> {
    const { termId, updates, creates, deletes } = params;
    
    // Start atomic transaction natively (if supported by connection)
    if (poolOrConn.beginTransaction) {
       await poolOrConn.beginTransaction();
    } else {
       await poolOrConn.query('START TRANSACTION');
    }

    try {
      // 1. Process Deletions
      if (deletes.length > 0) {
        await poolOrConn.query('DELETE FROM schedules WHERE id IN (?)', [deletes]);
      }

      // 2. Process Updates with real-time validation
      for (const upd of updates) {
        const result = await this.validatePlacement(poolOrConn, {
          teachingLoadId: upd.teaching_load_id,
          dayOfWeek: upd.day_of_week,
          startTime: upd.start_time,
          endTime: upd.end_time,
          room: upd.room,
          termId,
          excludeScheduleId: upd.id
        });

        if (!result.valid) {
          throw new Error(`Batch validation failed for Update: ${result.message} - ${result.details}`);
        }

        await poolOrConn.query(
          'UPDATE schedules SET day_of_week = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?',
          [upd.day_of_week, upd.start_time, upd.end_time, upd.room, upd.id]
        );
      }

      // 3. Process Creations with real-time validation
      for (const crt of creates) {
        const result = await this.validatePlacement(poolOrConn, {
          teachingLoadId: crt.teaching_load_id,
          dayOfWeek: crt.day_of_week,
          startTime: crt.start_time,
          endTime: crt.end_time,
          room: crt.room,
          termId
        });

        if (!result.valid) {
          throw new Error(`Batch validation failed for Creation: ${result.message} - ${result.details}`);
        }

        await poolOrConn.query(
          'INSERT INTO schedules (teaching_load_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)',
          [crt.teaching_load_id, crt.day_of_week, crt.start_time, crt.end_time, crt.room]
        );
      }

      if (poolOrConn.commit) {
        await poolOrConn.commit();
      } else {
        await poolOrConn.query('COMMIT');
      }
      return { success: true, message: 'Ghost Layer successfully committed to production ledger.' };
    } catch (error: any) {
      if (poolOrConn.rollback) {
        await poolOrConn.rollback();
      } else {
        await poolOrConn.query('ROLLBACK');
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Pre-Commit Integrity Scan:
   * Validates a batch of schedules specifically for "Spectral Orphans" (references to archived/deleted resources).
   * Returns a list of orphan IDs and the reason for their invalidity.
   */
  static async validateBatchIntegrity(poolOrConn: any, schedules: any[]): Promise<{ orphanedIds: number[], issues: { id: number, reason: string }[] }> {
    if (schedules.length === 0) return { orphanedIds: [], issues: [] };

    // 1. Get all active rooms and faculty for validation
    const [activeRooms]: [any[], any] = await poolOrConn.query('SELECT name FROM rooms WHERE is_archived = FALSE');
    const [activeFaculty]: [any[], any] = await poolOrConn.query('SELECT id FROM faculty WHERE is_archived = FALSE');
    
    const validRoomNames = new Set(activeRooms.map(r => r.name));
    const validFacultyIds = new Set(activeFaculty.map(f => f.id));

    const orphanedIds: number[] = [];
    const issues: { id: number, reason: string }[] = [];

    for (const sch of schedules) {
      const issuesForBlock: string[] = [];

      // Check Room
      if (sch.room && !validRoomNames.has(sch.room)) {
        issuesForBlock.push(`Room "${sch.room}" is archived or missing.`);
      }

      // Check Faculty (including Co-Teachers)
      const facIdsInBlock = [sch.faculty_id, sch.co_faculty_id_1, sch.co_faculty_id_2].filter(Boolean);
      for (const fId of facIdsInBlock) {
        if (!validFacultyIds.has(fId)) {
          issuesForBlock.push(`Instructor ID ${fId} is archived or missing.`);
        }
      }

      if (issuesForBlock.length > 0) {
        orphanedIds.push(sch.id);
        issues.push({ id: sch.id, reason: issuesForBlock.join(' ') });
      }
    }

    return { orphanedIds, issues };
  }
}
