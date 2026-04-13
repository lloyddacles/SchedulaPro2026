import express, { Request, Response } from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id } = req.query;
    
    // Hardening: Ensure IDs are valid numbers or null to prevent NaN SQL injection
    const cleanTermId = term_id && !isNaN(Number(term_id)) ? Number(term_id) : null;
    const cleanCampusId = campus_id && !isNaN(Number(campus_id)) ? Number(campus_id) : null;

    // Core parameters explicitly isolated by campus where applicable
    const termFilter = cleanTermId ? 'AND term_id = ?' : '';
    const campFilter = cleanCampusId ? 'AND campus_id = ?' : '';
    const fCampFilter = cleanCampusId ? 'AND f.campus_id = ?' : '';
    const rCampFilter = cleanCampusId ? 'AND r.campus_id = ?' : '';
    const secCampFilter = cleanCampusId ? 'AND sec.campus_id = ?' : '';

    const termParams = cleanTermId ? [cleanTermId] : [];
    const campParams = cleanCampusId ? [cleanCampusId] : [];
    const termCampParams = [...termParams, ...campParams];

    // Counters — only active (non-archived) records natively filtered by campus
    const [facultyCount]: any = await pool.query(`SELECT COUNT(*) as count FROM faculty WHERE is_archived = FALSE ${campFilter}`, campParams);
    const [subjectCount]: any = await pool.query('SELECT COUNT(*) as count FROM subjects WHERE is_archived = FALSE'); // Global Dictionary
    const [loadCount]: any = await pool.query(`
      SELECT COUNT(tl.id) as count FROM teaching_loads tl 
      LEFT JOIN sections sec ON tl.section_id = sec.id 
      WHERE tl.status = 'approved' ${term_id ? 'AND tl.term_id = ?' : ''} ${secCampFilter}
    `, termCampParams);

    const [mappedCount]: any = await pool.query(`
      SELECT COUNT(DISTINCT tl.id) as count 
      FROM teaching_loads tl
      JOIN schedules sch ON tl.id = sch.teaching_load_id
      JOIN sections sec ON tl.section_id = sec.id
      WHERE tl.status != 'archived' ${term_id ? 'AND tl.term_id = ?' : ''} ${secCampFilter}
    `, termCampParams);

    const [blockCount]: any = await pool.query(`
      SELECT COUNT(sch.id) as count 
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN sections sec ON tl.section_id = sec.id
      WHERE tl.status != 'archived' ${term_id ? 'AND tl.term_id = ?' : ''} ${secCampFilter}
    `, termCampParams);

    const queryFacultyLoads = `
      SELECT f.id, f.full_name, d.name as department, f.max_teaching_hours,
             COUNT(tl.id) as subjects_count,
             COALESCE(SUM(s.required_hours), 0) as total_assigned_hours
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      LEFT JOIN teaching_loads tl ON f.id = tl.faculty_id ${term_id ? `AND tl.term_id = ?` : ''}
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE f.is_archived = FALSE ${fCampFilter}
      GROUP BY f.id
    `;
    const [facultyData]: any = await pool.query(queryFacultyLoads, termCampParams);

    // Department Stats (active faculty only)
    const [deptStats]: any = await pool.query(`
      SELECT d.name as department, COUNT(*) as value 
      FROM faculty f
      JOIN departments d ON f.department_id = d.id
      WHERE f.is_archived = FALSE ${fCampFilter}
      GROUP BY d.name
    `, campParams);

    // Unassigned Subjects (active subjects only)
    const queryUnassigned = `
      SELECT s.id, s.subject_code, s.subject_name, s.units, s.required_hours, p.code as program_code, s.year_level
      FROM subjects s
      LEFT JOIN programs p ON s.program_id = p.id
      WHERE s.is_archived = FALSE
        AND s.id NOT IN (
          SELECT subject_id FROM teaching_loads ${term_id ? ' WHERE term_id = ?' : ''}
        )
    `;
    const [unassignedSubjects]: any = await pool.query(queryUnassigned, term_id ? [term_id] : []);

    // Room Utilization (active rooms only)
    const queryRooms = `
      SELECT r.id, r.name, r.type, r.capacity,
             COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(sch.end_time, sch.start_time))/3600), 0) as utilized_hours
      FROM rooms r
      LEFT JOIN schedules sch ON r.name = sch.room
      LEFT JOIN teaching_loads tl ON sch.teaching_load_id = tl.id ${term_id ? 'AND tl.term_id = ?' : ''}
      WHERE r.is_archived = FALSE ${rCampFilter}
      GROUP BY r.id
      HAVING utilized_hours > 0
      ORDER BY utilized_hours DESC
    `;
    const [roomUtilization]: any = await pool.query(queryRooms, termCampParams);

    // Conflict Detection
    const queryFacultyConflicts = `
      SELECT 
        f.full_name as faculty_name,
        a.day_of_week,
        sa.subject_code as subject_a,
        sb.subject_code as subject_b,
        a.start_time,
        a.end_time
      FROM schedules a
      JOIN schedules b ON a.id < b.id
        AND a.day_of_week = b.day_of_week
        AND a.start_time < b.end_time
        AND a.end_time > b.start_time
      JOIN teaching_loads tla ON a.teaching_load_id = tla.id
      JOIN teaching_loads tlb ON b.teaching_load_id = tlb.id
      JOIN faculty f ON tla.faculty_id = f.id
      JOIN subjects sa ON tla.subject_id = sa.id
      JOIN subjects sb ON tlb.subject_id = sb.id
      WHERE tla.faculty_id = tlb.faculty_id
        ${term_id ? 'AND tla.term_id = ? AND tlb.term_id = ?' : ''}
        ${fCampFilter}
      LIMIT 20
    `;
    let conflictParams: any[] = term_id ? [term_id, term_id] : [];
    if (campus_id) conflictParams.push(campus_id);
    const [facultyConflicts]: any = await pool.query(queryFacultyConflicts, conflictParams);

    const queryRoomConflicts = `
      SELECT
        a.room,
        a.day_of_week,
        sa.subject_code as subject_a,
        sb.subject_code as subject_b,
        a.start_time,
        a.end_time
      FROM schedules a
      JOIN schedules b ON a.id < b.id
        AND a.room = b.room
        AND a.day_of_week = b.day_of_week
        AND a.start_time < b.end_time
        AND a.end_time > b.start_time
      JOIN teaching_loads tla ON a.teaching_load_id = tla.id
      JOIN teaching_loads tlb ON b.teaching_load_id = tlb.id
      JOIN subjects sa ON tla.subject_id = sa.id
      JOIN subjects sb ON tlb.subject_id = sb.id
      JOIN rooms r ON a.room = r.name
      ${term_id ? 'WHERE tla.term_id = ? AND tlb.term_id = ?' : 'WHERE 1=1'}
      ${rCampFilter}
      LIMIT 20
    `;
    const [roomConflicts]: any = await pool.query(queryRoomConflicts, conflictParams);

    const FULL_LOAD = 24;
    const loadStatusBreakdown = { unassigned: 0, part_load: 0, full_load: 0, overload: 0 };
    for (const f of facultyData) {
      const hrs = Number(f.total_assigned_hours);
      if (hrs === 0) loadStatusBreakdown.unassigned++;
      else if (hrs > FULL_LOAD) loadStatusBreakdown.overload++;
      else if (hrs === FULL_LOAD) loadStatusBreakdown.full_load++;
      else loadStatusBreakdown.part_load++;
    }

    const [empBreakdown]: any = await pool.query(`
      SELECT COALESCE(employment_type, 'Regular') as type, COUNT(*) as count
      FROM faculty WHERE is_archived = FALSE ${campFilter} GROUP BY employment_type
    `, campParams);

    const [pendingCount]: any = await pool.query(`
      SELECT COUNT(tl.id) as count FROM teaching_loads tl 
      LEFT JOIN sections sec ON tl.section_id = sec.id 
      WHERE tl.status = 'pending_review' 
      ${term_id ? 'AND tl.term_id = ?' : ''} ${secCampFilter}
    `, termCampParams);

    res.json({
      summary: {
        total_faculty: facultyCount[0].count,
        total_subjects: subjectCount[0].count,
        total_assigned_loads: loadCount[0].count,
        total_mapped_loads: mappedCount[0].count,
        total_schedule_blocks: blockCount[0].count,
        total_unassigned_subjects: unassignedSubjects.length,
        total_conflicts: facultyConflicts.length + roomConflicts.length,
        pending_approval_count: pendingCount[0].count
      },
      load_status_breakdown: loadStatusBreakdown,
      employment_breakdown: empBreakdown,
      unassigned_subjects: unassignedSubjects,
      room_utilization: roomUtilization,
      faculty_loads: facultyData,
      department_stats: deptStats,
      conflicts: {
        faculty: facultyConflicts,
        rooms: roomConflicts
      }
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
  }
});

export default router;
