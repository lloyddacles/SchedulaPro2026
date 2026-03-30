import pool from '../config/db.js';
import { getIo } from './socketStore.js';

export async function createNotification(userId: number | string, title: string, message: string, type = 'info', link: string | null = null) {
  try {
    const [result]: any = await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type, link]
    );

    const io = getIo();
    if (io) {
      io.to(`user_${userId}`).emit('notification_received', {
        id: result.insertId,
        title,
        message,
        type,
        link
      });
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyRole(role: string, title: string, message: string, type = 'info', link: string | null = null) {
  try {
    const [users]: [any[], any] = await pool.query('SELECT id FROM users WHERE role = ?', [role]);
    for (const u of users) {
      await createNotification(u.id, title, message, type, link);
    }
  } catch (error) {
    console.error(`Failed to notify role ${role}:`, error);
  }
}

export async function notifyFaculty(facultyId: number | string, title: string, message: string, type = 'info', link: string | null = null) {
  try {
    const [users]: [any[], any] = await pool.query('SELECT id FROM users WHERE faculty_id = ?', [facultyId]);
    if (users.length > 0) {
      await createNotification(users[0].id, title, message, type, link);
    }
  } catch (error) {
    console.error(`Failed to notify faculty ${facultyId}:`, error);
  }
}

export default {
  createNotification,
  notifyRole,
  notifyFaculty,
};
