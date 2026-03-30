const pool = require('./config/db');
require('dotenv').config();

async function migrate() {
  try {
    // Add employment_type column (check first — MySQL doesn't support IF NOT EXISTS on ALTER)
    const [cols] = await pool.query(`SHOW COLUMNS FROM faculty LIKE 'employment_type'`);
    if (cols.length === 0) {
      await pool.query(`
        ALTER TABLE faculty 
        ADD COLUMN employment_type 
        ENUM('Regular', 'Contractual', 'Probationary', 'Part-time') 
        NOT NULL DEFAULT 'Regular'
      `);
      console.log('✅ employment_type column added to faculty.');
    } else {
      console.log('ℹ️  employment_type column already exists, skipping.');
    }
    console.log('✅ employment_type column added to faculty.');

    // Set sensible defaults based on max_teaching_hours already on record
    // Part-time is typically <= 16 units
    await pool.query(`
      UPDATE faculty 
      SET employment_type = 'Part-time' 
      WHERE max_teaching_hours <= 16 AND employment_type = 'Regular'
    `);
    console.log('✅ Existing faculty with <= 16 max hrs auto-tagged as Part-time.');

    console.log('\n✅ Employment Type Migration Complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
