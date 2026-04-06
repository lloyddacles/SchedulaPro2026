import express, { Response } from 'express';
import pool from '../config/db.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();
router.use(authenticateToken);

// GET /evaluations — faculty see own; admin/head see all (optionally filtered by term or faculty)
router.get('/', async (req: any, res: Response, next: express.NextFunction) => {
  try {
    const { faculty_id, term_id } = req.query;
    const isViewer = req.user.role === 'viewer';
    const targetFacultyId = isViewer ? req.user.faculty_id : (faculty_id || null);

    let query = `
      SELECT le.id, le.teaching_load_id, le.rating, le.notes, le.evaluated_at,
             tl.term_id, tl.faculty_id,
             t.name as term_name,
             s.subject_code, s.subject_name,
             f.full_name as faculty_name,
             u.username as evaluator_username
      FROM load_evaluations le
      JOIN teaching_loads tl ON le.teaching_load_id = tl.id
      JOIN subjects s ON tl.subject_id = s.id
      JOIN terms t ON tl.term_id = t.id
      JOIN faculty f ON tl.faculty_id = f.id
      JOIN users u ON le.evaluator_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetFacultyId) { query += ' AND tl.faculty_id = ?'; params.push(targetFacultyId); }
    if (term_id) { query += ' AND tl.term_id = ?'; params.push(term_id); }
    query += ' ORDER BY le.evaluated_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    next(error);
  }
});

// POST /evaluations — Program Head / Admin submits a rating
router.post('/', authorizeRoles('admin', 'program_head'), async (req: any, res: Response, next: express.NextFunction) => {
  const { teaching_load_id, rating, notes } = req.body;
  if (!teaching_load_id || !rating) {
    return res.status(400).json({ message: 'teaching_load_id and rating are required.' });
  }
  const validRatings = ['Excellent', 'Satisfactory', 'Needs Improvement'];
  if (!validRatings.includes(rating)) {
    return res.status(400).json({ message: `Invalid rating. Use: ${validRatings.join(', ')}` });
  }
  try {
    await pool.query(
      'INSERT INTO load_evaluations (teaching_load_id, evaluator_id, rating, notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), notes = VALUES(notes), evaluator_id = VALUES(evaluator_id), evaluated_at = NOW()',
      [teaching_load_id, req.user.id, rating, notes || null]
    );
    await logAudit('EVALUATE_LOAD', 'TeachingLoad', teaching_load_id, { rating }, req.user.username);
    res.status(201).json({ message: 'Evaluation submitted successfully.' });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /evaluations/:teaching_load_id — Admin removes an evaluation
router.delete('/:teaching_load_id', authorizeRoles('admin'), async (req: any, res: Response, next: express.NextFunction) => {
  try {
    await pool.query('DELETE FROM load_evaluations WHERE teaching_load_id = ?', [req.params.teaching_load_id]);
    await logAudit('DELETE_EVALUATION', 'TeachingLoad', req.params.teaching_load_id, {}, req.user.username);
    res.json({ message: 'Evaluation removed.' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
