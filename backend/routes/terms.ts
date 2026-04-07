import express, { Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, termSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: any, res: Response) => {
  const includeArchived = req.query.include_archived === 'true';
  try {
    let query = 'SELECT * FROM terms';
    if (!includeArchived) {
      query += ' WHERE is_archived = 0';
    }
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin'), validate(termSchema), async (req: any, res: Response) => {
  const { name, is_active, is_archived } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO terms (name, is_active, is_archived) VALUES (?, ?, ?)',
      [name, is_active || 0, is_archived || 0]
    );
    await logAudit('CREATE', 'Term', result.insertId, { name }, req.user.username);
    res.status(201).json({ id: result.insertId, name, is_active, is_archived });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorizeRoles('admin'), validate(termSchema), async (req: any, res: Response) => {
  const { name, is_active, is_archived } = req.body;
  try {
    await pool.query(
      'UPDATE terms SET name = ?, is_active = ?, is_archived = ? WHERE id = ?',
      [name, is_active, is_archived, req.params.id]
    );
    await logAudit('UPDATE', 'Term', req.params.id as string, { name }, req.user.username);
    res.json({ message: 'Term updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// [ATOMIC] Promote a term to Operational Default
router.put('/:id/activate', authorizeRoles('admin'), async (req: any, res: Response) => {
  const termId = req.params.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Deactivate all
    await connection.query('UPDATE terms SET is_active = 0');
    // Activate target and unarchive it if it was archived
    await connection.query('UPDATE terms SET is_active = 1, is_archived = 0 WHERE id = ?', [termId]);
    
    await logAudit('ACTIVATE_GLOBAL', 'Term', termId, { note: 'Promoted to global active' }, req.user.username);
    await connection.commit();
    res.json({ message: 'Term promoted to global operational default.' });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Toggle Archive status
router.put('/:id/archive', authorizeRoles('admin'), async (req: any, res: Response) => {
  const termId = req.params.id;
  const { is_archived } = req.body;
  try {
    // If archiving an active term, we must deactivate it first
    if (is_archived) {
      await pool.query('UPDATE terms SET is_archived = 1, is_active = 0 WHERE id = ?', [termId]);
    } else {
      await pool.query('UPDATE terms SET is_archived = 0 WHERE id = ?', [termId]);
    }
    
    await logAudit('ARCHIVE', 'Term', termId, { is_archived }, req.user.username);
    res.json({ message: `Term ${is_archived ? 'archived' : 'restored'}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  try {
    const termId = req.params.id;
    // Archive associated schedules and teaching loads essentially by marking term archived
    await pool.query('UPDATE terms SET is_active = FALSE, is_archived = TRUE WHERE id = ?', [termId]);
    await logAudit('DEACTIVATE', 'Term', termId, { note: 'Deleted/Archived' }, req.user.username);
    res.json({ message: 'Term archived.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
