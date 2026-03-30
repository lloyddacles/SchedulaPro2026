import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows]: [any[], any] = await pool.query(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 250
    `);
    const [[countResult]]: any = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    res.json({ logs: rows, total: countResult.total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
