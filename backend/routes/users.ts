import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';
import { validate, userSchema } from '../middleware/validator.js';
import { sendOTPEmail } from '../utils/mailer.js';

const router = express.Router();

// All user management routes are restricted to admins
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.email, u.role, u.faculty_id, f.full_name as faculty_name 
      FROM users u 
      LEFT JOIN faculty f ON u.faculty_id = f.id
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', validate(userSchema), async (req: any, res: Response) => {
  const { username, email, password, role, faculty_id } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const [result]: any = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, faculty_id) VALUES (?, ?, ?, ?, ?)',
      [username, email, hash, role || 'faculty', faculty_id || null]
    );
    await logAudit('CREATE', 'User', result.insertId, { username, role }, req.user.username);
    res.status(201).json({ id: result.insertId, username, email, role, faculty_id });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', validate(userSchema), async (req: any, res: Response) => {
  const { username, email, role, faculty_id, password } = req.body;
  try {
    let query = 'UPDATE users SET username = ?, email = ?, role = ?, faculty_id = ?';
    let params: any[] = [username, email, role, faculty_id || null];

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

router.delete('/:id', async (req: any, res: Response) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logAudit('DELETE', 'User', req.params.id, {}, req.user.username);
    res.json({ message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/send-reset', async (req: any, res: Response) => {
  try {
    const [rows]: [any[], any] = await pool.query('SELECT username, email FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = rows[0];
    if (!user.email) return res.status(400).json({ error: 'User does not have an institutional email registered' });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query('UPDATE users SET reset_otp = ?, reset_expires = ? WHERE id = ?', [otp, expiry, req.params.id]);
    await sendOTPEmail(user.email, otp);
    
    await logAudit('SEND_RESET', 'User', req.params.id, { username: user.username, email: user.email }, req.user.username);
    res.json({ message: `Identity recovery Matrix Code dispatched to ${user.email}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
