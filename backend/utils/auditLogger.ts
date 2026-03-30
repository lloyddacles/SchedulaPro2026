import pool from '../config/db.js';

/**
 * Push immutable tracking traces directly into analytical database vectors.
 */
export async function logAudit(action: string, entity_type: string, entity_id: number | string | null, details: any, userName: string) {
  if (!userName) {
    console.error(` [AUDIT_ERROR]: Attempted to log ${action} on ${entity_type} without user context.`);
    return;
  }
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name) VALUES (?, ?, ?, ?, ?)',
      [action, entity_type, entity_id || null, typeof details === 'object' ? JSON.stringify(details) : details, userName]
    );
  } catch (err) {
    console.error('Failed to commit log trace securely:', err);
  }
}

export default logAudit;
