import express, { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * Universal Search Endpoint for Command Palette
 * Returns combined results for Faculty, Rooms, and Programs
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const { q } = req.query;

  if (!q || String(q).length < 2) {
    return res.json({ faculty: [], rooms: [], programs: [] });
  }

  const searchTerm = `%${q}%`;

  try {
    // 1. Search Faculty
    const [faculty] = await pool.query(
      'SELECT id, full_name as name, email FROM faculty WHERE full_name LIKE ? AND is_archived = FALSE LIMIT 5',
      [searchTerm]
    );

    // 2. Search Rooms
    const [rooms] = await pool.query(
      'SELECT id, name, type FROM rooms WHERE name LIKE ? AND is_archived = FALSE LIMIT 5',
      [searchTerm]
    );

    // 3. Search Programs
    const [programs] = await pool.query(
      'SELECT id, name, code FROM programs WHERE (name LIKE ? OR code LIKE ?) LIMIT 5',
      [searchTerm, searchTerm]
    );

    // 4. Search Audit Logs (Forensic Layer)
    const [audit] = await pool.query(
      'SELECT id, action, entity_type, user_name, details, created_at FROM audit_logs WHERE (action LIKE ? OR entity_type LIKE ? OR user_name LIKE ? OR details LIKE ?) ORDER BY created_at DESC LIMIT 5',
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    res.json({
      faculty,
      rooms,
      programs,
      audit
    });
  } catch (error) {
    next(error);
  }
});

export default router;
