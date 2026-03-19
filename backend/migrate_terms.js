const pool = require('./config/db');

async function migrateTerms() {
  try {
    console.log('Creating terms table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS terms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting default term...');
    await pool.query('INSERT IGNORE INTO terms (id, name, is_active) VALUES (1, "Default Term", true)');

    console.log('Altering teaching_loads table...');
    try {
      await pool.query('ALTER TABLE teaching_loads ADD COLUMN term_id INT NOT NULL DEFAULT 1');
      await pool.query('ALTER TABLE teaching_loads ADD FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE');
      console.log('Successfully linked teaching_loads to terms.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log('term_id already exists on teaching_loads.');
      } else {
         throw e;
      }
    }
    console.log('Migration complete.');
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

migrateTerms();
