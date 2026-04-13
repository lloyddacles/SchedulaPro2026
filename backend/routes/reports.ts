import express, { Request, Response } from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Faculty Workloads & Contract Types
router.get('/faculty-workloads', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id, department_id } = req.query;
    if (!term_id || isNaN(Number(term_id))) return res.status(400).json({ message: 'Valid term_id is required' });

    const cleanTermId = Number(term_id);
    const cleanCampusId = campus_id && !isNaN(Number(campus_id)) ? Number(campus_id) : null;
    const cleanDeptId = department_id && !isNaN(Number(department_id)) ? Number(department_id) : null;

    let filter = '';
    const params: any[] = [cleanTermId];

    if (cleanCampusId) {
      filter += ' AND f.campus_id = ?';
      params.push(cleanCampusId);
    }
    if (cleanDeptId) {
      filter += ' AND f.department_id = ?';
      params.push(cleanDeptId);
    }

    const query = `
      SELECT f.id, f.full_name as name, f.employment_type as contract_type, 
             CAST(IFNULL(f.max_teaching_hours, 24) AS UNSIGNED) as max_units,
             CAST(COALESCE(SUM(s.required_hours), 0) AS UNSIGNED) as current_load
      FROM faculty f
      LEFT JOIN teaching_loads tl ON f.id = tl.faculty_id AND tl.term_id = ? AND tl.status != 'archived'
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE f.is_archived = FALSE ${filter}
      GROUP BY f.id
      ORDER BY current_load DESC
    `;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Room Utilization Analysis
router.get('/room-utilization', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id, department_id } = req.query;
    if (!term_id || isNaN(Number(term_id))) return res.status(400).json({ message: 'Valid term_id is required' });

    const cleanTermId = Number(term_id);
    const cleanCampusId = campus_id && !isNaN(Number(campus_id)) ? Number(campus_id) : null;
    const cleanDeptId = department_id && !isNaN(Number(department_id)) ? Number(department_id) : null;

    let filter = '';
    const params: any[] = [cleanTermId];

    if (cleanCampusId) {
      filter += ' AND r.campus_id = ?';
      params.push(cleanCampusId);
    }
    if (cleanDeptId) {
      filter += ' AND r.department_id = ?';
      params.push(cleanDeptId);
    }

    const query = `
      SELECT r.name,
             CAST(COALESCE(SUM(s.required_hours), 0) AS DECIMAL(10,2)) as value
      FROM rooms r
      LEFT JOIN schedules sch ON LOWER(REPLACE(r.name, '-', ' ')) = LOWER(REPLACE(sch.room, '-', ' '))
      LEFT JOIN teaching_loads tl ON sch.teaching_load_id = tl.id AND tl.term_id = ? AND tl.status != 'archived'
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE r.is_archived = FALSE ${filter}
      GROUP BY r.id
      HAVING value > 0
      ORDER BY value DESC
    `;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Program/Department Distribution
router.get('/program-distribution', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id, department_id } = req.query;
    if (!term_id || isNaN(Number(term_id))) return res.status(400).json({ message: 'Valid term_id is required' });

    const cleanTermId = Number(term_id);
    const cleanCampusId = campus_id && !isNaN(Number(campus_id)) ? Number(campus_id) : null;
    const cleanDeptId = department_id && !isNaN(Number(department_id)) ? Number(department_id) : null;

    let filter = '';
    const params: any[] = [cleanTermId];

    if (cleanCampusId) {
      filter += ' AND p.campus_id = ?';
      params.push(cleanCampusId);
    }
    if (cleanDeptId) {
      filter += ' AND p.department_id = ?';
      params.push(cleanDeptId);
    }

    const query = `
      SELECT p.code as name, p.code as program_code, COUNT(tl.id) as value, COUNT(tl.id) as total_loads, p.name as description
      FROM programs p
      JOIN sections sec ON p.id = sec.program_id
      JOIN teaching_loads tl ON sec.id = tl.section_id AND tl.term_id = ? AND tl.status != 'archived'
      WHERE p.is_archived = FALSE ${filter}
      GROUP BY p.id
      HAVING value > 0
    `;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Overall Key Performance Indicators
router.get('/overall-stats', async (req: Request, res: Response) => {
  try {
    const { term_id, campus_id, department_id } = req.query;
    if (!term_id || isNaN(Number(term_id))) return res.status(400).json({ message: 'Valid term_id is required' });

    const cleanTermId = Number(term_id);
    const cleanCampusId = campus_id && !isNaN(Number(campus_id)) ? Number(campus_id) : null;
    const cleanDeptId = department_id && !isNaN(Number(department_id)) ? Number(department_id) : null;

    const campParams = cleanCampusId ? [cleanCampusId] : [];
    const deptParams = cleanDeptId ? [cleanDeptId] : [];

    // Filters per table
    const fFilter = (cleanCampusId ? ' AND f.campus_id = ?' : '') + (cleanDeptId ? ' AND f.department_id = ?' : '');
    const rFilter = (cleanCampusId ? ' AND r.campus_id = ?' : '') + (cleanDeptId ? ' AND r.department_id = ?' : '');

    // 1. Instructor Load balance
    const [facultyData]: any = await pool.query(`
      SELECT f.id, CAST(COALESCE(SUM(s.required_hours), 0) AS DECIMAL(10,2)) as load_hrs
      FROM faculty f
      LEFT JOIN teaching_loads tl ON f.id = tl.faculty_id AND tl.term_id = ? AND tl.status != 'archived'
      LEFT JOIN subjects s ON tl.subject_id = s.id
      WHERE f.is_archived = FALSE ${fFilter}
      GROUP BY f.id
    `, [term_id, ...campParams, ...deptParams]);

    const activeFacultyCount = facultyData.filter((f: any) => Number(f.load_hrs) > 0).length;
    const overloadedCount = facultyData.filter((f: any) => Number(f.load_hrs) > 24).length;

    // 2. Room Capacity
    const [roomData]: any = await pool.query(`
      SELECT COUNT(*) as count FROM rooms r WHERE is_archived = FALSE ${rFilter}
    `, [...campParams, ...deptParams]);
    const totalRooms = roomData[0].count;
    const totalCapacityHours = totalRooms * 72;

    const [utilization]: any = await pool.query(`
      SELECT CAST(COALESCE(SUM(s.required_hours), 0) AS DECIMAL(10,2)) as used
      FROM teaching_loads tl
      JOIN subjects s ON tl.subject_id = s.id
      JOIN faculty f ON tl.faculty_id = f.id
      WHERE tl.term_id = ? AND tl.status != 'archived' ${fFilter}
    `, [term_id, ...campParams, ...deptParams]);

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
