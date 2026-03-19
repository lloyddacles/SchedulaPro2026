const db = require('../config/db');

/**
 * Push immutable tracking traces directly into analytical database vectors natively avoiding synchronous UI blocking.
 */
async function logAudit(action, entity_type, entity_id, details, userName = 'System Admin') {
  try {
    await db.query(
      'INSERT INTO audit_logs (action, entity_type, entity_id, details, user_name) VALUES (?, ?, ?, ?, ?)',
      [action, entity_type, entity_id || null, typeof details === 'object' ? JSON.stringify(details) : details, userName]
    );
  } catch (err) {
    console.error('Failed to commit log trace securely:', err);
  }
}

module.exports = logAudit;
