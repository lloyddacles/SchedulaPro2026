import express, { Request, Response } from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Faculty Workloads & Contract Types
router.get('/faculty-workloads', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id } = req.query;
    if (!term_id) return res.status(400).json({ message: 'term_id is required' });

    const campFilter = campus_id ? 'AND f.campus_id = ?' : '';
    const campParams = campus_id ? [campus_id] : [];

    const query = `
      SELECT f.id, f.full_name as name, f.employment_type as contract_type, 
             CAST(IFNULL(f.max_teaching_hours, 24) AS UNSIGNED) as max_units,
             CAST(COALESCE(SUM(s.required_hours), 0) AS UNSIGNED) as current_load
      FROM faculty f
      LEFT JOIN teaching_loads tl ON f.id = tl.faculty_id AND tl.term_id = ? AND tl.status != 'archived'
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE f.is_archived = FALSE ${campFilter}
      GROUP BY f.id
      ORDER BY current_load DESC
    `;
    const [rows] = await pool.query(query, [term_id, ...campParams]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Room Utilization Analysis
router.get('/room-utilization', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id } = req.query;
    if (!term_id) return res.status(400).json({ message: 'term_id is required' });

    const campFilter = campus_id ? 'AND r.campus_id = ?' : '';
    const campParams = campus_id ? [campus_id] : [];

    const query = `
      SELECT r.name,
             CAST(COALESCE(SUM(s.required_hours), 0) AS DECIMAL(10,2)) as value
      FROM rooms r
      LEFT JOIN schedules sch ON LOWER(REPLACE(r.name, '-', ' ')) = LOWER(REPLACE(sch.room, '-', ' '))
      LEFT JOIN teaching_loads tl ON sch.teaching_load_id = tl.id AND tl.term_id = ? AND tl.status != 'archived'
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE r.is_archived = FALSE ${campFilter}
      GROUP BY r.id
      HAVING value > 0
      ORDER BY value DESC
    `;
    const [rows] = await pool.query(query, [term_id, ...campParams]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Program/Department Distribution
router.get('/program-distribution', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id } = req.query;
    const campFilter = campus_id ? 'AND p.campus_id = ?' : '';
    const campParams = campus_id ? [campus_id] : [];

    const query = `
      SELECT p.code as name, p.code as program_code, COUNT(tl.id) as value, COUNT(tl.id) as total_loads, p.name as description
      FROM programs p
      JOIN sections sec ON p.id = sec.program_id
      JOIN teaching_loads tl ON sec.id = tl.section_id AND tl.term_id = ? AND tl.status != 'archived'
      WHERE p.is_archived = FALSE ${campFilter}
      GROUP BY p.id
      HAVING value > 0
    `;
    const [rows] = await pool.query(query, [term_id, ...campParams]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Overall Key Performance Indicators
router.get('/overall-stats', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id } = req.query;
    if (!term_id) return res.status(400).json({ message: 'term_id is required' });

    const campFilter = campus_id ? 'AND campus_id = ?' : '';
    const fCampFilter = campus_id ? 'AND f.campus_id = ?' : '';
    const rCampFilter = campus_id ? 'AND r.campus_id = ?' : '';
    const secCampFilter = campus_id ? 'AND sec.campus_id = ?' : '';
    const campParams = campus_id ? [campus_id] : [];

    // 1. Instructor Load balance
    const [facultyData]: any = await pool.query(`
      SELECT f.id, CAST(COALESCE(SUM(s.required_hours), 0) AS DECIMAL(10,2)) as load_hrs
      FROM faculty f
      LEFT JOIN teaching_loads tl ON f.id = tl.faculty_id AND tl.term_id = ? AND tl.status != 'archived'
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE f.is_archived = FALSE ${fCampFilter}
      GROUP BY f.id
    `, [term_id, ...campParams]);

    const activeFacultyCount = facultyData.filter((f: any) => Number(f.load_hrs) > 0).length;
    const overloadedCount = facultyData.filter((f: any) => Number(f.load_hrs) > 24).length;

    // 2. Room Capacity (72 hrs/room/term-week)
    const [roomData]: any = await pool.query(`
      SELECT COUNT(*) as count FROM rooms r WHERE is_archived = FALSE ${rCampFilter}
    `, campParams);
    const totalRooms = roomData[0].count;
    const totalCapacityHours = totalRooms * 72;

    const [utilization]: any = await pool.query(`
      SELECT CAST(COALESCE(SUM(s.required_hours), 0) AS DECIMAL(10,2)) as used
      FROM teaching_loads tl
      JOIN subjects s ON tl.subject_id = s.id
      WHERE tl.term_id = ? AND tl.status != 'archived'
    `, [term_id]);

    // 3. Subject Metadata
    const [subStats]: any = await pool.query(`
      SELECT COUNT(*) as total FROM subjects WHERE is_archived = FALSE
    `);

    res.json({
      active_faculty: activeFacultyCount,
      overloaded_instructors: overloadedCount,
      total_subjects: subStats[0].total,
      room_capacity: {
        total_rooms: totalRooms,
        total_booked_hours: Math.round(utilization[0].used),
        total_capacity_hours: totalCapacityHours
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
