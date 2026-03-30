import pool from '/Users/lloyd.dacles/Documents/Cursor Project/faculty-scheduling-system/backend/config/db.js';

async function run() {
  try {
    console.log('Adding student_count to sections table...');
    await pool.query('ALTER TABLE sections ADD COLUMN student_count INT DEFAULT 30 AFTER name');
    console.log('Success.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}
run();
