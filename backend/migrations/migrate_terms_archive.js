import 'dotenv/config';
import pool from '../config/db.ts';

async function run() {
  try {
    console.log('Running Term Lifecycle Migration (ESM + Env)...');
    
    // Add is_archived column if it doesn't exist
    try {
      await pool.query('ALTER TABLE terms ADD COLUMN is_archived TINYINT(1) DEFAULT 0');
      console.log('Added is_archived to terms.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('is_archived already exists on terms.');
      } else {
        throw e;
      }
    }

    // Ensure we have at least one active term to start with
    const [activeRows] = await pool.query('SELECT id FROM terms WHERE is_active = 1 LIMIT 1');
    if (activeRows.length === 0) {
      const [allRows] = await pool.query('SELECT id FROM terms ORDER BY created_at DESC LIMIT 1');
      if (allRows.length > 0) {
        await pool.query('UPDATE terms SET is_active = 1 WHERE id = ?', [allRows[0].id]);
        console.log('Promoted most recent term to Active as default.');
      }
    }
    
    console.log('Term Lifecycle Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

run();
