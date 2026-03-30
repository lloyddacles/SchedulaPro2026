import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  const termId = req.query.term_id;
  
  try {
    let query = `
      SELECT s.*, p.code as program_code, p.name as program_name,
             (SELECT COUNT(*) 
              FROM teaching_loads tl 
              WHERE tl.subject_id = s.id 
                AND tl.status != 'archived'
                ${termId ? 'AND tl.term_id = ?' : ''}
             ) as usage_count
      FROM subjects s
      LEFT JOIN programs p ON s.program_id = p.id
      WHERE s.is_archived = ?
      ORDER BY s.subject_code ASC
    `;
    
    const params = termId ? [termId, isArchived] : [isArchived];
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  const { subject_code, subject_name, units, required_hours, room_type, program_id, year_level } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO subjects (subject_code, subject_name, units, required_hours, room_type, program_id, year_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [subject_code, subject_name, units, required_hours, room_type || 'Any', program_id || 1, year_level || null]
    );
    const [newSub]: [any[], any] = await pool.query('SELECT id FROM subjects WHERE subject_code = ?', [subject_code]);
    if (newSub.length > 0) {
      await logAudit('CREATE', 'Subject', newSub[0].id, { subject_code, subject_name }, req.user.username);
    }
    res.status(201).json({ message: 'Subject created successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        message: `Subject code '${subject_code}' already exists. It may be hidden in the Archives if not visible in the main list.`,
        code: 'ER_DUP_ENTRY'
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  const { subject_code, subject_name, units, required_hours, room_type, program_id, year_level } = req.body;
  try {
    await pool.query(
      'UPDATE subjects SET subject_code=?, subject_name=?, units=?, required_hours=?, room_type=?, program_id=?, year_level=? WHERE id=?',
      [subject_code, subject_name, units, required_hours, room_type || 'Any', program_id || 1, year_level || null, req.params.id]
    );
    await logAudit('UPDATE', 'Subject', req.params.id as string, { subject_code }, req.user.username);
    res.json({ message: 'Subject updated successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        message: `Another subject is already using code '${subject_code}'.`,
        code: 'ER_DUP_ENTRY'
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    const [[sub]]: [any[], any] = await pool.query('SELECT subject_code FROM subjects WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    if (sub) {
      await logAudit('DELETE', 'Subject', req.params.id as string, { subject_code: sub.subject_code }, req.user.username);
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/restore', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE subjects SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Subject', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Subject restored successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
