import express, { Request, Response } from 'express';
import pool from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateToken, authorizeRoles } from '../utils/auth.js';

const router = express.Router();

// Migrate/seed the table on first use — safe to call multiple times
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const defaults: [string, string][] = [
    ['app_name', 'SchedulaPro'],
    ['institution_name', 'CARD-MRI Development Institute, Inc.'],
    ['logo_url', ''],
  ];

  for (const [key, value] of defaults) {
    await pool.query(
      'INSERT IGNORE INTO system_settings (`key`, value) VALUES (?, ?)',
      [key, value]
    );
  }
};

// Initialize on load
ensureTable().catch(console.error);

// GET /api/settings — public (needed by login page before auth)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT `key`, value FROM system_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings — admin only (explicit auth since route is mounted before global authenticateToken)
router.put('/', authenticateToken, authorizeRoles('admin'), async (req: any, res: Response) => {
  const { app_name, institution_name, logo_url } = req.body;
  try {
    const updates: [string, string][] = [];
    if (app_name !== undefined) updates.push(['app_name', app_name]);
    if (institution_name !== undefined) updates.push(['institution_name', institution_name]);
    if (logo_url !== undefined) updates.push(['logo_url', logo_url]);

    for (const [key, value] of updates) {
      await pool.query(
        'INSERT INTO system_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [key, value]
      );
    }

    await logAudit('UPDATE', 'SystemSettings', 'global', { app_name, institution_name }, req.user.username);
    res.json({ message: 'Settings updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
