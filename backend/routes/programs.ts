import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.get('/', async (req: any, res: Response) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  try {
    const [rows] = await pool.query('SELECT * FROM programs WHERE is_archived = ? ORDER BY type ASC, code ASC', [isArchived]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  const { code, name, type } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO programs (code, name, type) VALUES (?, ?, ?)',
      [code, name, type || 'College']
    );
    await logAudit('CREATE', 'Program', result.insertId, { code, name }, req.user.username);
    res.status(201).json({ id: result.insertId, code, name, type });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  const { code, name, type } = req.body;
  try {
    await pool.query(
      'UPDATE programs SET code = ?, name = ?, type = ? WHERE id = ?',
      [code, name, type, req.params.id]
    );
    await logAudit('UPDATE', 'Program', req.params.id as string, { code }, req.user.username);
    res.json({ message: 'Program updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE programs SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Program', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Program archived' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/restore', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE programs SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Program', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Program restored' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
