import express, { Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Get ALL blockouts globally
router.get('/', async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM faculty_unavailability');
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Get specific faculty's blocked times
router.get('/:facultyId', async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM faculty_unavailability WHERE faculty_id = ? ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), start_time ASC`,
      [req.params.facultyId]
    );
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Insert new blocked time
router.post('/', authorizeRoles('admin', 'program_head', 'program_assistant', 'faculty'), async (req: any, res: Response) => {
  const { faculty_id, day_of_week, start_time, end_time, reason } = req.body;
  
  if (start_time >= end_time) return res.status(400).json({ error: 'End time must be cleanly after start time.' });

  try {
    const [existing]: [any[], any] = await pool.query(
      `SELECT * FROM faculty_unavailability 
       WHERE faculty_id = ? AND day_of_week = ?
       AND (start_time < ? AND end_time > ?)`,
      [faculty_id, day_of_week, end_time, start_time]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'This blocked time actively physically overlaps with a pre-existing blackout window.' });

    const [result]: any = await pool.query(
      'INSERT INTO faculty_unavailability (faculty_id, day_of_week, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)',
      [faculty_id, day_of_week, start_time, end_time, reason || 'Unavailable']
    );
    await logAudit('CREATE', 'FacultyUnavailability', result.insertId, { day_of_week, start_time }, req.user.username);
    res.status(201).json({ id: result.insertId, faculty_id, day_of_week, start_time, end_time, reason });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authorizeRoles('admin', 'program_head', 'program_assistant', 'faculty'), async (req: any, res: Response) => {
  try {
    await pool.query('DELETE FROM faculty_unavailability WHERE id = ?', [req.params.id]);
    await logAudit('DELETE', 'FacultyUnavailability', req.params.id, {}, req.user.username);
    res.json({ message: 'Deleted' });
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

export default router;
