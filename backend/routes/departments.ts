import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authorizeRoles } from '../utils/auth.js';

const router = express.Router();

// Get all departments
router.get('/', async (req: any, res: Response) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM departments WHERE is_archived = ? ORDER BY code ASC',
      [isArchived]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a department
router.post('/', authorizeRoles('admin'), async (req: any, res: Response) => {
  const { code, name } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Code and Name are required.' });
  }
  try {
    const [result]: any = await pool.query(
      'INSERT INTO departments (code, name) VALUES (?, ?)',
      [code, name]
    );
    await logAudit('CREATE', 'Department', result.insertId, { code, name }, req.user.username);
    res.status(201).json({ id: result.insertId, code, name });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department code already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a department
router.put('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  const { code, name } = req.body;
  try {
    await pool.query(
      'UPDATE departments SET code = ?, name = ? WHERE id = ?',
      [code, name, req.params.id]
    );
    await logAudit('UPDATE', 'Department', req.params.id as string, { code, name }, req.user.username);
    res.json({ message: 'Department updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive a department
router.delete('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE departments SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Department', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Department archived' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restore a department
router.put('/:id/restore', authorizeRoles('admin'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE departments SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Department', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Department restored' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
