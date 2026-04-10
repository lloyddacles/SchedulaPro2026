import express, { Request, Response } from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/faculty-loads', async (req: Request, res: Response) => {
  try {
    const term_id = req.query.term_id;
    let query = `
      SELECT f.full_name, d.name as department, f.employment_type, f.max_teaching_hours,
             s.subject_code, s.subject_name, s.units, s.required_hours,
             p.code as program, sec.year_level, sec.name as section,
             tl.status as load_status
      FROM teaching_loads tl
      JOIN faculty f ON tl.faculty_id = f.id
      LEFT JOIN departments d ON f.department_id = d.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
    `;
    const params: any[] = [];
    if (term_id) {
       query += ' WHERE tl.term_id = ?';
       params.push(term_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/schedules', async (req: Request, res: Response) => {
  try {
    const term_id = req.query.term_id;
    let query = `
      SELECT sch.day_of_week, sch.start_time, sch.end_time, sch.room,
             f.full_name as faculty, f.employment_type, s.subject_code, 
             sec.name as section, p.code as program,
             tl.status as load_status
      FROM schedules sch
      JOIN teaching_loads tl ON sch.teaching_load_id = tl.id
      JOIN faculty f ON tl.faculty_id = f.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN sections sec ON tl.section_id = sec.id
      JOIN programs p ON sec.program_id = p.id
    `;
    const params: any[] = [];
    if (term_id) {
       query += ' WHERE tl.term_id = ?';
       params.push(term_id);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
