import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

// All user management routes are restricted to admins
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.role, u.faculty_id, f.full_name as faculty_name 
      FROM users u 
      LEFT JOIN faculty f ON u.faculty_id = f.id
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authorizeRoles('admin'), async (req: any, res: Response) => {
  const { username, password, role, faculty_id } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const [result]: any = await pool.query(
      'INSERT INTO users (username, password_hash, role, faculty_id) VALUES (?, ?, ?, ?)',
      [username, hash, role || 'faculty', faculty_id || null]
    );
    await logAudit('CREATE', 'User', result.insertId, { username, role }, req.user.username);
    res.status(201).json({ id: result.insertId, username, role, faculty_id });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  const { username, role, faculty_id, password } = req.body;
  try {
    let query = 'UPDATE users SET username = ?, role = ?, faculty_id = ?';
    let params: any[] = [username, role, faculty_id || null];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      query += ', password_hash = ?';
      params.push(hash);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(query, params);
    await logAudit('UPDATE', 'User', req.params.id, { username, role, password_changed: !!password }, req.user.username);
    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authorizeRoles('admin'), async (req: any, res: Response) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logAudit('DELETE', 'User', req.params.id, {}, req.user.username);
    res.json({ message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
