const pool = require('./config/db');
async function migrate() {
  try {
    console.log('Altering subjects table...');
    await pool.query('ALTER TABLE subjects ADD COLUMN program_id INT NULL');
    await pool.query('ALTER TABLE subjects ADD COLUMN year_level INT NULL');
    await pool.query('ALTER TABLE subjects ADD FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL');
    console.log('Migration complete.');
    process.exit();
  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('Already migrated');
    else console.error(e);
    process.exit();
  }
}
migrate();
