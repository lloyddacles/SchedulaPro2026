import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { authenticateToken } from '../utils/auth.js';
import { validate, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validator.js';
import { sendOTPEmail } from '../utils/mailer.js';
import crypto from 'crypto';

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

// ── PASSWORD RECOVERY ────────────────────────────────────────────────────────

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response, next: express.NextFunction) => {
  const { email } = req.body;
  try {
    const [rows]: [any[], any] = await pool.query('SELECT id, username FROM users WHERE email = ?', [email]);
    
    // Security best practice: Don't reveal if user exists, but here we'll be helpful for internal tools
    if (rows.length === 0) {
      return res.status(200).json({ message: 'If an account exists with this email, an OTP has been sent.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query('UPDATE users SET reset_otp = ?, reset_expires = ? WHERE email = ?', [otp, expiry, email]);
    
    await sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent successfully to your registered email.' });
  } catch (error: any) {
    next(error);
  }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response, next: express.NextFunction) => {
  const { email, otp, newPassword } = req.body;
  try {
    const [rows]: [any[], any] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND reset_otp = ? AND reset_expires > NOW()',
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP code.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_otp = NULL, reset_expires = NULL WHERE id = ?',
      [hash, rows[0].id]
    );

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
