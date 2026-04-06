import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { authenticateToken } from '../utils/auth.js';
import { validate, loginSchema, changePasswordSchema } from '../middleware/validator.js';

const router = express.Router();

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: express.NextFunction) => {
  const { username, password } = req.body;
  try {
    const [rows]: [any[], any] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      throw new ApiError(401, 'Invalid credentials', 'AUTH_FAILED');
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      throw new ApiError(401, 'Invalid credentials', 'AUTH_FAILED');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, faculty_id: user.faculty_id },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    // Set secure httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production
      sameSite: 'lax', // prevent CSRF while allowing navigation
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ role: user.role, faculty_id: user.faculty_id, username: user.username });
  } catch (error: any) {
    next(error);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.put('/change-password', authenticateToken, validate(changePasswordSchema), async (req: any, res: Response, next: express.NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const [rows]: [any[], any] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) throw new ApiError(404, 'User not found', 'NOT_FOUND');

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) throw new ApiError(401, 'Incorrect current password', 'AUTH_FAILED');

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    next(error);
  }
});

router.get('/me', authenticateToken, (req: any, res: Response) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    faculty_id: req.user.faculty_id
  });
});

export default router;
