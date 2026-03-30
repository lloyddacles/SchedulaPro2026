const pool = require('./config/db');

async function migrateLoadStatus() {
  try {
    console.log('Altering teaching_loads status ENUM to include archived...');
    const query = `
      ALTER TABLE teaching_loads 
      MODIFY COLUMN status ENUM('draft', 'pending_review', 'approved', 'rejected', 'archived') 
      DEFAULT 'draft';
    `;
    await pool.query(query);
    console.log('Migration completed successfully: "archived" constraint added.');
  } catch (error) {
    console.error('Error updating ENUM constraint:', error);
  } finally {
    process.exit(0);
  }
}

migrateLoadStatus();
