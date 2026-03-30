const pool = require('./config/db');

async function migrateArchive() {
  try {
    const tables = ['faculty', 'programs', 'rooms', 'sections', 'subjects'];
    
    for (const table of tables) {
      console.log(`Injecting is_archived property into ${table}...`);
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE`);
        console.log(`Successfully mapped soft-deletion to ${table}.`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`> Column is_archived already exists on ${table}.`);
        } else {
          throw e;
        }
      }
    }
    
    console.log('Archive Structural Migration Complete.');
    process.exit(0);
  } catch (e) {
    console.error('Migration crashed:', e);
    process.exit(1);
  }
}
migrateArchive();
