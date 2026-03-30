import express, { Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM terms ORDER BY created_at DESC');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin'), async (req: any, res: Response) => {
  const { name, is_active } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO terms (name, is_active) VALUES (?, ?)',
      [name, is_active || 0]
    );
    await logAudit('CREATE', 'Term', result.insertId, { name }, req.user.username);
    res.status(201).json({ id: result.insertId, name, is_active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  const { name, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE terms SET name = ?, is_active = ? WHERE id = ?',
      [name, is_active, req.params.id]
    );
    await logAudit('UPDATE', 'Term', req.params.id as string, { name }, req.user.username);
    res.json({ message: 'Term updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  try {
    const termId = req.params.id;
    // Archive associated schedules and teaching loads essentially by marking term archived
    await pool.query('UPDATE terms SET is_active = FALSE WHERE id = ?', [termId]);
    await logAudit('DEACTIVATE', 'Term', termId, {}, req.user.username);
    res.json({ message: 'Term deactivated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
