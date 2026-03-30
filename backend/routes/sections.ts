import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authorizeRoles, authenticateToken } from '../utils/auth.js';
import { validate, sectionSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: any, res: Response) => {
  try {
    const isArchived = req.query.archived === 'true' ? 1 : 0;
    const campusId = req.query.campus_id;
    const [rows] = await pool.query(`
      SELECT sec.*, p.code as program_code, p.name as program_name, p.type as program_type, 
             f.full_name as adviser_name, c.name as campus_name
      FROM sections sec
      JOIN programs p ON sec.program_id = p.id
      LEFT JOIN faculty f ON sec.adviser_id = f.id
      LEFT JOIN campuses c ON sec.campus_id = c.id
      WHERE sec.is_archived = ? ${campusId ? 'AND sec.campus_id = ?' : ''}
      ORDER BY p.code ASC, sec.year_level ASC, sec.name ASC
    `, campusId ? [isArchived, campusId] : [isArchived]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/advisory', async (req: any, res: Response) => {
  try {
    const facultyId = req.user.faculty_id;
    if (!facultyId) return res.json([]);

    const [rows] = await pool.query(`
      SELECT sec.*, p.code as program_code, p.name as program_name, p.type as program_type, 
             f.full_name as adviser_name, c.name as campus_name
      FROM sections sec
      JOIN programs p ON sec.program_id = p.id
      LEFT JOIN faculty f ON sec.adviser_id = f.id
      LEFT JOIN campuses c ON sec.campus_id = c.id
      WHERE sec.adviser_id = ? AND sec.is_archived = 0
      ORDER BY p.code ASC, sec.year_level ASC, sec.name ASC
    `, [facultyId]);
    
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin', 'program_head'), validate(sectionSchema), async (req: any, res: Response) => {
  try {
    const { program_id, year_level, name, adviser_id, campus_id } = req.body;
    const [result]: any = await pool.query(
      'INSERT INTO sections (program_id, year_level, name, adviser_id, campus_id) VALUES (?, ?, ?, ?, ?)',
      [program_id, year_level, name, adviser_id || null, campus_id || null]
    );
    await logAudit('CREATE', 'Section', result.insertId, { name, year_level }, req.user.username);
    res.status(201).json({ id: result.insertId, program_id, year_level, name, adviser_id, campus_id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE sections SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Section', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Section archived successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head'), validate(sectionSchema), async (req: any, res: Response) => {
  try {
    const { program_id, year_level, name, adviser_id, campus_id } = req.body;
    await pool.query(
      'UPDATE sections SET program_id = ?, year_level = ?, name = ?, adviser_id = ?, campus_id = ? WHERE id = ?',
      [program_id, year_level, name, adviser_id || null, campus_id || null, req.params.id]
    );
    await logAudit('UPDATE', 'Section', req.params.id as string, { name }, req.user.username);
    res.json({ message: 'Section successfully tracked and updated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/restore', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE sections SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Section', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Section restored successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
