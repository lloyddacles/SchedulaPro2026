import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.get('/', async (req: any, res: Response) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  try {
    const [rows] = await pool.query(
      `SELECT p.*, d.name as department_name, d.code as department_code 
       FROM programs p 
       LEFT JOIN departments d ON p.department_id = d.id 
       WHERE p.is_archived = ? 
       ORDER BY p.type ASC, p.code ASC`,
      [isArchived]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  const { code, name, type, department_id } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO programs (code, name, type, department_id) VALUES (?, ?, ?, ?)',
      [code, name, type || 'College', department_id || null]
    );
    await logAudit('CREATE', 'Program', result.insertId, { code, name, department_id }, req.user.username);
    res.status(201).json({ id: result.insertId, code, name, type, department_id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-upload', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  const programs = req.body;
  if (!Array.isArray(programs)) {
    return res.status(400).json({ error: 'Invalid data format. Expected an array of programs.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const p of programs) {
      if (!p.code || !p.name) continue;
      await connection.query(
        'INSERT INTO programs (code, name, type) VALUES (?, ?, ?)',
        [p.code, p.name, p.type || 'College']
      );
    }

    await connection.commit();
    await logAudit('CREATE_BULK', 'Program', null, { count: programs.length }, req.user.username);
    res.status(201).json({ message: `Successfully imported ${programs.length} programs.` });
  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'One or more program codes already exist.' });
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  const { code, name, type, department_id } = req.body;
  try {
    await pool.query(
      'UPDATE programs SET code = ?, name = ?, type = ?, department_id = ? WHERE id = ?',
      [code, name, type, department_id || null, req.params.id]
    );
    await logAudit('UPDATE', 'Program', req.params.id as string, { code, department_id }, req.user.username);
    res.json({ message: 'Program updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE programs SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Program', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Program archived' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/restore', authorizeRoles('admin', 'program_head', 'program_assistant'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE programs SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Program', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Program restored' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
