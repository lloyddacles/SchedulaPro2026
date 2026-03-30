import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authorizeRoles, authenticateToken } from '../utils/auth.js';
import { validate, roomSchema } from '../middleware/validator.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: any, res: Response) => {
  const isArchived = req.query.archived === 'true' ? 1 : 0;
  const campusId = req.query.campus_id;
  try {
    const query = `
      SELECT 
        r.*, 
        c.name as campus_name,
        (SELECT COUNT(*) FROM schedules s WHERE s.room = r.name) as usage_count,
        (SELECT COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time))) / 3600, 0) 
         FROM schedules s WHERE s.room = r.name) as weekly_hours,
        EXISTS (
          SELECT 1 FROM schedules s 
          WHERE s.room = r.name 
          AND s.day_of_week = DAYNAME(NOW())
          AND TIME(NOW()) BETWEEN s.start_time AND s.end_time
        ) as is_occupied
      FROM rooms r 
      LEFT JOIN campuses c ON r.campus_id = c.id 
      WHERE r.is_archived = ? ${campusId ? 'AND r.campus_id = ?' : ''}
      ORDER BY r.type ASC, r.name ASC
    `;
    const params = campusId ? [isArchived, campusId] : [isArchived];
    const [rows]: [any[], any] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin', 'program_head'), validate(roomSchema), async (req: any, res: Response) => {
  const { name, type, capacity, campus_id, status } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO rooms (name, type, capacity, campus_id, status) VALUES (?, ?, ?, ?, ?)',
      [name, type || 'Lecture', capacity || 40, campus_id || null, status || 'active']
    );
    await logAudit('CREATE', 'Room', result.insertId, { name, type }, req.user.username);
    res.status(201).json({ id: result.insertId, name, type: type || 'Lecture', capacity, campus_id });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Room name already in use' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorizeRoles('admin', 'program_head'), validate(roomSchema), async (req: any, res: Response) => {
  const { name, type, capacity, campus_id, status } = req.body;
  try {
    await pool.query(
      'UPDATE rooms SET name = ?, type = ?, capacity = ?, campus_id = ?, status = ? WHERE id = ?',
      [name, type, capacity, campus_id, status || 'active', req.params.id]
    );
    await logAudit('UPDATE', 'Room', req.params.id as string, { name }, req.user.username);
    res.json({ message: 'Room updated' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Room name already in use' });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE rooms SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logAudit('ARCHIVE', 'Room', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Room archived.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/restore', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  try {
    await pool.query('UPDATE rooms SET is_archived = FALSE WHERE id = ?', [req.params.id]);
    await logAudit('RESTORE', 'Room', req.params.id as string, {}, req.user.username);
    res.json({ message: 'Room restored.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', authorizeRoles('admin', 'program_head'), async (req: any, res: Response) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE rooms SET status = ? WHERE id = ?', [status, req.params.id]);
    await logAudit('UPDATE_STATUS', 'Room', req.params.id as string, { status }, req.user.username);
    res.json({ message: 'Room status updated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
