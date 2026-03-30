import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, campusSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken);

// Get all campuses
router.get('/', async (req: any, res: Response) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  try {
    const [rows] = await pool.query('SELECT * FROM campuses WHERE is_archived = ? ORDER BY name ASC', [isArchived]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create campus
router.post('/', authorizeRoles('admin', 'program_head'), validate(campusSchema), async (req: any, res: Response) => {
  const { name, code } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO campuses (name, code) VALUES (?, ?)',
      [name, code]
    );
    await logAudit('CREATE', 'Campus', result.insertId, { name, code }, req.user.username);
    res.status(201).json({ id: result.insertId, name, code });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Campus code already in use' });
    res.status(500).json({ error: error.message });
  }
});

// Update campus
router.put('/:id', authorizeRoles('admin', 'program_head'), validate(campusSchema), async (req: any, res: Response) => {
  const { name, code } = req.body;
  try {
    await pool.query(
      'UPDATE campuses SET name = ?, code = ? WHERE id = ?',
      [name, code, req.params.id]
    );
    await logAudit('UPDATE', 'Campus', req.params.id as string, { code }, req.user.username);
    res.json({ message: 'Campus updated' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Campus code already in use' });
    res.status(500).json({ error: error.message });
  }
});

// Archive campus
router.delete('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE campuses SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Campus', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Campus archived.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restore campus
router.put('/:id/restore', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE campuses SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Campus', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Campus restored.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
